// ═══════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════
const SUPABASE_URL = 'https://njixgaybvkzemikghmob.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qaXhnYXlidmt6ZW1pa2dobW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyOTk5MjksImV4cCI6MjA4ODg3NTkyOX0.NeXqQwnyCOJ-atNsajAO3Ps_aMZ8Aa0SW04zWH6-XKw';
// ═══════════════════════════════════════════════════

const HEADERS = {
  'apikey': SUPABASE_ANON,
  'Authorization': `Bearer ${SUPABASE_ANON}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

let allDomains = [];
let currentRow = null;
let hasUnsaved = false;

// ── Boot ──────────────────────────────────────────
async function init() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/websites?select=id,domain&order=domain.asc`, { headers: HEADERS });
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error('Bad response');

    allDomains = rows;
    renderSidebar(rows);
    document.getElementById('conn-status').textContent = `${rows.length} domains`;
  } catch (e) {
    document.getElementById('conn-status').textContent = 'Connection failed';
    showToast('Cannot connect to Supabase. Check your URL and key.', 'error');
  }
}

// ── Sidebar ───────────────────────────────────────
function renderSidebar(rows) {
  const list = document.getElementById('domain-list');
  const select = document.getElementById('domain-select');

  list.innerHTML = '';
  select.innerHTML = '<option value="">— choose a domain —</option>';

  rows.forEach(r => {
    // list item
    const el = document.createElement('div');
    el.className = 'domain-item';
    el.dataset.id = r.id;
    el.innerHTML = `<span>${r.domain}</span><span class="dot"></span>`;
    el.onclick = () => onDomainSelect(r.id);
    list.appendChild(el);

    // select option
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.domain;
    select.appendChild(opt);
  });
}

// ── Select domain ─────────────────────────────────
async function onDomainSelect(id) {
  if (!id) return;
  if (hasUnsaved && !confirm('You have unsaved changes. Discard them?')) return;

  // highlight sidebar
  document.querySelectorAll('.domain-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id == id);
  });
  document.getElementById('domain-select').value = id;

  showToast('Loading...', 'loading');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/websites?id=eq.${id}&select=*`, { headers: HEADERS });
    const rows = await res.json();
    currentRow = rows[0];
    renderEditor(currentRow);
    hideToast();
  } catch (e) {
    showToast('Failed to load domain data', 'error');
  }
}

// ── Render editor ─────────────────────────────────
function renderEditor(s) {
  hasUnsaved = false;
  const editor = document.getElementById('editor');
  editor.innerHTML = `
    <div class="editor-header">
      <div>
        <div class="editor-title">
          ${s.domain}
          <span class="unsaved-badge" id="unsaved-badge">● unsaved</span>
        </div>
        <div style="color:var(--muted);font-size:0.8rem;margin-top:0.3rem;font-family:var(--font-mono)">id: ${s.id}</div>
      </div>
      <div class="editor-actions">
        <button class="btn btn-ghost" onclick="reloadCurrent()">↺ Reload</button>
        <button class="btn btn-delete" onclick="deleteDomain(${s.id}, '${s.domain}')">✕ Delete</button>
        <button class="btn btn-publish" id="publish-btn" onclick="publish()">▲ Publish</button>
      </div>
    </div>

    <div class="sections">

      <!-- HERO -->
      <div class="section" id="sec-hero">
        <div class="section-head" onclick="toggleSection('sec-hero')">
          <div class="section-icon icon-blue">🌐</div>
          <div class="section-title-text">Hero & Pricing</div>
          <span class="section-chevron">▾</span>
        </div>
        <div class="section-body">
          <div class="field full">
            <label>Domain Name <span class="col-name">domain</span> (Unchangeable)</label>
            <input type="text" id="f-domain" value="${esc(s.domain)}" readonly>
          </div>
          <div class="field full">
            <label>Overview / Hero Subtitle <span class="col-name">overview</span></label>
            <textarea id="f-overview" class="short" oninput="markUnsaved()">${esc(s.overview)}</textarea>
          </div>
          <div class="field">
            <label>Price <span class="col-name">price</span></label>
            <input type="text" id="f-price" value="${esc(s.price)}" placeholder="e.g. $3,100" oninput="markUnsaved()">
          </div>
          <div class="field">
            <label>Powered By Badge <span class="col-name">powered_by_promotionocean</span></label>
            <div class="toggle-wrap">
              <button class="toggle ${s.powered_by_promotionocean ? 'on' : ''}" id="f-powered" onclick="togglePowered()"></button>
              <span class="toggle-label" id="powered-label">${s.powered_by_promotionocean ? 'Visible' : 'Hidden'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- METRICS -->
      <div class="section" id="sec-metrics">
        <div class="section-head" onclick="toggleSection('sec-metrics')">
          <div class="section-icon icon-green">📊</div>
          <div class="section-title-text">Domain Metrics</div>
          <span class="section-chevron">▾</span>
        </div>
        <div class="section-body">
          <div class="field">
            <label>Backlink Counter <span class="col-name">backlink_counter</span></label>
            <input type="number" id="f-backlinks" value="${s.backlink_counter ?? 0}" oninput="markUnsaved()">
          </div>
          <div class="field">
            <label>Domain Age <span class="col-name">domain_age</span></label>
            <input type="text" id="f-age" value="${esc(s.domain_age)}" placeholder="e.g. 4 years" oninput="markUnsaved()">
          </div>
          <div class="field">
            <label>Monthly Visits <span class="col-name">monthly_visits</span></label>
            <input type="text" id="f-visits" value="${esc(s.monthly_visits)}" placeholder="e.g. 1200" oninput="markUnsaved()">
          </div>
          <div class="field">
            <label>SEO Rating <span class="col-name">seo_rating</span></label>
            <input type="text" id="f-seo" value="${esc(s.seo_rating)}" placeholder="e.g. 9/10" oninput="markUnsaved()">
          </div>
        </div>
      </div>

      <!-- ABOUT -->
      <div class="section" id="sec-about">
        <div class="section-head" onclick="toggleSection('sec-about')">
          <div class="section-icon icon-teal">ℹ️</div>
          <div class="section-title-text">About Section</div>
          <span class="section-chevron">▾</span>
        </div>
        <div class="section-body">
          <div class="field full">
            <label>About Body <span class="col-name">about</span></label>
            <textarea id="f-about" class="tall" oninput="markUnsaved()">${esc(s.about)}</textarea>
          </div>
          <div class="field full">
            <label>Perfect For <span class="col-name">perfect_for</span> — one item per line</label>
            <textarea id="f-perfect" oninput="markUnsaved()">${esc(s.perfect_for)}</textarea>
          </div>
          <div class="field full">
            <label>Market Opportunity <span class="col-name">market_opportunity</span> — one item per line</label>
            <textarea id="f-market" oninput="markUnsaved()">${esc(s.market_opportunity)}</textarea>
          </div>
        </div>
      </div>

      <!-- MAIN BLOG -->
      <div class="section" id="sec-blog1">
        <div class="section-head" onclick="toggleSection('sec-blog1')">
          <div class="section-icon icon-pink">✍️</div>
          <div class="section-title-text">Main Blog</div>
          <span class="section-chevron">▾</span>
        </div>
        <div class="section-body">
          <div class="field full">
            <label>Mini Blog Title <span class="col-name">mini_blog_title</span></label>
            <input type="text" id="f-mini-title" value="${esc(s.mini_blog_title)}" oninput="markUnsaved()">
          </div>
          <div class="field full">
            <label>Mini Blog Content <span class="col-name">mini_blog</span> — separate paragraphs with a blank line</label>
            <textarea id="f-mini-blog" class="tall" oninput="markUnsaved()">${esc(s.mini_blog)}</textarea>
          </div>
          <div class="field full">
            <label>Special Feature 1 <span class="col-name">special_feature_1</span> — first sentence = card title</label>
            <textarea id="f-sf1" class="short" oninput="markUnsaved()">${esc(s.special_feature_1)}</textarea>
          </div>
          <div class="field full">
            <label>Special Feature 2 <span class="col-name">special_feature_2</span> — first sentence = card title</label>
            <textarea id="f-sf2" class="short" oninput="markUnsaved()">${esc(s.special_feature_2)}</textarea>
          </div>
        </div>
      </div>

      <!-- COLLAPSIBLE BLOGS -->
      <div class="section" id="sec-blogs">
        <div class="section-head" onclick="toggleSection('sec-blogs')">
          <div class="section-icon icon-gold">📝</div>
          <div class="section-title-text">Collapsible Blogs</div>
          <span class="section-chevron">▾</span>
        </div>
        <div class="section-body">
          <div class="field full">
            <label>Secondary Blog Title <span class="col-name">secondary_blog_title</span></label>
            <input type="text" id="f-sec-title" value="${esc(s.secondary_blog_title)}" oninput="markUnsaved()">
          </div>
          <div class="field full">
            <label>Secondary Blog Content <span class="col-name">secondary_blog</span></label>
            <textarea id="f-sec-blog" class="tall" oninput="markUnsaved()">${esc(s.secondary_blog)}</textarea>
          </div>
          <div class="field full" style="border-top:1px solid var(--border);padding-top:1rem;margin-top:0.25rem">
            <label>Continuous Blog 1 Title <span class="col-name">contnious_blog_title1</span></label>
            <input type="text" id="f-cont1-title" value="${esc(s.contnious_blog_title1)}" oninput="markUnsaved()">
          </div>
          <div class="field full">
            <label>Continuous Blog 1 Content <span class="col-name">contnious_blog_content1</span></label>
            <textarea id="f-cont1" class="tall" oninput="markUnsaved()">${esc(s.contnious_blog_content1)}</textarea>
          </div>
          <div class="field full" style="border-top:1px solid var(--border);padding-top:1rem;margin-top:0.25rem">
            <label>Continuous Blog 2 Title <span class="col-name">contnious_blog_title2</span></label>
            <input type="text" id="f-cont2-title" value="${esc(s.contnious_blog_title2)}" oninput="markUnsaved()">
          </div>
          <div class="field full">
            <label>Continuous Blog 2 Content <span class="col-name">contnious_blog_content2</span></label>
            <textarea id="f-cont2" class="tall" oninput="markUnsaved()">${esc(s.contnious_blog_content2)}</textarea>
          </div>
        </div>
      </div>

      <!-- SCREENSHOTS -->
      <div class="section" id="sec-images">
        <div class="section-head" onclick="toggleSection('sec-images')">
          <div class="section-icon icon-blue">🖼️</div>
          <div class="section-title-text">Screenshot URLs</div>
          <span class="section-chevron">▾</span>
        </div>
        <div class="section-body">
          <div class="field full">
            <label>Screenshot URLs <span class="col-name">screenshot_urls</span> — one URL per line</label>
            <textarea id="f-screenshots" class="tall" placeholder="https://example.com/image1.png&#10;https://example.com/image2.png" oninput="markUnsaved()">${urlsToText(s.screenshot_urls)}</textarea>
          </div>
        </div>
      </div>

    </div>
  `;
}

// ── Publish ───────────────────────────────────────
async function publish() {
  if (!currentRow) return;
  const btn = document.getElementById('publish-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Publishing...';
  showToast('Publishing...', 'loading');

  const screenshots = textToUrls(val('f-screenshots'));

    const backval = val('f-backlinks');
    const backlinkCounter = backval === '' ? null : (parseInt(backval) || 0);

    const payload = {
        overview: val('f-overview') || null,
        price: val('f-price') || null,
        backlink_counter: backlinkCounter,
        domain_age: val('f-age') || null,
        monthly_visits: val('f-visits') || null,
        seo_rating: val('f-seo') || null,
    about: val('f-about') || null,
    perfect_for: val('f-perfect') || null,
    market_opportunity: val('f-market') || null,
    mini_blog_title: val('f-mini-title') || null,
    mini_blog: val('f-mini-blog') || null,
    special_feature_1: val('f-sf1') || null,
    special_feature_2: val('f-sf2') || null,
    secondary_blog_title: val('f-sec-title') || null,
    secondary_blog: val('f-sec-blog') || null,
    contnious_blog_title1: val('f-cont1-title') || null,
    contnious_blog_content1: val('f-cont1') || null,
    contnious_blog_title2: val('f-cont2-title') || null,
    contnious_blog_content2: val('f-cont2') || null,
    screenshot_urls: screenshots,
    powered_by_promotionocean: document.getElementById('f-powered').classList.contains('on')
  };

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/websites?id=eq.${currentRow.id}`,
      { method: 'PATCH', headers: HEADERS, body: JSON.stringify(payload) }
    );

    if (!res.ok) throw new Error(await res.text());

    hasUnsaved = false;
    document.getElementById('unsaved-badge')?.classList.remove('visible');
    showToast('✓ Published successfully!', 'success');

  } catch (e) {
    showToast('Publish failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '▲ Publish';
  }
}

// ── New Domain ────────────────────────────────────
async function newDomain() {
  const domain = prompt('Enter the new domain name (e.g. mynewdomain.com):');
  if (!domain || !domain.trim()) return;

  showToast('Creating...', 'loading');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/websites`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ domain: domain.trim() })
    });
    const rows = await res.json();
    const newRow = Array.isArray(rows) ? rows[0] : rows;

    allDomains.push({ id: newRow.id, domain: newRow.domain });
    allDomains.sort((a, b) => a.domain.localeCompare(b.domain));
    renderSidebar(allDomains);
    showToast('✓ Domain created!', 'success');
    await onDomainSelect(newRow.id);
  } catch (e) {
    showToast('Failed to create domain', 'error');
  }
}

// ── Delete Domain ─────────────────────────────────
async function deleteDomain(id, domain) {
  if (!confirm(`Delete "${domain}" permanently? This cannot be undone.`)) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/websites?id=eq.${id}`, { method: 'DELETE', headers: HEADERS });
    allDomains = allDomains.filter(d => d.id !== id);
    renderSidebar(allDomains);
    document.getElementById('editor').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✓</div>
        <h2>Domain deleted</h2>
        <p>Select another domain from the sidebar.</p>
      </div>`;
    currentRow = null;
    showToast('Domain deleted', 'success');
  } catch (e) {
    showToast('Delete failed', 'error');
  }
}

// ── Helpers ───────────────────────────────────────
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function esc(v) {
  if (v == null || v === 'NULL' || v === 'Null') return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function urlsToText(raw) {
  if (!raw || raw === 'null' || raw === 'NULL') return '';
  if (typeof raw === 'string') {
    try { const a = JSON.parse(raw); return Array.isArray(a) ? a.join('\n') : raw; }
    catch { return raw; }
  }
  return Array.isArray(raw) ? raw.join('\n') : '';
}

function textToUrls(text) {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.length ? JSON.stringify(lines) : null;
}

function markUnsaved() {
  if (!hasUnsaved) {
    hasUnsaved = true;
    document.getElementById('unsaved-badge')?.classList.add('visible');
  }
}

function toggleSection(id) {
  document.getElementById(id).classList.toggle('collapsed');
}

function togglePowered() {
  const btn = document.getElementById('f-powered');
  const label = document.getElementById('powered-label');
  btn.classList.toggle('on');
  label.textContent = btn.classList.contains('on') ? 'Visible' : 'Hidden';
  markUnsaved();
}

async function reloadCurrent() {
  if (!currentRow) return;
  if (hasUnsaved && !confirm('Discard unsaved changes?')) return;
  await onDomainSelect(currentRow.id);
}

// ── Theme Toggle ──────────────────────────────────
const themeToggleBtn = document.getElementById('theme-toggle');
let isLightMode = localStorage.getItem('theme') === 'light';

function applyTheme() {
  if (isLightMode) {
    document.body.classList.add('light-theme');
    themeToggleBtn.textContent = '🌙';
  } else {
    document.body.classList.remove('light-theme');
    themeToggleBtn.textContent = '☀️';
  }
}

themeToggleBtn.addEventListener('click', () => {
  isLightMode = !isLightMode;
  localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
  applyTheme();
});

// ── Toast ─────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  if (type !== 'loading') {
    toastTimer = setTimeout(hideToast, 3000);
  }
}
function hideToast() {
  document.getElementById('toast').classList.remove('show');
}

// ── Keyboard shortcut: Ctrl+S / Cmd+S ────────────
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (currentRow) publish();
  }
});

// ── Start ─────────────────────────────────────────
applyTheme();
init();
