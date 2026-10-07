// ============================================================
// الفوترة: التسعير يُدار من لوحة المؤسس (once/monthly × website/account).
// الدفع والتحقق في الخادم فقط. لا يُعلَّم أي موقع "مدفوعًا" إلا بعد Webhook موقّع من Stripe.
// بدون مفاتيح Stripe: دفع تجريبي في التطوير فقط.
// ============================================================
import crypto from 'node:crypto';
import { route, HttpError } from '../lib/http.js';
import { db } from '../lib/db.js';
import { config } from '../lib/config.js';
import { signToken, verifyToken } from '../lib/auth.js';
import { getPricing, trialEnds, accessInfo } from '../lib/pricing.js';

const mode = () => (config.stripe.key ? 'stripe' : 'mock');
const DAY = 86400000;

// يطبّق الدفع على الموقع أو الحساب حسب النطاق ونموذج التسعير
function applyPayment({ userId, websiteId, scope, model, subId, until }) {
  const patch = model === 'monthly' ? { paidUntil: until || Date.now() + 32 * DAY, ...(subId ? { subscriptionId: subId } : {}) } : { paid: true };
  if (scope === 'account') { if (db.users.get(userId)) db.users.update(userId, patch); }
  else { const w = db.websites.get(websiteId); if (w && w.userId === userId) db.websites.update(w.id, patch); }
}
const bySub = (id) => { const w = db.websites.find((x) => x.subscriptionId === id); if (w) return ['site', w]; const u = db.users.find((x) => x.subscriptionId === id); return u ? ['user', u] : null; };

route('GET', '/api/billing', ({ user }) => {
  const p = getPricing(), now = Date.now();
  return {
    mode: mode(), ...p, trialEndsAt: trialEnds(user), trialActive: now < trialEnds(user),
    accountPaid: user.paid === true || (user.paidUntil || 0) > now, accountUntil: user.paidUntil || null,
    websites: db.websites.list((w) => w.userId === user.id).map((w) => ({ id: w.id, name: w.name, paid: accessInfo(user, w).paid, until: w.paidUntil || null }))
  };
}, { auth: true });

route('POST', '/api/billing/checkout', async ({ user, body }) => {
  const p = getPricing();
  let w = null;
  if (p.scope === 'website') {
    w = db.websites.get(String(body.websiteId || ''));
    if (!w || w.userId !== user.id) throw new HttpError(404, 'not_found');
    if (accessInfo(user, w).paid) return { paid: true };
  } else if (accessInfo(user, null).paid) return { paid: true };
  const meta = { userId: user.id, websiteId: w?.id || '', scope: p.scope, model: p.model };
  if (!config.stripe.key) return { mock: true, token: signToken({ k: 'mock-pay', ...meta }, 600) };
  const form = new URLSearchParams({
    mode: p.model === 'monthly' ? 'subscription' : 'payment', client_reference_id: w?.id || user.id, customer_email: user.email,
    success_url: `${config.appUrl}/#/dashboard/billing?paid=1`, cancel_url: `${config.appUrl}/#/dashboard/billing`,
    'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(Math.round(p.priceUsd * 100)),
    'line_items[0][price_data][product_data][name]': (w ? `NEXORA — ${w.name}` : 'NEXORA — All websites').slice(0, 100)
  });
  if (p.model === 'monthly') form.set('line_items[0][price_data][recurring][interval]', 'month');
  for (const [k, v] of Object.entries(meta)) { form.set(`metadata[${k}]`, v); if (p.model === 'monthly') form.set(`subscription_data[metadata][${k}]`, v); }
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${config.stripe.key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  const s = await r.json();
  if (!r.ok || !s.url) { console.error('[nexora] Stripe error', s.error?.message); throw new HttpError(502, 'payment_unavailable'); }
  return { url: s.url };
}, { auth: true, limit: [10, 600000] });

// تأكيد الدفع التجريبي (معطّل تمامًا في الإنتاج وعند وجود Stripe)
route('POST', '/api/billing/mock-confirm', ({ user, body }) => {
  if (config.prod || config.stripe.key) throw new HttpError(404, 'not_found');
  const p = verifyToken(body.token);
  if (!p || p.k !== 'mock-pay' || p.userId !== user.id) throw new HttpError(400, 'invalid_token');
  applyPayment({ userId: p.userId, websiteId: p.websiteId, scope: p.scope, model: p.model });
  return { ok: true };
}, { auth: true });

// Webhook: يتحقق من توقيع Stripe على الجسم الخام قبل أي تغيير
route('POST', '/api/billing/webhook', ({ req, raw }) => {
  if (!config.stripe.webhookSecret) throw new HttpError(503, 'webhook_not_configured');
  const parts = Object.fromEntries(String(req.headers['stripe-signature'] || '').split(',').map((kv) => kv.split('=')));
  const expected = crypto.createHmac('sha256', config.stripe.webhookSecret).update(`${parts.t}.${raw.toString('utf8')}`).digest('hex');
  const ok = parts.v1 && parts.v1.length === expected.length && crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
  if (!ok || Math.abs(Date.now() / 1000 - Number(parts.t)) > 600) throw new HttpError(400, 'invalid_signature');
  const ev = JSON.parse(raw.toString('utf8')), o = ev.data?.object || {};
  if (ev.type === 'checkout.session.completed' && (o.payment_status === 'paid' || o.mode === 'subscription')) {
    const m = o.metadata || {};
    if (m.kind === 'campaign') { const c = db.campaigns.get(m.campaignId); if (c && c.userId === m.userId) db.campaigns.update(c.id, { feePaid: true, feeAmount: Number(m.amount) || 0 }); }  // رسوم حملة إعلانية
    else applyPayment({ userId: m.userId, websiteId: m.websiteId, scope: m.scope, model: m.model, subId: o.subscription || undefined });
  } else if (ev.type === 'invoice.paid' && o.subscription) {
    const hit = bySub(o.subscription), end = o.lines?.data?.[0]?.period?.end;
    if (hit) (hit[0] === 'site' ? db.websites : db.users).update(hit[1].id, { paidUntil: end ? end * 1000 + DAY : Date.now() + 32 * DAY });
  } else if (ev.type === 'customer.subscription.deleted') {
    const hit = bySub(o.id);
    if (hit) (hit[0] === 'site' ? db.websites : db.users).update(hit[1].id, { paidUntil: Date.now() });
  }
  return { received: true };
}, { rawBody: true, noOrigin: true });

route('GET', '/api/config', () => {
  const founder = db.users.find((u) => u.role === 'founder');
  return { googleClientId: config.google.clientId, billingMode: mode(), pricing: getPricing(), priceUsd: getPricing().priceUsd, trialDays: getPricing().trialDays, platformDomain: config.platformDomain || 'nexora.app', founderClaimable: !founder };
});
