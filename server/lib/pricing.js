// ============================================================
// التسعير القابل للتعديل من لوحة المؤسس + فحص الوصول (تجربة / مدفوع)
//   model: once (دفعة واحدة)  أو monthly (اشتراك شهري)
//   scope: website (لكل موقع)  أو account (حساب كامل: كل المواقع)
// ============================================================
import { config } from './config.js';
import { db } from './db.js';

export const defaultPricing = () => ({ model: 'once', scope: 'website', priceUsd: config.priceUsd, trialDays: config.trialDays });
export function getPricing() { return { ...defaultPricing(), ...(db.settings.get('pricing') || {}) }; }
export function setPricing(p) {
  const clean = {
    model: p.model === 'monthly' ? 'monthly' : 'once',
    scope: p.scope === 'account' ? 'account' : 'website',
    priceUsd: Math.min(10000, Math.max(0.5, Number(p.priceUsd) || 0)),
    trialDays: Math.min(90, Math.max(0, Math.floor(Number(p.trialDays) || 0)))
  };
  if (!clean.priceUsd) throw new Error('invalid_pricing');
  return db.settings.get('pricing') ? db.settings.update('pricing', clean) : db.settings.insert({ id: 'pricing', ...clean });
}

export const trialEnds = (u) => u.createdAt + getPricing().trialDays * 86400000;
export function accessInfo(user, site) {
  const now = Date.now();
  const trial = now < trialEnds(user);
  const site_ = !!site && (site.paid === true || (site.paidUntil || 0) > now);
  const acct = user.paid === true || (user.paidUntil || 0) > now;
  return { trial, paid: site_ || acct, ok: trial || site_ || acct };
}
