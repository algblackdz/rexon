// لوحة المستخدم: My Websites / Create / Templates / Billing / Domains / Settings
import { t, getLang, setLang, LANGS } from '../i18n.js';
import { esc, $, $$, api, state, toast, errText, modal, confirmBox, fmtDate, fmtDay, logoHTML, absUrl } from '../core.js';
import { navigate } from '../main.js';
import { renderDocument } from '/shared/render.js';
import { buildCSS } from '/shared/css.js';
import { siteLangs } from '/shared/schema.js';
import { statusBadge, payModal, domainModal } from '../siteops.js';
import { langSwitcherHTML, motionToggleHTML } from '../shell.js';
import { motion, setReduced } from '../fx.js';
import { templateCard, bindTemplateCards } from './templates.js';

const BASE_TABS = [['websites', '▦'], ['create', '＋'], ['templates', '◧'], ['tools', '✦'], ['ads', '📣'], ['billing', '$'], ['domains', '⌘'], ['settings', '⚙']];
// تبويب الطاقم يظهر فقط لمن لديه رتبة
const tabsFor = () => (state.user?.role && state.user.role !== 'user' ? [...BASE_TABS, ['staff', '★']] : BASE_TABS);
const tabLabel = (k) => (k === 'tools' ? t('tools.tab_tools') : k === 'ads' ? t('ads.title') : k === 'staff' ? t('support.staff') : t('dashboard.tab_' + k));
let sites = [];

const thumbDoc = (w) => {
  const langs = siteLangs(w.data);
  const lang = langs.includes(getLang()) ? getLang() : langs[0];
  return renderDocument(w.data, w.data.pages[0], lang, { css: buildCSS(w.data) });
};
const urlOf = (w) => absUrl(w.url);

function websitesTab() {
  if (!sites.length) return `<div class="empty card"><h3>${esc(t('dashboard.emptyTitle'))}</h3><p class="muted">${esc(t('dashboard.emptyText'))}</p><a class="btn btn-primary" data-magnetic href="#/generator">${esc(t('common.createWebsite'))}</a></div>`;
  return `<div class="site-grid">${sites.map((w, i) => `<article class="card site" data-reveal data-cursor="card" style="--d:${i * 0.05}s" data-id="${w.id}">
    <a class="thumb" href="#/editor/${w.id}" aria-label="${esc(t('common.edit'))} ${esc(w.name)}"><iframe tabindex="-1" loading="lazy" data-thumb="${w.id}" title=""></iframe></a>
    <div class="site-meta"><div><h3>${esc(w.name)}</h3><p class="muted small">${esc(t('dashboard.lastEdited'))}: ${esc(fmtDate(w.updatedAt))}</p></div>${statusBadge(w.status)}</div>
    <div class="row wrap"><a class="btn btn-primary btn-sm" href="#/editor/${w.id}">${esc(t('common.edit'))}</a><button class="btn btn-ghost btn-sm" data-act="preview">${esc(t('common.preview'))}</button>
    <details class="menu"><summary class="btn btn-ghost btn-sm">${esc(t('common.settings'))}</summary><ul class="glass"><li data-act="rename">${esc(t('dashboard.rename'))}</li><li data-act="duplicate">${esc(t('dashboard.duplicate'))}</li><li data-act="domain">${esc(t('dashboard.connectDomain'))}</li><li data-act="export">${esc(t('editor.exportCode'))}</li><li class="danger" data-act="delete">${esc(t('common.delete'))}</li></ul></details></div></article>`).join('')}</div>`;
}

function billingTab(b) {
  state.config.pricing = { model: b.model, scope: b.scope, priceUsd: b.priceUsd, trialDays: b.trialDays }; state.config.priceUsd = b.priceUsd;
  const days = Math.max(0, Math.ceil((b.trialEndsAt - Date.now()) / 86400000));
  const note = t('tools.note_' + b.model + '_' + b.scope);
  const acct = b.scope === 'account';
  return `<div class="grid2"><div class="card"><span class="pill ${b.trialActive ? '' : 'warn'}">${esc(b.trialActive ? t('dashboard.trialActive', { days }) : t('dashboard.trialEnded'))}</span>
    <h3 class="mt">$${b.priceUsd} <small class="muted">${esc(note)}</small></h3><p class="muted">${esc(t('tools.billingText_' + b.model))}</p>${b.mode === 'mock' ? `<p class="small muted">${esc(t('dashboard.payDemo'))}</p>` : ''}
    ${acct ? (b.accountPaid ? `<span class="badge st-published">${esc(t('dashboard.paid'))}${b.accountUntil ? ' · ' + esc(fmtDay(b.accountUntil)) : ''}</span>` : `<button class="btn btn-primary mt" data-pay="account">${esc(t('dashboard.payNow', { price: b.priceUsd }))}</button>`) : ''}</div>
    <div class="card"><h3>${esc(t('dashboard.billingSites'))}</h3>${b.websites.length ? `<ul class="rows">${b.websites.map((w) => `<li><span>${esc(w.name)}</span>${w.paid ? `<span class="badge st-published">${esc(t('dashboard.paid'))}${w.until ? ' · ' + esc(fmtDay(w.until)) : ''}</span>` : acct ? '' : `<button class="btn btn-primary btn-sm" data-pay="${w.id}">${esc(t('dashboard.payNow', { price: b.priceUsd }))}</button>`}</li>`).join('')}</ul>` : `<p class="muted">${esc(t('dashboard.noSites'))}</p>`}</div></div>`;
}

function domainsTab() {
  if (!sites.length) return `<div class="empty card"><p class="muted">${esc(t('dashboard.noSites'))}</p></div>`;
  return `<div class="card"><ul class="rows">${sites.map((w) => `<li><div><b>${esc(w.name)}</b><div class="small muted" dir="ltr">${esc(w.subdomain)}.${esc(state.config.platformDomain)}${w.customDomain ? ' · ' + esc(w.customDomain) : ''}</div></div><button class="btn btn-ghost btn-sm" data-domain="${w.id}">${esc(t('dashboard.connectDomain'))}</button></li>`).join('')}</ul></div>`;
}

function settingsTab() {
  const u = state.user;
  return `<div class="grid2"><form class="card" id="prof"><h3>${esc(t('dashboard.account'))}</h3><label class="field"><span>${esc(t('auth.f_name'))}</span><input name="name" value="${esc(u.name)}" maxlength="60"></label><label class="field"><span>${esc(t('auth.f_email'))}</span><input value="${esc(u.email)}" disabled dir="ltr"></label><button class="btn btn-primary">${esc(t('common.save'))}</button></form>
  <div class="card"><h3>${esc(t('dashboard.preferences'))}</h3><label class="field"><span>${esc(t('common.language'))}</span><select id="set-lang">${LANGS.map((l) => `<option value="${l}" ${l === getLang() ? 'selected' : ''}>${{ en: 'English', fr: 'Français', ar: 'العربية' }[l]}</option>`).join('')}</select></label>
  <label class="check"><input type="checkbox" id="set-motion" ${motion.reduced ? 'checked' : ''}> ${esc(t('common.reduceMotion'))}</label>
  <button class="btn btn-ghost mt" id="logout">${esc(t('common.logout'))}</button></div>
  ${state.config.founderClaimable ? `<form class="card" id="claim"><h3>${esc(t('support.claimTitle'))}</h3><p class="muted small">${esc(t('ads.claimTextLogs'))}</p><label class="field"><input name="key" type="password" autocomplete="off" required></label><button class="btn btn-primary">${esc(t('support.claimBtn'))}</button></form>` : ''}</div>`;
}

export default {
  title: 'common.nav_dashboard',
  async render({ name }) {
    const tab = tabsFor().some(([k]) => k === name) ? name : 'websites';
    if (tab === 'create') { setTimeout(() => navigate('/generator'), 0); return ''; }
    if (tab === 'websites' || tab === 'domains') sites = (await api('GET', '/api/websites').catch(() => ({ websites: [] }))).websites;
    let inner = '';
    if (tab === 'websites') inner = `<div class="dash-bar"><h1 class="h2">${esc(t('dashboard.myWebsites'))}</h1><div class="row"><label class="btn btn-ghost btn-sm" tabindex="0">${esc(t('dashboard.import'))}<input type="file" id="imp" accept="application/json,.json" hidden></label><a class="btn btn-primary" data-magnetic href="#/generator">${esc(t('common.createWebsite'))}</a></div></div>${websitesTab()}`;
    else if (tab === 'templates') {
      const { templates } = await api('GET', '/api/templates');
      inner = `<h1 class="h2 mb">${esc(t('common.nav_templates'))}</h1><div class="tpl-grid">${templates.map(templateCard).join('')}</div>`;
    } else if (tab === 'billing') inner = `<h1 class="h2 mb">${esc(t('dashboard.tab_billing'))}</h1>${billingTab(await api('GET', '/api/billing'))}`;
    else if (tab === 'domains') inner = `<h1 class="h2 mb">${esc(t('dashboard.tab_domains'))}</h1>${domainsTab()}`;
    else if (tab === 'tools') inner = `<h1 class="h2 mb">${esc(t('tools.tab_tools'))}</h1><div id="tools-root"></div>`;
    else if (tab === 'ads') inner = `<h1 class="h2 mb">${esc(t('ads.title'))}</h1><div id="ads-root"></div>`;
    else if (tab === 'staff') inner = `<h1 class="h2 mb">${esc(t('support.staff'))}</h1><div id="staff-root"></div>`;
    else inner = `<h1 class="h2 mb">${esc(t('common.settings'))}</h1>${settingsTab()}`;
    return `<div class="dash"><aside class="dash-side glass"><a class="brand" href="#/">${logoHTML()}</a>
      <nav aria-label="Dashboard">${tabsFor().map(([k, ic]) => `<a href="#/dashboard/${k}" class="${k === tab ? 'on' : ''}" ${k === tab ? 'aria-current="page"' : ''}><i aria-hidden="true">${ic}</i>${esc(tabLabel(k))}</a>`).join('')}</nav>
      <div class="side-foot">${langSwitcherHTML()}${motionToggleHTML()}</div></aside>
      <main id="view" class="dash-main page-in" tabindex="-1">${inner}</main></div>`;
  },
  mount(root, { name }) {
    const tab = tabsFor().some(([k]) => k === name) ? name : 'websites';
    if (tab === 'tools') import('./tools.js').then((m) => m.mount($('#tools-root', root)));
    if (tab === 'ads') import('./ads.js').then((m) => m.mount($('#ads-root', root)));
    if (tab === 'staff') import('./staff.js').then((m) => m.mount($('#staff-root', root)));
    $$('[data-reveal]', root).forEach((el) => el.classList.add('in'));
    if (new URLSearchParams(location.hash.split('?')[1] || '').get('paid')) toast(t('dashboard.paid'), 'ok');
    const reload = () => dispatchEvent(new Event('hashchange'));
    if (tab === 'websites') {
      $$('iframe[data-thumb]', root).forEach((f) => { f.srcdoc = thumbDoc(sites.find((s) => s.id === f.dataset.thumb)); });
      $('#imp', root)?.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try { const r = await api('POST', '/api/websites', { website: JSON.parse(await file.text()) }); navigate(`/editor/${r.website.id}`); } catch (er) { toast(errText(er), 'err'); }
      });
      root.addEventListener('click', async (e) => {
        const li = e.target.closest('[data-act]'); const card = e.target.closest('.site'); if (!li || !card) return;
        const w = sites.find((s) => s.id === card.dataset.id); card.querySelector('details')?.removeAttribute('open');
        try {
          if (li.dataset.act === 'preview') { if (urlOf(w)) window.open(urlOf(w), '_blank', 'noopener'); else modal(`<h3>${esc(w.name)}</h3><iframe class="tpl-full" srcdoc="${esc(thumbDoc(w))}" title="preview"></iframe>`, { wide: true }); }
          else if (li.dataset.act === 'duplicate') { await api('POST', `/api/websites/${w.id}/duplicate`); reload(); }
          else if (li.dataset.act === 'domain') domainModal(w, reload);
          else if (li.dataset.act === 'export') location.href = `/api/websites/${w.id}/export`;
          else if (li.dataset.act === 'delete') { if (await confirmBox(t('dashboard.confirmDelete', { name: w.name }), t('common.delete'))) { await api('DELETE', `/api/websites/${w.id}`); reload(); } }
          else if (li.dataset.act === 'rename') modal(`<h3>${esc(t('dashboard.rename'))}</h3><label class="field"><input id="rn" value="${esc(w.name)}" maxlength="80" autofocus></label><div class="row end"><button class="btn btn-primary" data-ok>${esc(t('common.save'))}</button></div>`, { onMount: (el, close) => el.querySelector('[data-ok]').addEventListener('click', async () => { await api('PATCH', `/api/websites/${w.id}`, { name: el.querySelector('#rn').value }); close(); reload(); }) });
        } catch (er) { toast(errText(er), 'err'); }
      });
    }
    if (tab === 'templates') bindTemplateCards(root);
    if (tab === 'billing') root.addEventListener('click', (e) => { const b = e.target.closest('[data-pay]'); if (b) payModal({ id: b.dataset.pay === 'account' ? null : b.dataset.pay }, reload); });
    if (tab === 'domains') root.addEventListener('click', (e) => { const b = e.target.closest('[data-domain]'); if (b) domainModal(sites.find((s) => s.id === b.dataset.domain), reload); });
    if (tab === 'settings') {
      $('#prof', root).addEventListener('submit', async (e) => { e.preventDefault(); try { state.user = (await api('PATCH', '/api/auth/me', { name: e.target.name.value })).user; toast(t('common.saved'), 'ok'); } catch (er) { toast(errText(er), 'err'); } });
      $('#set-lang', root).addEventListener('change', async (e) => { await setLang(e.target.value); api('PATCH', '/api/auth/me', { language: e.target.value }).catch(() => {}); });
      $('#set-motion', root).addEventListener('change', (e) => setReduced(e.target.checked));
      $('#claim', root)?.addEventListener('submit', async (e) => { e.preventDefault(); try { await api('POST', '/api/staff/claim-founder', { key: e.target.key.value }); state.user = (await api('GET', '/api/auth/me')).user; state.config.founderClaimable = false; toast(t('common.saved'), 'ok'); dispatchEvent(new Event('hashchange')); } catch (er) { toast(errText(er), 'err'); } });
      $('#logout', root).addEventListener('click', async () => { await api('POST', '/api/auth/logout'); state.user = null; navigate('/'); });
    }
  }
};
