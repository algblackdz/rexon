// ============================================================
// Renderer — يحوّل Website Schema إلى HTML نهائي
// يُستخدم في: معاينة Editor، التصدير، والنشر (نفس الكود = نفس النتيجة)
// كل النصوص تمر عبر esc() لمنع XSS.
// ============================================================
import { siteLangs, isRtl, FONTS } from './schema.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// يختار النص بحسب اللغة، ويرجع للإنجليزية عند غياب الترجمة
export function tr(v, lang) {
  if (v == null) return '';
  if (typeof v === 'object' && !Array.isArray(v)) return String(v[lang] ?? v.en ?? Object.values(v)[0] ?? '');
  return String(v);
}

const LANG_LABEL = { en: 'EN', fr: 'FR', ar: 'عربي' };

// تعليقات عربية توضح وظيفة كل قسم في الكود المُصدَّر
const COMMENTS = {
  navbar: 'شريط التنقل العلوي: الشعار وروابط الصفحات',
  hero: 'هذا القسم مسؤول عن عرض الـ Hero الرئيسي',
  features: 'قسم المزايا: يعرض أهم نقاط القوة',
  cards: 'قسم البطاقات: عناصر متشابهة في شبكة',
  pricing: 'قسم الأسعار: باقات الخدمة',
  testimonials: 'آراء العملاء',
  reviews: 'تقييمات العملاء بالنجوم',
  faq: 'الأسئلة الشائعة: تفتح الإجابة عند الضغط',
  contact: 'نموذج التواصل: يعالجه script.js',
  gallery: 'معرض الصور أو الأعمال',
  productGrid: 'شبكة المنتجات',
  stats: 'الأرقام والإحصائيات',
  timeline: 'الخط الزمني',
  team: 'أعضاء الفريق',
  cta: 'قسم الدعوة لاتخاذ إجراء (CTA)',
  login: 'نموذج تسجيل الدخول',
  signup: 'نموذج إنشاء حساب',
  footer: 'تذييل الصفحة: الحقوق والروابط'
};

function makeCtx(site, page, lang, o) {
  const assets = {};
  for (const a of site.assets || []) assets[a.id] = o.assetUrl ? o.assetUrl(a) : a.dataUrl;
  return { site, page, lang, langs: siteLangs(site), multi: site.language === 'multi', editor: !!o.editor, comments: !!o.comments, assets, langHref: o.langHref || (() => '#') };
}

function link(h) {
  h = String(h || '#');
  if (h.startsWith('page:')) { const s = h.slice(5).replace(/[^a-z0-9-]/g, ''); return s === 'index' || !s ? 'index.html' : s + '.html'; }
  return /^(https?:\/\/|mailto:|tel:|#)/.test(h) ? h : '#';
}

function img(v, ctx) {
  v = String(v || '');
  if (v.startsWith('asset:')) return ctx.assets[v.slice(6)] || '';
  if (/^https:\/\//.test(v)) return v;
  if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)) return v;
  return '';
}

const T = (v, ctx) => esc(tr(v, ctx.lang));
const heading = (p, ctx, tag = 'h2') => (p.title ? `<${tag} class="nx-title">${T(p.title, ctx)}</${tag}>` : '') + (p.subtitle ? `<p class="nx-sub">${T(p.subtitle, ctx)}</p>` : '');
const btn = (b, ctx, cls = '') => (b && b.label ? `<a class="nx-btn ${cls}" href="${esc(link(b.href))}">${T(b.label, ctx)}</a>` : '');
const arr = (v) => (Array.isArray(v) ? v : []);
const pic = (src, ctx, alt = '') => { const u = img(src, ctx); return u ? `<img src="${esc(u)}" alt="${esc(alt)}" loading="lazy">` : ''; };

const R = {
  navbar(s, ctx) {
    const p = s.props;
    const links = arr(p.links).length ? p.links : ctx.site.pages.map((pg) => ({ label: pg.title, href: 'page:' + pg.slug }));
    const sw = ctx.multi ? `<div class="nx-lang" role="group" aria-label="Language">${ctx.langs.map((l) => `<a href="${esc(ctx.langHref(l))}" hreflang="${l}" ${l === ctx.lang ? 'aria-current="true"' : ''}>${LANG_LABEL[l]}</a>`).join('')}</div>` : '';
    return `<nav class="nx-nav"><div class="nx-wrap nx-nav-in"><a class="nx-brand" href="index.html">${T(p.brand, ctx)}</a>
<button class="nx-burger" aria-label="Menu" aria-expanded="false"><span></span><span></span></button>
<div class="nx-links">${links.map((l) => `<a href="${esc(link(l.href))}">${T(l.label, ctx)}</a>`).join('')}</div>
<div class="nx-nav-end">${sw}${ctx.site.theme.toggle === false ? '' : '<button class="nx-theme" type="button" data-nx-theme aria-label="Theme">◐</button>'}${btn(p.cta, ctx, 'sm')}</div></div></nav>`;
  },
  hero(s, ctx) {
    const p = s.props, im = pic(p.image, ctx);
    return `<div class="nx-wrap nx-hero-in">${p.badge ? `<span class="nx-badge">${T(p.badge, ctx)}</span>` : ''}<h1 class="nx-h1">${T(p.title, ctx)}</h1><p class="nx-lead">${T(p.subtitle, ctx)}</p>
<div class="nx-actions">${btn(p.primary, ctx)}${btn(p.secondary, ctx, 'ghost')}</div>${im ? `<div class="nx-hero-img">${im}</div>` : p.showcase ? '<div class="nx-showcase" aria-hidden="true"><div class="nx-sc-bar"><i></i><i></i><i></i></div><div class="nx-sc-body"><b></b><b></b><b></b><span></span></div></div>' : ''}</div>`;
  },
  features(s, ctx) {
    return `<div class="nx-wrap">${heading(s.props, ctx)}<div class="nx-grid">${arr(s.props.items).map((i) => `<article class="nx-card"><span class="nx-icon" aria-hidden="true">${esc(i.icon || '✦')}</span><h3>${T(i.title, ctx)}</h3><p>${T(i.text, ctx)}</p></article>`).join('')}</div></div>`;
  },
  cards(s, ctx) {
    return `<div class="nx-wrap">${heading(s.props, ctx)}<div class="nx-grid">${arr(s.props.items).map((i) => `<article class="nx-card">${pic(i.image, ctx, tr(i.title, ctx.lang))}<h3>${T(i.title, ctx)}</h3><p>${T(i.text, ctx)}</p></article>`).join('')}</div></div>`;
  },
  pricing(s, ctx) {
    return `<div class="nx-wrap">${heading(s.props, ctx)}<div class="nx-grid nx-pricing">${arr(s.props.items).map((i) => `<article class="nx-card ${i.highlight ? 'is-hl' : ''}"><h3>${T(i.name, ctx)}</h3><div class="nx-price">${T(i.price, ctx)}<small>${T(i.period, ctx)}</small></div><ul>${arr(i.features).map((f) => `<li>${T(f, ctx)}</li>`).join('')}</ul><a class="nx-btn ${i.highlight ? '' : 'ghost'}" href="${esc(link('page:contact'))}">${T(i.cta, ctx)}</a></article>`).join('')}</div></div>`;
  },
  testimonials(s, ctx) {
    return `<div class="nx-wrap">${heading(s.props, ctx)}<div class="nx-grid">${arr(s.props.items).map((i) => `<figure class="nx-card"><div class="nx-stars" aria-label="${esc(i.rating || 5)}/5">${'★'.repeat(Math.min(5, Math.max(0, Number(i.rating) || 5)))}</div><blockquote>${T(i.text, ctx)}</blockquote><figcaption><strong>${T(i.name, ctx)}</strong> <span>${T(i.role, ctx)}</span></figcaption></figure>`).join('')}</div></div>`;
  },
  faq(s, ctx) {
    return `<div class="nx-wrap nx-narrow">${heading(s.props, ctx)}${arr(s.props.items).map((i) => `<details class="nx-faq"><summary>${T(i.q, ctx)}</summary><p>${T(i.a, ctx)}</p></details>`).join('')}</div>`;
  },
  contact(s, ctx) {
    const p = s.props, l = p.labels || {};
    return `<div class="nx-wrap nx-narrow">${heading(p, ctx)}<form class="nx-form nx-card" data-nx-form novalidate>
<label>${T(l.name, ctx)}<input name="name" required autocomplete="name"></label>
<label>${T(l.email, ctx)}<input name="email" type="email" required autocomplete="email"></label>
<label>${T(l.message, ctx)}<textarea name="message" rows="4" required></textarea></label>
<button class="nx-btn" type="submit">${T(p.button, ctx)}</button><p class="nx-ok" role="status" hidden>${T(p.success, ctx)}</p></form></div>`;
  },
  gallery(s, ctx) {
    return `<div class="nx-wrap">${heading(s.props, ctx)}<div class="nx-gal">${arr(s.props.items).map((i, n) => `<figure class="nx-tile" style="--n:${n}">${pic(i.image, ctx, tr(i.caption, ctx.lang))}<figcaption>${T(i.caption, ctx)}</figcaption></figure>`).join('')}</div></div>`;
  },
  productGrid(s, ctx) {
    return `<div class="nx-wrap">${heading(s.props, ctx)}<div class="nx-grid">${arr(s.props.items).map((i, n) => `<article class="nx-card nx-prod"><div class="nx-tile" style="--n:${n}">${pic(i.image, ctx, tr(i.name, ctx.lang))}${i.badge ? `<span class="nx-badge">${T(i.badge, ctx)}</span>` : ''}</div><h3>${T(i.name, ctx)}</h3><div class="nx-price sm">${T(i.price, ctx)}</div></article>`).join('')}</div></div>`;
  },
  stats(s, ctx) {
    return `<div class="nx-wrap"><div class="nx-grid nx-stats">${arr(s.props.items).map((i) => `<div class="nx-stat"><strong>${T(i.value, ctx)}</strong><span>${T(i.label, ctx)}</span></div>`).join('')}</div></div>`;
  },
  timeline(s, ctx) {
    return `<div class="nx-wrap nx-narrow">${heading(s.props, ctx)}<ol class="nx-tl">${arr(s.props.items).map((i) => `<li><time>${T(i.date, ctx)}</time><h3>${T(i.title, ctx)}</h3><p>${T(i.text, ctx)}</p></li>`).join('')}</ol></div>`;
  },
  team(s, ctx) {
    return `<div class="nx-wrap">${heading(s.props, ctx)}<div class="nx-grid">${arr(s.props.items).map((i, n) => `<article class="nx-card nx-member"><div class="nx-avatar" style="--n:${n}">${pic(i.image, ctx, tr(i.name, ctx.lang))}</div><h3>${T(i.name, ctx)}</h3><p>${T(i.role, ctx)}</p></article>`).join('')}</div></div>`;
  },
  cta(s, ctx) {
    return `<div class="nx-wrap nx-cta-in">${heading(s.props, ctx)}<div class="nx-actions">${btn(s.props.button, ctx)}</div></div>`;
  },
  login(s, ctx) {
    const p = s.props, l = p.labels || {};
    return `<div class="nx-wrap nx-narrow">${heading(p, ctx)}<form class="nx-form nx-card" data-nx-form novalidate><label>${T(l.email, ctx)}<input name="email" type="email" autocomplete="email"></label><label>${T(l.password, ctx)}<input name="password" type="password" autocomplete="current-password"></label><button class="nx-btn" type="submit">${T(p.button, ctx)}</button></form></div>`;
  },
  signup(s, ctx) {
    const p = s.props, l = p.labels || {};
    return `<div class="nx-wrap nx-narrow">${heading(p, ctx)}<form class="nx-form nx-card" data-nx-form novalidate><label>${T(l.name, ctx)}<input name="name" autocomplete="name"></label><label>${T(l.email, ctx)}<input name="email" type="email" autocomplete="email"></label><label>${T(l.password, ctx)}<input name="password" type="password" autocomplete="new-password"></label><button class="nx-btn" type="submit">${T(p.button, ctx)}</button></form></div>`;
  },
  footer(s, ctx) {
    const soc = Object.entries(ctx.site.settings?.social || {}).map(([k, v]) => `<a href="${esc(v)}" rel="noopener noreferrer" target="_blank">${esc(k)}</a>`).join('');
    return `<div class="nx-wrap nx-foot"><p>${T(s.props.text, ctx)}</p><nav class="nx-foot-links">${arr(s.props.links).map((l) => `<a href="${esc(link(l.href))}">${T(l.label, ctx)}</a>`).join('')}${soc}</nav></div>`;
  }
};

function wrap(sec, ctx, used) {
  const fn = R[sec.component];
  if (!fn) return '';
  let id = sec.component;
  if (used.has(id)) id = sec.id;
  used.add(id);
  const cls = ['nx-sec', 'nx-' + sec.component, 'nx-s-' + sec.id, sec.hover && sec.hover !== 'none' ? 'hv-' + sec.hover : '', sec.micro && sec.micro !== 'none' ? 'mi-' + sec.micro : ''].filter(Boolean).join(' ');
  const anim = sec.animation && sec.animation !== 'none' ? ` data-anim="${sec.animation}"` : '';
  const tag = sec.component === 'navbar' ? 'header' : sec.component === 'footer' ? 'footer' : 'section';
  const note = ctx.comments ? `<!-- ${COMMENTS[sec.component]} -->\n` : '';
  return `${note}<${tag} class="${cls}" id="${esc(id)}"${anim}${ctx.editor ? ` data-nx-id="${esc(sec.id)}"` : ''}>${fn(sec, ctx)}</${tag}>`;
}

export function renderBody(site, page, lang, o = {}) {
  const ctx = makeCtx(site, page, lang, o);
  const used = new Set();
  const parts = [];
  if (site.layout?.navbar) parts.push(wrap(site.layout.navbar, ctx, used));
  parts.push(`<main>${page.sections.map((s) => wrap(s, ctx, used)).join('\n')}</main>`);
  if (site.layout?.footer) parts.push(wrap(site.layout.footer, ctx, used));
  return parts.join('\n');
}

// يحدد الوضع (ليلي/نهاري) قبل الرسم لتفادي الوميض: اختيار الزائر ثم وضع جهازه ثم وضع الموقع
function themeScript(site) {
  const d = site.theme.mode, auto = site.theme.autoMode !== false;
  return `<script>(function(){var r=document.documentElement,d='${d}',t=null;try{t=localStorage.getItem('nx_theme')}catch(e){}if(!t&&${auto}&&window.matchMedia)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';r.setAttribute('data-default',d);r.setAttribute('data-theme',t||d)})();</script>`;
}

export function fontsHref(site) {
  const fams = [site.theme.fonts.latin];
  if (siteLangs(site).includes('ar')) fams.push(site.theme.fonts.arabic);
  return 'https://fonts.googleapis.com/css2?' + fams.filter((f) => [...FONTS.latin, ...FONTS.arabic].includes(f)).map((f) => 'family=' + f.replace(/ /g, '+') + ':wght@400;500;600;700').join('&') + '&display=swap';
}

// يبني مستند HTML كاملًا. opts: {cssHref|css, jsSrc|js, comments, allowCustomCode, assetUrl, langHref, editor}
export function renderDocument(site, page, lang, o = {}) {
  const dir = isRtl(lang) ? 'rtl' : 'ltr';
  const title = tr(page.title, lang);
  const ps = page.seo || {};
  const seoTitle = tr(ps.title, lang) || (page.slug === 'index' && site.seo.title ? site.seo.title : `${title} — ${site.name}`);
  const desc = tr(ps.description, lang) || site.seo.description;
  const fav = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${esc(site.settings.favicon || '✦')}</text></svg>`);
  const c = o.comments;
  const css = o.cssHref ? `<link rel="stylesheet" href="${esc(o.cssHref)}">` : `<style id="nx-style">${o.css || ''}</style>`;
  const js = o.jsSrc ? `<script src="${esc(o.jsSrc)}" defer></script>` : o.js ? `<script>${o.js}</script>` : '';
  const ga = site.settings.analyticsId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${site.settings.analyticsId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${site.settings.analyticsId}');</script>` : '';
  const customJS = o.allowCustomCode && site.settings.customJS ? `<script>${site.settings.customJS.replace(/<\/script/gi, '<\\/script')}</script>` : '';
  const customHTML = o.allowCustomCode ? site.settings.customHTML : '';
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
${c ? '<!-- إعدادات الصفحة: الترميز وحجم الشاشة وعنوان الصفحة -->\n' : ''}<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(seoTitle)}</title>
${desc ? `<meta name="description" content="${esc(desc)}">` : ''}
<meta property="og:title" content="${esc(seoTitle)}">
${desc ? `<meta property="og:description" content="${esc(desc)}">` : ''}
<meta property="og:type" content="website">
${site.seo.ogImage ? `<meta property="og:image" content="${esc(site.seo.ogImage)}">` : ''}
<link rel="icon" href="${fav}">
${site.settings.formEndpoint ? `<meta name="nx-form-endpoint" content="${esc(site.settings.formEndpoint)}">` : ''}
${c ? '<!-- الخطوط: تُحمَّل بطريقة محسّنة للأداء -->\n' : ''}<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link id="nx-fonts" rel="stylesheet" href="${esc(fontsHref(site))}">
${o.editor || o.noThemeScript ? '' : themeScript(site)}
${c ? '<!-- ملف التنسيقات -->\n' : ''}${css}
${ga}
</head>
<body data-style="${esc(site.theme.style)}">
${renderBody(site, page, lang, o)}
${customHTML || ''}
${c ? '<!-- ملف السلوك والحركات -->\n' : ''}${js}
${customJS}
</body>
</html>
`;
}
