// ============================================================
// إعدادات المؤسس من داخل الموقع (بديل ملف .env):
//  - التكاملات (Google, Gmail, Stripe, AI, Meta, TikTok) تُحفظ مشفّرة وتعمل فورًا
//  - تسعير الإعلانات
//  - اختبار البريد
// ============================================================
import { route, HttpError } from '../lib/http.js';
import { can } from '../lib/roles.js';
import { integrationsView, saveIntegrations } from '../lib/integrations.js';
import { mailConfigured, sendMail } from '../lib/mailer.js';
import { getAdsPricing, setAdsPricing } from '../ads/pricing.js';

const need = (ctx, perm) => { if (!can(ctx.user, perm)) throw new HttpError(403, 'forbidden'); };

route('GET', '/api/staff/integrations', (ctx) => { need(ctx, 'settings.edit'); return { items: integrationsView() }; }, { auth: true });
route('PUT', '/api/staff/integrations', (ctx) => { need(ctx, 'settings.edit'); saveIntegrations(ctx.body.values); return { items: integrationsView() }; }, { auth: true, limit: [30, 600000] });
route('POST', '/api/staff/integrations/test-mail', async (ctx) => {
  need(ctx, 'settings.edit');
  if (!mailConfigured()) throw new HttpError(400, 'mail_not_configured');
  try { await sendMail({ to: ctx.user.email, subject: 'NEXORA — test email', html: '<p style="font-family:Arial">✅ NEXORA email is working. / البريد يعمل بنجاح.</p>' }); }
  catch (e) { throw new HttpError(400, 'mail_failed', { detail: String(e.message).slice(0, 120) }); }
  return { ok: true };
}, { auth: true, limit: [5, 600000] });
route('GET', '/api/staff/ads-pricing', (ctx) => { need(ctx, 'pricing.edit'); return { pricing: getAdsPricing() }; }, { auth: true });
route('PUT', '/api/staff/ads-pricing', (ctx) => { need(ctx, 'pricing.edit'); setAdsPricing(ctx.body || {}); return { pricing: getAdsPricing() }; }, { auth: true });
