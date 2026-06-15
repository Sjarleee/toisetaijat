import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return htmlResponse('error', error ?? 'no_code', '');
  }

  const clientId = import.meta.env.GITHUB_CLIENT_ID;
  const clientSecret = import.meta.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return htmlResponse('error', 'server_misconfigured', '');
  }

  // Exchange code for access token
  let token: string;
  try {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = await res.json() as { access_token?: string; error?: string };
    if (!data.access_token) {
      return htmlResponse('error', data.error ?? 'no_token', '');
    }
    token = data.access_token;
  } catch {
    return htmlResponse('error', 'fetch_failed', '');
  }

  return htmlResponse('success', '', token);
};

// Decap CMS expects the popup to postMessage with this format, then close itself
function htmlResponse(status: 'success' | 'error', errorMsg: string, token: string) {
  const content =
    status === 'success'
      ? `{"token":"${token}","provider":"github"}`
      : `{"error":"${errorMsg}"}`;

  const html = `<!DOCTYPE html>
<html>
<head><title>Authorizing…</title></head>
<body>
<script>
  (function() {
    var content = ${JSON.stringify(content)};
    var status = ${JSON.stringify(status)};
    var msg = 'authorization:github:' + status + ':' + content;
    var opener = window.opener;
    if (opener) {
      opener.postMessage(msg, '*');
    }
    window.close();
  })();
</script>
<p>Authorizing… this window should close automatically.</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
