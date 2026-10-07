// ============================================================
// الإعدادات: تُقرأ من متغيرات البيئة (.env) فقط — لا مفاتيح داخل الكود
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// قارئ .env بسيط بدون مكتبات خارجية
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* لا يوجد .env — نستخدم القيم الافتراضية */ }

const e = process.env;
const prod = e.NODE_ENV === 'production';

// القيم التي يدخلها المؤسس من لوحة التحكم (الإعدادات ← التكاملات) بدل ملف .env
// يملؤها server/lib/integrations.js بعد تحميل القاعدة. متغيرات البيئة تتقدم عليها إن وُجدت.
export const overrides = {};
const val = (k, fb = '') => e[k] || overrides[k] || fb;

// السرّ: من SESSION_SECRET، وإلا يُولَّد مرة واحدة ويُحفظ في ملف بجانب البيانات
// (حتى يعمل الموقع حتى لو لم تستطع ضبط المتغيرات). الأفضل ضبطه من Render ← Environment.
let secret = e.SESSION_SECRET;
if (!secret) {
  const file = path.resolve(ROOT, e.SECRET_FILE || './data/secret.key');
  try { secret = fs.readFileSync(file, 'utf8').trim(); } catch { /* غير موجود بعد */ }
  if (!secret) {
    secret = crypto.randomBytes(32).toString('hex');
    try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, secret, { mode: 0o600 }); } catch { /* قرص للقراءة فقط */ }
  }
  console.warn('[nexora] SESSION_SECRET غير مضبوط: استُخدم سرّ محفوظ في ' + file + ' (على Render يُمسح مع كل نشر ما لم تضف Disk).');
}

export const config = {
  prod,
  port: Number(e.PORT) || 3000,
  // على Render يتوفر RENDER_EXTERNAL_URL تلقائيًا فنستخدمه إذا لم يُضبط APP_URL
  appUrl: (e.APP_URL || e.RENDER_EXTERNAL_URL || `http://localhost:${Number(e.PORT) || 3000}`).replace(/\/$/, ''),
  platformDomain: (e.PLATFORM_DOMAIN || '').toLowerCase(),
  secret,
  dataFile: path.resolve(ROOT, e.DATA_FILE || './data/db.json'),
  // قاعدة بيانات الحسابات منفصلة تمامًا عن بيانات المواقع
  accountsFile: path.resolve(ROOT, e.ACCOUNTS_FILE || (e.DATA_FILE ? path.join(path.dirname(e.DATA_FILE), 'accounts.json') : './data/accounts.json')),
  // الإعدادات التالية تُقرأ عند كل استخدام (getters) فتتغير فورًا عند حفظها من لوحة المؤسس
  get founderKey() { return val('FOUNDER_SETUP_KEY'); },
  get smtp() { return { host: val('SMTP_HOST', 'smtp.gmail.com'), port: Number(val('SMTP_PORT')) || 465, secure: e.SMTP_SECURE !== 'false', user: val('SMTP_USER'), pass: val('SMTP_PASS'), from: val('MAIL_FROM') }; },
  get ai() { return { key: val('ANTHROPIC_API_KEY'), model: val('AI_MODEL', 'claude-sonnet-5-5') }; },
  get stripe() { return { key: val('STRIPE_SECRET_KEY'), webhookSecret: val('STRIPE_WEBHOOK_SECRET') }; },
  get google() { return { clientId: val('GOOGLE_CLIENT_ID'), secret: val('GOOGLE_CLIENT_SECRET') }; },
  get ads() { return { metaId: val('META_APP_ID'), metaSecret: val('META_APP_SECRET'), tiktokId: val('TIKTOK_APP_ID'), tiktokSecret: val('TIKTOK_APP_SECRET'), maxDaily: Number(val('ADS_MAX_DAILY_BUDGET')) || 500 }; },
  priceUsd: Number(e.WEBSITE_PRICE_USD) || 5,
  trialDays: Number(e.TRIAL_DAYS) || 7
};
