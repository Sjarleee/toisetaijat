/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages Function: GET /api/payment/status?ref=<orderId>
 *
 * Sjekker betalingsstatus for en MobilePay-betaling.
 * Hvis betalingen er AUTHORIZED, gjennomføres capture automatisk.
 *
 * Svar:
 *   { ok: true, state: 'CAPTURED' | 'AUTHORIZED' | 'ABORTED' | 'EXPIRED' | 'TERMINATED' }
 *   { ok: false, error: string }
 */

const MP_BASE = 'https://api.vipps.no';

const ALLOWED_ORIGINS = [
  'https://www.toisetaijat.fi',
  'https://toisetaijat.fi',
  'https://toisetaijat.pages.dev',
  'http://localhost:4323',
];

interface Env {
  MOBILEPAY_CLIENT_ID: string;
  MOBILEPAY_CLIENT_SECRET: string;
  MOBILEPAY_SUBSCRIPTION_KEY: string;
  MOBILEPAY_MSN: string;
  SHEETS_WEBHOOK?: string;
}

async function getAccessToken(env: Env): Promise<string> {
  const res = await fetch(`${MP_BASE}/accesstoken/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'client_id': env.MOBILEPAY_CLIENT_ID,
      'client_secret': env.MOBILEPAY_CLIENT_SECRET,
      'Ocp-Apim-Subscription-Key': env.MOBILEPAY_SUBSCRIPTION_KEY,
      'Merchant-Serial-Number': env.MOBILEPAY_MSN,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed: ${res.status} ${text}`);
  }
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get('Origin') || '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Content-Type': 'application/json',
  };

  const ref = new URL(request.url).searchParams.get('ref');
  const orderParam = new URL(request.url).searchParams.get('order');
  if (!ref) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing ref' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const token = await getAccessToken(env);
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Ocp-Apim-Subscription-Key': env.MOBILEPAY_SUBSCRIPTION_KEY,
      'Merchant-Serial-Number': env.MOBILEPAY_MSN,
      'Vipps-System-Name': 'toisetaijat',
      'Vipps-System-Version': '1.0.0',
    };

    // Hent betalingsstatus
    const paymentRes = await fetch(
      `${MP_BASE}/epayment/v1/payments/${encodeURIComponent(ref)}`,
      { headers: authHeaders },
    );

    if (!paymentRes.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'Payment not found' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const payment = await paymentRes.json() as {
      state: string;
      amount: { value: number; currency: string };
    };

    // Gjennomfør capture hvis AUTHORIZED
    if (payment.state === 'AUTHORIZED') {
      const captureRes = await fetch(
        `${MP_BASE}/epayment/v1/payments/${encodeURIComponent(ref)}/capture`,
        {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Idempotency-Key': `capture-${ref}`,
          },
          body: JSON.stringify({
            modificationAmount: {
              currency: payment.amount.currency,
              value: payment.amount.value,
            },
          }),
        },
      );

      if (!captureRes.ok) {
        const text = await captureRes.text();
        console.error('Capture failed:', captureRes.status, text);
        return new Response(
          JSON.stringify({ ok: false, error: 'Capture failed', state: payment.state }),
          { status: 502, headers: corsHeaders },
        );
      }

      // Forward order to Google Sheet after successful capture
      if (env.SHEETS_WEBHOOK && orderParam) {
        try {
          const order = JSON.parse(decodeURIComponent(orderParam));
          await fetch(env.SHEETS_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...order, paymentState: 'CAPTURED' }),
          });
        } catch {
          console.error('Failed to write to Google Sheets after capture');
        }
      }

      return new Response(JSON.stringify({ ok: true, state: 'CAPTURED' }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // ABORTED, EXPIRED, TERMINATED — ingen capture
    return new Response(JSON.stringify({ ok: true, state: payment.state }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('Payment status error:', err);
    return new Response(JSON.stringify({ ok: false, error: 'Internal error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};

export const onRequestOptions: PagesFunction = async ({ request }) => {
  const origin = request.headers.get('Origin') || '';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
