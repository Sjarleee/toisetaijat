/// <reference types="@cloudflare/workers-types" />

export const onRequestGet: PagesFunction = () => {
  return new Response(
    JSON.stringify({
      ok: true,
      message: 'Backend kjører!',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const onRequestPost: PagesFunction = async ({ request }) => {
  const body = await request.json().catch(() => null);
  return new Response(
    JSON.stringify({
      ok: true,
      mottatt: body,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
