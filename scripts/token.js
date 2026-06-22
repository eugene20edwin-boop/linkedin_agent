import { createServer } from 'node:http';
import { URL } from 'node:url';
import { loadEnvFile, env, requiredEnv } from '../src/env.js';

loadEnvFile();

const clientId = requiredEnv('LINKEDIN_CLIENT_ID');
const clientSecret = requiredEnv('LINKEDIN_CLIENT_SECRET');
const redirectUri = env('LINKEDIN_REDIRECT_URI', 'http://localhost:8745/callback');
const scopes = env('LINKEDIN_SCOPES', 'openid profile w_member_social w_organization_social');
const providedCode = env('LINKEDIN_AUTH_CODE');

async function exchangeCode(code) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Token exchange failed (${response.status}): ${body}`);
  }

  return JSON.parse(body);
}

function authorizationUrl() {
  const state = Math.random().toString(36).slice(2);
  const url = new URL('https://www.linkedin.com/oauth/v2/authorization');

  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', state);

  return { url, state };
}

if (providedCode) {
  const token = await exchangeCode(providedCode);
  console.log(JSON.stringify(token, null, 2));
} else {
  const { url, state } = authorizationUrl();
  const redirect = new URL(redirectUri);

  console.log('Open this URL and approve access:');
  console.log(url.toString());

  if (redirect.hostname !== 'localhost' && redirect.hostname !== '127.0.0.1') {
    console.log('\nAfter approval, run again with LINKEDIN_AUTH_CODE set to the returned code.');
    process.exit(0);
  }

  const server = createServer(async (request, response) => {
    try {
      const callbackUrl = new URL(request.url, redirectUri);
      const code = callbackUrl.searchParams.get('code');
      const returnedState = callbackUrl.searchParams.get('state');
      const error = callbackUrl.searchParams.get('error');

      if (error) {
        throw new Error(`${error}: ${callbackUrl.searchParams.get('error_description') || ''}`);
      }

      if (!code || returnedState !== state) {
        throw new Error('Invalid OAuth callback.');
      }

      const token = await exchangeCode(code);

      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.end('LinkedIn token created. You can close this tab and return to the terminal.\n');

      console.log('\nToken response:');
      console.log(JSON.stringify(token, null, 2));
      server.close();
    } catch (error) {
      response.writeHead(400, { 'Content-Type': 'text/plain' });
      response.end(`${error.message}\n`);
      console.error(error);
      server.close();
      process.exitCode = 1;
    }
  });

  server.listen(Number(redirect.port || 80), redirect.hostname, () => {
    console.log(`\nWaiting for OAuth callback on ${redirect.origin}${redirect.pathname}`);
  });
}
