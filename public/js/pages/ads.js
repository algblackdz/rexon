// ============================================================
// إضافة الحملات الإعلانية (Ads Hub) داخل لوحة التحكم — نفس هوية الموقع (نفس الأصناف والألوان)
// 1) القنوات: ربط Meta / TikTok / Telegram / Discord   2) بناء الحملة وزرّا "نشر مجاني" و"نشر مدفوع"
// 3) سجل الحملات ونتائج كل منصة وروابط المشاركة
// ============================================================
import { t, getLang, has } from '../i18n.js';
import { esc, $, $$, api, state, toast, errText, modal, confirmBox, debounce, absUrl } from '../core.js';

const FREE = ['meta_page', 'instagram', 'telegram', 'discord', 'share'], PAID = ['meta_ads', 'tiktok_ads'];
const CTAS = ['LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'CONTACT_US', 'GET_QUOTE', 'BOOK_NOW'];
let root, P, campaigns = [], sites = [], D;
const blank = () => ({ id: '', name: '', websiteId: '', lang: getLang(), creative: { headline: '', text: '', url: '', imageUrl: '', cta: 'LEARN_MORE' }, variants: [], audience: { countries: 'US', ageMin: 18, ageMax: 65, gender: 'all', interests: '' }, budget: { daily: 5, days: 7, startDate: '' }, features: { aiCopy: false, retargeting: false }, free: ['share'], paid: [] });
const money = (n) => `$${(+n || 0).toFixed(2)}`;
const errMsg = (e) => (has('ads.err_' + e?.code) ? t('ads.err_' + e.code) : errText(e));
const resErr = (m) => (has('ads.e_' + m) ? t('ads.e_' + m) : m);

function body(mode) {
  const c = D, p = mode === 'paid';
  return { id: c.id || undefined, name: c.name || c.creative.headline.slice(0, 40) || 'Campaign', mode, websiteId: c.websiteId, lang: c.lang, creative: c.creative, variants: c.variants, audience: { ...c.audience, countries: String(c.audience.countries).split(/[,\s]+/).filter(Boolean) }, budget: c.budget, features: c.features, targets: p ? c.paid : c.free };
}

// ---------- القنوات ----------
function channelCard(id, inner) { return `<article class="card ch" data-ch="${id}"><h3>${esc(t('ads.ch_' + id))}</h3>${inner}</article>`; }
function channelsHTML() {
  const cn = P.connections, cf = P.configured, founder = state.user.perms.includes('settings.edit');
  const note = (k) => `<p class="muted small">${esc(t('ads.notConfigured'))}${founder ? ` <a href="#/dashboard/staff">${esc(t('ads.configureNow'))}</a>` : ` ${esc(t('ads.askFounder'))}`}</p>`;
  const sel = (id, list, cur, key, label) => `<label class="field sm"><span>${esc(label)}</span><select data-sel="${key}" data-conn="${id}">${list.map((x) => `<option value="${esc(x.id)}" ${x.id === cur ? 'selected' : ''}>${esc(x.name)}${x.currency ? ' · ' + esc(x.currency) : ''}</option>`).join('')}</select></label>`;
  const status = (c) => `<span class="badge ${c.connected ? 'st-published' : 'st-draft'}">${esc(t(c.connected ? 'ads.connected' : 'ads.notConnected'))}</span>${c.expired ? ` <span class="badge st-unpublished">${esc(t('ads.expired'))}</span>` : ''}`;
  const disc = (id) => `<button class="btn btn-ghost btn-sm" data-disc="${id}">${esc(t('ads.disconnect'))}</button>`;
  const oauth = (id, extra) => cf[id] ? (cn[id].connected ? `${extra}<div class="row">${disc(id)}<button class="btn btn-ghost btn-sm" data-oauth="${id}">${esc(t('ads.reconnect'))}</button></div>` : `<button class="btn btn-primary" data-oauth="${id}" data-magnetic>${esc(t('ads.connect'))}</button>`) : note(id);
  return `<div class="ads-grid">
    ${channelCard('meta', `<p class="muted small">${esc(t('ads.meta_desc'))}</p>${status(cn.meta)}${oauth('meta', cn.meta.connected ? sel('meta', cn.meta.info.adAccounts || [], cn.meta.selected.adAccountId, 'adAccountId', t('ads.adAccount')) + sel('meta', cn.meta.info.pages || [], cn.meta.selected.pageId, 'pageId', t('ads.page')) : '')}`)}
    ${channelCard('tiktok', `<p class="muted small">${esc(t('ads.tiktok_desc'))}</p>${status(cn.tiktok)}${oauth('tiktok', cn.tiktok.connected ? sel('tiktok', cn.tiktok.info.advertisers || [], cn.tiktok.selected.advertiserId, 'advertiserId', t('ads.advertiser')) : '')}`)}
    ${channelCard('telegram', `<p class="muted small">${esc(t('ads.tg_help'))}</p>${status(cn.telegram)}${cn.telegram.connected ? `<p class="small" dir="ltr">${esc(cn.telegram.info.chatId || '')}</p>${disc('telegram')}` : `<form data-form="telegram"><label class="field sm"><span>${esc(t('ads.tgToken'))}</span><input name="token" dir="ltr" autocomplete="off" required></label><label class="field sm"><span>${esc(t('ads.tgChat'))}</span><input name="chatId" dir="ltr" placeholder="@mychannel" required></label><button class="btn btn-primary btn-sm">${esc(t('ads.connectTest'))}</button></form>`}`)}
    ${channelCard('discord', `<p class="muted small">${esc(t('ads.dc_help'))}</p>${status(cn.discord)}${cn.discord.connected ? disc('discord') : `<form data-form="discord"><label class="field sm"><span>Webhook URL</span><input name="webhook" dir="ltr" autocomplete="off" required placeholder="https://discord.com/api/webhooks/…"></label><button class="btn btn-primary btn-sm">${esc(t('ads.connectTest'))}</button></form>`}`)}
  </div><p class="muted small mt">${esc(t('ads.soon'))}: ${P.targets.filter((x) => x.planned).map((x) => esc(t('ads.tg_' + x.id))).join(' · ')}</p>`;
}

// ---------- البناء ----------
const tgt = (id, group) => { const x = P.targets.find((z) => z.id === id), on = D[group].includes(id), ok = x.configured && x.connected;
  return `<label class="tgt ${ok ? '' : 'off'}"><input type="checkbox" data-t="${group}" value="${id}" ${on ? 'checked' : ''} ${ok || id === 'share' ? '' : 'disabled'}><span>${esc(t('ads.tg_' + id))}</span>${ok || id === 'share' ? '' : `<small class="muted">${esc(t(x.configured ? 'ads.notConnected' : 'ads.notConfiguredShort'))}</small>`}</label>`; };
const f = (label, input) => `<label class="field sm"><span>${esc(label)}</span>${input}</label>`;
function builderHTML() {
  const c = D, cr = c.creative;
  return `<div class="grid2 ads-build"><div class="card"><h3>${esc(t('ads.creative'))}</h3>
    ${f(t('ads.f_name'), `<input data-k="name" value="${esc(c.name)}" maxlength="80">`)}
    ${sites.length ? f(t('ads.f_site'), `<select data-k="websiteId"><option value="">—</option>${sites.map((s) => `<option value="${s.id}" ${c.websiteId === s.id ? 'selected' : ''}>${esc(s.name)}${s.url ? '' : ' (' + esc(t('dashboard.status_draft')) + ')'}</option>`).join('')}</select>`) : ''}
    ${f(t('ads.f_url'), `<input data-k="creative.url" dir="ltr" value="${esc(cr.url)}" placeholder="https://…">`)}
    <div class="row"><button class="btn btn-ghost btn-sm" data-ai>${esc(t('ads.aiCopy'))}</button><span class="muted small">${esc(t('ads.aiCopyHelp'))}</span></div><div id="ai-vars"></div>
    ${f(t('ads.f_headline'), `<input data-k="creative.headline" maxlength="80" value="${esc(cr.headline)}">`)}
    ${f(t('ads.f_text'), `<textarea data-k="creative.text" rows="3" maxlength="500">${esc(cr.text)}</textarea>`)}
    ${f(t('ads.f_image'), `<input data-k="creative.imageUrl" dir="ltr" value="${esc(cr.imageUrl)}" placeholder="https://…/image.jpg">`)}
    ${f(t('ads.f_cta'), `<select data-k="creative.cta">${CTAS.map((x) => `<option value="${x}" ${cr.cta === x ? 'selected' : ''}>${esc(t('ads.cta_' + x))}</option>`).join('')}</select>`)}
    ${c.variants.map((v, i) => `<div class="card var"><b class="small">${esc(t('ads.variant'))} ${i + 2}</b><input data-v="${i}" data-vk="headline" value="${esc(v.headline)}" placeholder="${esc(t('ads.f_headline'))}"><textarea data-v="${i}" data-vk="text" rows="2" placeholder="${esc(t('ads.f_text'))}">${esc(v.text)}</textarea><button class="mini" data-rmv="${i}">✕</button></div>`).join('')}
    ${c.variants.length < 2 ? `<button class="btn btn-ghost btn-sm" data-addv>+ ${esc(t('ads.addVariant'))}</button>` : ''}</div>
  <div class="card"><h3>${esc(t('ads.where'))}</h3>
    <b class="small">${esc(t('ads.freeChannels'))}</b><div class="tgts">${FREE.map((i) => tgt(i, 'free')).join('')}</div>
    <b class="small">${esc(t('ads.paidChannels'))}</b><div class="tgts">${PAID.map((i) => tgt(i, 'paid')).join('')}</div>
    <details class="item" ${c.paid.length ? 'open' : ''}><summary>${esc(t('ads.paidOptions'))}</summary>
      <div class="grid2">${f(t('ads.f_daily'), `<input type="number" data-k="budget.daily" min="1" max="${P.limits.maxDaily}" step="0.5" value="${c.budget.daily}">`)}${f(t('ads.f_days'), `<input type="number" data-k="budget.days" min="1" max="90" value="${c.budget.days}">`)}
      ${f(t('ads.f_start'), `<input type="date" data-k="budget.startDate" value="${esc(c.budget.startDate)}">`)}${f(t('ads.f_countries'), `<input data-k="audience.countries" dir="ltr" value="${esc(c.audience.countries)}" placeholder="US, GB, SA">`)}
      ${f(t('ads.f_age'), `<span class="row"><input type="number" data-k="audience.ageMin" min="13" max="65" value="${c.audience.ageMin}"><input type="number" data-k="audience.ageMax" min="13" max="65" value="${c.audience.ageMax}"></span>`)}${f(t('ads.f_gender'), `<select data-k="audience.gender">${['all', 'male', 'female'].map((g) => `<option value="${g}" ${c.audience.gender === g ? 'selected' : ''}>${esc(t('ads.g_' + g))}</option>`).join('')}</select>`)}</div>
      ${f(t('ads.f_interests'), `<input data-k="audience.interests" value="${esc(c.audience.interests)}" maxlength="200">`)}
      <label class="check"><input type="checkbox" data-k="features.retargeting" ${c.features.retargeting ? 'checked' : ''}> ${esc(t('ads.f_retarget'))}</label></details>
    <div id="quote" class="quote"></div>
    <div class="pub-btns"><button class="btn btn-ghost btn-lg" data-pub="free">${esc(t('ads.freePublish'))}<small>${esc(t('ads.freeHelp'))}</small></button><button class="btn btn-primary btn-lg" data-pub="paid" data-magnetic>${esc(t('ads.paidPublish'))}<small>${esc(t('ads.paidHelp'))}</small></button></div></div></div>`;
}
async function refreshQuote() {
  const el = $('#quote', root); if (!el) return;
  if (!D.paid.length) { el.innerHTML = `<p class="muted small">${esc(t('ads.q_free'))}</p>`; return; }
  try {
    const { quote: q } = await api('POST', '/api/ads/quote', body('paid'));
    el.innerHTML = `<h4>${esc(t('ads.q_title'))}</h4><ul class="rows">${q.lines.map((l) => `<li><span>${esc(t('ads.' + l.key))}${l.qty > 1 ? ` ×${l.qty}` : ''}${l.key === 'q_spend' ? ` (${q.percent}% × ${money(q.adSpend)})` : ''}</span><b>${money(l.amount)}</b></li>`).join('')}<li><span><b>${esc(t('ads.q_total'))}</b></span><b class="big-sm">${money(q.total)}</b></li></ul><p class="muted small">${esc(t('ads.q_note', { spend: money(q.adSpend) }))}</p>`;
  } catch { el.innerHTML = ''; }
}
const quoteLater = debounce(refreshQuote, 350);

// ---------- السجل ----------
function listHTML() {
  if (!campaigns.length) return `<div class="empty card"><p class="muted">${esc(t('ads.noCampaigns'))}</p></div>`;
  return `<div class="card"><ul class="rows">${campaigns.map((c) => `<li data-id="${c.id}"><div><b>${esc(c.name)}</b> <span class="badge st-${c.status === 'running' ? 'published' : c.status === 'failed' ? 'unpublished' : 'draft'}">${esc(t('ads.st_' + c.status))}</span> <span class="badge">${esc(t(c.mode === 'paid' ? 'ads.paidBadge' : 'ads.freeBadge'))}</span>
    <div class="small">${(c.results || []).map((r) => `<span class="${r.ok ? '' : 'muted'}">${r.ok ? '✓' : '✗'} ${esc(t('ads.tg_' + r.target))}${r.error ? ' — ' + esc(resErr(r.error)) : ''}</span>`).join(' · ')}</div></div>
    <div class="row wrap">${(c.results || []).some((r) => r.links) ? `<button class="btn btn-ghost btn-sm" data-a="share">${esc(t('ads.shareNow'))}</button>` : ''}${c.mode === 'paid' && ['running', 'paused', 'partial'].includes(c.status) ? `<button class="btn btn-ghost btn-sm" data-a="${c.status === 'paused' ? 'resume' : 'pause'}">${esc(t(c.status === 'paused' ? 'ads.resume' : 'ads.pause'))}</button>` : ''}${['draft', 'failed'].includes(c.status) ? `<button class="btn btn-primary btn-sm" data-a="launch">${esc(t('ads.launch'))}</button>` : ''}<button class="btn btn-ghost btn-sm" data-a="reuse">${esc(t('ads.reuse'))}</button><button class="btn btn-ghost btn-sm" data-a="del">✕</button></div></li>`).join('')}</ul></div>`;
}
function sharePanel(c) {
  const links = (c.results.find((r) => r.links) || {}).links || [];
  modal(`<h3>${esc(t('ads.shareTitle'))}</h3><p class="muted small">${esc(t('ads.shareHelp'))}</p><div class="chips">${links.map((l) => `<a class="chip" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(t('ads.sl_' + l.id))}</a>`).join('')}</div>`);
}

// ---------- الإجراءات ----------
async function load() {
  [P, { campaigns }, { websites: sites }] = await Promise.all([api('GET', '/api/ads/providers'), api('GET', '/api/ads/campaigns'), api('GET', '/api/websites').catch(() => ({ websites: [] }))]);
  sites = sites.map((s) => ({ ...s, url: absUrl(s.url) }));
}
function draw(keepDraft = true) {
  if (!keepDraft || !D) D = blank();
  root.innerHTML = `<h3 class="mb">${esc(t('ads.channels'))}</h3><p class="muted small">${esc(t('ads.channelsHelp'))}</p>${channelsHTML()}<h3 class="mt">${esc(t('ads.builder'))}</h3>${builderHTML()}<h3 class="mt">${esc(t('ads.list'))}</h3><div id="ads-list">${listHTML()}</div>`;
  refreshQuote();
}
function setPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; }

async function save(mode) {
  const r = await api('POST', '/api/ads/campaigns', body(mode)); D.id = r.campaign.id; return r.campaign;
}
function resultModal(c) {
  modal(`<h3>${esc(t(c.status === 'failed' ? 'ads.resFailed' : 'ads.resDone'))}</h3><ul class="rows">${c.results.map((r) => `<li><span>${esc(t('ads.tg_' + r.target))}</span>${r.ok ? `<span class="badge st-published">✓ ${esc(t('ads.res_ok'))}</span>` : `<span class="small">✗ ${esc(resErr(r.error))}</span>`}</li>`).join('')}</ul>${c.mode === 'paid' && c.status === 'paused' ? `<p class="muted small mt">${esc(t('ads.pausedNote'))}</p>` : ''}${c.results.some((r) => r.links) ? `<div class="chips">${c.results.find((r) => r.links).links.map((l) => `<a class="chip" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(t('ads.sl_' + l.id))}</a>`).join('')}</div>` : ''}`);
}
async function publish(mode) {
  const targets = mode === 'paid' ? D.paid : D.free;
  if (!D.creative.headline || !D.creative.text || !D.creative.url) return toast(t('ads.err_creative_required'), 'err');
  if (!targets.length) return toast(t('ads.err_targets_required'), 'err');
  try {
    const c = await save(mode);
    if (mode === 'free') { const r = await api('POST', `/api/ads/campaigns/${c.id}/launch`, {}); await load(); draw(true); resultModal(r.campaign); D = null; return; }
    confirmPaid(c);
  } catch (e) { toast(errMsg(e), 'err'); }
}
function confirmPaid(c) {
  const q = c.quote, daily = c.budget.daily, days = c.budget.days, n = c.targets.length;
  modal(`<h3>${esc(t('ads.confirmTitle'))}</h3><ul class="rows"><li><span>${esc(t('ads.confirmPlatforms'))}</span><b>${c.targets.map((x) => esc(t('ads.tg_' + x))).join(', ')}</b></li><li><span>${esc(t('ads.confirmSpend'))}</span><b>${money(daily)} × ${days} × ${n} = ${money(q.adSpend)}</b></li><li><span>${esc(t('ads.confirmFee'))}</span><b>${money(q.total)}</b></li></ul>
    <p class="muted small">${esc(t('ads.confirmNote'))}</p><label class="check"><input type="checkbox" id="ok-money"> ${esc(t('ads.confirmCheck'))}</label>
    <div class="row end wrap mt"><button class="btn btn-ghost" data-go="0" disabled>${esc(t('ads.createPaused'))}</button><button class="btn btn-primary" data-go="1" disabled>${esc(t('ads.createActive'))}</button></div>`, {
    onMount: (el, close) => {
      const btns = $$('[data-go]', el); el.querySelector('#ok-money').addEventListener('change', (e) => btns.forEach((b) => { b.disabled = !e.target.checked; }));
      btns.forEach((b) => b.addEventListener('click', async () => {
        try {
          if (q.total > 0 && !c.feePaid) {
            const ck = await api('POST', `/api/ads/campaigns/${c.id}/checkout`, {});
            if (ck.url) { location.href = ck.url; return; }
            if (ck.mock) await api('POST', `/api/ads/campaigns/${c.id}/mock-pay`, { token: ck.token });
          }
          const r = await api('POST', `/api/ads/campaigns/${c.id}/launch`, { activate: b.dataset.go === '1' });
          close(); await load(); draw(true); resultModal(r.campaign); D = null;
        } catch (e) { toast(errMsg(e), 'err'); }
      }));
    }
  });
}
function bind() {
  root.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.k) { setPath(D, el.dataset.k, el.type === 'checkbox' ? el.checked : el.type === 'number' ? +el.value : el.value); if (el.dataset.k === 'websiteId') { const s = sites.find((x) => x.id === el.value); if (s?.url) { D.creative.url = s.url; const u = $('[data-k="creative.url"]', root); if (u) u.value = s.url; } } quoteLater(); }
    else if (el.dataset.v !== undefined) { D.variants[+el.dataset.v][el.dataset.vk] = el.value; }
    else if (el.dataset.t) { const g = el.dataset.t; D[g] = el.checked ? [...new Set([...D[g], el.value])] : D[g].filter((x) => x !== el.value); quoteLater(); }
  });
  root.addEventListener('change', async (e) => {
    const s = e.target.closest('[data-sel]');
    if (s) { try { await api('POST', `/api/ads/connections/${s.dataset.conn}/select`, { [s.dataset.sel]: s.value }); toast(t('common.saved'), 'ok'); } catch (er) { toast(errMsg(er), 'err'); } }
  });
  root.addEventListener('submit', async (e) => {
    const fm = e.target.closest('[data-form]'); if (!fm) return; e.preventDefault();
    const btn = fm.querySelector('button'); btn.disabled = true;
    try { await api('POST', `/api/ads/connections/${fm.dataset.form}`, Object.fromEntries(new FormData(fm))); toast(t('ads.connectedOk'), 'ok'); await load(); draw(true); } catch (er) { toast(errMsg(er), 'err'); btn.disabled = false; }
  });
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('button, [data-a]'); if (!b) return;
    try {
      if (b.dataset.oauth) { const r = await api('GET', `/api/ads/oauth/${b.dataset.oauth}/start`); location.href = r.url; }
      else if (b.dataset.disc) { if (await confirmBox(t('ads.confirmDisc'), t('ads.disconnect'))) { await api('DELETE', `/api/ads/connections/${b.dataset.disc}`); await load(); draw(true); } }
      else if (b.dataset.pub) publish(b.dataset.pub);
      else if (b.dataset.addv !== undefined) { D.variants.push({ headline: '', text: '' }); draw(true); }
      else if (b.dataset.rmv !== undefined) { D.variants.splice(+b.dataset.rmv, 1); draw(true); }
      else if (b.dataset.ai !== undefined) {
        const topic = D.creative.headline || D.name || (sites.find((s) => s.id === D.websiteId)?.name) || ''; if (topic.length < 3) return toast(t('common.err_prompt_required'), 'err');
        b.disabled = true; const r = await api('POST', '/api/ads/copy', { prompt: topic + ' ' + D.creative.text, url: D.creative.url, lang: D.lang }); b.disabled = false; D.features.aiCopy = true;
        $('#ai-vars', root).innerHTML = r.variants.map((v, i) => `<div class="card var"><b>${esc(v.headline)}</b><p class="small">${esc(v.text)}</p><button class="btn btn-ghost btn-sm" data-use="${i}">${esc(t('ads.useVariant'))}</button></div>`).join(''); root._vars = r.variants; quoteLater();
      } else if (b.dataset.use !== undefined) { const v = root._vars[+b.dataset.use]; D.creative.headline = v.headline; D.creative.text = v.text; draw(true); $('#ai-vars', root).innerHTML = ''; }
      else if (b.dataset.a) {
        const c = campaigns.find((x) => x.id === b.closest('li').dataset.id), a = b.dataset.a;
        if (a === 'share') sharePanel(c);
        else if (a === 'del') { if (await confirmBox(t('ads.confirmDel'), t('common.delete'))) { await api('DELETE', `/api/ads/campaigns/${c.id}`); await load(); draw(true); } }
        else if (a === 'pause' || a === 'resume') { await api('POST', `/api/ads/campaigns/${c.id}/status`, { action: a }); await load(); draw(true); }
        else if (a === 'launch') { if (c.mode === 'paid') { D = { ...blank(), id: c.id, name: c.name, creative: c.creative, variants: c.variants, audience: { ...c.audience, countries: c.audience.countries.join(', ') }, budget: c.budget, features: c.features, paid: c.targets, free: [] }; confirmPaid(c); } else { const r = await api('POST', `/api/ads/campaigns/${c.id}/launch`, {}); await load(); draw(true); resultModal(r.campaign); } }
        else if (a === 'reuse') { D = { ...blank(), name: c.name, creative: { ...c.creative }, variants: [...c.variants], audience: { ...c.audience, countries: c.audience.countries.join(', ') }, budget: { ...c.budget }, features: { ...c.features }, [c.mode === 'paid' ? 'paid' : 'free']: c.targets, ...(c.mode === 'paid' ? { free: [] } : {}) }; draw(true); scrollTo({ top: 400, behavior: 'smooth' }); }
      }
    } catch (er) { toast(errMsg(er), 'err'); }
  });
}

export async function mount(el) {
  root = el; D = null;
  const qs = new URLSearchParams(location.hash.split('?')[1] || '');
  if (qs.get('connected')) toast(t('ads.connectedOk'), 'ok'); if (qs.get('error')) toast(t('ads.oauthError'), 'err'); if (qs.get('paid')) toast(t('ads.feePaid'), 'ok');
  try { await load(); } catch (e) { root.innerHTML = `<p class="muted">${esc(errText(e))}</p>`; return; }
  draw(false); bind();
}
