// ============================================================
// واجهات المصادقة: تسجيل، دخول، خروج، استعادة كلمة المرور، Google
// رسائل الخطأ تُرجع كأكواد (مثل invalid_email) والواجهة تترجمها.
// ============================================================
import crypto from 'node:crypto';
import { route, HttpError, setCookie } from '../lib/http.js';
import { db } from '../lib/db.js';
import { config } from '../lib/config.js';
import { mailConfigured, sendMail, resetEmail } from '../lib/mailer.js';
import { hashPassword, verifyPassword, signToken, verifyToken, publicUser, COOKIE, sessionMaxAge } from '../lib/auth.js';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const LANGS = ['en', 'fr', 'ar'];
const findByEmail = (email) => db.users.find((u) => u.email === email);
const login = (res, user) => setCookie(res, COOKIE, signToken({ uid: user.id }), sessionMaxAge);

route('POST', '/api/auth/signup', ({ body, res }) => {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim().slice(0, 60);
  if (!EMAIL.test(email)) throw new HttpError(400, 'invalid_email');
  if (password.length < 8 || password.length > 128) throw new HttpError(400, 'weak_password');
  if (!name) throw new HttpError(400, 'name_required');
  if (findByEmail(email)) throw new HttpError(409, 'email_taken');
  const user = db.users.insert({ email, name, passwordHash: hashPassword(password), language: LANGS.includes(body.language) ? body.language : null, createdAt: Date.now() });
  login(res, user);
  return { user: publicUser(user) };
}, { limit: [10, 600000] });

route('POST', '/api/auth/login', ({ body, res }) => {
  const user = findByEmail(String(body.email || '').trim().toLowerCase());
  if (!user || !verifyPassword(String(body.password || ''), user.passwordHash)) throw new HttpError(401, 'invalid_credentials');
  if (user.banned) throw new HttpError(403, 'account_banned');
  login(res, user);
  return { user: publicUser(user) };
}, { limit: [10, 600000] });

route('POST', '/api/auth/logout', ({ res }) => { setCookie(res, COOKIE, '', 0); return { ok: true }; });

route('GET', '/api/auth/me', async ({ req }) => {
  const { userFromRequest } = await import('../lib/auth.js');
  const u = userFromRequest(req);
  return { user: u ? publicUser(u) : null };
});

route('PATCH', '/api/auth/me', ({ user, body }) => {
  const patch = {};
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim().slice(0, 60);
  if (LANGS.includes(body.language)) patch.language = body.language;
  return { user: publicUser(db.users.update(user.id, patch)) };
}, { auth: true });

// استعادة كلمة المرور: الرمز موقّع ومرتبط ببصمة كلمة المرور الحالية فيبطل بعد الاستخدام
const fp = (u) => crypto.createHash('sha256').update(u.passwordHash).digest('hex').slice(0, 16);
route('POST', '/api/auth/forgot', async ({ body }) => {
  const user = findByEmail(String(body.email || '').trim().toLowerCase());
  const out = { ok: true };
  if (user && !user.banned) {
    const link = `${config.appUrl}/#/reset?token=${signToken({ rid: user.id, f: fp(user) }, 3600)}`;
    const lang = LANGS.includes(body.lang) ? body.lang : user.language || 'en';
    if (mailConfigured()) {
      // الإرسال عبر SMTP (Gmail). لا نكشف للمستخدم هل نجح أم لا حتى لا نكشف وجود الحساب.
      try { const m = resetEmail(lang, link); await sendMail({ to: user.email, subject: m.subject, html: m.html }); }
      catch (e) { console.error('[nexora] فشل إرسال بريد الاستعادة:', e.message); }
    } else {
      console.log(`[nexora] SMTP غير مضبوط. رابط استعادة كلمة المرور لـ ${user.email}: ${link}`);
      if (!config.prod) out.devLink = link;
    }
  }
  return out;
}, { limit: [5, 600000] });

route('POST', '/api/auth/reset', ({ body }) => {
  const p = verifyToken(body.token);
  const user = p?.rid && db.users.get(p.rid);
  if (!user || p.f !== fp(user)) throw new HttpError(400, 'invalid_token');
  const password = String(body.password || '');
  if (password.length < 8 || password.length > 128) throw new HttpError(400, 'weak_password');
  db.users.update(user.id, { passwordHash: hashPassword(password) });
  return { ok: true };
}, { limit: [10, 600000] });

// Google Identity Services: الواجهة ترسل credential (ID token) ونتحقق منه عبر Google
route('POST', '/api/auth/google', async ({ body, res }) => {
  if (!config.google.clientId) throw new HttpError(501, 'google_not_configured');
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(body.credential || '')));
  const info = r.ok ? await r.json() : null;
  if (!info || info.aud !== config.google.clientId || info.email_verified !== 'true') throw new HttpError(401, 'invalid_credentials');
  const email = String(info.email).toLowerCase();
  let user = findByEmail(email);
  if (!user) user = db.users.insert({ email, name: String(info.name || email.split('@')[0]).slice(0, 60), passwordHash: '', createdAt: Date.now(), language: null });
  login(res, user);
  return { user: publicUser(user) };
}, { limit: [10, 600000] });
