// ============================================================
// المصادقة: كلمات المرور بـ scrypt + رموز جلسة موقّعة HMAC داخل Cookie (HttpOnly)
// ============================================================
import crypto from 'node:crypto';
import { config } from './config.js';
import { db } from './db.js';
import { parseCookies } from './http.js';
import { getPricing } from './pricing.js';
import { roleOf, permsOf } from './roles.js';

export const COOKIE = 'nx_session';
const SESSION_SECONDS = 60 * 60 * 24 * 14;

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return salt.toString('hex') + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
}
export function verifyPassword(pw, stored) {
  const [s, h] = String(stored || '').split(':');
  if (!s || !h) return false;
  const a = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64);
  const b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const b64 = (b) => Buffer.from(b).toString('base64url');
const mac = (data) => crypto.createHmac('sha256', config.secret).update(data).digest('base64url');

export function signToken(payload, ttlSec = SESSION_SECONDS) {
  const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec }));
  return body + '.' + mac(body);
}
export function verifyToken(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const good = mac(body);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return p.exp > Date.now() / 1000 ? p : null;
  } catch { return null; }
}

export function userFromRequest(req) {
  const p = verifyToken(parseCookies(req)[COOKIE]);
  const u = p?.uid ? db.users.get(p.uid) : null;
  return u && !u.banned ? u : null; // الحساب المحظور لا يدخل
}
export const sessionMaxAge = SESSION_SECONDS;

// نسخة آمنة من المستخدم للإرجاع للواجهة (بدون hash)
export function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, language: u.language || null, createdAt: u.createdAt, trialEndsAt: u.createdAt + getPricing().trialDays * 86400000, role: roleOf(u), perms: permsOf(u) };
}
