// netlify/functions/claude.js
// Server-side rate limiting + API proxy
// Counts calls per IP per day — resets at midnight UTC

// In-memory store (resets on cold start, good enough for rate limiting)
var ipCallCounts = {};

var FREE_LIMIT     = 20;   // free turns per day per IP
var FULL_VERSION_CODES = [  // must match client-side list
  'SURVIVOR2024',
  'ALEXRILEYCUSTOM',
  'EMPDAY1UNLOCK',
  'DARKCOMMUTEPRO',
  'FULLVERSIONGO',
  'NORECKONING',
  'BADCOMMUTE'
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // "2024-01-15"
}

function getIPCount(ip) {
  var today = getTodayKey();
  var key   = ip + '_' + today;
  // Clean up old entries (different date)
  Object.keys(ipCallCounts).forEach(function(k) {
    if (k.indexOf('_' + today) === -1) delete ipCallCounts[k];
  });
  return ipCallCounts[key] || 0;
}

function incrementIP(ip) {
  var today = getTodayKey();
  var key   = ip + '_' + today;
  ipCallCounts[key] = (ipCallCounts[key] || 0) + 1;
}

exports.handler = async function(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { message: 'API key not configured.' } })
    };
  }

  try {
    const body = JSON.parse(event.body);

    // ── Rate limit check ──
    const clientIP = event.headers['x-forwarded-for'] ||
                     event.headers['client-ip'] ||
                     'unknown';
    const ip = clientIP.split(',')[0].trim(); // handle proxy chains

    // Check for full version code in request
    const unlockCode = (body.unlockCode || '').toUpperCase().trim();
    const isFullVersion = FULL_VERSION_CODES.includes(unlockCode);

    if (!isFullVersion) {
      const count = getIPCount(ip);
      if (count >= FREE_LIMIT) {
        return {
          statusCode: 429,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              message: 'Daily turn limit reached. Come back tomorrow or unlock the full version.',
              code: 'RATE_LIMIT'
            }
          })
        };
      }
    }

    // ── Forward to Anthropic ──
    // Remove our custom unlockCode field before forwarding
    const { unlockCode: _removed, ...anthropicBody } = body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(anthropicBody)
    });

    const data = await response.json();

    // Only increment counter on successful response
    if (response.ok && !isFullVersion) {
      incrementIP(ip);
    }

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { message: err.message } })
    };
  }
};
