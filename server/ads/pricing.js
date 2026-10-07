// ============================================================
// تسعير الحملات: رسوم خدمة NEXORA شفافة وتزيد تلقائيًا مع الميزات وعدد المنصات.
// ميزانية الإعلان نفسها تُدفع للمنصة (Meta/TikTok) من حساب المستخدم الإعلاني، ولا نلمسها.
// القيم قابلة للتعديل من لوحة المؤسس (الطاقم ← تسعير الإعلانات).
// ============================================================
import { db } from '../lib/db.js';

export const DEFAULT_ADS_PRICING = { baseFee: 5, perExtraPlatform: 3, perExtraVariant: 2, aiCopy: 2, scheduling: 1, advancedTargeting: 3, retargeting: 4, spendPercent: 5, minFee: 5, maxFee: 500 };
const LIMITS = { baseFee: 1000, perExtraPlatform: 1000, perExtraVariant: 1000, aiCopy: 1000, scheduling: 1000, advancedTargeting: 1000, retargeting: 1000, spendPercent: 30, minFee: 1000, maxFee: 100000 };

export const getAdsPricing = () => ({ ...DEFAULT_ADS_PRICING, ...(db.settings.get('adsPricing') || {}), id: undefined });
export function setAdsPricing(p) {
  const clean = {};
  for (const [k, max] of Object.entries(LIMITS)) clean[k] = Math.min(max, Math.max(0, Math.round((Number(p[k]) || 0) * 100) / 100));
  if (clean.maxFee < clean.minFee) clean.maxFee = clean.minFee;
  return db.settings.get('adsPricing') ? db.settings.update('adsPricing', clean) : db.settings.insert({ id: 'adsPricing', ...clean });
}

// camp: حملة منظَّفة. يرجع بنود التسعير (مفاتيح تُترجم في الواجهة) والإجمالي
export function quote(camp) {
  if (camp.mode !== 'paid') return { currency: 'USD', lines: [], fee: 0, adSpend: 0, total: 0, free: true };
  const p = getAdsPricing(), lines = [];
  const add = (key, amount, qty = 1) => { if (amount > 0) lines.push({ key, qty, amount: Math.round(amount * 100) / 100 }); };
  const n = camp.targets.length;
  add('q_base', p.baseFee);
  add('q_platforms', Math.max(0, n - 1) * p.perExtraPlatform, Math.max(0, n - 1));
  add('q_variants', camp.variants.length * p.perExtraVariant, camp.variants.length);
  if (camp.features.aiCopy) add('q_aiCopy', p.aiCopy);
  if (camp.budget.startDate) add('q_scheduling', p.scheduling);
  if (camp.features.advanced) add('q_targeting', p.advancedTargeting);
  if (camp.features.retargeting) add('q_retargeting', p.retargeting);
  const adSpend = Math.round(camp.budget.daily * camp.budget.days * Math.max(1, n) * 100) / 100;
  add('q_spend', adSpend * (p.spendPercent / 100));
  let fee = lines.reduce((a, l) => a + l.amount, 0);
  const clamped = Math.min(p.maxFee, Math.max(p.minFee, fee));
  if (clamped !== fee) { lines.push({ key: clamped > fee ? 'q_min' : 'q_max', qty: 1, amount: Math.round((clamped - fee) * 100) / 100 }); fee = clamped; }
  return { currency: 'USD', lines, fee: Math.round(fee * 100) / 100, adSpend, total: Math.round(fee * 100) / 100, free: false, percent: p.spendPercent };
}
