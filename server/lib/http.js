// ============================================================
// Router صغير + أدوات HTTP (بدون مكتبات)
// كل مسار يحدد: هل يحتاج تسجيل دخول؟ وما حدّ الطلبات (Rate limit)؟
// ============================================================
import { config } from './config.js';
import { hit } from './ratelimit.js';
import { userFromRequest } from './auth.js';

export class HttpError extends Error {
  constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra; }
}

const routes = [];
export function route(method, pattern, handler, opts = {}) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, handler, opts });
}

export function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function setCookie(res, name, value, maxAgeSec) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (config.prod) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export async function readBody(req, limit = 6_000_000) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new HttpError(413, 'too_large');
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

export function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body) || typeof body === 'string';
  res.writeHead(status, { 'Content-Type': isBuf ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(isBuf ? body : JSON.stringify(body));
}

export function clientIp(req) {
  return (config.prod && req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress || 'unknown';
}

// يرجع true إذا وُجد مسار مطابق وتمت معالجته
export async function dispatch(req, res, url) {
  for (const r of routes) {
    if (r.method !== req.method) continue;
    const m = r.re.exec(url.pathname);
    if (!m) continue;
    try {
      // حماية CSRF: الطلبات المُغيِّرة يجب أن تأتي من نفس الأصل
      if (req.method !== 'GET' && !r.opts.noOrigin) {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) throw new HttpError(403, 'forbidden_origin');
      }
      const ip = clientIp(req);
      if (r.opts.limit) {
        const [max, windowMs] = r.opts.limit;
        if (!hit(`${req.method}:${r.re.source}:${ip}`, max, windowMs)) throw new HttpError(429, 'rate_limited');
      }
      const ctx = { req, res, url, ip, query: Object.fromEntries(url.searchParams), params: {} };
      r.keys.forEach((k, i) => (ctx.params[k] = decodeURIComponent(m[i + 1])));
      if (r.opts.auth) {
        ctx.user = userFromRequest(req);
        if (!ctx.user) throw new HttpError(401, 'unauthorized');
      }
      if (req.method !== 'GET' && req.method !== 'DELETE') {
        ctx.raw = await readBody(req, r.opts.bodyLimit);
        if (!r.opts.rawBody) {
          try { ctx.body = ctx.raw.length ? JSON.parse(ctx.raw.toString('utf8')) : {}; } catch { throw new HttpError(400, 'invalid_json'); }
        }
      }
      const result = await r.handler(ctx);
      if (result !== undefined && !res.writableEnded) send(res, 200, result);
      if (!res.writableEnded) res.end();
    } catch (err) {
      if (err instanceof HttpError) send(res, err.status, { error: err.code, ...(err.extra || {}) });
      else { console.error('[nexora] خطأ غير متوقع:', err); send(res, 500, { error: 'server_error' }); }
    }
    return true;
  }
  return false;
}
