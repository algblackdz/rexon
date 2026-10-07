// ============================================================
// إضافة الحملات الإعلانية (Ads Hub): ربط المنصات، حملات مجانية ومدفوعة، تسعير شفاف
// الأسرار (توكنات المنصات) تُحفظ مشفّرة ولا تُرجَع للمتصفح أبدًا.
// ميزانية الإعلان تُدفع للمنصة من حساب المستخدم الإعلاني؛ NEXORA تأخذ رسوم خدمة فقط (انظر server/ads/pricing.js).
// ============================================================
import { route, HttpError, send } from '../lib/http.js';
import { db } from '../lib/db.js';
import { config } from '../lib/config.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { signToken, verifyToken, userFromRequest } from '../lib/auth.js';
import { chat } from '../ai/provider.js';
import { getAdsPricing, quote } from '../ads/pricing.js';
import { meta } from '../ads/providers/meta.js';
import { tiktok } from '../ads/providers/tiktok.js';
import { telegram, discord, shareLinks } from '../ads/providers/free.js';

const LANGS = ['en', 'fr', 'ar'];
const OAUTH = { meta, tiktok };
// الأهداف: كل هدف يعتمد على اتصال (conn). planned = مخطط له ولم يُنفَّذ بعد (يظهر معطّلًا بصدق)
export const TARGETS = [
  { id: 'meta_ads', kind: 'paid', conn: 'meta' }, { id: 'tiktok_ads', kind: 'paid', conn: 'tiktok' },
  { id: 'meta_page', kind: 'free', conn: 'meta' }, { id: 'instagram', kind: 'free', conn: 'meta' }, { id: 'telegram', kind: 'free', conn: 'telegram' }, { id: 'discord', kind: 'free', conn: 'discord' }, { id: 'share', kind: 'free', conn: null },
  { id: 'google_ads', kind: 'paid', planned: true }, { id: 'snapchat_ads', kind: 'paid', planned: true }, { id: 'pinterest_ads', kind: 'paid', planned: true }, { id: 'linkedin_ads', kind: 'paid', planned: true }, { id: 'x_ads', kind: 'paid', planned: true }
];
const origin = (req) => `${req.headers['x-forwarded-proto'] || (config.prod ? 'https' : 'http')}://${req.headers.host}`;
const txt = (v, n) => String(v ?? '').replace(/\u0000/g, '').trim().slice(0, n);
const num = (v, a, b, fb) => { const n = Number(v); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : fb; };
const https = (v) => (/^https:\/\/[^\s<>"]{3,500}$/.test(String(v || '').trim()) ? String(v).trim() : '');

// ---------- الاتصالات ----------
const connOf = (uid, p) => db.adconns.find((c) => c.userId === uid && c.provider === p);
const secretsOf = (c) => { try { return JSON.parse(decrypt(c.secretsEnc) || '{}'); } catch { return {}; } };
function saveConn(uid, provider, { secrets, info = {}, expiresAt = null, selected }) {
  const old = connOf(uid, provider);
  const row = { userId: uid, provider, secretsEnc: encrypt(JSON.stringify(secrets)), info, expiresAt, selected: selected || old?.selected || defaults(provider, info), createdAt: Date.now() };
  return old ? db.adconns.update(old.id, row) : db.adconns.insert(row);
}
const defaults = (p, info) => (p === 'meta' ? { adAccountId: info.adAccounts?.[0]?.id || '', pageId: info.pages?.[0]?.id || '' } : p === 'tiktok' ? { advertiserId: info.advertisers?.[0]?.id || '' } : {});
const pubConn = (c) => (c ? { connected: true, info: c.info, selected: c.selected, expired: !!(c.expiresAt && c.expiresAt < Date.now()), expiresAt: c.expiresAt } : { connected: false });

route('GET', '/api/ads/providers', ({ user }) => {
  const conns = Object.fromEntries(['meta', 'tiktok', 'telegram', 'discord'].map((p) => [p, pubConn(connOf(user.id, p))]));
  const configured = { meta: meta.configured(), tiktok: tiktok.configured(), telegram: true, discord: true };
  return { targets: TARGETS.map((t) => ({ ...t, configured: t.planned ? false : t.conn ? configured[t.conn] : true, connected: t.conn ? conns[t.conn].connected : true })), connections: conns, configured, limits: { maxDaily: config.ads.maxDaily }, pricing: getAdsPricing() };
}, { auth: true });

// ----- OAuth (Meta / TikTok) -----
route('GET', '/api/ads/oauth/:provider/start', ({ req, user, params }) => {
  const p = OAUTH[params.provider]; if (!p) throw new HttpError(404, 'not_found');
  if (!p.configured()) throw new HttpError(503, 'ads_not_configured');
  const state = signToken({ k: 'ads-oauth', uid: user.id, p: params.provider }, 600);
  return { url: p.authUrl(`${origin(req)}/api/ads/oauth/${params.provider}/callback`, state) };
}, { auth: true, limit: [20, 600000] });

route('GET', '/api/ads/oauth/:provider/callback', async ({ req, res, params, query }) => {
  const back = (q) => { res.writeHead(302, { Location: `/#/dashboard/ads?${q}` }); res.end(); };
  const p = OAUTH[params.provider], st = verifyToken(query.state);
  if (!p || !st || st.k !== 'ads-oauth' || st.p !== params.provider) return back('error=state');
  const me = userFromRequest(req); if (!me || me.id !== st.uid) return back('error=state');
  const code = query.code || query.auth_code; if (!code) return back('error=denied');
  try {
    const r = await p.exchange(code, `${origin(req)}/api/ads/oauth/${params.provider}/callback`);
    saveConn(me.id, params.provider, r);
    back(`connected=${params.provider}`);
  } catch (e) { console.error('[nexora] OAuth', params.provider, e.message); back('error=exchange'); }
});

// ----- اتصالات بالتوكن (Telegram / Discord) -----
route('POST', '/api/ads/connections/:provider', async ({ user, params, body }) => {
  const prov = params.provider === 'telegram' ? telegram : params.provider === 'discord' ? discord : null;
  if (!prov) throw new HttpError(404, 'not_found');
  const v = params.provider === 'telegram' ? { token: txt(body.token, 100), chatId: txt(body.chatId, 40) } : { webhook: txt(body.webhook, 300) };
  if (!prov.validate(v)) throw new HttpError(400, 'invalid_connection');
  try { await prov.test(v); } catch { throw new HttpError(400, 'connection_failed'); }
  saveConn(user.id, params.provider, { secrets: v, info: params.provider === 'telegram' ? { chatId: v.chatId } : {} });
  return { ok: true };
}, { auth: true, limit: [15, 600000] });
route('DELETE', '/api/ads/connections/:provider', ({ user, params }) => { const c = connOf(user.id, params.provider); if (c) db.adconns.remove(c.id); return { ok: true }; }, { auth: true });
route('POST', '/api/ads/connections/:provider/select', ({ user, params, body }) => {
  const c = connOf(user.id, params.provider); if (!c) throw new HttpError(404, 'not_found');
  const sel = { ...c.selected };
  if (params.provider === 'meta') { if (body.adAccountId !== undefined) { if (!c.info.adAccounts.some((a) => a.id === body.adAccountId)) throw new HttpError(400, 'invalid_selection'); sel.adAccountId = body.adAccountId; } if (body.pageId !== undefined) { if (!c.info.pages.some((a) => a.id === body.pageId)) throw new HttpError(400, 'invalid_selection'); sel.pageId = body.pageId; } }
  if (params.provider === 'tiktok' && body.advertiserId !== undefined) { if (!c.info.advertisers.some((a) => a.id === body.advertiserId)) throw new HttpError(400, 'invalid_selection'); sel.advertiserId = body.advertiserId; }
  db.adconns.update(c.id, { selected: sel }); return { ok: true };
}, { auth: true });

// ---------- مولّد نص الإعلان ----------
const MOCK = {
  en: (t) => [[`${t} — made simple`, `Discover ${t}. Fast, reliable and built for you. Start today.`], [`Ready for ${t}?`, `Join the people already using ${t}. See what it can do for you.`], [`${t}: your next step`, `Stop waiting. Try ${t} now and feel the difference.`]],
  fr: (t) => [[`${t}, tout simplement`, `Découvrez ${t}. Rapide, fiable et conçu pour vous. Commencez aujourd’hui.`], [`Prêt pour ${t} ?`, `Rejoignez ceux qui utilisent déjà ${t}. Voyez ce que cela peut changer.`], [`${t} : votre prochaine étape`, `N’attendez plus. Essayez ${t} maintenant.`]],
  ar: (t) => [[`${t} — بكل بساطة`, `اكتشف ${t}. سريع وموثوق ومصمم لأجلك. ابدأ اليوم.`], [`جاهز لتجربة ${t}؟`, `انضم لمن يستخدمون ${t} بالفعل، وشاهد الفرق بنفسك.`], [`${t}: خطوتك القادمة`, `لا تنتظر أكثر. جرّب ${t} الآن.`]]
};
route('POST', '/api/ads/copy', async ({ body }) => {
  const lang = LANGS.includes(body.lang) ? body.lang : 'en', topic = txt(body.prompt, 200);
  if (topic.length < 3) throw new HttpError(400, 'prompt_required');
  try {
    const out = await chat('You write high-converting ad copy. Return ONLY JSON: {"variants":[{"headline":"<=40 chars","text":"<=125 chars"}, ...3 items]}. Language: ' + { en: 'English', fr: 'French', ar: 'Arabic' }[lang] + '. No emojis spam, no false claims, no guarantees.', [{ role: 'user', content: `Product / offer: ${topic}\nLanding page: ${txt(body.url, 200)}` }], 600);
    const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    const variants = (j.variants || []).slice(0, 3).map((v) => ({ headline: txt(v.headline, 80), text: txt(v.text, 500) })).filter((v) => v.headline && v.text);
    if (variants.length) return { variants, source: 'claude' };
  } catch { /* نرجع للقوالب */ }
  const t = topic.slice(0, 40);
  return { variants: MOCK[lang](t).map(([headline, text]) => ({ headline, text })), source: 'mock' };
}, { auth: true, limit: [20, 60000] });

// ---------- الحملات ----------
function cleanCampaign(b, existing) {
  const mode = b.mode === 'paid' ? 'paid' : 'free';
  const allowed = TARGETS.filter((t) => t.kind === mode && !t.planned).map((t) => t.id);
  const targets = [...new Set((Array.isArray(b.targets) ? b.targets : []).filter((t) => allowed.includes(t)))];
  const cr = b.creative || {}, a = b.audience || {}, bu = b.budget || {};
  const camp = {
    name: txt(b.name, 80) || 'Campaign', mode, websiteId: txt(b.websiteId, 40), lang: LANGS.includes(b.lang) ? b.lang : 'en',
    creative: { headline: txt(cr.headline, 80), text: txt(cr.text, 500), url: https(cr.url), imageUrl: https(cr.imageUrl), cta: ['LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'CONTACT_US', 'GET_QUOTE', 'BOOK_NOW'].includes(cr.cta) ? cr.cta : 'LEARN_MORE' },
    variants: (Array.isArray(b.variants) ? b.variants : []).slice(0, 2).map((v) => ({ headline: txt(v.headline, 80), text: txt(v.text, 500) })).filter((v) => v.headline && v.text),
    audience: { countries: [...new Set((Array.isArray(a.countries) ? a.countries : []).map((c) => String(c).toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)))].slice(0, 20), ageMin: Math.round(num(a.ageMin, 13, 65, 18)), ageMax: Math.round(num(a.ageMax, 13, 65, 65)), gender: ['male', 'female'].includes(a.gender) ? a.gender : 'all', interests: txt(a.interests, 200) },
    budget: { daily: Math.round(num(bu.daily, 1, config.ads.maxDaily, 5) * 100) / 100, days: Math.round(num(bu.days, 1, 90, 7)), startDate: /^\d{4}-\d{2}-\d{2}$/.test(bu.startDate || '') ? bu.startDate : '' },
    targets, features: { aiCopy: !!b.features?.aiCopy, retargeting: !!b.features?.retargeting }
  };
  if (camp.audience.ageMax < camp.audience.ageMin) camp.audience.ageMax = camp.audience.ageMin;
  camp.features.advanced = camp.audience.ageMin > 18 || camp.audience.ageMax < 65 || camp.audience.gender !== 'all' || !!camp.audience.interests;
  return camp;
}
const view = (c) => ({ id: c.id, name: c.name, mode: c.mode, status: c.status, creative: c.creative, variants: c.variants, audience: c.audience, budget: c.budget, targets: c.targets, features: c.features, lang: c.lang, websiteId: c.websiteId, results: c.results || [], feePaid: !!c.feePaid, quote: quote(c), createdAt: c.createdAt, updatedAt: c.updatedAt });
const mine = (ctx) => { const c = db.campaigns.get(ctx.params.id); if (!c || c.userId !== ctx.user.id) throw new HttpError(404, 'not_found'); return c; };

route('GET', '/api/ads/campaigns', ({ user }) => ({ campaigns: db.campaigns.list((c) => c.userId === user.id).sort((a, b) => b.createdAt - a.createdAt).map(view) }), { auth: true });
route('POST', '/api/ads/quote', ({ body }) => ({ quote: quote(cleanCampaign(body)) }), { auth: true, limit: [120, 60000] });
route('POST', '/api/ads/campaigns', ({ user, body }) => {
  let old = null;
  if (body.id) { old = db.campaigns.get(body.id); if (!old || old.userId !== user.id) throw new HttpError(404, 'not_found'); if (['running', 'partial'].includes(old.status)) throw new HttpError(409, 'locked'); }
  else if (db.campaigns.list((c) => c.userId === user.id).length >= 200) throw new HttpError(403, 'limit_reached');
  const camp = cleanCampaign(body);
  if (!camp.creative.headline || !camp.creative.text || !camp.creative.url) throw new HttpError(400, 'creative_required');
  const q = quote(camp), paid = old && old.feePaid && q.total <= (old.feeAmount || 0);
  const row = { ...camp, userId: user.id, status: 'draft', results: [], feePaid: !!paid || q.total === 0, feeAmount: paid ? old.feeAmount : q.total === 0 ? 0 : 0, updatedAt: Date.now() };
  const saved = old ? db.campaigns.update(old.id, row) : db.campaigns.insert({ ...row, createdAt: Date.now() });
  return { campaign: view(saved) };
}, { auth: true, limit: [60, 600000] });
route('DELETE', '/api/ads/campaigns/:id', (ctx) => { db.campaigns.remove(mine(ctx).id); return { ok: true }; }, { auth: true });

// ----- رسوم الخدمة (للمدفوع فقط) -----
route('POST', '/api/ads/campaigns/:id/checkout', async (ctx) => {
  const c = mine(ctx), q = quote(c);
  if (q.total <= 0 || c.feePaid) { db.campaigns.update(c.id, { feePaid: true }); return { paid: true }; }
  if (!config.stripe.key) return { mock: true, token: signToken({ k: 'ads-fee', cid: c.id, uid: ctx.user.id, amt: q.total }, 600), total: q.total };
  const form = new URLSearchParams({ mode: 'payment', client_reference_id: c.id, customer_email: ctx.user.email, success_url: `${origin(ctx.req)}/#/dashboard/ads?paid=1`, cancel_url: `${origin(ctx.req)}/#/dashboard/ads`, 'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'usd', 'line_items[0][price_data][unit_amount]': String(Math.round(q.total * 100)), 'line_items[0][price_data][product_data][name]': `NEXORA Ads — ${c.name}`.slice(0, 100), 'metadata[kind]': 'campaign', 'metadata[campaignId]': c.id, 'metadata[userId]': ctx.user.id, 'metadata[amount]': String(q.total) });
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${config.stripe.key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  const s = await r.json();
  if (!r.ok || !s.url) throw new HttpError(502, 'payment_unavailable');
  return { url: s.url };
}, { auth: true, limit: [10, 600000] });
route('POST', '/api/ads/campaigns/:id/mock-pay', (ctx) => {
  if (config.prod || config.stripe.key) throw new HttpError(404, 'not_found');
  const c = mine(ctx), p = verifyToken(ctx.body.token);
  if (!p || p.k !== 'ads-fee' || p.cid !== c.id || p.uid !== ctx.user.id) throw new HttpError(400, 'invalid_token');
  db.campaigns.update(c.id, { feePaid: true, feeAmount: p.amt }); return { ok: true };
}, { auth: true });

// ----- الإطلاق -----
const scrub = (msg, s) => { let m = String(msg || 'error'); for (const v of Object.values(s || {})) if (typeof v === 'string' && v.length > 6) m = m.split(v).join('***'); return m.slice(0, 240); };
async function runTarget(t, uid, camp, activate) {
  const def = TARGETS.find((x) => x.id === t), conn = def.conn ? connOf(uid, def.conn) : null;
  if (def.conn && !conn) throw new Error('not_connected');
  if (conn?.expiresAt && conn.expiresAt < Date.now()) throw new Error('connection_expired');
  const s = conn ? secretsOf(conn) : {};
  try {
    if (t === 'share') return { links: shareLinks(camp) };
    if (t === 'telegram') return await telegram.send(s, camp);
    if (t === 'discord') return await discord.send(s, camp);
    if (t === 'meta_page') return await meta.postPage(conn, s, camp);
    if (t === 'instagram') return await meta.postInstagram(conn, s, camp);
    if (t === 'meta_ads') return await meta.launchPaid(conn, s, camp, activate);
    if (t === 'tiktok_ads') return await tiktok.launchPaid(conn, s, camp, activate);
  } catch (e) { throw new Error(scrub(e.message, { ...s, ...(s.pageTokens || {}) })); }
  throw new Error('unsupported');
}
route('POST', '/api/ads/campaigns/:id/launch', async (ctx) => {
  const c = mine(ctx), q = quote(c);
  if (!c.targets.length) throw new HttpError(400, 'targets_required');
  if (c.mode === 'paid' && q.total > 0 && !c.feePaid) throw new HttpError(402, 'fee_required', { total: q.total });
  if (['running', 'partial'].includes(c.status)) throw new HttpError(409, 'locked');
  const activate = c.mode === 'paid' && !!ctx.body.activate;
  const results = [];
  for (const t of c.targets) {
    try { results.push({ target: t, ok: true, at: Date.now(), ...(await runTarget(t, ctx.user.id, c, activate)) }); }
    catch (e) { results.push({ target: t, ok: false, at: Date.now(), error: e.message }); }
  }
  const okN = results.filter((r) => r.ok).length;
  const status = okN === 0 ? 'failed' : okN < results.length ? 'partial' : c.mode === 'paid' && !activate ? 'paused' : 'running';
  return { campaign: view(db.campaigns.update(c.id, { results, status, launchedAt: Date.now() })) };
}, { auth: true, limit: [10, 600000] });

// إيقاف/استئناف الحملات المدفوعة على المنصات
route('POST', '/api/ads/campaigns/:id/status', async (ctx) => {
  const c = mine(ctx), action = ctx.body.action === 'resume' ? 'resume' : 'pause';
  if (c.mode !== 'paid') throw new HttpError(400, 'invalid_status');
  const out = [];
  for (const r of c.results || []) {
    if (!r.ok || !r.ids) continue;
    const prov = r.target === 'meta_ads' ? meta : r.target === 'tiktok_ads' ? tiktok : null, conn = connOf(ctx.user.id, r.target === 'meta_ads' ? 'meta' : 'tiktok');
    if (!prov || !conn) continue;
    try { await prov.setStatus(conn, secretsOf(conn), r.ids, action); out.push({ ...r, status: action === 'pause' ? 'PAUSED' : 'ACTIVE' }); } catch (e) { out.push({ ...r, error: scrub(e.message, secretsOf(conn)) }); }
  }
  const results = (c.results || []).map((r) => out.find((o) => o.target === r.target) || r);
  return { campaign: view(db.campaigns.update(c.id, { results, status: action === 'pause' ? 'paused' : 'running' })) };
}, { auth: true, limit: [30, 600000] });
void send;
