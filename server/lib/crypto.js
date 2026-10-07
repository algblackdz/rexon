// تشفير الأسرار (مفاتيح API ورموز ربط المنصات) قبل حفظها في القاعدة: AES-256-GCM
// المفتاح مشتق من السرّ الرئيسي (SESSION_SECRET أو الملف المحفوظ). لا تُرجَع الأسرار للواجهة أبدًا.
import crypto from 'node:crypto';
import { config } from './config.js';

const key = () => crypto.createHash('sha256').update('nexora-enc:' + config.secret).digest();
export function encrypt(plain) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return 'v1.' + [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.');
}
export function decrypt(s) {
  try {
    const [v, i, t, d] = String(s).split('.');
    if (v !== 'v1') return null;
    const dc = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(i, 'base64url'));
    dc.setAuthTag(Buffer.from(t, 'base64url'));
    return Buffer.concat([dc.update(Buffer.from(d, 'base64url')), dc.final()]).toString('utf8');
  } catch { return null; }
}
