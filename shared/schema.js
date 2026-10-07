// ============================================================
// Website Schema — المصدر الوحيد للحقيقة لكل موقع تنشئه NEXORA
// Website → Pages → Sections → Components → Styles → Animations
// يعمل هذا الملف في المتصفح وفي الخادم (نفس التحقق ونفس القواعد).
// ============================================================
export const LANGS = ['en', 'fr', 'ar'];
export const WEBSITE_TYPES = ['store', 'portfolio', 'business', 'landing', 'blog', 'restaurant', 'gaming', 'agency', 'personal', 'saas', 'other'];
export const COMPONENTS = ['navbar', 'hero', 'features', 'cards', 'pricing', 'testimonials', 'faq', 'contact', 'gallery', 'productGrid', 'stats', 'timeline', 'team', 'reviews', 'cta', 'login', 'signup', 'footer'];
export const ANIMATIONS = ['none', 'fade-in', 'fade-up', 'scale', 'blur'];
export const HOVERS = ['none', 'lift', 'glow', 'scale'];
export const MICROS = ['none', 'spotlight', 'tilt', 'magnetic', 'float'];
const PAL_DARK = { bg: '#070816', surface: '#10122b', text: '#f4f5ff', muted: '#9aa0c4' };
const PAL_LIGHT = { bg: '#f7f8ff', surface: '#ffffff', text: '#10122b', muted: '#5b6088' };
export const FONTS = {
  latin: ['Inter', 'Manrope', 'Poppins'],
  arabic: ['Cairo', 'Tajawal', 'IBM Plex Sans Arabic']
};
export const STYLE_KEYS = ['fontFamily', 'fontSize', 'width', 'height', 'margin', 'padding', 'border', 'borderRadius', 'boxShadow', 'color', 'background', 'position'];

export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 10);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const HEX = /^#[0-9a-f]{6}$/i;
export const isHex = (v) => typeof v === 'string' && HEX.test(v);

// قيمة CSS آمنة: بدون url() أو expression أو @import
const SAFE_CSS = /^[\w\s#%.,()\-+/'"]*$/;
const BAD_CSS = /url\s*\(|expression|@import|javascript:/i;
export function safeCssValue(v) {
  v = String(v ?? '').trim();
  return v.length > 200 || !SAFE_CSS.test(v) || BAD_CSS.test(v) ? '' : v;
}

// تنظيف عميق للـ props: يمنع المفاتيح الخطرة ويحدد الحجم والعمق
function cleanValue(v, depth = 0) {
  if (depth > 7) return null;
  if (typeof v === 'string') return v.slice(0, 5000);
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.slice(0, 60).map((x) => cleanValue(x, depth + 1));
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v).slice(0, 60)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      o[k] = cleanValue(x, depth + 1);
    }
    return o;
  }
  return null;
}

export function cleanSection(s) {
  if (!s || !COMPONENTS.includes(s.component)) return null;
  const style = {};
  for (const k of STYLE_KEYS) {
    const raw = s.style?.[k];
    if (raw) { const c = safeCssValue(raw); if (c) style[k] = c; }
  }
  const g = s.style?.gradient;
  if (g && isHex(g.from) && isHex(g.to)) style.gradient = { from: g.from, to: g.to, angle: clamp(Number(g.angle) || 135, 0, 360) };
  return {
    id: /^[\w-]{3,40}$/.test(s.id || '') ? s.id : uid('sec'),
    component: s.component,
    props: cleanValue(s.props || {}) || {},
    style,
    animation: ANIMATIONS.includes(s.animation) ? s.animation : 'fade-up',
    hover: HOVERS.includes(s.hover) ? s.hover : 'none',
    micro: MICROS.includes(s.micro) ? s.micro : 'none'
  };
}

const str = (v, max, fb = '') => (typeof v === 'string' ? v.slice(0, max) : fb);

// يقبل أي كائن ويرجع Website نظيفًا وصالحًا، أو يرمي خطأ invalid_website
export function normalizeWebsite(input) {
  if (!input || typeof input !== 'object') throw new Error('invalid_website');
  const c = input.theme?.colors || {};
  const theme = {
    mode: input.theme?.mode === 'light' ? 'light' : 'dark',
    style: str(input.theme?.style, 20, 'modern'),
    radius: clamp(Number(input.theme?.radius ?? 14), 0, 40),
    defaultAnimation: ANIMATIONS.includes(input.theme?.defaultAnimation) ? input.theme.defaultAnimation : 'fade-up',
    toggle: input.theme?.toggle !== false,      // زر الوضع الليلي/النهاري داخل الموقع
    autoMode: input.theme?.autoMode !== false,  // اتباع وضع جهاز الزائر تلقائيًا
    colors: {
      primary: isHex(c.primary) ? c.primary : '#7c3aed',
      secondary: isHex(c.secondary) ? c.secondary : '#3b82f6',
      bg: isHex(c.bg) ? c.bg : '#070816',
      surface: isHex(c.surface) ? c.surface : '#10122b',
      text: isHex(c.text) ? c.text : '#f4f5ff',
      muted: isHex(c.muted) ? c.muted : '#9aa0c4'
    },
    fonts: {
      latin: FONTS.latin.includes(input.theme?.fonts?.latin) ? input.theme.fonts.latin : 'Inter',
      arabic: FONTS.arabic.includes(input.theme?.fonts?.arabic) ? input.theme.fonts.arabic : 'Cairo'
    }
  };
  // ألوان الوضع الآخر (إن كان الموقع داكنًا فهذه ألوان الوضع الفاتح والعكس)
  const altIn = input.theme?.alt || {};
  const altDef = theme.mode === 'dark' ? PAL_LIGHT : PAL_DARK;
  theme.alt = Object.fromEntries(Object.keys(altDef).map((k) => [k, isHex(altIn[k]) ? altIn[k] : altDef[k]]));
  const seenSlugs = new Set();
  const pages = (Array.isArray(input.pages) ? input.pages : []).slice(0, 20).map((p, i) => {
    let slug = /^[a-z0-9-]{1,40}$/.test(p?.slug || '') ? p.slug : 'page-' + (i + 1);
    if (i === 0) slug = 'index';
    while (seenSlugs.has(slug)) slug += '-2';
    seenSlugs.add(slug);
    return {
      id: /^[\w-]{3,40}$/.test(p?.id || '') ? p.id : uid('page'),
      slug,
      title: cleanValue(p?.title ?? slug) ?? slug,
      seo: p?.seo && typeof p.seo === 'object' ? { title: cleanValue(p.seo.title) ?? '', description: cleanValue(p.seo.description) ?? '' } : undefined,
      sections: (Array.isArray(p?.sections) ? p.sections : []).slice(0, 60).map(cleanSection).filter(Boolean)
    };
  });
  if (!pages.length) throw new Error('invalid_website');
  const layout = {
    navbar: input.layout?.navbar?.component === 'navbar' ? cleanSection(input.layout.navbar) : null,
    footer: input.layout?.footer?.component === 'footer' ? cleanSection(input.layout.footer) : null
  };
  const assets = (Array.isArray(input.assets) ? input.assets : []).slice(0, 20)
    .filter((a) => typeof a?.dataUrl === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(a.dataUrl) && a.dataUrl.length < 2_800_000)
    .map((a) => ({ id: /^[\w-]{3,40}$/.test(a.id || '') ? a.id : uid('ast'), name: str(a.name, 60, 'image').replace(/[^\w.\-]/g, '_'), dataUrl: a.dataUrl }));
  const st = input.settings || {};
  const social = {};
  for (const [k, v] of Object.entries(st.social || {}).slice(0, 10)) if (/^https:\/\//.test(v) && v.length < 300) social[k.replace(/\W/g, '').slice(0, 20)] = v;
  return {
    name: str(input.name, 80, 'My Website') || 'My Website',
    type: WEBSITE_TYPES.includes(input.type) ? input.type : 'other',
    language: ['en', 'fr', 'ar', 'multi'].includes(input.language) ? input.language : 'en',
    theme,
    seo: { title: str(input.seo?.title, 120), description: str(input.seo?.description, 300), ogImage: /^https:\/\//.test(input.seo?.ogImage || '') ? input.seo.ogImage.slice(0, 400) : '' },
    pages,
    layout,
    assets,
    settings: {
      customCSS: str(st.customCSS, 20000),
      customJS: str(st.customJS, 20000),
      customHTML: str(st.customHTML, 20000),
      analyticsId: /^G-[A-Z0-9]{4,15}$/.test(st.analyticsId || '') ? st.analyticsId : '',
      formEndpoint: /^https:\/\//.test(st.formEndpoint || '') ? st.formEndpoint.slice(0, 300) : '',
      favicon: str(st.favicon, 8, '✦'),
      social
    }
  };
}

export const siteLangs = (site) => (site.language === 'multi' ? LANGS : [site.language]);
export const isRtl = (lang) => lang === 'ar';

// يبحث عن قسم بالمعرّف (داخل الصفحات أو التخطيط العام)
export function findSection(site, id) {
  for (const p of site.pages) {
    const i = p.sections.findIndex((s) => s.id === id);
    if (i >= 0) return { section: p.sections[i], page: p, index: i };
  }
  for (const k of ['navbar', 'footer']) if (site.layout?.[k]?.id === id) return { section: site.layout[k], layout: k };
  return null;
}
