/// <reference types="@cloudflare/workers-types" />

interface Env {
  GITHUB_CLIENT_ID: string;
}

export const onRequestGet: PagesFunction<Env> = ({ request, env }) => {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');

  if (provider !== 'github') {
    return new Response('Unsupported provider', { status: 400 });
  }

  const clientId = env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return new Response('GITHUB_CLIENT_ID not configured', { status: 500 });
  }

  const callbackUrl = new URL('/api/auth/callback', url.origin).toString();

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', clientId);
  githubAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  githubAuthUrl.searchParams.set('scope', 'repo');
  githubAuthUrl.searchParams.set('state', crypto.randomUUID());

  return Response.redirect(githubAuthUrl.toString(), 302);
};
