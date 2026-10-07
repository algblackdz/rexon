// ============================================================
// Editor: Left (Pages/Sections/Components/Assets/Themes/Animations/Settings)
//         Center (معاينة حية داخل iframe)  |  Right (Properties / Ask AI)
// كل تعديل يمر عبر commit() فيدخل في Undo/Redo ثم Auto Save.
// ============================================================
import { t, getLang } from '../i18n.js';
import { esc, $, $$, api, state, toast, errText, modal, confirmBox, debounce, fmtDate } from '../core.js';
import { navigate } from '../main.js';
import { renderBody, fontsHref, tr } from '/shared/render.js';
import { buildCSS } from '/shared/css.js';
import { findSection, siteLangs, uid, FONTS, ANIMATIONS, HOVERS, MICROS, COMPONENTS } from '/shared/schema.js';
import { openAssetExport } from '../assetexport.js';
import { makeSection, PAGE_PRESETS, PAGE_TITLES } from '/shared/defaults.js';
import { publishModal, domainModal, statusBadge } from '../siteops.js';
import { langSwitcherHTML, motionToggleHTML } from '../shell.js';

const LTABS = ['pages', 'sections', 'components', 'assets', 'themes', 'animations', 'settings'];
const LICON = { pages: '▤', sections: '☰', components: '◫', assets: '▣', themes: '◐', animations: '✺', settings: '⚙' };
const SHADOWS = { none: '', soft: '0 8px 30px rgba(0,0,0,.25)', glow: '0 0 40px rgba(124,58,237,.45)', strong: '0 20px 60px rgba(0,0,0,.5)' };
const FONT_CSS = ['Inter', 'Manrope', 'Poppins', 'Cairo', 'Tajawal', 'IBM Plex Sans Arabic'];
const SOCIAL = ['twitter', 'instagram', 'youtube', 'discord', 'github', 'linkedin'];
const STARTERS = { services: ['cards'], products: ['productGrid'], portfolio: ['gallery'], faq: ['faq'], blog: ['cards'], about: ['timeline', 'team'], contact: ['contact'] };
const AI_SUG = ['sug1', 'sug2', 'sug3', 'sug4'];

let S = null;

// ---------- أدوات ----------
const isLoc = (v) => v && typeof v === 'object' && !Array.isArray(v) && ('en' in v || 'fr' in v || 'ar' in v);
const page = () => S.site.pages.find((p) => p.id === S.pageId) || S.site.pages[0];
const multi = () => S.site.language === 'multi';
const ctxLang = () => (multi() ? S.plang : S.site.language);
const sec = () => (S.sel ? findSection(S.site, S.sel) : null);
const lbl = (k) => { const v = t('editor.prop_' + k); return v.startsWith('Prop_') ? k : v; };
const comp = (c) => t('editor.c_' + c);
function getPath(o, p) { return p.split('.').reduce((a, k) => (a == null ? a : a[k]), o); }
function setPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); const par = ks.reduce((a, k) => a[k], o); par[last] = v; }
const secCtx = () => ({ lang: multi() ? 'en' : S.site.language, multi: multi(), name: S.site.name, animation: S.site.theme.defaultAnimation });

// ---------- الحالة والتاريخ ----------
function commit(fn, { key = null, panels = true } = {}) {
  const now = Date.now();
  if (!(key && key === S.lastKey && now - S.lastAt < 900)) { S.hist.push(JSON.stringify(S.site)); if (S.hist.length > 80) S.hist.shift(); }
  S.lastKey = key; S.lastAt = now; S.fut = [];
  fn(S.site);
  after(panels);
}
function after(panels) {
  if (!S.site.pages.some((p) => p.id === S.pageId)) S.pageId = S.site.pages[0].id;
  if (S.sel && !sec()) S.sel = null;
  if (multi() && !siteLangs(S.site).includes(S.plang)) S.plang = 'en';
  postPreview(); updateTop();
  if (panels) { drawLeft(); drawRight(); }
  S.dirty = true; scheduleSave();
}
function undo() { if (!S.hist.length) return; S.fut.push(JSON.stringify(S.site)); S.site = JSON.parse(S.hist.pop()); S.lastKey = null; after(true); }
function redo() { if (!S.fut.length) return; S.hist.push(JSON.stringify(S.site)); S.site = JSON.parse(S.fut.pop()); S.lastKey = null; after(true); }

// ---------- الحفظ التلقائي ----------
const setStatus = (s) => { S.status = s; const el = $('#ed-status'); if (el) { el.textContent = t('editor.save_' + s); el.dataset.s = s; } };
const scheduleSave = debounce(() => save(), 1500);
async function save() {
  if (!S || !S.dirty) return;
  if (S.saving) { S.again = true; return; }
  S.saving = true; S.dirty = false; setStatus('saving');
  try { const r = await api('PUT', `/api/websites/${S.id}`, { website: S.site }); S.rec.updatedAt = r.updatedAt; setStatus(S.dirty ? 'saving' : 'saved'); }
  catch (e) { S.dirty = true; setStatus('error'); toast(errText(e), 'err'); }
  S.saving = false;
  if (S.again || S.dirty) { S.again = false; save(); }
}

// ---------- المعاينة ----------
function postPreview() {
  const f = $('#ed-frame');
  if (!f || !S.ready || !f.contentWindow) return;
  const lang = ctxLang();
  f.contentWindow.postMessage({ type: 'render', html: renderBody(S.site, page(), lang, { editor: true }), style: S.site.theme.style, css: buildCSS(S.site, { mode: S.pmode === 'auto' ? undefined : S.pmode }), lang, dir: lang === 'ar' ? 'rtl' : 'ltr', fontsHref: fontsHref(S.site), selected: S.sel }, location.origin);
}
function select(id, scroll = false) {
  S.sel = id; drawLeft(); drawRight();
  if (id) S.rtab = S.rtab === 'ai' ? 'ai' : 'props';
  $('#ed-frame')?.contentWindow?.postMessage({ type: 'select', id, scroll }, location.origin);
}

// ---------- الشريط العلوي ----------
function topHTML() {
  const dev = [['desktop', '🖥'], ['tablet', '▭'], ['mobile', '📱']];
  return `<header class="ed-top glass"><a class="icon-btn" href="#/dashboard" aria-label="${esc(t('common.back'))}">${getLang() === 'ar' ? '→' : '←'}</a>
    <input id="ed-name" class="ed-name" maxlength="80" value="${esc(S.site.name)}" aria-label="${esc(t('editor.siteName'))}">
    <span id="ed-status" class="save-status" role="status"></span>
    <div class="seg"><button id="ed-undo" aria-label="${esc(t('editor.undo'))}" title="${esc(t('editor.undo'))} (Ctrl+Z)">↶</button><button id="ed-redo" aria-label="${esc(t('editor.redo'))}" title="${esc(t('editor.redo'))} (Ctrl+Y)">↷</button></div>
    <div class="seg" role="radiogroup" aria-label="${esc(t('editor.device'))}">${dev.map(([d, i]) => `<button role="radio" data-dev="${d}" aria-label="${esc(t('editor.dev_' + d))}" title="${esc(t('editor.dev_' + d))}">${i}</button>`).join('')}</div>
    <select id="ed-plang" aria-label="${esc(t('editor.previewLang'))}" ${multi() ? '' : 'hidden'}>${['en', 'fr', 'ar'].map((l) => `<option value="${l}">${{ en: 'EN', fr: 'FR', ar: 'AR' }[l]}</option>`).join('')}</select>
    <button class="icon-btn" id="ed-mode" aria-label="${esc(t('editor.previewMode'))}" title="${esc(t('editor.previewMode'))}">◐</button>
    <i class="grow"></i>${langSwitcherHTML()}${motionToggleHTML()}
    <button class="btn btn-ghost btn-sm" id="ed-ai">✦ ${esc(t('editor.askAI'))}</button>
    <button class="btn btn-ghost btn-sm" id="ed-domain">${esc(t('dashboard.connectDomain'))}</button>
    <button class="btn btn-ghost btn-sm" id="ed-export">${esc(t('editor.exportCode'))}</button>
    <button class="btn btn-primary btn-sm" id="ed-publish" data-magnetic>${esc(t('editor.publish'))} <span id="ed-pubst"></span></button></header>`;
}
function updateTop() {
  if (!$('#ed-undo')) return;
  $('#ed-undo').disabled = !S.hist.length; $('#ed-redo').disabled = !S.fut.length;
  $$('[data-dev]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.dev === S.device)));
  $('.ed-frame-wrap').dataset.device = S.device;
  const pl = $('#ed-plang'); pl.hidden = !multi(); pl.value = S.plang;
  $('#ed-mode').dataset.m = S.pmode;
  $('#ed-pubst').innerHTML = statusBadge(S.rec.status);
  setStatus(S.status || 'saved');
}

// ---------- اللوحة اليسرى ----------
const field = (label, input) => `<label class="field sm"><span>${esc(label)}</span>${input}</label>`;
const val = (path) => esc(getPath(S.site, path) ?? '');
const mInput = (path, type = 'text', extra = '') => `<input type="${type}" data-model="${path}" value="${val(path)}" ${extra}>`;

function leftHTML() {
  const L = S.ltab, site = S.site, lang = ctxLang();
  if (L === 'pages') return `<ul class="list" data-list="pages">${site.pages.map((p) => `<li class="${p.id === S.pageId ? 'on' : ''}" data-act="page" data-id="${p.id}"><span>${esc(tr(p.title, lang))}</span><small dir="ltr">/${p.slug === 'index' ? '' : p.slug}</small>${p.slug === 'index' ? '' : `<button class="mini" data-act="delpage" data-id="${p.id}" aria-label="${esc(t('common.delete'))}">✕</button>`}</li>`).join('')}</ul><button class="btn btn-ghost block" data-act="addpage">+ ${esc(t('editor.addPage'))}</button>`;
  if (L === 'sections') {
    const g = ['navbar', 'footer'].filter((k) => site.layout[k]).map((k) => `<li class="${S.sel === site.layout[k].id ? 'on' : ''} glob" data-act="selsec" data-id="${site.layout[k].id}"><span>${esc(comp(k))}</span><small>${esc(t('editor.global'))}</small></li>`).join('');
    const items = page().sections.map((s, i) => `<li draggable="true" data-idx="${i}" data-id="${s.id}" data-act="selsec" class="${S.sel === s.id ? 'on' : ''}"><span class="grip" aria-hidden="true">⋮⋮</span><span>${esc(comp(s.component))}</span><span class="acts"><button class="mini" data-act="up" aria-label="${esc(t('editor.moveUp'))}">↑</button><button class="mini" data-act="down" aria-label="${esc(t('editor.moveDown'))}">↓</button><button class="mini" data-act="dup" aria-label="${esc(t('editor.duplicate'))}">⧉</button><button class="mini" data-act="del" aria-label="${esc(t('common.delete'))}">✕</button></span></li>`).join('');
    return `<ul class="list">${g}</ul><p class="muted small">${esc(t('editor.dragHint'))}</p><ul class="list" data-droplist>${items}</ul>`;
  }
  if (L === 'components') return `<p class="muted small">${esc(t('editor.compHint'))}</p><div class="comp-grid">${COMPONENTS.map((c) => `<button class="comp card" draggable="true" data-comp="${c}" data-act="addcomp" data-cursor="card"><i aria-hidden="true">${{ navbar: '▔', hero: '◩', features: '▦', cards: '▥', pricing: '$', testimonials: '❝', faq: '?', contact: '✉', gallery: '▣', productGrid: '▤', stats: '№', timeline: '⋮', team: '☺', reviews: '★', cta: '➜', login: '⇥', signup: '＋', footer: '▁' }[c]}</i>${esc(comp(c))}</button>`).join('')}</div>`;
  if (L === 'assets') return `<label class="btn btn-ghost block" tabindex="0">${esc(t('editor.upload'))}<input type="file" id="ed-up" accept="image/png,image/jpeg,image/webp,image/gif" hidden multiple></label><p class="muted small">${esc(t('editor.assetHint'))}</p><div class="asset-grid">${site.assets.map((a) => `<figure class="asset"><img src="${a.dataUrl}" alt="${esc(a.name)}"><figcaption class="small">${esc(a.name)}</figcaption><div class="row"><button class="mini" data-act="useasset" data-id="${a.id}">${esc(t('editor.useAsset'))}</button><button class="mini" data-act="rmasset" data-id="${a.id}" aria-label="${esc(t('common.delete'))}">✕</button></div></figure>`).join('')}</div>`;
  if (L === 'themes') {
    const c = site.theme.colors;
    return `<h4>${esc(t('editor.globalColors'))}</h4><div class="color-grid">${['primary', 'secondary', 'bg', 'surface', 'text', 'muted'].map((k) => field(t('editor.col_' + k), mInput('theme.colors.' + k, 'color'))).join('')}</div>
      <h4>${esc(t('editor.globalFonts'))}</h4>${field(t('editor.fontLatin'), `<select data-model="theme.fonts.latin">${FONTS.latin.map((f) => `<option ${site.theme.fonts.latin === f ? 'selected' : ''}>${f}</option>`).join('')}</select>`)}${field(t('editor.fontArabic'), `<select data-model="theme.fonts.arabic">${FONTS.arabic.map((f) => `<option ${site.theme.fonts.arabic === f ? 'selected' : ''}>${f}</option>`).join('')}</select>`)}
      ${field(t('editor.p_radius') + ` (${site.theme.radius}px)`, `<input type="range" min="0" max="40" data-model="theme.radius" data-num="1" value="${site.theme.radius}">`)}
      <h4>${esc(t('tools.altColors'))} (${esc(t('editor.mode_' + (site.theme.mode === 'dark' ? 'light' : 'dark')))})</h4><div class="color-grid">${['bg', 'surface', 'text', 'muted'].map((k) => field(t('editor.col_' + k), mInput('theme.alt.' + k, 'color'))).join('')}</div>
      <label class="check"><input type="checkbox" data-model="theme.toggle" ${site.theme.toggle !== false ? 'checked' : ''}> ${esc(t('tools.themeToggle'))}</label><label class="check"><input type="checkbox" data-model="theme.autoMode" ${site.theme.autoMode !== false ? 'checked' : ''}> ${esc(t('tools.autoMode'))}</label>
      ${field(t('editor.siteMode'), `<select data-act="mode"><option value="dark" ${site.theme.mode === 'dark' ? 'selected' : ''}>${esc(t('editor.mode_dark'))}</option><option value="light" ${site.theme.mode === 'light' ? 'selected' : ''}>${esc(t('editor.mode_light'))}</option></select>`)}`;
  }
  if (L === 'animations') return `${field(t('editor.defaultAnim'), `<select data-model="theme.defaultAnimation">${ANIMATIONS.map((a) => `<option value="${a}" ${site.theme.defaultAnimation === a ? 'selected' : ''}>${esc(t('editor.anim_' + a))}</option>`).join('')}</select>`)}<button class="btn btn-ghost block" data-act="applyanim">${esc(t('editor.applyAnimAll'))}</button><p class="muted small">${esc(t('editor.animNote'))}</p>`;
  // settings
  const st = site.settings;
  return `${field(t('editor.siteName'), mInput('name', 'text', 'maxlength="80"'))}
    <p class="muted small">${esc(t('editor.siteLanguage'))}: <b>${esc(t('generator.lang_' + site.language))}</b></p>
    <h4>SEO</h4><button class="btn btn-ghost block mb" data-act="genseo">✦ ${esc(t('tools.genSeo'))}</button>${field(t('editor.seoTitle'), mInput('seo.title', 'text', 'maxlength="120"'))}${field(t('editor.seoDesc'), `<textarea data-model="seo.description" rows="3" maxlength="300">${val('seo.description')}</textarea>`)}${field(t('editor.seoImage'), mInput('seo.ogImage', 'url', 'dir="ltr" placeholder="https://..."'))}${field(t('editor.favicon'), mInput('settings.favicon', 'text', 'maxlength="4"'))}
    <h4>${esc(t('editor.social'))}</h4>${SOCIAL.map((k) => field(k, mInput('settings.social.' + k, 'url', 'dir="ltr" placeholder="https://..."'))).join('')}
    <h4>${esc(t('editor.integrations'))}</h4>${field(t('editor.analytics'), mInput('settings.analyticsId', 'text', 'dir="ltr" placeholder="G-XXXXXXXXXX"'))}${field(t('editor.formEndpoint'), mInput('settings.formEndpoint', 'url', 'dir="ltr" placeholder="https://formspree.io/f/..."'))}
    <h4>${esc(t('editor.customCode'))}</h4><p class="muted small">${esc(t('editor.customNote'))}</p>${['customCSS', 'customHTML', 'customJS'].map((k) => field(t('editor.' + k), `<textarea class="code-in" dir="ltr" data-model="settings.${k}" rows="4" spellcheck="false">${val('settings.' + k)}</textarea>`)).join('')}
    <h4>${esc(t('editor.history'))}</h4><button class="btn btn-ghost block" data-act="versions">${esc(t('editor.loadVersions'))}</button><ul class="list" id="ed-versions"></ul>`;
}
function drawLeft() {
  $$('[data-ltab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.ltab === S.ltab)));
  const body = $('#ed-left-body'); if (!body) return;
  const keep = body.scrollTop; body.innerHTML = leftHTML(); body.scrollTop = keep;
}

// ---------- اللوحة اليمنى ----------
function fieldsHTML(v, path, key = '') {
  if (isLoc(v)) {
    const l = ctxLang(); const text = String(v[l] ?? '');
    const input = text.length > 70 ? `<textarea rows="3" data-sp="${path}" data-kind="loc">${esc(text)}</textarea>` : `<input data-sp="${path}" data-kind="loc" value="${esc(text)}">`;
    return field(lbl(key) + (multi() ? ` · ${l.toUpperCase()}` : ''), input);
  }
  if (typeof v === 'string') {
    if (key === 'image' || key === 'ogImage') return field(lbl(key), `<select data-sp="${path}" data-kind="str"><option value="">—</option>${S.site.assets.map((a) => `<option value="asset:${a.id}" ${v === 'asset:' + a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>`);
    const text = v.length > 70 ? `<textarea rows="3" data-sp="${path}" data-kind="str">${esc(v)}</textarea>` : `<input data-sp="${path}" data-kind="str" value="${esc(v)}" ${key === 'href' ? 'dir="ltr" placeholder="page:contact · #anchor · https://"' : ''}>`;
    return field(lbl(key), text);
  }
  if (typeof v === 'number') return field(lbl(key), `<input type="number" data-sp="${path}" data-kind="num" value="${v}">`);
  if (typeof v === 'boolean') return `<label class="check"><input type="checkbox" data-sp="${path}" data-kind="bool" ${v ? 'checked' : ''}> ${esc(lbl(key))}</label>`;
  if (Array.isArray(v)) {
    const obj = v.length && typeof v[0] === 'object' && !isLoc(v[0]);
    return `<fieldset class="grp"><legend>${esc(lbl(key))}</legend>${v.map((it, i) => obj ? `<details class="item"><summary>#${i + 1}<button class="mini" data-act="rmitem" data-sp="${path}" data-i="${i}" aria-label="${esc(t('common.delete'))}">✕</button></summary>${fieldsHTML(it, `${path}.${i}`, '')}</details>` : `<div class="row">${fieldsHTML(it, `${path}.${i}`, key)}<button class="mini" data-act="rmitem" data-sp="${path}" data-i="${i}" aria-label="${esc(t('common.delete'))}">✕</button></div>`).join('')}<button class="btn btn-ghost btn-sm" data-act="additem" data-sp="${path}">+ ${esc(t('editor.addItem'))}</button></fieldset>`;
  }
  if (v && typeof v === 'object') return `<fieldset class="grp">${key ? `<legend>${esc(lbl(key))}</legend>` : ''}${Object.entries(v).map(([k, x]) => fieldsHTML(x, `${path}.${k}`, k)).join('')}</fieldset>`;
  return '';
}
function styleHTML(s) {
  const st = s.style || {};
  const txt = (k, ph) => field(t('editor.p_' + k), `<input data-st="${k}" value="${esc(st[k] || '')}" placeholder="${ph}" dir="ltr">`);
  const col = (k) => `<label class="field sm"><span>${esc(t('editor.p_' + k))}</span><span class="row"><input type="color" data-st="${k}" value="${/^#[0-9a-f]{6}$/i.test(st[k] || '') ? st[k] : '#7c3aed'}"><button class="mini" data-act="clrst" data-st="${k}">✕</button></span></label>`;
  const g = st.gradient || {};
  const shadowKey = Object.entries(SHADOWS).find(([, v]) => v === (st.boxShadow || ''))?.[0] || 'none';
  return `<h4>${esc(t('editor.style'))}</h4>
   ${field(t('editor.p_font'), `<select data-st="fontFamily"><option value="">—</option>${FONT_CSS.map((f) => `<option value="'${f}', sans-serif" ${st.fontFamily === `'${f}', sans-serif` ? 'selected' : ''}>${f}</option>`).join('')}</select>`)}
   <div class="grid2">${txt('fontSize', '18px')}${txt('width', '1200px')}${txt('height', '400px')}${txt('margin', '0 auto')}${txt('padding', '4rem 1rem')}${txt('border', '1px solid #7c3aed')}${txt('borderRadius', '16px')}</div>
   ${field(t('editor.p_shadow'), `<select data-st="boxShadow">${Object.entries(SHADOWS).map(([k, v]) => `<option value="${esc(v)}" ${k === shadowKey ? 'selected' : ''}>${esc(t('editor.shadow_' + k))}</option>`).join('')}</select>`)}
   <div class="grid2">${col('color')}${col('background')}</div>
   <div class="grp"><b class="small">${esc(t('editor.p_gradient'))}</b><div class="row"><input type="color" data-grad="from" value="${g.from || S.site.theme.colors.primary}"><input type="color" data-grad="to" value="${g.to || S.site.theme.colors.secondary}"><input type="number" data-grad="angle" min="0" max="360" value="${g.angle ?? 135}" aria-label="angle"><button class="mini" data-act="clrgrad">✕</button></div></div>
   ${field(t('editor.p_position'), `<select data-st="position">${['', 'static', 'relative', 'sticky'].map((p) => `<option value="${p}" ${st.position === p ? 'selected' : ''}>${p || '—'}</option>`).join('')}</select>`)}
   <h4>${esc(t('editor.animation'))}</h4>
   ${field(t('editor.p_anim'), `<select data-sec="animation">${ANIMATIONS.map((a) => `<option value="${a}" ${s.animation === a ? 'selected' : ''}>${esc(t('editor.anim_' + a))}</option>`).join('')}</select>`)}
   ${field(t('tools.p_micro'), `<select data-sec="micro">${MICROS.map((a) => `<option value="${a}" ${(s.micro || 'none') === a ? 'selected' : ''}>${esc(t('tools.micro_' + a))}</option>`).join('')}</select>`)}
   ${field(t('editor.p_hover'), `<select data-sec="hover">${HOVERS.map((a) => `<option value="${a}" ${s.hover === a ? 'selected' : ''}>${esc(t('editor.hover_' + a))}</option>`).join('')}</select>`)}`;
}
function rightHTML() {
  const tabs = `<div class="tabs" role="tablist"><button role="tab" data-rtab="props" aria-selected="${S.rtab === 'props'}">${esc(t('editor.properties'))}</button><button role="tab" data-rtab="ai" aria-selected="${S.rtab === 'ai'}">✦ ${esc(t('editor.askAI'))}</button></div>`;
  if (S.rtab === 'ai') return tabs + `<div class="ai-log" id="ai-log">${S.ai.length ? S.ai.map((m) => `<p class="${m.r}">${esc(m.text)}</p>`).join('') : `<p class="muted small">${esc(t('editor.aiIntro'))}</p>`}</div><div class="chips">${AI_SUG.map((k) => `<button class="chip" data-aisug="${k}">${esc(t('editor.' + k))}</button>`).join('')}</div>
    <form id="ai-form" class="ai-form"><textarea id="ai-in" rows="2" maxlength="500" placeholder="${esc(t('editor.aiPlaceholder'))}"></textarea><button class="btn btn-primary btn-sm" ${S.aiBusy ? 'disabled' : ''}>${esc(S.aiBusy ? t('editor.thinking') : t('editor.send'))}</button></form>`;
  const f = sec();
  if (!f) return tabs + `<div class="empty small"><p class="muted">${esc(t('editor.selectHint'))}</p></div>`;
  const s = f.section;
  return tabs + `<div class="props-head"><b>${esc(comp(s.component))}</b><span class="acts"><button class="mini" data-act="assetexport" title="${esc(t('tools.ax_title'))}">⇪</button>${f.layout ? '' : `<button class="mini" data-act="up">↑</button><button class="mini" data-act="down">↓</button><button class="mini" data-act="dup">⧉</button>`}<button class="mini" data-act="del">✕</button></span></div>
    <h4>${esc(t('editor.content'))}</h4>${Object.entries(s.props).filter(([k, v]) => !(k === 'links' && Array.isArray(v) && !v.length)).map(([k, v]) => fieldsHTML(v, `props.${k}`, k)).join('')}${styleHTML(s)}`;
}
function drawRight() {
  const el = $('#ed-right'); if (!el) return;
  const keep = el.scrollTop; el.innerHTML = rightHTML(); el.scrollTop = keep;
  const log = $('#ai-log'); if (log) log.scrollTop = log.scrollHeight;
}

// ---------- عمليات الأقسام والصفحات ----------
function moveSection(id, to) {
  commit((s) => { const arr = page().sections; const i = arr.findIndex((x) => x.id === id); if (i < 0) return; const [it] = arr.splice(i, 1); arr.splice(Math.max(0, Math.min(to > i ? to - 1 : to, arr.length)), 0, it); });
}
function addComponent(name, index) {
  const s = makeSection(name, secCtx());
  commit((site) => {
    if (name === 'navbar' || name === 'footer') site.layout[name] = s;
    else { const arr = page().sections; const at = index ?? (S.sel ? arr.findIndex((x) => x.id === S.sel) + 1 || arr.length : arr.length); arr.splice(at, 0, s); }
  });
  select(s.id, true);
}
function currentSecOps(act) {
  const f = sec(); if (!f || f.layout) { if (act === 'del' && f?.layout) commit((site) => { site.layout[f.layout] = null; }); return; }
  const arr = page().sections, i = f.index;
  if (act === 'up' && i > 0) commit(() => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; });
  if (act === 'down' && i < arr.length - 1) commit(() => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; });
  if (act === 'dup') { const copy = JSON.parse(JSON.stringify(f.section)); copy.id = uid('sec'); commit(() => arr.splice(i + 1, 0, copy)); select(copy.id, true); }
  if (act === 'del') commit(() => arr.splice(i, 1));
}
function addPageModal() {
  const used = new Set(S.site.pages.map((p) => p.slug));
  const free = PAGE_PRESETS.filter((p) => !used.has(p));
  modal(`<h3>${esc(t('editor.addPage'))}</h3><label class="field"><span>${esc(t('editor.pageType'))}</span><select id="np-type">${free.map((p) => `<option value="${p}">${esc(PAGE_TITLES[p][getLang()])}</option>`).join('')}<option value="__custom">${esc(t('editor.customPage'))}</option></select></label><label class="field" id="np-wrap" hidden><span>${esc(t('editor.pageName'))}</span><input id="np-name" maxlength="40"></label><div class="row end"><button class="btn btn-primary" data-ok>${esc(t('editor.addPage'))}</button></div>`, {
    onMount: (el, close) => {
      const sel = el.querySelector('#np-type'); sel.addEventListener('change', () => { el.querySelector('#np-wrap').hidden = sel.value !== '__custom'; });
      el.querySelector('[data-ok]').addEventListener('click', () => {
        let slug = sel.value, title;
        if (slug === '__custom') { const n = el.querySelector('#np-name').value.trim(); if (!n) return; title = multi() ? { en: n, fr: n, ar: n } : n; slug = n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page'; while (used.has(slug)) slug += '-2'; }
        else title = multi() ? PAGE_TITLES[slug] : PAGE_TITLES[slug][S.site.language];
        const secs = (STARTERS[slug] || ['cards']).map((c) => makeSection(c, secCtx()));
        const p = { id: uid('page'), slug, title, sections: secs };
        commit((site) => site.pages.push(p)); S.pageId = p.id; S.sel = null; after(true); close();
      });
    }
  });
}

// ---------- تفاعل اللوحة اليسرى واليمنى ----------
async function onLeftClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, li = b.closest('li');
  const id = b.dataset.id || li?.dataset.id;
  if (act === 'page') { S.pageId = id; S.sel = null; after(true); }
  else if (act === 'addpage') addPageModal();
  else if (act === 'delpage') { e.stopPropagation(); if (await confirmBox(t('editor.confirmDelPage'), t('common.delete'))) commit((s) => { s.pages = s.pages.filter((p) => p.id !== id); }); }
  else if (act === 'selsec') { if (!e.target.closest('.acts')) select(id, true); }
  else if (['up', 'down', 'dup', 'del'].includes(act)) { e.stopPropagation(); if (li?.dataset.id && S.sel !== li.dataset.id) S.sel = li.dataset.id; currentSecOps(act); }
  else if (act === 'addcomp') addComponent(b.dataset.comp);
  else if (act === 'rmasset') commit((s) => { s.assets = s.assets.filter((a) => a.id !== id); });
  else if (act === 'useasset') {
    const f = sec(); if (f && 'image' in f.section.props) { commit((s) => { f.section.props.image = 'asset:' + id; }); select(f.section.id); } else toast(t('editor.assetNeedSection'));
  } else if (act === 'genseo') {
    try {
      const r = await api('POST', '/api/ai/seo', { website: S.site });
      commit((s) => { s.seo.title = r.site.title; s.seo.description = r.site.description; s.pages.forEach((p) => { if (r.pages[p.id]) p.seo = r.pages[p.id]; }); });
      toast(t('tools.seoDone'), 'ok');
    } catch (er) { toast(errText(er), 'err'); }
  } else if (act === 'applyanim') commit((s) => { s.pages.forEach((p) => p.sections.forEach((x) => { x.animation = s.theme.defaultAnimation; })); });
  else if (act === 'versions') {
    const { versions } = await api('GET', `/api/websites/${S.id}/versions`);
    $('#ed-versions').innerHTML = versions.length ? versions.map((v) => `<li><span>${esc(fmtDate(v.createdAt))}</span><button class="mini" data-act="restore" data-id="${v.id}">${esc(t('editor.restore'))}</button></li>`).join('') : `<li class="muted">${esc(t('editor.noVersions'))}</li>`;
  } else if (act === 'restore') {
    if (!(await confirmBox(t('editor.confirmRestore'), t('editor.restore')))) return;
    await save();
    const r = await api('POST', `/api/websites/${S.id}/versions/${id}/restore`);
    S.site = r.website.data; S.hist = []; S.fut = []; S.sel = null; after(true); S.dirty = false; toast(t('common.saved'), 'ok');
  }
}
function onModel(e) {
  const el = e.target.closest('[data-model]'); if (!el) return;
  let v = el.type === 'checkbox' ? el.checked : el.value; if (el.dataset.num) v = Number(v);
  const path = el.dataset.model;
  const panels = e.type === 'change' && (path.startsWith('theme') || path.startsWith('name'));
  commit((s) => { setPath(s, path, v); if (path === 'name' && s.layout.navbar) s.layout.navbar.props.brand = typeof s.layout.navbar.props.brand === 'string' ? v : s.layout.navbar.props.brand; }, { key: 'm:' + path, panels: false });
  if (panels && e.type === 'change') drawLeft();
}
function onMode(e) {
  if (e.target.dataset.act !== 'mode') return;
  const dark = { bg: '#070816', surface: '#10122b', text: '#f4f5ff', muted: '#9aa0c4' }, light = { bg: '#f7f8ff', surface: '#ffffff', text: '#10122b', muted: '#5b6088' };
  commit((s) => { s.theme.mode = e.target.value; Object.assign(s.theme.colors, e.target.value === 'light' ? light : dark); });
}
function onRight(e) {
  const t0 = e.target;
  if (t0.closest('[data-rtab]') && e.type === 'click') { S.rtab = t0.closest('[data-rtab]').dataset.rtab; drawRight(); return; }
  if (e.type === 'click') {
    const b = t0.closest('[data-act]'); if (b) {
      const act = b.dataset.act;
      if (['up', 'down', 'dup', 'del'].includes(act)) return currentSecOps(act);
      const f = sec(); if (!f) return;
      if (act === 'assetexport') return openAssetExport(S.site, f.section, ctxLang());
      if (act === 'rmitem') { e.preventDefault(); return commit(() => { getPath(f.section, b.dataset.sp).splice(+b.dataset.i, 1); }); }
      if (act === 'additem') { const arr = getPath(f.section, b.dataset.sp); return commit(() => arr.push(arr.length ? JSON.parse(JSON.stringify(arr[arr.length - 1])) : '')); }
      if (act === 'clrst') return commit(() => { delete f.section.style[b.dataset.st]; });
      if (act === 'clrgrad') return commit(() => { delete f.section.style.gradient; });
    }
    const sug = t0.closest('[data-aisug]'); if (sug) askAI(t('editor.' + sug.dataset.aisug + 'Full'));
    return;
  }
  const f = sec(); if (!f) return;
  const sp = t0.closest('[data-sp]');
  if (sp) {
    const path = sp.dataset.sp, kind = sp.dataset.kind;
    commit(() => {
      if (kind === 'loc') { const cur = getPath(f.section, path); cur[ctxLang()] = sp.value; }
      else if (kind === 'num') setPath(f.section, path, Number(sp.value) || 0);
      else if (kind === 'bool') setPath(f.section, path, sp.checked);
      else setPath(f.section, path, sp.value);
    }, { key: 'sp:' + f.section.id + path, panels: false });
    return;
  }
  const st = t0.closest('[data-st]');
  if (st) return commit(() => { if (st.value) f.section.style[st.dataset.st] = st.value; else delete f.section.style[st.dataset.st]; }, { key: 'st:' + f.section.id + st.dataset.st, panels: false });
  const gr = t0.closest('[data-grad]');
  if (gr) return commit(() => {
    const g = f.section.style.gradient || { from: S.site.theme.colors.primary, to: S.site.theme.colors.secondary, angle: 135 };
    g[gr.dataset.grad] = gr.dataset.grad === 'angle' ? Number(gr.value) : gr.value; f.section.style.gradient = g;
  }, { key: 'g:' + f.section.id, panels: false });
  const sc = t0.closest('[data-sec]');
  if (sc) commit(() => { f.section[sc.dataset.sec] = sc.value; }, { key: 'sec:' + f.section.id + sc.dataset.sec, panels: false });
}
async function askAI(text) {
  text = String(text || '').trim(); if (!text || S.aiBusy) return;
  S.rtab = 'ai'; S.ai.push({ r: 'u', text }); S.aiBusy = true; drawRight();
  try {
    const r = await api('POST', '/api/ai/edit', { website: S.site, command: text });
    if (r.message.code === 'ai.notUnderstood') S.ai.push({ r: 'b', text: t('editor.ai_notUnderstood') });
    else { commit((s) => { S.site = r.website; }); S.ai.push({ r: 'b', text: t('editor.' + r.message.code.replace('ai.', 'ai_'), { component: r.message.params ? t('editor.c_' + r.message.params.component) : '' }) }); }
  } catch (e) { S.ai.push({ r: 'b', text: errText(e) }); }
  S.aiBusy = false; drawRight();
}

// ---------- Drag & Drop ----------
function bindDnD(left) {
  left.addEventListener('dragstart', (e) => {
    const li = e.target.closest('li[data-id][draggable]'), c = e.target.closest('[data-comp]');
    e.dataTransfer.effectAllowed = 'copyMove';
    if (li) e.dataTransfer.setData('text/plain', 'sec:' + li.dataset.id); else if (c) e.dataTransfer.setData('text/plain', 'comp:' + c.dataset.comp);
  });
  left.addEventListener('dragover', (e) => {
    const list = e.target.closest('[data-droplist]'); if (!list) return;
    e.preventDefault(); $$('.drop-before', list).forEach((x) => x.classList.remove('drop-before'));
    e.target.closest('li[data-idx]')?.classList.add('drop-before');
  });
  left.addEventListener('drop', (e) => {
    const list = e.target.closest('[data-droplist]'); if (!list) return;
    e.preventDefault();
    const li = e.target.closest('li[data-idx]'); const idx = li ? +li.dataset.idx : page().sections.length;
    const [kind, id] = e.dataTransfer.getData('text/plain').split(':');
    if (kind === 'sec') moveSection(id, idx); else if (kind === 'comp') addComponent(id, idx);
  });
  left.addEventListener('dragend', () => $$('.drop-before').forEach((x) => x.classList.remove('drop-before')));
}
function readFile(f) { return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); }); }

// ---------- التجميع ----------
export default {
  title: 'editor.title',
  async render({ params }) {
    const id = params[0];
    if (!(S && S.id === id && Date.now() - (S.left || 0) < 5000)) {
      let r;
      try { r = await api('GET', `/api/websites/${id}`); } catch { navigate('/dashboard'); return ''; }
      const site = r.website.data;
      S = { id, rec: r.website, site, pageId: site.pages[0].id, sel: null, device: 'desktop', hist: [], fut: [], ltab: 'sections', rtab: 'props', plang: site.language === 'multi' ? (['en', 'fr', 'ar'].includes(getLang()) ? getLang() : 'en') : site.language, pmode: 'auto', status: 'saved', ai: [], ready: false };
    } else S.ready = false;
    return `<div class="editor" id="editor">${topHTML()}
      <aside class="ed-left glass" aria-label="${esc(t('editor.panelLeft'))}"><div class="ltabs" role="tablist" aria-orientation="vertical">${LTABS.map((k) => `<button role="tab" data-ltab="${k}" title="${esc(t('editor.tab_' + k))}" aria-label="${esc(t('editor.tab_' + k))}"><i aria-hidden="true">${LICON[k]}</i><span>${esc(t('editor.tab_' + k))}</span></button>`).join('')}</div><div class="ed-left-body" id="ed-left-body"></div></aside>
      <section class="ed-center"><div class="ed-stage"><div class="ed-frame-wrap"><iframe id="ed-frame" src="/preview-frame" title="${esc(t('editor.preview'))}"></iframe></div></div></section>
      <aside class="ed-right glass" id="ed-right" aria-label="${esc(t('editor.properties'))}"></aside></div>`;
  },
  mount(root) {
    const cleanups = [];
    const on = (t0, ev, fn, o) => { t0.addEventListener(ev, fn, o); cleanups.push(() => t0.removeEventListener(ev, fn, o)); };
    const left = $('#ed-left-body'), right = $('#ed-right');
    drawLeft(); drawRight(); updateTop();
    on(window, 'message', (e) => {
      if (e.origin !== location.origin || e.source !== $('#ed-frame')?.contentWindow) return;
      if (e.data?.type === 'ready') { S.ready = true; postPreview(); }
      else if (e.data?.type === 'select') { select(e.data.id); }
    });
    on($('.ltabs'), 'click', (e) => { const b = e.target.closest('[data-ltab]'); if (b) { S.ltab = b.dataset.ltab; drawLeft(); } });
    on(left, 'click', onLeftClick);
    on(left, 'input', onModel); on(left, 'change', (e) => { onModel(e); onMode(e); });
    on(left, 'change', async (e) => {
      if (e.target.id !== 'ed-up') return;
      for (const f of e.target.files) {
        if (f.size > 1_500_000) { toast(t('editor.fileTooBig'), 'err'); continue; }
        const dataUrl = await readFile(f);
        commit((s) => { if (s.assets.length < 20) s.assets.push({ id: uid('ast'), name: f.name.replace(/[^\w.\-]/g, '_').slice(0, 50), dataUrl }); });
      }
    });
    bindDnD(left);
    on(right, 'click', onRight); on(right, 'input', onRight); on(right, 'change', onRight);
    on(right, 'submit', (e) => { e.preventDefault(); const i = $('#ai-in'); const v = i.value; i.value = ''; askAI(v); });
    on($('#ed-name'), 'input', (e) => commit((s) => { s.name = e.target.value; }, { key: 'name', panels: false }));
    on($('#ed-undo'), 'click', undo); on($('#ed-redo'), 'click', redo);
    on($('.ed-top'), 'click', (e) => { const d = e.target.closest('[data-dev]'); if (d) { S.device = d.dataset.dev; updateTop(); } });
    on($('#ed-plang'), 'change', (e) => { S.plang = e.target.value; postPreview(); drawLeft(); drawRight(); });
    on($('#ed-mode'), 'click', () => { S.pmode = { auto: 'light', light: 'dark', dark: 'auto' }[S.pmode]; updateTop(); postPreview(); });
    on($('#ed-ai'), 'click', () => { S.rtab = 'ai'; drawRight(); $('#ai-in')?.focus(); });
    on($('#ed-domain'), 'click', () => domainModal(S.rec, () => updateTop()));
    on($('#ed-export'), 'click', async () => { S.dirty = true; await save(); location.href = `/api/websites/${S.id}/export`; });
    const onChange = (w) => { Object.assign(S.rec, w); updateTop(); };
    onChange.beforePublish = async () => { S.dirty = true; await save(); };
    on($('#ed-publish'), 'click', () => publishModal(S.rec, onChange));
    on(document, 'keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey; if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) { if (!/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); undo(); } }
      else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { if (!/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); redo(); } }
      else if (e.key === 's') { e.preventDefault(); S.dirty = true; save(); }
    });
    // إذا كان الـ iframe جاهزًا من قبل (تغيير لغة الواجهة) نعيد الإرسال عند load
    on($('#ed-frame'), 'load', () => { S.ready = true; postPreview(); });
    return () => { cleanups.forEach((c) => c()); S.left = Date.now(); if (S.dirty) save(); };
  }
};
