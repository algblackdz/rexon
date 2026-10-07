// ============================================================
// نقطة البداية: Router (hash) + Layouts + تحميل المستخدم واللغة
// الصفحات تُحمَّل بـ import() عند الحاجة (Code splitting).
// ============================================================
import { initI18n, t, getLang } from './i18n.js';
import { api, state, esc, logoHTML, $, $$ } from './core.js';
import { initMotion, initCursor, initAmbient, bindFx } from './fx.js';
import { langSwitcherHTML, motionToggleHTML, bindShell } from './shell.js';

const ROUTES = [
  [/^\/$/, () => import('./pages/landing.js'), 'site'],
  [/^\/generator$/, () => import('./pages/generator.js'), 'site'],
  [/^\/templates$/, () => import('./pages/templates.js'), 'site'],
  [/^\/(login|signup|forgot|reset)$/, () => import('./pages/auth.js'), 'site'],
  [/^\/dashboard(?:\/(\w+))?$/, () => import('./pages/dashboard.js'), 'app'],
  [/^\/editor\/([\w-]+)$/, () => import('./pages/editor.js'), 'full']
];
const PROTECTED = /^\/(dashboard|editor)/;
let cleanup = null, pendingScroll = null, token = 0;

function parseHash() {
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(qs || '')) };
}
export const navigate = (p) => { location.hash = p; };

function siteLayout(inner) {
  const u = state.user;
  return `<header class="nav" id="nav"><div class="nav-in container">
    <a class="brand" href="#/" aria-label="NEXORA">${logoHTML()}</a>
    <nav class="nav-links" aria-label="Main">
      <a href="#/generator">${esc(t('common.nav_create'))}</a><a href="#/templates">${esc(t('common.nav_templates'))}</a>
      <a href="#/" data-scroll="features">${esc(t('common.nav_features'))}</a><a href="#/" data-scroll="pricing">${esc(t('common.nav_pricing'))}</a>
    </nav>
    <div class="nav-end">${langSwitcherHTML()}${motionToggleHTML()}
      ${u && u.role !== 'user' ? `<a class="btn btn-ghost btn-sm" href="#/dashboard/staff">${esc(t('support.staff'))}</a>` : ''}
      ${u ? `<a class="btn btn-primary btn-sm" data-magnetic href="#/dashboard">${esc(t('common.nav_dashboard'))}</a>`
          : `<a class="btn btn-ghost btn-sm" href="#/login">${esc(t('common.nav_login'))}</a><a class="btn btn-primary btn-sm" data-magnetic href="#/signup">${esc(t('common.nav_getStarted'))}</a>`}
    </div>
    <button class="burger icon-btn" type="button" aria-label="Menu" aria-expanded="false">☰</button>
  </div></header>
  <main id="view" class="view" tabindex="-1">${inner}</main>
  <footer class="site-foot"><div class="container foot-in">
    <div>${logoHTML()}<p class="muted">${esc(t('common.footer_tag'))}</p></div>
    <nav class="foot-links" aria-label="Footer"><a href="#/generator">${esc(t('common.nav_create'))}</a><a href="#/templates">${esc(t('common.nav_templates'))}</a><a href="#/signup">${esc(t('common.nav_getStarted'))}</a></nav>
    <p class="muted small">© ${new Date().getFullYear()} NEXORA. ${esc(t('common.footer_rights'))}</p>
  </div></footer>`;
}

function bindSite(root) {
  const nav = $('#nav', root);
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 24);
  onScroll(); addEventListener('scroll', onScroll, { passive: true });
  const burger = $('.burger', root);
  burger.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', String(o)); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) nav.classList.remove('open'); });
  return () => removeEventListener('scroll', onScroll);
}

async function render() {
  const my = ++token;
  cleanup?.(); cleanup = null;
  const { path, query } = parseHash();
  if (PROTECTED.test(path) && !state.user) return navigate(`/login?next=${encodeURIComponent(path)}`);
  const hit = ROUTES.map(([re, load, layout]) => [re.exec(path), load, layout]).find(([m]) => m);
  const app = $('#app');
  if (!hit) return navigate('/');
  const [m, load, layout] = hit;
  const page = (await load()).default;
  const ctx = { params: m.slice(1), path, query, name: m[1] };
  const html = await page.render(ctx);
  if (my !== token) return;
  app.innerHTML = layout === 'site' ? siteLayout(html) : html;
  app.dataset.layout = layout;
  const view = $('#view', app) || app;
  view.classList.add('page-in');
  const subs = [bindFx(app)];
  bindShell(app);
  if (layout === 'site') subs.push(bindSite(app));
  const c = await page.mount?.(view, ctx);
  document.title = page.title ? `${t(page.title)} — NEXORA` : t('common.pageTitle');
  cleanup = () => { subs.forEach((s) => s?.()); c?.(); };
  if (pendingScroll) { const el = document.getElementById(pendingScroll); pendingScroll = null; el?.scrollIntoView({ behavior: 'smooth' }); }
  else if (!ctx.keepScroll) scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-scroll]');
  if (!a) return;
  const id = a.dataset.scroll;
  if (parseHash().path === '/') { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }
  else pendingScroll = id;
});
addEventListener('hashchange', render);
addEventListener('nx:lang', render);
addEventListener('nx:auth', render);

async function boot() {
  initMotion();
  const [me, cfg] = await Promise.all([api('GET', '/api/auth/me').catch(() => ({ user: null })), api('GET', '/api/config').catch(() => ({}))]);
  state.user = me.user;
  Object.assign(state.config, cfg);
  const saved = localStorage.getItem('nx_lang');
  await initI18n(!saved && state.user?.language ? state.user.language : undefined);
  initCursor(); initAmbient();
  await render();
  import('./assistant.js').then((m) => m.initAssistant());
  document.body.classList.add('ready');
}
boot();
