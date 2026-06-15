/// <reference types="@cloudflare/workers-types" />

interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return htmlResponse('error', error ?? 'no_code', '');
  }

  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return htmlResponse('error', 'server_misconfigured', '');
  }

  let token: string;
  try {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: new URL('/api/auth/callback', url.origin).toString(),
      }),
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

function htmlResponse(status: 'success' | 'error', errorMsg: string, token: string) {
  const content =
    status === 'success'
      ? JSON.stringify({ token, provider: 'github' })
      : JSON.stringify({ error: errorMsg });

  const html = `<!DOCTYPE html>
<html>
<head><title>Authorizing…</title></head>
<body>
<p id="msg" style="font-family:sans-serif;padding:2rem">Authorizing… this window should close automatically.</p>
<script>
  (function() {
    var content = ${JSON.stringify(content)};
    var status = ${JSON.stringify(status)};
    var provider = 'github';
    var opener = window.opener;

    if (!opener) {
      document.getElementById('msg').textContent = 'Error: popup has no opener. Try logging in again.';
      return;
    }

    if (status !== 'success') {
      var errMsg = 'authorization:' + provider + ':error:' + content;
      opener.postMessage(errMsg, '*');
      document.getElementById('msg').textContent = 'Auth error: ' + content;
      return;
    }

    // Decap CMS handshake: send "authorizing:github", wait for ack, then send token
    var successMsg = 'authorization:' + provider + ':success:' + content;

    function receiveAck(e) {
      if (e.data === 'authorizing:' + provider) {
        window.removeEventListener('message', receiveAck, false);
        opener.postMessage(successMsg, e.origin || '*');
        setTimeout(function() { window.close(); }, 500);
      }
    }

    window.addEventListener('message', receiveAck, false);
    opener.postMessage('authorizing:' + provider, '*');

    // Fallback: if no ack within 3s, try sending directly
    setTimeout(function() {
      window.removeEventListener('message', receiveAck, false);
      opener.postMessage(successMsg, '*');
      document.getElementById('msg').textContent = 'Authorized! You can close this window.';
      setTimeout(function() { window.close(); }, 1000);
    }, 3000);
  })();
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
