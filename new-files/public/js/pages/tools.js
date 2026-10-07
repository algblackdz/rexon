// ============================================================
// أدوات الفريلانسر: حاسبة التسعير الذكية، الفواتير والعقود، مولّد Portfolio
// ============================================================
import { t, getLang } from '../i18n.js';
import { esc, $, $$, api, state, toast, errText, modal, confirmBox, fmtDay } from '../core.js';
import { navigate } from '../main.js';

let root, sub = 'calc', docs = [];
const SUBS = ['calc', 'docs', 'portfolio'];
const PRESETS = ['purple-blue', 'black-red', 'white-blue', 'green-black', 'orange-black'];
const CUR = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'DZD', 'MAD', 'EGP'];
const money = (n, c = 'USD') => { try { return new Intl.NumberFormat(getLang(), { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n); } catch { return n.toFixed(0) + ' ' + c; } };

// ---------- الحاسبة ----------
const TYPES = { logo: 1, website: 1.2, design: 1, video: 1.3, dev: 1.4, writing: 0.9, other: 1 };
function calcView() {
  return `<div class="grid2"><form class="card" id="calc"><h3>${esc(t('tools.calcTitle'))}</h3><p class="muted small">${esc(t('tools.calcHelp'))}</p>
  <label class="field"><span>${esc(t('tools.projType'))}</span><select name="type">${Object.keys(TYPES).map((k) => `<option value="${k}">${esc(t('tools.pt_' + k))}</option>`).join('')}</select></label>
  <div class="grid2"><label class="field"><span>${esc(t('tools.hours'))}</span><input name="hours" type="number" min="1" value="20"></label><label class="field"><span>${esc(t('tools.rate'))}</span><input name="rate" type="number" min="1" value="25"></label></div>
  <div class="grid2"><label class="field"><span>${esc(t('tools.complexity'))}</span><select name="cx"><option value="1">${esc(t('tools.cx_low'))}</option><option value="1.25" selected>${esc(t('tools.cx_mid'))}</option><option value="1.5">${esc(t('tools.cx_high'))}</option></select></label><label class="field"><span>${esc(t('tools.revisions'))}</span><input name="rev" type="number" min="0" max="20" value="2"></label></div>
  <div class="grid2"><label class="field"><span>${esc(t('tools.rights'))}</span><select name="rights"><option value="0">${esc(t('tools.rights_personal'))}</option><option value="0.15">${esc(t('tools.rights_commercial'))}</option><option value="0.4">${esc(t('tools.rights_exclusive'))}</option></select></label><label class="field"><span>${esc(t('tools.expenses'))}</span><input name="exp" type="number" min="0" value="0"></label></div>
  <label class="check"><input type="checkbox" name="rush"> ${esc(t('tools.rush'))}</label><label class="field"><span>${esc(t('tools.tax'))}</span><input name="tax" type="number" min="0" max="100" value="0"></label></form>
  <div class="card" id="calc-out"></div></div>`;
}
function calcBind() {
  const f = $('#calc', root), out = $('#calc-out', root);
  const run = () => {
    const v = Object.fromEntries(new FormData(f));
    let base = (+v.hours || 0) * (+v.rate || 0) * TYPES[v.type] * (+v.cx);
    base *= 1 + Math.max(0, (+v.rev || 0) - 2) * 0.05 + (+v.rights) + (v.rush ? 0.25 : 0);
    const sub = base + (+v.exp || 0), tax = sub * ((+v.tax || 0) / 100);
    const rec = sub + tax, lo = rec * 0.85, hi = rec * 1.25;
    out.innerHTML = `<p class="muted">${esc(t('tools.recommended'))}</p><div class="big-num">${money(rec)}</div><p class="muted">${esc(t('tools.range'))}: <b>${money(lo)}</b> — <b>${money(hi)}</b></p>
      <ul class="rows"><li><span>${esc(t('tools.perHour'))}</span><b>${money(rec / Math.max(1, +v.hours))}</b></li><li><span>${esc(t('tools.deposit'))}</span><b>${money(rec * 0.5)}</b></li></ul>
      <p class="small muted">${esc(t('tools.calcTip'))}</p><button class="btn btn-primary" type="button" id="to-inv">${esc(t('tools.toInvoice'))}</button>`;
    $('#to-inv', out).onclick = () => { sessionStorage.setItem('nx_prefill', JSON.stringify({ desc: t('tools.pt_' + v.type), price: Math.round(sub), tax: +v.tax || 0 })); sub_('docs'); setTimeout(() => docModal('invoice'), 50); };
  };
  f.addEventListener('input', run); run();
}

// ---------- الفواتير والعقود ----------
const inp = (n, label, val = '', type = 'text', extra = '') => `<label class="field sm"><span>${esc(label)}</span><input name="${n}" type="${type}" value="${esc(val)}" ${extra}></label>`;
async function docsView() {
  docs = (await api('GET', '/api/docs')).docs;
  const rows = docs.map((d) => `<li data-id="${d.id}"><div><b>${esc(d.number)}</b> <span class="badge st-${d.status === 'paid' || d.status === 'accepted' ? 'published' : d.status === 'sent' ? 'unpublished' : 'draft'}">${esc(t('tools.ds_' + d.status))}</span><br><small class="muted">${esc(d.data.client.name || '—')} · ${money(d.total || 0, d.data.currency)}</small></div>
    <div class="row wrap"><a class="btn btn-ghost btn-sm" href="/doc/${d.token}" target="_blank" rel="noopener">${esc(t('common.preview'))}</a><button class="btn btn-ghost btn-sm" data-a="send">${esc(t('tools.send'))}</button>${d.type === 'invoice' && d.status !== 'paid' ? `<button class="btn btn-ghost btn-sm" data-a="paid">${esc(t('tools.markPaid'))}</button>` : ''}${d.status !== 'accepted' ? `<button class="btn btn-ghost btn-sm" data-a="edit">${esc(t('common.edit'))}</button>` : ''}<button class="btn btn-ghost btn-sm" data-a="del">✕</button></div></li>`).join('');
  return `<div class="row wrap mb"><button class="btn btn-primary" data-new="invoice">+ ${esc(t('tools.newInvoice'))}</button><button class="btn btn-primary" data-new="contract">+ ${esc(t('tools.newContract'))}</button></div><div class="card"><ul class="rows">${rows || `<li class="muted">${esc(t('tools.noDocs'))}</li>`}</ul></div>`;
}
function docModal(type, existing) {
  const pre = JSON.parse(sessionStorage.getItem('nx_prefill') || 'null'); sessionStorage.removeItem('nx_prefill');
  const d = existing?.data || { lang: getLang(), currency: 'USD', from: { name: state.user.name, email: state.user.email, address: '' }, client: { name: '', email: '', address: '' }, items: [{ desc: pre?.desc || '', qty: 1, price: pre?.price || 0 }], taxPercent: pre?.tax || 0, issueDate: new Date().toISOString().slice(0, 10), scope: '', price: pre?.price || 0, revisions: 2, paymentTerms: '', notes: '', clauses: [] };
  const itemRow = (i) => `<div class="item-row"><input name="i_desc" placeholder="${esc(t('tools.desc'))}" value="${esc(i.desc)}"><input name="i_qty" type="number" min="0" value="${i.qty}"><input name="i_price" type="number" min="0" step="any" value="${i.price}"><button type="button" class="mini" data-rm>✕</button></div>`;
  const m = modal(`<h3>${esc(t(type === 'invoice' ? 'tools.newInvoice' : 'tools.newContract'))}</h3><form id="df">
    <div class="grid2"><label class="field sm"><span>${esc(t('common.language'))}</span><select name="lang">${['en', 'fr', 'ar'].map((l) => `<option value="${l}" ${d.lang === l ? 'selected' : ''}>${{ en: 'English', fr: 'Français', ar: 'العربية' }[l]}</option>`).join('')}</select></label><label class="field sm"><span>${esc(t('tools.currency'))}</span><select name="currency">${CUR.map((c) => `<option ${d.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label></div>
    <div class="grid2"><div><b class="small">${esc(t('tools.from'))}</b>${inp('from_name', t('auth.f_name'), d.from.name)}${inp('from_email', t('auth.f_email'), d.from.email, 'email')}${inp('from_address', t('tools.address'), d.from.address)}</div><div><b class="small">${esc(t('tools.client'))}</b>${inp('client_name', t('auth.f_name'), d.client.name)}${inp('client_email', t('auth.f_email'), d.client.email, 'email')}${inp('client_address', t('tools.address'), d.client.address)}</div></div>
    ${type === 'invoice' ? `<div class="grid2">${inp('issueDate', t('tools.issueDate'), d.issueDate, 'date')}${inp('dueDate', t('tools.dueDate'), d.dueDate || '', 'date')}</div><b class="small">${esc(t('tools.items'))}</b><div id="items">${d.items.map(itemRow).join('')}</div><button type="button" class="btn btn-ghost btn-sm" id="add-i">+ ${esc(t('editor.addItem'))}</button>${inp('taxPercent', t('tools.tax'), d.taxPercent, 'number', 'min="0" max="100"')}`
      : `<label class="field sm"><span>${esc(t('tools.scope'))}</span><textarea name="scope" rows="4" required>${esc(d.scope || '')}</textarea></label><div class="grid2">${inp('price', t('tools.fee'), d.price, 'number', 'min="0" step="any"')}${inp('revisions', t('tools.revisions'), d.revisions ?? 2, 'number', 'min="0"')}${inp('startDate', t('tools.start'), d.startDate || '', 'date')}${inp('deadline', t('tools.deadline'), d.deadline || '', 'date')}</div>${inp('paymentTerms', t('tools.paymentTerms'), d.paymentTerms || '')}`}
    <label class="field sm"><span>${esc(t('editor.prop_text'))} / ${esc(t('tools.notes'))}</span><textarea name="notes" rows="2">${esc(d.notes || '')}</textarea></label>
    <div class="row end"><button class="btn btn-ghost" type="button" data-close>${esc(t('common.cancel'))}</button><button class="btn btn-primary">${esc(t('common.save'))}</button></div></form>`, { wide: true });
  const f = $('#df', m.el);
  $('#add-i', m.el)?.addEventListener('click', () => $('#items', m.el).insertAdjacentHTML('beforeend', itemRow({ desc: '', qty: 1, price: 0 })));
  m.el.addEventListener('click', (e) => { if (e.target.closest('[data-rm]')) e.target.closest('.item-row').remove(); });
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(f));
    const data = { lang: v.lang, currency: v.currency, from: { name: v.from_name, email: v.from_email, address: v.from_address }, client: { name: v.client_name, email: v.client_email, address: v.client_address }, notes: v.notes };
    if (type === 'invoice') Object.assign(data, { issueDate: v.issueDate, dueDate: v.dueDate, taxPercent: +v.taxPercent, items: $$('.item-row', f).map((r) => ({ desc: r.children[0].value, qty: +r.children[1].value, price: +r.children[2].value })) });
    else Object.assign(data, { scope: v.scope, price: +v.price, revisions: +v.revisions, startDate: v.startDate, deadline: v.deadline, paymentTerms: v.paymentTerms });
    try { existing ? await api('PUT', `/api/docs/${existing.id}`, { data }) : await api('POST', '/api/docs', { type, data }); m.close(); sub_('docs'); } catch (er) { toast(errText(er), 'err'); }
  });
}
async function docsBind() {
  root.onclick = async (e) => {
    const n = e.target.closest('[data-new]'); if (n) return docModal(n.dataset.new);
    const b = e.target.closest('[data-a]'); if (!b) return;
    const d = docs.find((x) => x.id === b.closest('li').dataset.id);
    try {
      if (b.dataset.a === 'edit') docModal(d.type, d);
      else if (b.dataset.a === 'paid') { await api('POST', `/api/docs/${d.id}/mark`, { status: 'paid' }); sub_('docs'); }
      else if (b.dataset.a === 'del') { if (await confirmBox(t('tools.confirmDel'), t('common.delete'))) { await api('DELETE', `/api/docs/${d.id}`); sub_('docs'); } }
      else if (b.dataset.a === 'send') modal(`<h3>${esc(t('tools.send'))} ${esc(d.number)}</h3>${inp('em', t('auth.f_email'), d.data.client.email, 'email')}<div class="row end"><button class="btn btn-primary" data-ok>${esc(t('tools.send'))}</button></div><div id="sent"></div>`, { onMount: (el) => el.querySelector('[data-ok]').addEventListener('click', async () => { try { const r = await api('POST', `/api/docs/${d.id}/send`, { email: el.querySelector('[name=em]').value }); el.querySelector('#sent').innerHTML = `<p class="${r.mailed ? '' : 'muted'} mt">${esc(t(r.mailed ? 'tools.mailed' : 'tools.copyLinkMsg'))}</p><div class="copybox" dir="ltr"><input readonly value="${esc(r.link)}"><button class="btn btn-ghost btn-sm" data-cp>${esc(t('editor.copyLink'))}</button></div>`; el.querySelector('[data-cp]').onclick = () => { navigator.clipboard?.writeText(r.link); toast(t('editor.copied'), 'ok'); }; } catch (er) { toast(errText(er), 'err'); } }) });
    } catch (er) { toast(errText(er), 'err'); }
  };
}

// ---------- مولّد Portfolio ----------
const readFile = (f) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });
function portfolioView() {
  const row = () => `<div class="proj card"><input name="p_title" placeholder="${esc(t('tools.pTitle'))}"><input name="p_cat" placeholder="${esc(t('tools.pCat'))}"><textarea name="p_desc" rows="2" placeholder="${esc(t('tools.pDesc'))}"></textarea><input type="file" name="p_img" accept="image/png,image/jpeg,image/webp"><button type="button" class="mini" data-rm>✕</button></div>`;
  setTimeout(() => {
    const f = $('#pf2', root), list = $('#projs', root);
    list.innerHTML = row(); $('#add-p', root).onclick = () => list.insertAdjacentHTML('beforeend', row());
    list.onclick = (e) => { if (e.target.closest('[data-rm]') && list.children.length > 1) e.target.closest('.proj').remove(); };
    f.onsubmit = async (e) => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(f)); const btn = f.querySelector('button.btn-primary'); btn.disabled = true;
      try {
        const projects = [];
        for (const p of $$('.proj', f)) {
          const file = p.querySelector('[type=file]').files[0]; let image = '';
          if (file) { if (file.size > 1_500_000) throw Object.assign(new Error('x'), { code: 'too_large' }); image = await readFile(file); }
          projects.push({ title: p.querySelector('[name=p_title]').value, category: p.querySelector('[name=p_cat]').value, description: p.querySelector('[name=p_desc]').value, image });
        }
        const r = await api('POST', '/api/portfolio/generate', { name: v.name, bio: v.bio, language: v.language, style: v.style, colors: { preset: v.preset }, projects });
        navigate(`/editor/${r.website.id}`);
      } catch (er) { toast(errText(er), 'err'); btn.disabled = false; }
    };
  }, 0);
  return `<form class="card" id="pf2"><h3>${esc(t('tools.portfolioTitle'))}</h3><p class="muted small">${esc(t('tools.portfolioHelp'))}</p>
  <div class="grid2"><label class="field"><span>${esc(t('tools.yourName'))}</span><input name="name" required maxlength="80" value="${esc(state.user.name)}"></label><label class="field"><span>${esc(t('common.language'))}</span><select name="language">${['en', 'fr', 'ar'].map((l) => `<option value="${l}" ${l === getLang() ? 'selected' : ''}>${{ en: 'English', fr: 'Français', ar: 'العربية' }[l]}</option>`).join('')}</select></label></div>
  <label class="field"><span>${esc(t('tools.bio'))}</span><textarea name="bio" rows="2" maxlength="300"></textarea></label>
  <div class="grid2"><label class="field"><span>${esc(t('generator.s3_title'))}</span><select name="style">${['creative', 'modern', 'minimal', 'luxury', 'futuristic', 'gaming', 'dark'].map((s) => `<option value="${s}">${esc(t('generator.style_' + s))}</option>`).join('')}</select></label><label class="field"><span>${esc(t('generator.s4_title'))}</span><select name="preset">${PRESETS.map((p) => `<option value="${p}">${esc(t('generator.preset_' + p))}</option>`).join('')}</select></label></div>
  <b class="small">${esc(t('tools.projects'))}</b><div id="projs"></div><button type="button" class="btn btn-ghost btn-sm mb" id="add-p">+ ${esc(t('tools.addProject'))}</button>
  <div><button class="btn btn-primary btn-lg">✦ ${esc(t('generator.generate'))}</button></div></form>`;
}

// ---------- الإطار ----------
async function paint() {
  root.innerHTML = `<div class="chips" role="tablist">${SUBS.map((k) => `<button class="chip ${k === sub ? 'on' : ''}" role="tab" data-sub="${k}">${esc(t('tools.sub_' + k))}</button>`).join('')}</div><div id="tl-body"><p class="muted">${esc(t('common.loading'))}</p></div>`;
  const body = $('#tl-body', root);
  if (sub === 'calc') { body.innerHTML = calcView(); calcBind(); }
  else if (sub === 'docs') { body.innerHTML = await docsView(); docsBind(); }
  else body.innerHTML = portfolioView();
}
function sub_(k) { sub = k; paint(); }
export function mount(el) {
  root = el;
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-sub]'); if (b) sub_(b.dataset.sub); });
  paint();
}
