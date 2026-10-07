// معالج إنشاء الموقع: 5 خطوات + تحريك توليد الـ AI
import { t, getLang } from '../i18n.js';
import { esc, $, $$, api, state, toast, errText } from '../core.js';
import { navigate } from '../main.js';

const TYPES = ['store', 'portfolio', 'business', 'landing', 'blog', 'restaurant', 'gaming', 'agency', 'personal', 'saas', 'other'];
const ICON = { store: '🛒', portfolio: '🎨', business: '🏢', landing: '📄', blog: '✍️', restaurant: '🍽️', gaming: '🎮', agency: '🚀', personal: '👤', saas: '⚡', other: '＋' };
const STYLES = ['minimal', 'modern', 'luxury', 'futuristic', 'gaming', 'dark', 'clean', 'creative', 'corporate'];
const PRESETS = { 'purple-blue': ['#7c3aed', '#3b82f6'], 'black-red': ['#ef4444', '#7f1d1d'], 'white-blue': ['#2563eb', '#06b6d4'], 'green-black': ['#22c55e', '#065f46'], 'orange-black': ['#f97316', '#b45309'] };
const LANG_OPTS = ['en', 'fr', 'ar', 'multi'];
const KEY = 'nx_gen';

let G;
function load(query) {
  try { G = JSON.parse(sessionStorage.getItem(KEY)); } catch { G = null; }
  G = G || { step: 1, type: '', prompt: '', name: '', language: getLang(), style: 'modern', colors: { preset: 'purple-blue' } };
  if (query.type && TYPES.includes(query.type)) { G.type = query.type; G.step = Math.max(G.step, 2); }
}
const save = () => sessionStorage.setItem(KEY, JSON.stringify(G));

function stepBody() {
  const s = (k) => esc(t(k));
  if (G.step === 1) return `<h2 class="h3">${s('generator.s1_title')}</h2><div class="type-grid big" role="radiogroup">${TYPES.map((k) => `<button class="type-chip card ${G.type === k ? 'sel' : ''}" role="radio" aria-checked="${G.type === k}" data-type="${k}" data-cursor="card"><span aria-hidden="true">${ICON[k]}</span>${s('generator.type_' + k)}</button>`).join('')}</div>`;
  if (G.step === 2) return `<h2 class="h3">${s('generator.s2_title')}</h2>
    <label class="field"><span>${s('generator.s2_label')}</span><textarea id="g-prompt" rows="5" maxlength="1500" placeholder="${s('generator.s2_placeholder')}">${esc(G.prompt)}</textarea></label>
    <div class="chips sug"><span class="muted small">${s('generator.s2_sug')}</span>${[1, 2, 3, 4].map((n) => `<button class="chip" data-sug="${n}">${s('generator.sug' + n)}</button>`).join('')}</div>
    <div class="grid2"><label class="field"><span>${s('generator.s2_name')}</span><input id="g-name" maxlength="80" value="${esc(G.name)}"></label>
    <div class="field"><span>${s('generator.s2_lang')}</span><div class="seg" role="radiogroup">${LANG_OPTS.map((l) => `<button class="${G.language === l ? 'on' : ''}" role="radio" aria-checked="${G.language === l}" data-lang="${l}">${s('generator.lang_' + l)}</button>`).join('')}</div></div></div>`;
  if (G.step === 3) return `<h2 class="h3">${s('generator.s3_title')}</h2><div class="style-grid">${STYLES.map((k) => `<button class="card style-opt ${G.style === k ? 'sel' : ''}" role="radio" aria-checked="${G.style === k}" data-style="${k}" data-cursor="card"><i class="sty sty-${k}"></i>${s('generator.style_' + k)}</button>`).join('')}</div>`;
  if (G.step === 4) {
    const p = G.colors.preset, c1 = G.colors.primary || '#7c3aed', c2 = G.colors.secondary || '#3b82f6';
    return `<h2 class="h3">${s('generator.s4_title')}</h2><div class="preset-grid">${Object.entries(PRESETS).map(([k, [a, b]]) => `<button class="card preset ${p === k ? 'sel' : ''}" role="radio" aria-checked="${p === k}" data-preset="${k}"><i style="background:linear-gradient(135deg,${a},${b})"></i>${s('generator.preset_' + k)}</button>`).join('')}</div>
    <div class="custom-colors card"><b>${s('generator.custom')}</b><label>${s('generator.primary')}<input type="color" id="c1" value="${c1}"></label><label>${s('generator.secondary')}<input type="color" id="c2" value="${c2}"></label><i class="swatch-big" style="background:linear-gradient(135deg,${c1},${c2})"></i></div>`;
  }
  const rows = [['s1_title', G.type ? t('generator.type_' + G.type) : '—'], ['s2_name', G.name || '—'], ['s2_lang', t('generator.lang_' + G.language)], ['s3_title', t('generator.style_' + G.style)]];
  return `<h2 class="h3">${s('generator.s5_title')}</h2><dl class="summary card">${rows.map(([k, v]) => `<dt>${s('generator.' + k)}</dt><dd>${esc(v)}</dd>`).join('')}<dt>${s('generator.s4_title')}</dt><dd><i class="dot" style="background:${G.colors.preset ? PRESETS[G.colors.preset][0] : G.colors.primary}"></i><i class="dot" style="background:${G.colors.preset ? PRESETS[G.colors.preset][1] : G.colors.secondary}"></i></dd></dl>
    <p class="muted prompt-echo">${esc(G.prompt)}</p><button class="btn btn-primary btn-xl block" data-magnetic id="g-go">✦ ${s('generator.generate')}</button>`;
}

function canNext() { return G.step === 1 ? !!G.type : G.step === 2 ? G.prompt.trim().length >= 3 : true; }

function draw(root) {
  const labels = [1, 2, 3, 4, 5];
  $('#gen-steps', root).innerHTML = labels.map((n) => `<li class="${n === G.step ? 'active' : n < G.step ? 'done' : ''}"><button ${n > G.step ? 'disabled' : ''} data-go="${n}"><b>${n < G.step ? '✓' : n}</b><span>${esc(t('generator.step_' + n))}</span></button></li>`).join('');
  const body = $('#gen-body', root);
  body.innerHTML = stepBody();
  body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
  $('#g-back', root).hidden = G.step === 1;
  const next = $('#g-next', root);
  next.hidden = G.step === 5; next.disabled = !canNext();
  save();
}

async function generate(root) {
  if (!state.user) { save(); return navigate('/signup?next=' + encodeURIComponent('/generator')); }
  const ov = $('#gen-overlay', root);
  ov.hidden = false;
  const msgs = [1, 2, 3, 4, 5, 6].map((n) => t('generator.gen_' + n));
  const line = $('#gen-line', ov), bar = $('#gen-bar', ov);
  let i = 0;
  const tick = setInterval(() => { i = Math.min(i + 1, msgs.length - 1); line.textContent = msgs[i]; bar.style.width = Math.round(((i + 1) / msgs.length) * 92) + '%'; }, 900);
  line.textContent = msgs[0]; bar.style.width = '8%';
  try {
    const [r] = await Promise.all([api('POST', '/api/ai/generate', { type: G.type, prompt: G.prompt, name: G.name, language: G.language, style: G.style, colors: G.colors.preset ? { preset: G.colors.preset } : { primary: G.colors.primary, secondary: G.colors.secondary } }), new Promise((ok) => setTimeout(ok, 4600))]);
    clearInterval(tick); bar.style.width = '100%'; line.textContent = t('generator.gen_done');
    sessionStorage.removeItem(KEY);
    setTimeout(() => navigate(`/editor/${r.website.id}`), 500);
  } catch (e) { clearInterval(tick); ov.hidden = true; toast(errText(e), 'err'); }
}

export default {
  title: 'common.nav_create',
  render({ query }) {
    load(query);
    return `<section class="gen"><div class="container gen-wrap">
      <ol class="gen-steps" id="gen-steps" aria-label="Steps"></ol>
      <div class="gen-card glass"><div id="gen-body" class="swap"></div>
        <div class="gen-nav"><button class="btn btn-ghost" id="g-back">${esc(t('common.back'))}</button><button class="btn btn-primary" id="g-next" data-magnetic>${esc(t('common.next'))}</button></div></div></div>
      <div id="gen-overlay" class="gen-overlay" hidden role="alertdialog" aria-live="polite"><div class="orb" aria-hidden="true"></div><p id="gen-line"></p><div class="progress"><i id="gen-bar"></i></div></div></section>`;
  },
  mount(root) {
    draw(root);
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.type) { G.type = d.type; draw(root); }
      else if (d.style) { G.style = d.style; draw(root); }
      else if (d.preset) { G.colors = { preset: d.preset }; draw(root); }
      else if (d.lang) { G.language = d.lang; draw(root); }
      else if (d.sug) { G.prompt = t('generator.sug' + d.sug + 'Full'); draw(root); }
      else if (d.go) { G.step = +d.go; draw(root); }
      else if (b.id === 'g-next' && canNext()) { G.step++; draw(root); }
      else if (b.id === 'g-back') { G.step--; draw(root); }
      else if (b.id === 'g-go') generate(root);
    });
    root.addEventListener('input', (e) => {
      if (e.target.id === 'g-prompt') { G.prompt = e.target.value; $('#g-next', root).disabled = !canNext(); save(); }
      else if (e.target.id === 'g-name') { G.name = e.target.value; save(); }
      else if (e.target.id === 'c1' || e.target.id === 'c2') { G.colors = { primary: $('#c1', root).value, secondary: $('#c2', root).value }; $$('.preset', root).forEach((p) => p.classList.remove('sel')); $('.swatch-big', root).style.background = `linear-gradient(135deg,${G.colors.primary},${G.colors.secondary})`; save(); }
    });
  }
};
