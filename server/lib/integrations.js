// ============================================================
// التكاملات من لوحة المؤسس (بديل ملف .env): تُحفظ مشفّرة في القاعدة وتُطبَّق فورًا.
// متغيرات البيئة (Render ← Environment) تتقدم عليها إن وُجدت.
// ============================================================
import { config, overrides } from './config.js';
import { db } from './db.js';
import { encrypt, decrypt } from './crypto.js';

// secret=true: لا يُعرض بعد الحفظ (يظهر مقنّعًا فقط)
export const KEYS = [
  { key: 'GOOGLE_CLIENT_ID', group: 'google' },
  { key: 'SMTP_USER', group: 'mail' }, { key: 'SMTP_PASS', group: 'mail', secret: true }, { key: 'MAIL_FROM', group: 'mail' }, { key: 'SMTP_HOST', group: 'mail' },
  { key: 'ANTHROPIC_API_KEY', group: 'ai', secret: true }, { key: 'AI_MODEL', group: 'ai' },
  { key: 'STRIPE_SECRET_KEY', group: 'payments', secret: true }, { key: 'STRIPE_WEBHOOK_SECRET', group: 'payments', secret: true },
  { key: 'META_APP_ID', group: 'ads' }, { key: 'META_APP_SECRET', group: 'ads', secret: true },
  { key: 'TIKTOK_APP_ID', group: 'ads' }, { key: 'TIKTOK_APP_SECRET', group: 'ads', secret: true },
  { key: 'ADS_MAX_DAILY_BUDGET', group: 'ads' },
  { key: 'FOUNDER_SETUP_KEY', group: 'security', secret: true }
];
const find = (k) => KEYS.find((x) => x.key === k);

export function loadIntegrations() {
  const doc = db.settings.get('integrations');
  for (const k of Object.keys(overrides)) delete overrides[k];
  for (const [k, enc] of Object.entries(doc?.values || {})) { const v = decrypt(enc); if (v && find(k)) overrides[k] = v; }
}
export function saveIntegrations(patch) {
  const doc = db.settings.get('integrations') || { id: 'integrations', values: {} };
  const values = { ...doc.values };
  for (const [k, v] of Object.entries(patch || {})) {
    if (!find(k) || typeof v !== 'string') continue;
    const clean = v.trim().slice(0, 600);
    if (clean === '') delete values[k]; else if (clean !== '••••') values[k] = encrypt(clean);  // '••••' = لم يتغير
  }
  db.settings.get('integrations') ? db.settings.update('integrations', { values }) : db.settings.insert({ id: 'integrations', values });
  loadIntegrations();
}
// العرض: لا نرجع أي سرّ، فقط حالة الضبط ومصدره
export function integrationsView() {
  return KEYS.map(({ key, group, secret }) => {
    const fromEnv = !!process.env[key], fromPanel = !!overrides[key];
    const v = process.env[key] || overrides[key] || '';
    return { key, group, secret: !!secret, set: fromEnv || fromPanel, source: fromEnv ? 'env' : fromPanel ? 'panel' : 'none', value: secret ? (v ? '••••' : '') : v };
  });
}
loadIntegrations();
void config;
