// ============================================================
// تقديم المواقع المنشورة: /s/<subdomain>/ أو <subdomain>.PLATFORM_DOMAIN أو دومين مخصص
// نفس مُصدِّر الملفات يُستخدم هنا فيكون المنشور = المُصدَّر بالضبط.
// ============================================================
import { send } from '../lib/http.js';
import { db } from '../lib/db.js';
import { buildProjectFiles, MIME } from '../export/exporter.js';
import { siteUrl } from './websites.js';
import { config } from '../lib/config.js';

const cache = new Map();

export function findPublishedBy(pred) {
  const w = db.websites.find((x) => x.status === 'published' && x.published && pred(x));
  return w || null;
}

// dedicated=true عند التقديم من نطاق مستقل (تُسمح فيه الأكواد المخصصة بأمان لأن الأصل مختلف عن المنصة)
export function serveSite(res, w, relPath, dedicated) {
  const key = `${w.id}:${w.publishedAt}:${dedicated}`;
  let files = cache.get(key);
  if (!files) {
    for (const k of cache.keys()) if (k.startsWith(w.id + ':')) cache.delete(k);
    files = buildProjectFiles(w.published, { baseUrl: (siteUrl(w).startsWith('/') ? config.appUrl + siteUrl(w) : siteUrl(w)).replace(/\/$/, ''), allowCustomCode: dedicated });
    cache.set(key, files);
    if (cache.size > 200) cache.delete(cache.keys().next().value);
  }
  let rel = decodeURIComponent(relPath).replace(/^\/+/, '');
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  if (!files[rel] && files[rel + '.html']) rel += '.html';
  const body = files[rel];
  if (body === undefined) return send(res, 404, 'Not found');
  const ext = rel.split('.').pop();
  const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=60' };
  // في وضع المسار /s/ نعزل الصفحة (sandbox) حتى لا تصل لأي بيانات من أصل المنصة
  if (!dedicated && ext === 'html') headers['Content-Security-Policy'] = 'sandbox allow-scripts allow-forms allow-popups';
  send(res, 200, body, headers);
}
