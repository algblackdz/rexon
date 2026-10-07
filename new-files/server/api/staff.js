// ============================================================
// لوحة الطاقم: دعم فني (شات)، مستخدمون ورتب، تسعير، إحصائيات، إدارة المواقع.
// كل مسار يتحقق من صلاحية محددة (server/lib/roles.js). الواجهة تُخفي فقط، والخادم هو الذي يمنع.
// ============================================================
import crypto from 'node:crypto';
import { route, HttpError } from '../lib/http.js';
import { db } from '../lib/db.js';
import { config } from '../lib/config.js';
import { can, roleOf, canAssign, ROLES, RANK } from '../lib/roles.js';
import { getPricing, setPricing } from '../lib/pricing.js';

const need = (ctx, perm) => { if (!can(ctx.user, perm)) throw new HttpError(403, 'forbidden'); };
const text = (v, max = 1000) => String(v ?? '').replace(/\u0000/g, '').trim().slice(0, max);
const summary = (t) => { const last = t.messages[t.messages.length - 1]; return { id: t.id, userName: t.userName, userEmail: t.userEmail, status: t.status, updatedAt: t.updatedAt, createdAt: t.createdAt, last: last?.text.slice(0, 120) || '', lastFrom: last?.from || '', needsReply: t.status === 'open' && last?.from === 'user' }; };

// ----- جهة المستخدم: محادثة مع الدعم -----
const openTicket = (uid) => db.tickets.find((t) => t.userId === uid && t.status === 'open');
route('GET', '/api/support/mine', ({ user }) => { const t = openTicket(user.id); return { ticket: t ? { id: t.id, messages: t.messages, status: t.status } : null }; }, { auth: true });
route('POST', '/api/support/message', ({ user, body }) => {
  const msg = text(body.text);
  if (!msg) throw new HttpError(400, 'message_required');
  let t = openTicket(user.id);
  const m = { from: 'user', name: user.name, text: msg, at: Date.now() };
  if (!t) t = db.tickets.insert({ userId: user.id, userName: user.name, userEmail: user.email, status: 'open', createdAt: Date.now(), updatedAt: Date.now(), messages: [m] });
  else { if (t.messages.length > 300) throw new HttpError(429, 'rate_limited'); db.tickets.update(t.id, { messages: [...t.messages, m], updatedAt: Date.now() }); }
  return { ok: true };
}, { auth: true, limit: [20, 60000] });
route('POST', '/api/support/close', ({ user }) => { const t = openTicket(user.id); if (t) db.tickets.update(t.id, { status: 'closed', updatedAt: Date.now() }); return { ok: true }; }, { auth: true });

// ----- جهة الطاقم -----
route('GET', '/api/staff/tickets', (ctx) => {
  need(ctx, 'support.read');
  const status = ctx.query.status === 'closed' ? 'closed' : 'open';
  return { tickets: db.tickets.list((t) => t.status === status).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 200).map(summary) };
}, { auth: true });
route('GET', '/api/staff/tickets/:id', (ctx) => { need(ctx, 'support.read'); const t = db.tickets.get(ctx.params.id); if (!t) throw new HttpError(404, 'not_found'); return { ticket: { ...summary(t), messages: t.messages } }; }, { auth: true });
route('POST', '/api/staff/tickets/:id/reply', (ctx) => {
  need(ctx, 'support.reply');
  const t = db.tickets.get(ctx.params.id); if (!t) throw new HttpError(404, 'not_found');
  const msg = text(ctx.body.text); if (!msg) throw new HttpError(400, 'message_required');
  db.tickets.update(t.id, { messages: [...t.messages, { from: 'staff', name: ctx.user.name, role: roleOf(ctx.user), text: msg, at: Date.now() }], updatedAt: Date.now(), status: 'open' });
  return { ok: true };
}, { auth: true, limit: [60, 60000] });
route('POST', '/api/staff/tickets/:id/close', (ctx) => { need(ctx, 'support.reply'); if (!db.tickets.update(ctx.params.id, { status: 'closed', updatedAt: Date.now() })) throw new HttpError(404, 'not_found'); return { ok: true }; }, { auth: true });

// ----- إحصائيات -----
route('GET', '/api/staff/overview', (ctx) => {
  need(ctx, 'stats.view');
  const users = db.users.list(), sites = db.websites.list();
  return { users: users.length, staff: users.filter((u) => roleOf(u) !== 'user').length, websites: sites.length, published: sites.filter((s) => s.status === 'published').length, openTickets: db.tickets.list((t) => t.status === 'open').length, paidSites: sites.filter((s) => s.paid || (s.paidUntil || 0) > Date.now()).length };
}, { auth: true });

// ----- المستخدمون والرتب -----
const userRow = (u, sites) => ({ id: u.id, name: u.name, email: u.email, role: roleOf(u), banned: !!u.banned, createdAt: u.createdAt, sites: sites.filter((s) => s.userId === u.id).length });
route('GET', '/api/staff/users', (ctx) => {
  need(ctx, 'users.view');
  const q = text(ctx.query.q, 60).toLowerCase(), sites = db.websites.list();
  return { users: db.users.list((u) => !q || u.email.includes(q) || u.name.toLowerCase().includes(q)).sort((a, b) => b.createdAt - a.createdAt).slice(0, 100).map((u) => userRow(u, sites)), roles: ROLES };
}, { auth: true });
route('POST', '/api/staff/users/:id/role', (ctx) => {
  const target = db.users.get(ctx.params.id); if (!target) throw new HttpError(404, 'not_found');
  const role = String(ctx.body.role || '');
  if (!canAssign(ctx.user, target, role)) throw new HttpError(403, 'forbidden');
  db.users.update(target.id, { role: role === 'user' ? undefined : role });
  return { ok: true };
}, { auth: true });
route('POST', '/api/staff/users/:id/ban', (ctx) => {
  need(ctx, 'users.ban');
  const target = db.users.get(ctx.params.id); if (!target) throw new HttpError(404, 'not_found');
  if (target.id === ctx.user.id || RANK[roleOf(target)] >= RANK[roleOf(ctx.user)]) throw new HttpError(403, 'forbidden');
  db.users.update(target.id, { banned: !!ctx.body.banned });
  return { ok: true };
}, { auth: true });

// ----- التسعير (المؤسس فقط افتراضيًا) -----
route('GET', '/api/staff/pricing', (ctx) => { need(ctx, 'pricing.edit'); return { pricing: getPricing() }; }, { auth: true });
route('PUT', '/api/staff/pricing', (ctx) => {
  need(ctx, 'pricing.edit');
  try { setPricing(ctx.body); } catch { throw new HttpError(400, 'invalid_pricing'); }
  return { pricing: getPricing() };
}, { auth: true });

// ----- مراقبة المواقع -----
route('GET', '/api/staff/sites', (ctx) => {
  need(ctx, 'sites.moderate');
  const q = text(ctx.query.q, 60).toLowerCase(), owners = Object.fromEntries(db.users.list().map((u) => [u.id, u.email]));
  return { sites: db.websites.list((w) => !q || w.name.toLowerCase().includes(q) || w.subdomain.includes(q)).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 100).map((w) => ({ id: w.id, name: w.name, subdomain: w.subdomain, status: w.status, banned: !!w.banned, owner: owners[w.userId] || '' })) };
}, { auth: true });
route('POST', '/api/staff/sites/:id/takedown', (ctx) => {
  need(ctx, 'sites.moderate');
  const w = db.websites.get(ctx.params.id); if (!w) throw new HttpError(404, 'not_found');
  const ban = !!ctx.body.banned;
  db.websites.update(w.id, ban ? { banned: true, status: 'unpublished' } : { banned: false });
  return { ok: true };
}, { auth: true });

// ----- المطالبة برتبة المؤسس: تتطلب مفتاحًا سريًا من متغيرات البيئة ولا تعمل إذا وُجد مؤسس -----
route('POST', '/api/staff/claim-founder', ({ user, body }) => {
  if (!config.founderKey || db.users.find((u) => u.role === 'founder')) throw new HttpError(403, 'forbidden');
  const a = Buffer.from(String(body.key || '')), b = Buffer.from(config.founderKey);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new HttpError(403, 'invalid_key');
  db.users.update(user.id, { role: 'founder' });
  return { ok: true };
}, { auth: true, limit: [5, 600000] });
