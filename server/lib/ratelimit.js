// حدّ طلبات بسيط في الذاكرة (نافذة منزلقة). في الإنتاج متعدد الخوادم استبدله بـ Redis.
const buckets = new Map();
export function hit(key, max, windowMs) {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { buckets.set(key, arr); return false; }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > 3_600_000) buckets.delete(k); }, 600_000).unref();
