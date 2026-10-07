// ============================================================
// واجهات المواقع: إنشاء/حفظ/نسخ/حذف/إصدارات/نشر/دومين/تصدير/استيراد
// كل عملية تتحقق من ملكية الموقع (Authorization) وتنظّف المدخلات (normalizeWebsite).
// ============================================================
import { route, HttpError } from '../lib/http.js';
import { db } from '../lib/db.js';
import { config } from '../lib/config.js';
import { createZip } from '../lib/zip.js';
import { normalizeWebsite } from '../../shared/schema.js';
import { accessInfo, trialEnds } from '../lib/pricing.js';
import { buildExportBundle } from '../export/exporter.js';

export const trialActive = (u) => Date.now() < trialEnds(u);
const RESERVED = new Set(['www', 'app', 'api', 'admin', 'mail', 'static', 'cdn', 'dashboard', 'login', 'nexora', 'support', 'billing']);
const SUB = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const DOMAIN = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export function siteUrl(w) {
  // بدون دومين للمنصة نرجع مسارًا نسبيًا، والمتصفح يحوّله إلى رابط كامل بعنوان الموقع الحقيقي
  return config.platformDomain ? `${config.appUrl.startsWith('https') ? 'https' : 'http'}://${w.subdomain}.${config.platformDomain}` : `/s/${w.subdomain}/`;
}
function newSubdomain(name) {
  const base = (String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20)) || 'site';
  for (;;) {
    const s = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (SUB.test(s) && !RESERVED.has(s) && !db.websites.find((w) => w.subdomain === s)) return s;
  }
}
export function createWebsite(userId, data) {
  const now = Date.now();
  return db.websites.insert({ userId, name: data.name, data, status: 'draft', subdomain: newSubdomain(data.name), customDomain: '', paid: false, published: null, publishedAt: null, createdAt: now, updatedAt: now });
}
const stripAssets = (d) => ({ ...d, assets: d.assets.map((a) => ({ id: a.id, name: a.name })) });
export function view(w, full = false) {
  return { id: w.id, name: w.name, type: w.data.type, status: w.status, subdomain: w.subdomain, customDomain: w.customDomain, paid: w.paid, paidUntil: w.paidUntil || null, banned: !!w.banned, createdAt: w.createdAt, updatedAt: w.updatedAt, publishedAt: w.publishedAt, url: w.status === 'published' ? siteUrl(w) : null, data: full ? w.data : stripAssets(w.data) };
}
function owned({ params, user }) {
  const w = db.websites.get(params.id);
  if (!w || w.userId !== user.id) throw new HttpError(404, 'not_found');
  return w;
}

route('GET', '/api/websites', ({ user }) => ({ websites: db.websites.list((w) => w.userId === user.id).sort((a, b) => b.updatedAt - a.updatedAt).map((w) => view(w)) }), { auth: true });

// إنشاء/استيراد مشروع (JSON من nexora.project.json)
route('POST', '/api/websites', ({ user, body }) => {
  if (db.websites.list((w) => w.userId === user.id).length >= 50) throw new HttpError(403, 'limit_reached');
  let data;
  try { data = normalizeWebsite(body.website?.website || body.website); } catch { throw new HttpError(400, 'invalid_website'); }
  return { website: view(createWebsite(user.id, data), true) };
}, { auth: true, limit: [30, 600000], bodyLimit: 12_000_000 });

route('GET', '/api/websites/:id', (ctx) => ({ website: view(owned(ctx), true) }), { auth: true });

// حفظ تلقائي: يحفظ آخر حالة ويسجّل نسخة (Version) كل دقيقتين تقريبًا
route('PUT', '/api/websites/:id', (ctx) => {
  const w = owned(ctx);
  let data;
  try { data = normalizeWebsite(ctx.body.website); } catch { throw new HttpError(400, 'invalid_website'); }
  const versions = db.versions.list((v) => v.websiteId === w.id).sort((a, b) => b.createdAt - a.createdAt);
  if (!versions.length || Date.now() - versions[0].createdAt > 120000 || ctx.body.snapshot) {
    db.versions.insert({ websiteId: w.id, data: w.data, createdAt: Date.now(), label: String(ctx.body.label || '').slice(0, 60) });
    versions.slice(29).forEach((v) => db.versions.remove(v.id));
  }
  const upd = db.websites.update(w.id, { data, name: data.name, updatedAt: Date.now() });
  return { updatedAt: upd.updatedAt };
}, { auth: true, bodyLimit: 12_000_000 });

route('PATCH', '/api/websites/:id', (ctx) => {
  const w = owned(ctx);
  const name = String(ctx.body.name || '').trim().slice(0, 80);
  if (!name) throw new HttpError(400, 'name_required');
  db.websites.update(w.id, { name, data: { ...w.data, name }, updatedAt: Date.now() });
  return { ok: true };
}, { auth: true });

route('POST', '/api/websites/:id/duplicate', (ctx) => {
  const w = owned(ctx);
  const copy = { ...structuredClone(w.data), name: (w.name + ' (copy)').slice(0, 80) };
  return { website: view(createWebsite(ctx.user.id, copy)) };
}, { auth: true, limit: [20, 600000] });

route('DELETE', '/api/websites/:id', (ctx) => {
  const w = owned(ctx);
  db.versions.list((v) => v.websiteId === w.id).forEach((v) => db.versions.remove(v.id));
  db.websites.remove(w.id);
  return { ok: true };
}, { auth: true });

route('GET', '/api/websites/:id/versions', (ctx) => {
  const w = owned(ctx);
  return { versions: db.versions.list((v) => v.websiteId === w.id).sort((a, b) => b.createdAt - a.createdAt).map((v) => ({ id: v.id, createdAt: v.createdAt, label: v.label })) };
}, { auth: true });

route('POST', '/api/websites/:id/versions/:vid/restore', (ctx) => {
  const w = owned(ctx);
  const v = db.versions.get(ctx.params.vid);
  if (!v || v.websiteId !== w.id) throw new HttpError(404, 'not_found');
  db.versions.insert({ websiteId: w.id, data: w.data, createdAt: Date.now(), label: 'before-restore' });
  db.websites.update(w.id, { data: v.data, name: v.data.name, updatedAt: Date.now() });
  return { website: view(db.websites.get(w.id), true) };
}, { auth: true });

// النشر: متاح خلال فترة التجربة، وبعدها يتطلب دفع 5$ لهذا الموقع (التحقق هنا في الخادم فقط)
route('POST', '/api/websites/:id/publish', (ctx) => {
  const w = owned(ctx);
  if (w.banned) throw new HttpError(403, 'site_banned');
  if (!accessInfo(ctx.user, w).ok) throw new HttpError(402, 'payment_required', { priceUsd: config.priceUsd });
  const upd = db.websites.update(w.id, { status: 'published', published: w.data, publishedAt: Date.now() });
  return { website: view(upd) };
}, { auth: true, limit: [20, 600000] });

route('POST', '/api/websites/:id/unpublish', (ctx) => {
  const w = owned(ctx);
  return { website: view(db.websites.update(w.id, { status: 'unpublished' })) };
}, { auth: true });

route('POST', '/api/websites/:id/domain', (ctx) => {
  const w = owned(ctx);
  const patch = {};
  if (ctx.body.subdomain !== undefined) {
    const s = String(ctx.body.subdomain).toLowerCase();
    if (!SUB.test(s) || RESERVED.has(s)) throw new HttpError(400, 'invalid_subdomain');
    if (db.websites.find((x) => x.subdomain === s && x.id !== w.id)) throw new HttpError(409, 'subdomain_taken');
    patch.subdomain = s;
  }
  if (ctx.body.customDomain !== undefined) {
    const d = String(ctx.body.customDomain).toLowerCase().trim();
    if (d && (!DOMAIN.test(d) || (config.platformDomain && d.endsWith(config.platformDomain)))) throw new HttpError(400, 'invalid_domain');
    if (d && db.websites.find((x) => x.customDomain === d && x.id !== w.id)) throw new HttpError(409, 'domain_taken');
    patch.customDomain = d;
  }
  return { website: view(db.websites.update(w.id, patch)) };
}, { auth: true, limit: [30, 600000] });

route('GET', '/api/websites/:id/export', (ctx) => {
  const w = owned(ctx);
  const zip = createZip(buildExportBundle(w.data, w));
  const fname = (w.name.replace(/[^\w-]+/g, '_') || 'website') + '.zip';
  ctx.res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${fname}"`, 'Content-Length': zip.length });
  ctx.res.end(zip);
}, { auth: true, limit: [30, 600000] });
