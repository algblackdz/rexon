// ============================================================
// المولّد التجريبي: يبني Website Schema كاملًا بدون API key.
// ليس "ذكاءً" حقيقيًا: يستخدم قوالب لكل نوع موقع + كلمات مفتاحية من الوصف.
// ============================================================
import { makeSection, PAGE_TITLES } from '../../shared/defaults.js';
import { normalizeWebsite, uid, findSection } from '../../shared/schema.js';
import { PRESETS, STYLES, TYPE_COPY, TYPE_LAYOUT, findColors, findStyle, findType, detectLang } from './copy.js';

const LIGHT = { bg: '#f7f8ff', surface: '#ffffff', text: '#10122b', muted: '#5b6088' };
const DARK = { bg: '#070816', surface: '#10122b', text: '#f4f5ff', muted: '#9aa0c4' };

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, s, l];
}
function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}
// لون ثانوي متناسق: إزاحة Hue بمقدار 35 درجة
export const companion = (hex) => { const [h, s, l] = hexToHsl(hex); return hslToHex((h + 35) % 360, s, l); };

function buildTheme(colors, styleName, textForDetect) {
  let c = { ...PRESETS['purple-blue'] };
  if (colors?.preset && PRESETS[colors.preset]) c = { ...PRESETS[colors.preset] };
  else if (/^#[0-9a-f]{6}$/i.test(colors?.primary || '')) c = { primary: colors.primary, secondary: /^#[0-9a-f]{6}$/i.test(colors.secondary || '') ? colors.secondary : companion(colors.primary) };
  else { const found = findColors(textForDetect); if (found.length) c = { primary: found[0], secondary: found[1] || companion(found[0]) }; }
  const light = c.light && styleName !== 'dark';
  const st = STYLES[styleName] || STYLES.modern;
  return {
    mode: light ? 'light' : 'dark', style: styleName in STYLES ? styleName : 'modern', radius: st.radius, defaultAnimation: 'fade-up',
    colors: { primary: c.primary, secondary: c.secondary, ...(light ? LIGHT : DARK), ...(c.bg ? { bg: c.bg, surface: c.surface } : {}) },
    fonts: { latin: st.latin, arabic: 'Cairo' }
  };
}

export function mockGenerate(p) {
  const prompt = String(p.prompt || '');
  const type = p.type && p.type !== 'other' ? p.type : findType(prompt) || 'other';
  const style = p.style || findStyle(prompt) || 'modern';
  const language = ['en', 'fr', 'ar', 'multi'].includes(p.language) ? p.language : detectLang(prompt);
  const multi = language === 'multi';
  const lang = multi ? 'en' : language;
  const name = (p.name || '').trim() || { en: 'My Website', fr: 'Mon site', ar: 'موقعي' }[lang];
  const ctx = { lang, multi, name, animation: 'fade-up' };
  const L = (en, fr, ar) => (multi ? { en, fr, ar } : { en, fr, ar }[lang]);
  const copy = TYPE_COPY[type] || TYPE_COPY.other;
  const loc = (i) => (multi ? { en: copy.en[i], fr: copy.fr[i], ar: copy.ar[i] } : copy[lang][i]);
  const layout = TYPE_LAYOUT[type] || TYPE_LAYOUT.other;

  const hero = makeSection('hero', ctx, { animation: 'blur', props: { title: loc(0), subtitle: loc(1), primary: { label: loc(3), href: 'page:contact' }, secondary: { label: L('Learn more', 'En savoir plus', 'اعرف المزيد'), href: '#features' } } });
  const feat = makeSection('features', ctx);
  feat.props.items.forEach((it, i) => { it.title = multi ? { en: copy.en[2][i], fr: copy.fr[2][i], ar: copy.ar[2][i] } : copy[lang][2][i]; });
  const mid = layout.mid.map((c) => makeSection(c, ctx));
  const home = [hero, feat, ...mid, makeSection('cta', ctx)];

  const mk = (slug, secs) => ({ id: uid('page'), slug, title: PAGE_TITLES[slug] ? (multi ? PAGE_TITLES[slug] : PAGE_TITLES[slug][lang]) : slug, sections: secs });
  const pages = [mk('index', home)];
  if (layout.extra) pages.push(mk(layout.extra, layout.extraSecs.map((c) => makeSection(c, ctx))));
  pages.push(mk('contact', [makeSection('contact', ctx)]));

  const theme = buildTheme(p.colors, style, prompt);
  const site = {
    name, type, language, theme, seo: { title: name, description: loc(1), ogImage: '' },
    pages, layout: { navbar: makeSection('navbar', ctx, { animation: 'none' }), footer: makeSection('footer', ctx, { animation: 'none' }) },
    assets: [], settings: { customCSS: '', customJS: '', customHTML: '', analyticsId: '', formEndpoint: '', favicon: '✦', social: {} }
  };
  return normalizeWebsite(site);
}

// ----- تعديل بالأوامر (Ask AI) بدون API: كلمات مفتاحية بالعربية والفرنسية والإنجليزية -----
const ADD = [
  ['pricing', ['pricing', 'price', 'prix', 'tarif', 'أسعار', 'اسعار', 'سعر']], ['faq', ['faq', 'question', 'أسئلة', 'اسئلة']],
  ['testimonials', ['testimonial', 'avis', 'review', 'آراء', 'اراء', 'تقييم']], ['gallery', ['gallery', 'galerie', 'معرض']],
  ['stats', ['stats', 'statistic', 'chiffres', 'إحصائ', 'احصائ', 'أرقام']], ['team', ['team', 'équipe', 'equipe', 'فريق']],
  ['contact', ['contact form', 'contact', 'اتصل', 'تواصل']], ['timeline', ['timeline', 'chronologie', 'خط زمني']]
];
const PRO = ['professional', 'professionnel', 'luxury', 'luxe', 'احترافي', 'فخم', 'فخامة'];
const ADD_VERB = ['add', 'ajoute', 'ajouter', 'أضف', 'اضف', 'إضافة', 'اضافة', 'insert', 'create'];

export function mockEdit(site, command) {
  const low = String(command || '').toLowerCase();
  const next = structuredClone(site);
  const ctx = { lang: site.language === 'multi' ? 'en' : site.language, multi: site.language === 'multi', name: site.name, animation: next.theme.defaultAnimation };
  const home = next.pages[0];
  const insertAt = () => { const i = home.sections.findIndex((s) => s.component === 'cta'); return i < 0 ? home.sections.length : i; };

  const colors = findColors(command);
  if (colors.length) {
    const target = colors[colors.length - 1];
    next.theme.colors.primary = target;
    next.theme.colors.secondary = companion(target);
    return { website: next, message: { code: 'ai.colorChanged' } };
  }
  if (ADD_VERB.some((v) => low.includes(v))) {
    for (const [comp, words] of ADD) {
      if (words.some((w) => low.includes(w))) {
        if (comp === 'contact' && next.pages.some((p) => p.slug === 'contact')) continue;
        home.sections.splice(insertAt(), 0, makeSection(comp, ctx));
        return { website: next, message: { code: 'ai.sectionAdded', params: { component: comp } } };
      }
    }
  }
  if (PRO.some((w) => low.includes(w))) {
    next.theme.style = 'luxury'; next.theme.radius = 6; next.theme.fonts.latin = 'Manrope';
    const hero = home.sections.find((s) => s.component === 'hero');
    if (hero) { hero.animation = 'blur'; hero.style = { ...hero.style, padding: '9rem 0' }; }
    if (!home.sections.some((s) => s.component === 'stats')) home.sections.splice(1, 0, makeSection('stats', ctx));
    return { website: next, message: { code: 'ai.polished' } };
  }
  return { website: site, message: { code: 'ai.notUnderstood' } };
}
export { findSection };
