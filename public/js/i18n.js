// ============================================================
// نظام الترجمة المركزي — كل نص ظاهر للمستخدم يمر من هنا
// الملفات: /locales/<lang>/<namespace>.json   المفتاح: namespace.key
// الاحتياط: إذا فُقدت الترجمة نستخدم الإنجليزية، ولا نعرض undefined أبدًا.
// ============================================================
export const LANGS = ['en', 'fr', 'ar'];
const NS = ['common', 'landing', 'generator', 'dashboard', 'editor', 'pricing', 'auth', 'support', 'tools', 'ads'];
const cache = {};
let lang = 'en';

async function load(l) {
  if (cache[l]) return;
  const parts = await Promise.all(NS.map((n) => fetch(`/locales/${l}/${n}.json`).then((r) => r.json()).then((j) => Object.entries(j).map(([k, v]) => [`${n}.${k}`, v]))));
  cache[l] = Object.fromEntries(parts.flat());
}

export function t(key, vars) {
  let s = cache[lang]?.[key] ?? cache.en?.[key];
  if (s === undefined) s = key.split('.').pop().replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s;
}
export const getLang = () => lang;
export const has = (key) => cache[lang]?.[key] !== undefined || cache.en?.[key] !== undefined;
export const isRTL = () => lang === 'ar';

// اللغة عند أول زيارة: المحفوظة ← لغة المتصفح ← الإنجليزية
export function detectLang() {
  const saved = localStorage.getItem('nx_lang') || document.cookie.match(/(?:^|; )nx_lang=(\w+)/)?.[1];
  if (LANGS.includes(saved)) return saved;
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return LANGS.includes(nav) ? nav : 'en';
}

function apply() {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
  document.title = t('common.pageTitle');
  const sk = document.querySelector('[data-skip]');
  if (sk) sk.textContent = t('common.skipToContent');
}

export async function initI18n(forced) {
  lang = forced || detectLang();
  await Promise.all([load('en'), load(lang)]);
  apply();
}

// تبديل اللغة بدون Reload: Fade out ← تغيير ← Fade in، مع بقاء الحالة في الذاكرة
export async function setLang(l, { persist = true } = {}) {
  if (!LANGS.includes(l) || l === lang) return;
  const app = document.getElementById('app');
  app.classList.add('lang-out');
  await Promise.all([load(l), new Promise((r) => setTimeout(r, 160))]);
  lang = l;
  if (persist) {
    localStorage.setItem('nx_lang', l);
    document.cookie = `nx_lang=${l}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }
  apply();
  window.dispatchEvent(new CustomEvent('nx:lang', { detail: l }));
  requestAnimationFrame(() => app.classList.remove('lang-out'));
}
