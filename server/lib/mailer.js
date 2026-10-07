// ============================================================
// إرسال البريد عبر SMTP (Gmail أو غيره) بدون مكتبات خارجية.
// Gmail: فعّل التحقق بخطوتين ثم أنشئ "App Password" وضعه في SMTP_PASS.
// بدون إعدادات SMTP: لا يُرسل شيء، ويُطبع الرابط في السجل (Logs) للتطوير.
// ============================================================
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';
import { config } from './config.js';

export const mailConfigured = () => !!(config.smtp.user && config.smtp.pass);
const clean = (s) => String(s).replace(/[\r\n]+/g, ' ').trim();
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');

export function sendMail({ to, subject, html }) {
  const c = config.smtp;
  to = clean(to);
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to)) return Promise.reject(new Error('bad_recipient'));
  const from = clean(c.from || c.user);
  const fromAddr = (/<([^>]+)>/.exec(from) || [, from])[1];
  return new Promise((resolve, reject) => {
    const sock = c.secure ? tls.connect({ host: c.host, port: c.port, servername: c.host }) : net.connect({ host: c.host, port: c.port });
    sock.setTimeout(20000, () => { sock.destroy(); reject(new Error('smtp_timeout')); });
    sock.on('error', reject);
    let buf = '', waiter = null;
    const check = () => {
      if (!waiter) return;
      const lines = buf.split('\r\n');
      if (lines.length < 2) return;
      const full = lines.slice(0, -1);
      if (!/^\d{3} /.test(full[full.length - 1])) return;
      const text = full.join('\n'); buf = lines[lines.length - 1];
      const w = waiter; waiter = null; w({ code: Number(text.slice(0, 3)), text });
    };
    sock.on('data', (d) => { buf += d.toString('utf8'); check(); });
    const read = () => new Promise((r) => { waiter = r; check(); });
    const cmd = async (line, ok) => { if (line !== null) sock.write(line + '\r\n'); const r = await read(); if (!ok.includes(r.code)) throw new Error('smtp_' + r.code); return r; };
    (async () => {
      await cmd(null, [220]);
      await cmd('EHLO nexora', [250]);
      await cmd('AUTH LOGIN', [334]); await cmd(b64(c.user), [334]); await cmd(b64(c.pass), [235]);
      await cmd(`MAIL FROM:<${fromAddr}>`, [250]); await cmd(`RCPT TO:<${to}>`, [250, 251]); await cmd('DATA', [354]);
      const body = b64(html).replace(/(.{76})/g, '$1\r\n');
      const msg = [`From: ${from}`, `To: ${to}`, `Subject: =?UTF-8?B?${b64(clean(subject))}?=`, 'MIME-Version: 1.0', 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64', `Date: ${new Date().toUTCString()}`, `Message-ID: <${crypto.randomBytes(8).toString('hex')}@nexora>`, '', body].join('\r\n');
      await cmd(msg + '\r\n.', [250]);
      sock.write('QUIT\r\n'); sock.end(); resolve(true);
    })().catch((e) => { sock.destroy(); reject(e); });
  });
}

const T = {
  en: { s: 'Reset your NEXORA password', h: 'Reset your password', p: 'Click the button below to choose a new password. The link works for 1 hour.', b: 'Choose a new password', n: 'If you did not request this, you can ignore this email.' },
  fr: { s: 'Réinitialisez votre mot de passe NEXORA', h: 'Réinitialiser le mot de passe', p: 'Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Le lien est valable 1 heure.', b: 'Choisir un nouveau mot de passe', n: 'Si vous n’avez rien demandé, ignorez cet e-mail.' },
  ar: { s: 'استعادة كلمة مرور NEXORA', h: 'استعادة كلمة المرور', p: 'اضغط على الزر أدناه لاختيار كلمة مرور جديدة. الرابط صالح لمدة ساعة واحدة.', b: 'اختيار كلمة مرور جديدة', n: 'إذا لم تطلب ذلك فتجاهل هذه الرسالة.' }
};
export function resetEmail(lang, link) {
  const t = T[lang] || T.en, dir = lang === 'ar' ? 'rtl' : 'ltr';
  const safe = String(link).replace(/"/g, '%22');
  return { subject: t.s, html: `<div dir="${dir}" style="font-family:Segoe UI,Tahoma,Arial,sans-serif;background:#06071a;padding:32px"><div style="max-width:480px;margin:auto;background:#10132e;border:1px solid #2a2f63;border-radius:16px;padding:32px;color:#f4f5ff"><div style="font-weight:800;letter-spacing:.1em;font-size:20px;color:#a78bfa">NEXORA</div><h2 style="margin:18px 0 8px">${t.h}</h2><p style="color:#9aa0c4;line-height:1.7">${t.p}</p><p style="margin:26px 0"><a href="${safe}" style="background:linear-gradient(135deg,#8b5cf6,#3b82f6);color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;display:inline-block">${t.b}</a></p><p style="color:#6b7194;font-size:13px">${t.n}</p></div></div>` };
}
