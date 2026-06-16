/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages Function: POST /api/order
 *
 * Receives order JSON from the checkout form, saves it to Google Sheets
 * via a Google Apps Script Web App webhook.
 *
 * Required environment variable (set in Cloudflare Dashboard → Pages → Settings → Variables):
 *   SHEETS_WEBHOOK  =  https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * GOOGLE APPS SCRIPT SETUP:
 *
 * 1. Create a new Google Sheet for orders.
 * 2. Open Extensions → Apps Script.
 * 3. Paste the following code and save:
 *
 * -------- Full Apps Script code (Extensions → Apps Script in the Sheet) --------
 * See the full script maintained separately — key logToSheet columns:
 *   Aikaleima, Tilausnumero, Nimi, Sähköposti, Puhelin,
 *   Osoite, Postinumero, Kaupunki, Maa, Tuotteet,
 *   Välisumma, ALV, Toimitus, Yhteensä, Maksutapa, Tila, Muistiinpanot
 * -------- end of Apps Script reference --------
 *
 * 4. Click Deploy → New deployment → Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Authorize and copy the Web App URL.
 * 6. Add it as SHEETS_WEBHOOK in Cloudflare Dashboard.
 * 7. For email notifications: in Google Sheets, go to Tools → Notification rules
 *    → "When a row is added" → send email immediately to jarle@toisetaijat.fi
 * ──────────────────────────────────────────────────────────────────────────────
 */

interface Env {
  SHEETS_WEBHOOK?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // CORS headers for same-origin only
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = ['https://www.toisetaijat.fi', 'https://toisetaijat.fi', 'https://toisetaijat.pages.dev', 'http://localhost:4323'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Content-Type': 'application/json',
  };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Basic validation
  const order = body as Record<string, unknown>;
  if (!order.orderId || !order.email || !order.name || !Array.isArray(order.items) || order.items.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Forward to Google Sheets webhook if configured
  if (env.SHEETS_WEBHOOK) {
    try {
      await fetch(env.SHEETS_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
    } catch {
      // Log but don't fail the order if Sheets is down
      console.error('Failed to write to Google Sheets');
    }
  }

  return new Response(JSON.stringify({ ok: true, orderId: order.orderId }), {
    status: 200,
    headers: corsHeaders,
  });
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
