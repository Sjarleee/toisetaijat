/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages Function: POST /api/payment/create
 *
 * Oppretter en MobilePay-betaling og returnerer redirectUrl til frontend.
 *
 * Forventede Secrets (Cloudflare Dashboard → Workers → Settings → Secrets):
 *   MOBILEPAY_CLIENT_ID
 *   MOBILEPAY_CLIENT_SECRET
 *   MOBILEPAY_SUBSCRIPTION_KEY
 *   MOBILEPAY_MSN
 *
 * Body (JSON):
 *   orderId      string   — unik ordre-ID
 *   amountCents  number   — beløp i euro-cent (f.eks. 1990 = 19,90 €)
 *   phone?       string   — kundens telefonnummer (forhåndsutfyller i app)
 *   description? string   — betalingstekst som vises i appen
 *
 * Svar:
 *   { ok: true, redirectUrl: string, reference: string }
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
}

interface CreatePaymentBody {
  orderId: string;
  amountCents: number;
  phone?: string;
  description?: string;
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

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get('Origin') || '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Content-Type': 'application/json',
  };

  let body: CreatePaymentBody;
  try {
    body = await request.json() as CreatePaymentBody;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!body.orderId || !body.amountCents || body.amountCents <= 0) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing orderId or amountCents' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    if (!env.MOBILEPAY_CLIENT_ID || !env.MOBILEPAY_CLIENT_SECRET || !env.MOBILEPAY_SUBSCRIPTION_KEY || !env.MOBILEPAY_MSN) {
      console.error('Missing MobilePay secrets');
      return new Response(JSON.stringify({ ok: false, error: 'Server misconfiguration: missing secrets' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const token = await getAccessToken(env);

    // Avled base URL fra requesten slik at returnUrl fungerer i både test og produksjon
    const baseUrl = new URL(request.url).origin;
    const returnUrl = `${baseUrl}/tilaus-vahvistettu?ref=${encodeURIComponent(body.orderId)}`;

    const paymentBody: Record<string, unknown> = {
      amount: { currency: 'EUR', value: body.amountCents },
      paymentMethod: { type: 'WALLET' },
      reference: body.orderId,
      returnUrl,
      userFlow: 'WEB_REDIRECT',
      paymentDescription: body.description ?? 'Kirjatilaus – Toiset Aijat',
    };

    if (body.phone) {
      // Fjern alt som ikke er siffer
      paymentBody.customer = { phoneNumber: body.phone.replace(/\D/g, '') };
    }

    const res = await fetch(`${MP_BASE}/epayment/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Ocp-Apim-Subscription-Key': env.MOBILEPAY_SUBSCRIPTION_KEY,
        'Merchant-Serial-Number': env.MOBILEPAY_MSN,
        'Idempotency-Key': body.orderId,
        'Vipps-System-Name': 'toisetaijat',
        'Vipps-System-Version': '1.0.0',
      },
      body: JSON.stringify(paymentBody),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('MobilePay create payment error:', res.status, text);
      return new Response(JSON.stringify({ ok: false, error: 'Payment creation failed' }), {
        status: 502,
        headers: corsHeaders,
      });
    }

    const data = await res.json() as { redirectUrl: string; reference: string };
    return new Response(JSON.stringify({ ok: true, redirectUrl: data.redirectUrl, reference: data.reference }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('Payment create error:', err);
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
