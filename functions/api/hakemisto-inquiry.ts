/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages Function: POST /api/hakemisto-inquiry
 *
 * Receives hakemisto inquiry form data and forwards to Google Apps Script webhook.
 *
 * Required environment variable:
 *   HAKEMISTO_WEBHOOK  =  https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
 */

interface Env {
  HAKEMISTO_WEBHOOK?: string;
}

const ALLOWED_ORIGINS = [
  'https://www.toisetaijat.fi',
  'https://toisetaijat.fi',
  'https://toisetaijat.pages.dev',
  'http://localhost:4323',
];

function corsHeaders(origin: string) {
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Content-Type': 'application/json',
  };
}

export const onRequestOptions: PagesFunction = async ({ request }) => {
  const origin = request.headers.get('Origin') ?? '';
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get('Origin') ?? '';
  const headers = corsHeaders(origin);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers });
  }

  const payload = body as Record<string, unknown>;

  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  const collection = typeof payload.collection === 'string' ? payload.collection : '';
  const matched = typeof payload.matched === 'string' ? payload.matched : '';
  const sources = typeof payload.sources === 'string' ? payload.sources : '';

  if (!name || !email) {
    return new Response(JSON.stringify({ ok: false, error: 'Nimi ja sähköposti ovat pakollisia' }), { status: 400, headers });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: 'Virheellinen sähköpostiosoite' }), { status: 400, headers });
  }

  const webhookUrl = env.HAKEMISTO_WEBHOOK;
  if (!webhookUrl) {
    return new Response(JSON.stringify({ ok: false, error: 'Webhook not configured' }), { status: 500, headers });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message, collection, matched, sources }),
    });
    if (!res.ok) throw new Error(`Webhook ${res.status}`);
    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Tiedustelun lähettäminen epäonnistui' }), { status: 502, headers });
  }
};
