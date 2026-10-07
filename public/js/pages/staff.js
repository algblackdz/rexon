// ============================================================
// لوحة الطاقم (تظهر فقط لمن لديه رتبة): دعم، مستخدمون، مواقع، تسعير، إحصائيات
// الواجهة تُخفي التبويبات حسب الصلاحيات، والخادم هو الذي يفرضها فعليًا.
// ============================================================
import { t } from '../i18n.js';
import { esc, $, $$, api, state, toast, errText, fmtDate } from '../core.js';

const has = (p) => state.user.perms.includes(p);
let root, sub = null, current = null, timer = null;
const SUBS = [['support', 'support.read'], ['users', 'users.view'], ['sites', 'sites.moderate'], ['pricing', 'pricing.edit'], ['adsprice', 'pricing.edit'], ['integrations', 'settings.edit'], ['overview', 'stats.view']];

function shell() {
  const list = SUBS.filter(([, p]) => has(p));
  sub = list.some(([k]) => k === sub) ? sub : list[0]?.[0];
  root.innerHTML = `<div class="chips" role="tablist">${list.map(([k]) => `<button class="chip ${k === sub ? 'on' : ''}" role="tab" data-sub="${k}">${esc(t(k === 'adsprice' || k === 'integrations' ? 'ads.sub_' + k : 'support.sub_' + k))}</button>`).join('')}<span class="muted small">${esc(t('support.yourRole'))}: <b>${esc(t('support.role_' + state.user.role))}</b></span></div><div id="st-body"></div>`;
  clearInterval(timer);
  if (sub === 'adsprice' || sub === 'integrations') { import('./staff-extra.js').then((m) => (sub === 'adsprice' ? m.viewAdsPricing : m.viewIntegrations)($('#st-body', root))); return; }
  ({ support: viewSupport, users: viewUsers, sites: viewSites, pricing: viewPricing, overview: viewOverview })[sub]?.($('#st-body', root));
}

async function viewSupport(el, status = 'open') {
  const { tickets } = await api('GET', `/api/staff/tickets?status=${status}`);
  el.innerHTML = `<div class="st-grid"><div class="card st-list"><div class="seg"><button class="${status === 'open' ? 'on' : ''}" data-st="open">${esc(t('support.open_'))}</button><button class="${status === 'closed' ? 'on' : ''}" data-st="closed">${esc(t('support.closed_'))}</button></div>
    <ul class="list">${tickets.length ? tickets.map((x) => `<li data-id="${x.id}" class="${x.id === current ? 'on' : ''}"><span><b>${esc(x.userName)}</b><br><small class="muted">${esc(x.last)}</small></span>${x.needsReply ? '<i class="dotred"></i>' : ''}</li>`).join('') : `<li class="muted">${esc(t('support.noTickets'))}</li>`}</ul></div>
    <div class="card st-chat" id="st-chat"><p class="muted">${esc(t('support.pick'))}</p></div></div>`;
  el.querySelector('[data-st]').parentElement.addEventListener('click', (e) => { const b = e.target.closest('[data-st]'); if (b) viewSupport(el, b.dataset.st); });
  el.querySelector('.st-list ul').addEventListener('click', (e) => { const li = e.target.closest('li[data-id]'); if (li) { current = li.dataset.id; $$('.st-list li', el).forEach((x) => x.classList.toggle('on', x === li)); openTicket(el); } });
  if (current && tickets.some((x) => x.id === current)) openTicket(el);
  clearInterval(timer); timer = setInterval(() => { if (!document.body.contains(el)) return clearInterval(timer); current ? refreshChat() : null; }, 6000);
}
async function refreshChat() { const chat = $('#st-chat'); if (!chat || !current) return; try { const { ticket } = await api('GET', `/api/staff/tickets/${current}`); const n = $$('.am', chat).length; if (n !== ticket.messages.length) paintChat(chat, ticket); } catch { /* */ } }
function paintChat(chat, tk) {
  chat.innerHTML = `<div class="row"><b>${esc(tk.userName)}</b><span class="muted small" dir="ltr">${esc(tk.userEmail)}</span><i class="grow"></i>${tk.status === 'open' ? `<button class="btn btn-ghost btn-sm" data-close>${esc(t('support.closeTicket'))}</button>` : ''}</div>
    <div class="a-log st-log">${tk.messages.map((m) => `<div class="am ${m.from === 'user' ? 'b' : 'u'}"><small>${esc(m.name)} · ${esc(fmtDate(m.at))}</small>${esc(m.text).replace(/\n/g, '<br>')}</div>`).join('')}</div>
    ${has('support.reply') ? `<form class="a-form"><textarea rows="2" maxlength="1000" placeholder="${esc(t('support.reply'))}"></textarea><button class="btn btn-primary btn-sm">${esc(t('editor.send'))}</button></form>` : ''}`;
  const log = $('.st-log', chat); log.scrollTop = log.scrollHeight;
}
async function openTicket(el) {
  const chat = $('#st-chat', el); const { ticket } = await api('GET', `/api/staff/tickets/${current}`); paintChat(chat, ticket);
  chat.onsubmit = async (e) => { e.preventDefault(); const ta = e.target.querySelector('textarea'); if (!ta.value.trim()) return; try { await api('POST', `/api/staff/tickets/${current}/reply`, { text: ta.value }); openTicket(el); } catch (er) { toast(errText(er), 'err'); } };
  chat.onclick = async (e) => { if (e.target.closest('[data-close]')) { await api('POST', `/api/staff/tickets/${current}/close`); current = null; viewSupport(el); } };
}

async function viewUsers(el, q = '') {
  const { users, roles } = await api('GET', `/api/staff/users?q=${encodeURIComponent(q)}`);
  const rank = { user: 0, support: 1, moderator: 2, admin: 3, founder: 4 }, mine = rank[state.user.role];
  el.innerHTML = `<input id="u-q" class="mb" placeholder="${esc(t('support.search'))}" value="${esc(q)}"><div class="card tbl"><table><tr><th>${esc(t('auth.f_name'))}</th><th>${esc(t('auth.f_email'))}</th><th>${esc(t('support.role'))}</th><th>${esc(t('support.sites'))}</th><th></th></tr>
    ${users.map((u) => { const canEdit = has('users.setRole') && (state.user.role === 'founder' ? u.id !== state.user.id : rank[u.role] < mine); return `<tr><td>${esc(u.name)}</td><td dir="ltr">${esc(u.email)}</td><td>${canEdit ? `<select data-role="${u.id}">${roles.filter((r) => state.user.role === 'founder' || rank[r] < mine).map((r) => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${esc(t('support.role_' + r))}</option>`).join('')}</select>` : esc(t('support.role_' + u.role))}</td><td>${u.sites}</td><td>${has('users.ban') && rank[u.role] < mine && u.id !== state.user.id ? `<button class="btn btn-ghost btn-sm" data-ban="${u.id}" data-b="${u.banned ? 0 : 1}">${esc(t(u.banned ? 'support.unban' : 'support.ban'))}</button>` : ''}${u.banned ? ' <span class="badge st-unpublished">' + esc(t('support.banned')) + '</span>' : ''}</td></tr>`; }).join('')}</table></div>`;
  let tm; $('#u-q', el).addEventListener('input', (e) => { clearTimeout(tm); tm = setTimeout(() => viewUsers(el, e.target.value), 350); });
  el.onchange = async (e) => { const s = e.target.closest('[data-role]'); if (!s) return; try { await api('POST', `/api/staff/users/${s.dataset.role}/role`, { role: s.value }); toast(t('common.saved'), 'ok'); } catch (er) { toast(errText(er), 'err'); viewUsers(el, q); } };
  el.onclick = async (e) => { const b = e.target.closest('[data-ban]'); if (!b) return; try { await api('POST', `/api/staff/users/${b.dataset.ban}/ban`, { banned: b.dataset.b === '1' }); viewUsers(el, q); } catch (er) { toast(errText(er), 'err'); } };
}

async function viewSites(el, q = '') {
  const { sites } = await api('GET', `/api/staff/sites?q=${encodeURIComponent(q)}`);
  el.innerHTML = `<input id="s-q" class="mb" placeholder="${esc(t('support.search'))}" value="${esc(q)}"><div class="card tbl"><table><tr><th>${esc(t('support.site'))}</th><th>${esc(t('support.owner'))}</th><th>${esc(t('support.status'))}</th><th></th></tr>${sites.map((s) => `<tr><td>${esc(s.name)}<br><small class="muted" dir="ltr">/s/${esc(s.subdomain)}/</small></td><td dir="ltr">${esc(s.owner)}</td><td>${esc(t('dashboard.status_' + s.status))}${s.banned ? ' · ' + esc(t('support.banned')) : ''}</td><td><button class="btn btn-ghost btn-sm" data-td="${s.id}" data-b="${s.banned ? 0 : 1}">${esc(t(s.banned ? 'support.restore' : 'support.takedown'))}</button></td></tr>`).join('')}</table></div>`;
  let tm; $('#s-q', el).addEventListener('input', (e) => { clearTimeout(tm); tm = setTimeout(() => viewSites(el, e.target.value), 350); });
  el.onclick = async (e) => { const b = e.target.closest('[data-td]'); if (!b) return; try { await api('POST', `/api/staff/sites/${b.dataset.td}/takedown`, { banned: b.dataset.b === '1' }); viewSites(el, q); } catch (er) { toast(errText(er), 'err'); } };
}

async function viewPricing(el) {
  const { pricing: p } = await api('GET', '/api/staff/pricing');
  el.innerHTML = `<form class="card st-price" id="pf"><h3>${esc(t('support.pricingTitle'))}</h3><p class="muted small">${esc(t('support.pricingHelp'))}</p>
    <label class="field"><span>${esc(t('support.model'))}</span><select name="model"><option value="once" ${p.model === 'once' ? 'selected' : ''}>${esc(t('support.model_once'))}</option><option value="monthly" ${p.model === 'monthly' ? 'selected' : ''}>${esc(t('support.model_monthly'))}</option></select></label>
    <label class="field"><span>${esc(t('support.scope'))}</span><select name="scope"><option value="website" ${p.scope === 'website' ? 'selected' : ''}>${esc(t('support.scope_website'))}</option><option value="account" ${p.scope === 'account' ? 'selected' : ''}>${esc(t('support.scope_account'))}</option></select></label>
    <div class="grid2"><label class="field"><span>${esc(t('support.price'))} (USD)</span><input name="priceUsd" type="number" min="0.5" max="10000" step="0.5" value="${p.priceUsd}"></label><label class="field"><span>${esc(t('support.trialDays'))}</span><input name="trialDays" type="number" min="0" max="90" value="${p.trialDays}"></label></div>
    <p class="pill alt" id="pv"></p><div><button class="btn btn-primary">${esc(t('common.save'))}</button></div></form>`;
  const f = $('#pf', el), pv = () => { $('#pv', el).textContent = `${f.trialDays.value} ${t('support.days')} → $${f.priceUsd.value} · ${t('tools.note_' + f.model.value + '_' + f.scope.value)}`; };
  f.addEventListener('input', pv); pv();
  f.addEventListener('submit', async (e) => { e.preventDefault(); try { const r = await api('PUT', '/api/staff/pricing', Object.fromEntries(new FormData(f))); Object.assign(state.config, { pricing: r.pricing, priceUsd: r.pricing.priceUsd, trialDays: r.pricing.trialDays }); toast(t('common.saved'), 'ok'); } catch (er) { toast(errText(er), 'err'); } });
}

async function viewOverview(el) {
  const o = await api('GET', '/api/staff/overview');
  el.innerHTML = `<div class="stat-grid">${['users', 'staff', 'websites', 'published', 'paidSites', 'openTickets'].map((k) => `<div class="card stat"><b>${o[k]}</b><span class="muted">${esc(t('support.stat_' + k))}</span></div>`).join('')}</div>`;
}

export function mount(el) {
  root = el;
  root.addEventListener('click', (e) => { const b = e.target.closest('[data-sub]'); if (b) { sub = b.dataset.sub; shell(); } });
  shell();
}
