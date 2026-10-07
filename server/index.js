// ============================================================
// نقطة تشغيل الخادم: Static files + API + تقديم المواقع المنشورة
// بدون أي مكتبات خارجية (Node >= 18).
// ============================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { config, ROOT } from './lib/config.js';
import { dispatch, send } from './lib/http.js';
import './api/auth.js';
import './api/websites.js';
import './api/ai.js';
import './api/billing.js';
import './api/staff.js';
import './api/ads.js';
import './api/admin-settings.js';
import { serveDoc } from './api/tools.js';
import { serveSite, findPublishedBy } from './api/sites.js';
import { db } from './lib/db.js';
import { accessInfo } from './lib/pricing.js';
import { MIME } from './export/exporter.js';
import { aiMode } from './ai/provider.js';

const PUBLIC = path.join(ROOT, 'public');
const SHARED = path.join(ROOT, 'shared');
const TYPES = { ...MIME, svg: 'image/svg+xml', ico: 'image/x-icon', woff2: 'font/woff2', map: 'application/json' };
// يُحسب عند كل طلب لأن مفتاح Google قد يُضاف من لوحة المؤسس بعد التشغيل
const appCsp = () => { const g = config.google.clientId ? ' https://accounts.google.com' : ''; return `default-src 'self'; script-src 'self'${g}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com${g}; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'${g}; frame-src 'self'${g}; object-src 'none'; base-uri 'self'; frame-ancestors 'self'`; };
const FRAME_CSP = "default-src 'none'; script-src 'self'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: https:; frame-ancestors 'self'";

const FRAME_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link id="nx-fonts" rel="stylesheet" href=""><style id="nx-style"></style>
<style>[data-nx-id]{cursor:pointer}[data-nx-id]:hover{outline:1px dashed rgba(124,58,237,.8);outline-offset:-2px}[data-nx-id].nx-selected{outline:2px solid #7c3aed;outline-offset:-2px}</style>
</head><body></body><script src="/js/preview-frame.js"></script></html>`;

const SUSPENDED = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEXORA</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#06071a;color:#f4f5ff;font-family:Segoe UI,Tahoma,Arial,sans-serif;text-align:center;padding:1rem}b{font-size:1.6rem;letter-spacing:.1em;color:#a78bfa}p{color:#9aa0c4}</style></head><body><div><b>NEXORA</b><p>This website is currently unavailable.<br>هذا الموقع غير متاح حاليًا.<br>Ce site est momentanément indisponible.</p></div></body></html>';
// الموقع متاح فقط إذا لم يُحظر صاحبه/الموقع، وكان في التجربة أو مدفوعًا
function sitePlayable(w) {
  const owner = db.users.get(w.userId);
  return !!owner && !owner.banned && !w.banned && accessInfo(owner, w).ok;
}

function serveStatic(req, res, pathname) {
  let base = PUBLIC, rel = pathname;
  if (pathname.startsWith('/shared/')) { base = SHARED; rel = pathname.slice(7); }
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, 'Not found');
  const ext = path.extname(file).slice(1);
  const type = TYPES[ext] || 'application/octet-stream';
  const headers = { 'Content-Type': type, 'Cache-Control': config.prod && ext !== 'html' ? 'public, max-age=3600' : 'no-cache', 'X-Content-Type-Options': 'nosniff' };
  let body = fs.readFileSync(file);
  if (/^(text|application\/(json|javascript))|svg/.test(type) && body.length > 1024 && /gzip/.test(req.headers['accept-encoding'] || '')) { body = zlib.gzipSync(body); headers['Content-Encoding'] = 'gzip'; }
  res.writeHead(200, headers); res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // 1) مواقع منشورة على نطاقات مستقلة (subdomain أو دومين مخصص)
  const appHost = new URL(config.appUrl).hostname;
  if (host && host !== appHost && host !== 'localhost' && host !== '127.0.0.1') {
    const sub = config.platformDomain && host.endsWith('.' + config.platformDomain) ? host.slice(0, -config.platformDomain.length - 1) : null;
    const w = findPublishedBy((x) => (sub ? x.subdomain === sub : x.customDomain === host));
    if (w) return sitePlayable(w) ? serveSite(res, w, url.pathname, true) : send(res, 503, SUSPENDED, { 'Content-Type': 'text/html; charset=utf-8' });
  }
  // 2) وضع المسار /s/<sub>/
  const m = /^\/s\/([a-z0-9-]+)(\/.*)?$/.exec(url.pathname);
  if (m) {
    const w = findPublishedBy((x) => x.subdomain === m[1]);
    if (!w) return send(res, 404, 'Not found');
    if (!m[2]) { res.writeHead(301, { Location: `/s/${m[1]}/` }); return res.end(); }
    return sitePlayable(w) ? serveSite(res, w, m[2], false) : send(res, 503, SUSPENDED, { 'Content-Type': 'text/html; charset=utf-8' });
  }
  const d = /^\/doc\/([a-f0-9]+)$/.exec(url.pathname);
  if (d) return serveDoc(res, d[1]);
  // 3) واجهات API
  if (url.pathname.startsWith('/api/')) {
    if (await dispatch(req, res, url)) return;
    return send(res, 404, { error: 'not_found' });
  }
  // 4) إطار معاينة Editor
  if (url.pathname === '/preview-frame') return send(res, 200, FRAME_HTML, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': FRAME_CSP });
  // 5) الملفات الثابتة
  res.setHeader('Content-Security-Policy', appCsp());
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
  serveStatic(req, res, decodeURIComponent(url.pathname));
});

process.on('unhandledRejection', (e) => console.error('[nexora] unhandledRejection', e));
server.listen(config.port, () => {
  console.log(`\n  NEXORA جاهز على ${config.appUrl}`);
  console.log(`  الذكاء الاصطناعي: ${aiMode() === 'claude' ? 'Claude (حقيقي)' : 'Mock تجريبي (أضف ANTHROPIC_API_KEY لتفعيل الحقيقي)'}`);
  console.log(`  الدفع: ${config.stripe.key ? 'Stripe' : 'وضع تجريبي (أضف STRIPE_SECRET_KEY)'}\n`);
});
