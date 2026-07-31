import { createSign } from 'node:crypto';

const PACKAGE_NAME = 'app.darkcommute.game';
const PRODUCT_ID = 'dark_commute_full_game';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    },
    body: JSON.stringify(body)
  };
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createServiceAccountAssertion(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${unsigned}.${signature}`;
}

async function getAccessToken(serviceAccount) {
  const assertion = createServiceAccountAssertion(serviceAccount);
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  if (!response.ok) throw new Error('Google OAuth token exchange failed');
  const payload = await response.json();
  if (!payload.access_token) throw new Error('Google OAuth returned no access token');
  return payload.access_token;
}

async function acknowledgePurchase(accessToken, purchaseToken) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/products/${encodeURIComponent(PRODUCT_ID)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  });
  if (!response.ok && response.status !== 409) {
    throw new Error('Google Play acknowledgement failed');
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { verified: false, error: 'Method not allowed.' });
  if ((event.body || '').length > 4096) return json(413, { verified: false, error: 'Request too large.' });

  let request;
  try {
    request = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { verified: false, error: 'Invalid JSON.' });
  }

  const purchaseToken = String(request.purchaseToken || '').trim();
  if (!purchaseToken || purchaseToken.length > 2048) {
    return json(400, { verified: false, error: 'A valid purchase token is required.' });
  }

  const rawCredentials = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!rawCredentials) {
    return json(503, { verified: false, error: 'Play verification is not configured.' });
  }

  try {
    const serviceAccount = JSON.parse(rawCredentials);
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error('Invalid service-account configuration');
    }
    const accessToken = await getAccessToken(serviceAccount);
    const purchaseUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE_NAME)}/purchases/products/${encodeURIComponent(PRODUCT_ID)}/tokens/${encodeURIComponent(purchaseToken)}`;
    const response = await fetch(purchaseUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (response.status === 404) return json(200, { verified: false });
    if (!response.ok) throw new Error('Google Play purchase lookup failed');

    const purchase = await response.json();
    const verified = purchase.purchaseState === 0 && purchase.consumptionState === 0;
    if (!verified) {
      return json(200, {
        verified: false,
        purchaseState: purchase.purchaseState,
        acknowledgementState: purchase.acknowledgementState
      });
    }

    if (purchase.acknowledgementState === 0) {
      await acknowledgePurchase(accessToken, purchaseToken);
    }

    return json(200, {
      verified: true,
      productId: PRODUCT_ID,
      packageName: PACKAGE_NAME,
      orderId: purchase.orderId || null,
      purchaseTimeMillis: purchase.purchaseTimeMillis || null
    });
  } catch (error) {
    console.error('Play purchase verification failed:', error?.message || error);
    return json(502, { verified: false, error: 'Play verification temporarily failed.' });
  }
}
