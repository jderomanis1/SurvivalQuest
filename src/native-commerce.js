const bridge = window.DarkCommuteNative;

function hasNativeBridge() {
  try {
    return Boolean(bridge && bridge.isNative && bridge.isNative());
  } catch {
    return false;
  }
}

if (hasNativeBridge()) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const rawUrl = typeof input === 'string' ? input : input?.url;
    if (rawUrl && rawUrl.startsWith('/.netlify/functions/')) {
      const absolute = `https://darkcommute.app${rawUrl}`;
      if (typeof input === 'string') return originalFetch(absolute, init);
      return originalFetch(new Request(absolute, input), init);
    }
    return originalFetch(input, init);
  };

  let billing = {
    premium: safeCall(() => bridge.isPremium(), false),
    price: safeCall(() => bridge.getPremiumPrice(), 'CHECK PLAY STORE'),
    status: 'PROLOGUE MODE'
  };

  function safeCall(callback, fallback) {
    try { return callback(); } catch { return fallback; }
  }

  function buildCommerceUi() {
    if (document.getElementById('nativePremiumModal')) return;
    const style = document.createElement('style');
    style.textContent = `
      .native-edition-pill{display:inline-flex;align-items:center;min-height:28px;border:1px solid rgba(255,176,0,.35);border-radius:999px;padding:4px 10px;color:#ffb000;font:0.6rem 'Share Tech Mono',monospace;letter-spacing:.1em}
      .native-premium-modal{position:fixed;inset:0;z-index:500;display:none;place-items:center;padding:18px;background:rgba(0,0,0,.82);backdrop-filter:blur(10px)}
      .native-premium-modal.is-open{display:grid}
      .native-premium-card{width:min(100%,520px);border:1px solid rgba(255,176,0,.58);border-radius:16px;padding:26px;background:linear-gradient(180deg,#12100a,#050607);box-shadow:0 30px 100px rgba(0,0,0,.8),inset 0 0 60px rgba(255,176,0,.04)}
      .native-premium-card .eyebrow{margin:0 0 10px;color:#ffb000;font-size:.7rem;letter-spacing:.18em}
      .native-premium-card h2{margin:0;color:#79ffb8;font:400 clamp(2.6rem,11vw,4.4rem)/.9 'VT323',monospace;letter-spacing:.05em}
      .native-premium-card p{color:#a5aea9;line-height:1.7}
      .native-premium-benefits{display:grid;gap:8px;margin:18px 0;padding:0;list-style:none}
      .native-premium-benefits li{border-left:2px solid #00ff91;padding:8px 12px;color:#dfe6e2;background:rgba(0,255,145,.035)}
      .native-premium-price{display:block;margin:18px 0;color:#ffb000;font:2rem 'VT323',monospace;letter-spacing:.08em}
      .native-premium-actions{display:grid;gap:10px}
      .native-premium-actions button{min-height:52px;border:1px solid rgba(0,255,145,.48);border-radius:8px;background:rgba(0,255,145,.08);color:#79ffb8;font:0.78rem 'Share Tech Mono',monospace;letter-spacing:.1em}
      .native-premium-actions button:first-child{border-color:#ffb000;color:#191000;background:#ffb000}
      .native-billing-status{display:block;min-height:1.3em;margin-top:12px;color:#8d9993;font-size:.62rem;letter-spacing:.06em}
    `;
    document.head.appendChild(style);

    const modal = document.createElement('section');
    modal.id = 'nativePremiumModal';
    modal.className = 'native-premium-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'nativePremiumTitle');
    modal.innerHTML = `
      <div class="native-premium-card">
        <p class="eyebrow">GOOGLE PLAY · ONE-TIME PURCHASE</p>
        <h2 id="nativePremiumTitle">THE PROLOGUE ENDS HERE</h2>
        <p>You reached street level. Unlock the complete commute before choosing the direct, resource, or social route.</p>
        <ul class="native-premium-benefits">
          <li>All three routes and endings</li>
          <li>The full Signal mystery and Static Breach</li>
          <li>Unlimited runs with no turn timer</li>
          <li>Purchase restoration on supported devices</li>
        </ul>
        <strong class="native-premium-price" id="nativePremiumPrice"></strong>
        <div class="native-premium-actions">
          <button id="nativeBuyPremium">UNLOCK FULL GAME</button>
          <button id="nativeRestorePremium">RESTORE PURCHASE</button>
          <button id="nativeClosePremium">RETURN TO STREET</button>
        </div>
        <span class="native-billing-status" id="nativeBillingStatus"></span>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('nativeBuyPremium').addEventListener('click', () => safeCall(() => bridge.purchasePremium()));
    document.getElementById('nativeRestorePremium').addEventListener('click', () => safeCall(() => bridge.restorePurchases()));
    document.getElementById('nativeClosePremium').addEventListener('click', closePremiumModal);
    modal.addEventListener('click', event => {
      if (event.target === modal) closePremiumModal();
    });
    updateCommerceUi();
  }

  function updateCommerceUi() {
    const price = document.getElementById('nativePremiumPrice');
    const status = document.getElementById('nativeBillingStatus');
    if (price) price.textContent = billing.premium ? 'FULL GAME OWNED' : billing.price;
    if (status) status.textContent = billing.status || '';

    let pill = document.getElementById('nativeEditionPill');
    const row = document.querySelector('.status-row');
    if (row && !pill) {
      pill = document.createElement('span');
      pill.id = 'nativeEditionPill';
      pill.className = 'native-edition-pill';
      row.appendChild(pill);
    }
    if (pill) pill.textContent = billing.premium ? 'FULL EDITION' : 'FREE PROLOGUE';
    if (billing.premium) closePremiumModal();
  }

  function openPremiumModal() {
    const modal = document.getElementById('nativePremiumModal');
    if (!modal) return;
    updateCommerceUi();
    modal.classList.add('is-open');
    safeCall(() => bridge.haptic('signal'));
  }

  function closePremiumModal() {
    document.getElementById('nativePremiumModal')?.classList.remove('is-open');
  }

  const routeActions = new Set(['direct_route', 'resource_route', 'social_route']);
  document.addEventListener('click', event => {
    safeCall(() => bridge.haptic('tap'));
    const actionCard = event.target.closest?.('.action-card[data-action]');
    if (!actionCard || billing.premium || !routeActions.has(actionCard.dataset.action)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openPremiumModal();
  }, true);

  window.addEventListener('darkcommute:billing', event => {
    billing = { ...billing, ...(event.detail || {}) };
    updateCommerceUi();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildCommerceUi, { once: true });
  } else {
    buildCommerceUi();
  }
}
