const products = [
  { id: '1', name: 'Linen Everyday Shirt', category: 'Apparel', price: 1499, code: '01', tags: ['new', 'shirt'] },
  { id: '2', name: 'Stoneware Coffee Set', category: 'Home', price: 1899, code: '02', tags: ['home', 'coffee'] },
  { id: '3', name: 'Soft Weave Tote', category: 'Accessories', price: 1299, code: '03', tags: ['bag', 'tote'] },
  { id: '4', name: 'Oak Desk Lamp', category: 'Home', price: 2399, code: '04', tags: ['lamp', 'desk'] },
  { id: '5', name: 'Relaxed Cotton Trousers', category: 'Apparel', price: 2099, code: '05', tags: ['pants', 'cotton'] },
  { id: '6', name: 'Daily Ceramic Mug', category: 'Home', price: 699, code: '06', tags: ['mug', 'coffee'] },
  { id: '7', name: 'Minimal Card Holder', category: 'Accessories', price: 899, code: '07', tags: ['wallet', 'leather'] },
  { id: '8', name: 'Heritage Overshirt', category: 'Apparel', price: 2499, code: '08', tags: ['shirt', 'jacket'] }
];

function getPageType() {
  return document.body.dataset.pageType || 'unknown_page';
}

function getStoredLogin() {
  return localStorage.getItem('luma_logged_in') === 'true';
}

function getStableUserIdForDemoUser(username) {
  const key = 'luma_demo_users';
  const map = JSON.parse(localStorage.getItem(key) || '{}');
  const normalized = username.trim().toLowerCase() || 'demo_user';
  if (!map[normalized]) {
    map[normalized] = `UID_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
    localStorage.setItem(key, JSON.stringify(map));
  }
  return map[normalized];
}

function updateIdentityAfterLogin(username) {
  const userId = getStableUserIdForDemoUser(username);
  localStorage.setItem('luma_logged_in', 'true');
  localStorage.setItem('luma_username', username.trim() || 'Demo User');
  localStorage.setItem('luma_user_id', userId);
  window.dataLayer.push({
    event: 'login_success',
    user_id: userId,
    user_type: 'loggedin',
    page_type: getPageType(),
    pageName: getPageType(),
    login_method: 'demo_form'
  });
  return userId;
}

function logoutUser() {
  localStorage.removeItem('luma_logged_in');
  localStorage.removeItem('luma_username');
  localStorage.removeItem('luma_user_id');
  window.dataLayer.push({
    event: 'logout',
    user_id: null,
    user_type: 'guest',
    page_type: getPageType(),
    pageName: getPageType()
  });
  window.location.href = 'index.html';
}

function pushEvent(payload) {
  window.dataLayer.push(payload);
  showToast(`dataLayer event: ${payload.event}`);
}

function sanitizeSearchTerm(value) {
  return value
    .trim()
    .replace(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    .replace(/\b\d{10,15}\b/g, '[redacted-number]')
    .slice(0, 80);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[char]));
}

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 2200);
}

function renderProductCards(list, targetId = 'productGrid') {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = list.map((product) => `
    <article class="card product-card">
      <a href="product.html?id=${encodeURIComponent(product.id)}">
        <div class="product-art">${escapeHtml(product.code)}</div>
        <div class="product-info">
          <div class="tag">${escapeHtml(product.category)}</div>
          <h3>${escapeHtml(product.name)}</h3>
          <div class="price">${money(product.price)}</div>
        </div>
      </a>
    </article>
  `).join('');
}

function wireMenuClicks() {
  document.querySelectorAll('[data-menu-click]').forEach((element) => {
    element.addEventListener('click', () => {
      pushEvent({
        event: 'menuClick',
        pageName: element.dataset.pageName || getPageType(),
        mainMenuCategory: element.dataset.mainMenuCategory || '',
        mainMenuSubCategory: element.dataset.mainMenuSubCategory || '',
        mainMenuTab: element.dataset.mainMenuTab || ''
      });
    });
  });
}

function wireHeaderClicks() {
  document.querySelectorAll('[data-header-link]').forEach((element) => {
    element.addEventListener('click', () => {
      pushEvent({
        event: 'headerClick',
        headerLink: element.dataset.headerLink || '',
        headerLinkPosition: element.dataset.headerPosition || '',
        pageName: element.dataset.pageName || getPageType()
      });
    });
  });
}

function wireFooterClicks() {
  document.querySelectorAll('[data-footer-link]').forEach((element) => {
    element.addEventListener('click', () => {
      pushEvent({
        event: 'footerClick',
        footerLink: element.dataset.footerLink || element.textContent.trim(),
        footerLinkPosition: element.dataset.footerPosition || '',
        footerSection: element.dataset.footerSection || '',
        pageName: element.dataset.pageName || getPageType()
      });
    });
  });
}

function getSearchResults(term) {
  const query = term.toLowerCase();
  return products.filter((product) =>
    [product.name, product.category, ...product.tags].some((value) => value.toLowerCase().includes(query))
  );
}

function wireSearch() {
  const form = document.querySelector('#siteSearchForm');
  const input = document.querySelector('#siteSearchInput');
  const suggestions = document.querySelector('#searchSuggestions');
  if (!form || !input || !suggestions) return;

  function renderSuggestions() {
    const value = input.value.trim();
    if (!value) {
      suggestions.style.display = 'none';
      suggestions.innerHTML = '';
      return;
    }
    const matches = getSearchResults(value).slice(0, 5);
    if (!matches.length) {
      suggestions.innerHTML = '<div class="suggestion-btn muted">No suggestions</div>';
      suggestions.style.display = 'block';
      return;
    }
    suggestions.innerHTML = matches.map((product, index) => `
      <button type="button" class="suggestion-btn" data-suggestion="${escapeHtml(product.name)}" data-position="${index + 1}">
        ${escapeHtml(product.name)} <span class="muted">· ${escapeHtml(product.category)}</span>
      </button>
    `).join('');
    suggestions.style.display = 'block';

    suggestions.querySelectorAll('[data-suggestion]').forEach((button) => {
      button.addEventListener('click', () => {
        const suggestedTerm = button.dataset.suggestion || '';
        pushEvent({
          event: 'searchSuggestionClick',
          suggestedTerm: sanitizeSearchTerm(suggestedTerm),
          searchSuggestionPosition: button.dataset.position || '',
          pageName: getPageType()
        });
        input.value = suggestedTerm;
        form.requestSubmit();
      });
    });
  }

  input.addEventListener('input', renderSuggestions);
  document.addEventListener('click', (event) => {
    if (!form.contains(event.target)) suggestions.style.display = 'none';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const term = sanitizeSearchTerm(input.value);
    if (!term) return;
    const count = getSearchResults(term).length;
    pushEvent({
      event: 'search',
      searchTerm: term,
      searchResult: count,
      searchType: 'text',
      pageName: getPageType()
    });
    window.location.href = `products.html?search=${encodeURIComponent(term)}`;
  });
}

function wireLogin() {
  const form = document.querySelector('#loginForm');
  if (!form) return;
  const notice = document.querySelector('#loginNotice');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = new FormData(form).get('username')?.toString().trim() || 'demo_user';
    updateIdentityAfterLogin(username);
    notice.textContent = `Logged in. Demo User-ID: ${localStorage.getItem('luma_user_id')}`;
    notice.className = 'alert success';
    notice.style.display = 'block';
    setTimeout(() => { window.location.href = 'account.html'; }, 700);
  });
}

function wireLogout() {
  const button = document.querySelector('[data-logout]');
  if (button) button.addEventListener('click', logoutUser);
}

function renderProductDetails() {
  const mount = document.querySelector('#productDetail');
  if (!mount) return;
  const id = new URLSearchParams(window.location.search).get('id') || '1';
  const product = products.find((item) => item.id === id) || products[0];
  document.title = `${product.name} | Luma Cart`;
  mount.innerHTML = `
    <div class="detail-grid">
      <div class="detail-art"><div class="product-art">${escapeHtml(product.code)}</div></div>
      <div class="detail-content">
        <div class="tag">${escapeHtml(product.category)}</div>
        <h1>${escapeHtml(product.name)}</h1>
        <div class="detail-price">${money(product.price)}</div>
        <p class="muted">A quiet, practical piece designed to fit naturally into everyday routines. This is sample ecommerce content created for analytics and tag-management testing.</p>
        <ul>
          <li>Demo product data for GA4 / GTM testing</li>
          <li>Responsive product detail layout</li>
          <li>Works with GitHub Pages</li>
        </ul>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:24px;">
          <button class="btn" type="button" id="addToCart">Add to cart</button>
          <a class="btn btn-secondary" href="products.html">Continue shopping</a>
        </div>
        <div class="alert" id="cartNotice">Added to demo cart.</div>
      </div>
    </div>
  `;
  document.querySelector('#addToCart')?.addEventListener('click', () => {
    pushEvent({
      event: 'add_to_cart_demo',
      item_id: product.id,
      item_name: product.name,
      value: product.price,
      currency: 'INR',
      pageName: getPageType()
    });
    const notice = document.querySelector('#cartNotice');
    notice.style.display = 'block';
    notice.className = 'alert success';
  });
}

function renderProductsPage() {
  const grid = document.querySelector('#productGrid');
  if (!grid) return;
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const search = params.get('search');
  let list = [...products];
  if (category) list = list.filter((product) => product.category.toLowerCase() === category.toLowerCase() || (category === 'New Arrivals' && Number(product.id) <= 4));
  if (search) list = getSearchResults(search);
  renderProductCards(list);
  const resultLabel = document.querySelector('#resultLabel');
  if (resultLabel) resultLabel.textContent = search ? `${list.length} result${list.length === 1 ? '' : 's'} for “${escapeHtml(search)}”` : `${list.length} products`;
}

function initAccountPage() {
  const logged = getStoredLogin();
  const panel = document.querySelector('#accountPanel');
  if (!panel) return;
  if (!logged) {
    panel.innerHTML = `
      <div class="card form-card" style="margin:0;max-width:none;">
        <h2>Please sign in</h2>
        <p class="muted">Use the demo login to generate and persist a non-PII User-ID for analytics testing.</p>
        <a class="btn" href="login.html">Go to login</a>
      </div>
    `;
    return;
  }
  const userId = localStorage.getItem('luma_user_id') || 'unknown';
  const username = localStorage.getItem('luma_username') || 'Demo User';
  panel.innerHTML = `
    <div class="account-grid">
      <div class="card stat-card">
        <div class="tag">SIGNED-IN USER</div>
        <h2 style="font-family:Georgia,serif;font-weight:500;">${escapeHtml(username)}</h2>
        <div class="stat-value">loggedin</div>
        <p class="muted">user_type</p>
      </div>
      <div class="card stat-card">
        <div class="tag">GA4 USER-ID DEMO</div>
        <div class="stat-value" style="font-size:24px;word-break:break-all;">${escapeHtml(userId)}</div>
        <p class="muted">This ID remains stable for this demo account in this browser until local storage is cleared.</p>
        <button class="btn btn-secondary" data-logout type="button">Log out</button>
      </div>
    </div>
  `;
  wireLogout();
}

document.addEventListener('DOMContentLoaded', () => {
  wireMenuClicks();
  wireHeaderClicks();
  wireFooterClicks();
  wireSearch();
  wireLogin();
  wireLogout();
  renderProductDetails();
  renderProductsPage();
  initAccountPage();
});
