// ============================================================
// أدوات المنصة: المساعد الذكي، مولّد SEO، مولّد Portfolio، الفواتير والعقود
// ============================================================
import crypto from 'node:crypto';
import { route, HttpError, send } from '../lib/http.js';
import { db } from '../lib/db.js';
import { config } from '../lib/config.js';
import { getPricing } from '../lib/pricing.js';
import { mailConfigured, sendMail } from '../lib/mailer.js';
import { chat } from '../ai/provider.js';
import { kbAnswer } from '../ai/kb.js';
import { mockGenerate } from '../ai/mock.js';
import { normalizeWebsite, uid, siteLangs } from '../../shared/schema.js';
import { makeSection } from '../../shared/defaults.js';
import { tr, esc } from '../../shared/render.js';
import { createWebsite, view } from './websites.js';

const LANGS = ['en', 'fr', 'ar'];
const origin = (req) => `${req.headers['x-forwarded-proto'] || (config.prod ? 'https' : 'http')}://${req.headers.host}`;
const txt = (v, n) => String(v ?? '').replace(/\u0000/g, '').trim().slice(0, n);
const num = (v, a, b) => Math.min(b, Math.max(a, Number(v) || 0));

// ---------------- المساعد الذكي ----------------
function pricingText(lang) {
  const p = getPricing(), per = { once: { en: 'one-time', fr: 'paiement unique', ar: 'دفعة واحدة' }, monthly: { en: 'per month', fr: 'par mois', ar: 'شهريًا' } }[p.model][lang];
  const sc = { website: { en: 'per website', fr: 'par site', ar: 'لكل موقع' }, account: { en: 'for all your websites', fr: 'pour tous vos sites', ar: 'لجميع مواقعك' } }[p.scope][lang];
  return { en: `Every account gets a ${p.trialDays}-day free trial with full access. After that: $${p.priceUsd} (${per}) ${sc}.`, fr: `Chaque compte a ${p.trialDays} jours d’essai gratuit avec accès complet. Ensuite : ${p.priceUsd} $ (${per}) ${sc}.`, ar: `كل حساب يحصل على تجربة مجانية ${p.trialDays} أيام بوصول كامل. بعدها: ${p.priceUsd}$ (${per}) ${sc}.` }[lang];
}
const SYSTEM = (lang) => `You are NEXORA Assistant, an expert, friendly helper inside NEXORA, an AI website builder (English / Français / العربية with RTL).
Answer in the user's language (${{ en: 'English', fr: 'French', ar: 'Arabic' }[lang]} unless they write in another). Be accurate, practical and concise: short steps, concrete examples, no filler.
You can help with NEXORA AND with anything related to building a business online: web design, copywriting, SEO, marketing, freelancing, pricing projects, HTML/CSS/JS, domains, hosting, e-commerce.
NEXORA facts (do not invent other features): create websites via a 5-step wizard (type, description, style, colors, generate); editor with pages, sections, components, assets, themes, animations, settings, undo/redo, auto-save, version history, device preview, dark/light preview; "Ask AI" edits the site by command; export code as ZIP (index.html, style.css, script.js, assets, Arabic comments); asset export per section as CSS/Tailwind/SVG; publish to a free link or custom domain (CNAME); SEO generator; invoices, contracts, pricing calculator and portfolio generator in Dashboard → Tools; human support chat for logged-in users.
Pricing now: ${pricingText('en')}
If the issue involves a specific account, payment or bug you cannot verify, say so and tell the user to open the Support tab. Never ask for passwords or card numbers.`;

route('POST', '/api/assistant', async ({ body }) => {
  const lang = LANGS.includes(body.lang) ? body.lang : 'en';
  const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-12).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: txt(m.content, 1500) })).filter((m) => m.content);
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') throw new HttpError(400, 'message_required');
  while (msgs[0].role !== 'user') msgs.shift();
  try { return { reply: await chat(SYSTEM(lang), msgs), source: 'claude' }; }
  catch (e) { if (e.message !== 'no_key') console.warn('[nexora] المساعد: فشل Claude', e.message); }
  return { reply: kbAnswer(msgs[msgs.length - 1].content, lang, pricingText(lang)), source: 'kb' };
}, { limit: [20, 60000] });

// ---------------- مولّد SEO ----------------
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1); return c.slice(0, Math.max(c.lastIndexOf(' '), n * 0.6)).replace(/[,.;:\-—\s]+$/, '') + '…'; };
function mockSeo(site) {
  const multi = site.language === 'multi', langs = siteLangs(site);
  const hero = site.pages[0].sections.find((s) => s.component === 'hero')?.props || {};
  const pick = (fn) => (multi ? Object.fromEntries(langs.map((l) => [l, fn(l)])) : fn(langs[0]));
  const lang0 = multi ? 'en' : langs[0];
  const out = { site: { title: cut(`${site.name} — ${tr(hero.title, lang0)}`, 60), description: cut(tr(hero.subtitle, lang0) || site.name, 155) }, pages: {} };
  for (const p of site.pages) {
    const first = p.sections.find((s) => s.props?.title || s.props?.subtitle)?.props || {};
    out.pages[p.id] = { title: pick((l) => cut(p.slug === 'index' ? `${site.name} — ${tr(hero.title, l)}` : `${tr(p.title, l)} — ${site.name}`, 60)), description: pick((l) => cut(tr(first.subtitle, l) || tr(first.title, l) || tr(hero.subtitle, l), 155)) };
  }
  return out;
}
route('POST', '/api/ai/seo', async ({ body }) => {
  let site; try { site = normalizeWebsite(body.website); } catch { throw new HttpError(400, 'invalid_website'); }
  return { ...mockSeo(site) };
}, { auth: true, limit: [20, 60000], bodyLimit: 12_000_000 });

// ---------------- مولّد Portfolio ----------------
route('POST', '/api/portfolio/generate', ({ user, body }) => {
  const projects = (Array.isArray(body.projects) ? body.projects : []).slice(0, 12).map((p) => ({ title: txt(p.title, 80), category: txt(p.category, 40), description: txt(p.description, 400), image: typeof p.image === 'string' ? p.image : '' })).filter((p) => p.title);
  if (!projects.length) throw new HttpError(400, 'projects_required');
  const language = ['en', 'fr', 'ar'].includes(body.language) ? body.language : 'en';
  const site = mockGenerate({ type: 'portfolio', style: txt(body.style, 20) || 'creative', colors: body.colors && typeof body.colors === 'object' ? { preset: body.colors.preset } : {}, language, name: txt(body.name, 80) || { en: 'My Portfolio', fr: 'Mon portfolio', ar: 'معرض أعمالي' }[language], prompt: '' });
  const ctx = { lang: language, multi: false, name: site.name, animation: 'fade-up' };
  const assets = [];
  const items = projects.map((p) => {
    let image = '';
    if (/^data:image\/(png|jpeg|webp|gif);base64,/.test(p.image)) { const id = uid('ast'); assets.push({ id, name: p.title.replace(/[^\w]+/g, '_').slice(0, 30) + '.png', dataUrl: p.image }); image = 'asset:' + id; }
    return { image, caption: p.category ? `${p.title} · ${p.category}` : p.title };
  });
  const home = site.pages[0];
  const hero = home.sections.find((s) => s.component === 'hero');
  if (hero && txt(body.bio, 300)) hero.props.subtitle = txt(body.bio, 300);
  const gal = home.sections.find((s) => s.component === 'gallery');
  if (gal) gal.props.items = items;
  const work = makeSection('cards', ctx);
  work.props.items = projects.map((p) => ({ title: p.title, text: p.description || p.category, image: items[projects.indexOf(p)].image }));
  work.props.title = { en: 'Projects', fr: 'Projets', ar: 'المشاريع' }[language];
  const si = home.sections.findIndex((s) => s.component === 'gallery');
  home.sections.splice(si >= 0 ? si + 1 : 2, 0, work);
  site.assets = assets;
  return { website: view(createWebsite(user.id, normalizeWebsite(site)), true) };
}, { auth: true, limit: [10, 600000], bodyLimit: 14_000_000 });

// ---------------- الفواتير والعقود ----------------
const party = (p) => ({ name: txt(p?.name, 120), email: txt(p?.email, 120), address: txt(p?.address, 300) });
const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
function cleanDoc(type, d) {
  const base = { lang: LANGS.includes(d.lang) ? d.lang : 'en', currency: /^[A-Z]{3}$/.test(d.currency) ? d.currency : 'USD', from: party(d.from), client: party(d.client), notes: txt(d.notes, 1000), issueDate: date(d.issueDate) || new Date().toISOString().slice(0, 10) };
  if (type === 'invoice') return { ...base, dueDate: date(d.dueDate), taxPercent: num(d.taxPercent, 0, 100), items: (Array.isArray(d.items) ? d.items : []).slice(0, 30).map((i) => ({ desc: txt(i.desc, 200), qty: num(i.qty, 0, 100000), price: num(i.price, 0, 10_000_000) })).filter((i) => i.desc) };
  return { ...base, scope: txt(d.scope, 3000), price: num(d.price, 0, 100_000_000), startDate: date(d.startDate), deadline: date(d.deadline), paymentTerms: txt(d.paymentTerms, 500), revisions: Math.floor(num(d.revisions, 0, 50)), clauses: (Array.isArray(d.clauses) ? d.clauses : []).slice(0, 20).map((c) => txt(c, 500)).filter(Boolean) };
}
export const invoiceTotals = (d) => { const sub = d.items.reduce((a, i) => a + i.qty * i.price, 0), tax = sub * (d.taxPercent / 100); return { sub, tax, total: sub + tax }; };
const mine = (ctx) => { const x = db.docs.get(ctx.params.id); if (!x || x.userId !== ctx.user.id) throw new HttpError(404, 'not_found'); return x; };
const row = (x) => ({ id: x.id, type: x.type, number: x.number, status: x.status, data: x.data, token: x.token, createdAt: x.createdAt, sentAt: x.sentAt || null, acceptedAt: x.acceptedAt || null, acceptedBy: x.acceptedBy || '', total: x.type === 'invoice' ? invoiceTotals(x.data).total : x.data.price });

route('GET', '/api/docs', ({ user }) => ({ docs: db.docs.list((x) => x.userId === user.id).sort((a, b) => b.createdAt - a.createdAt).map(row) }), { auth: true });
route('POST', '/api/docs', ({ user, body }) => {
  const type = body.type === 'contract' ? 'contract' : 'invoice';
  const all = db.docs.list((x) => x.userId === user.id);
  if (all.length >= 200) throw new HttpError(403, 'limit_reached');
  const n = all.filter((x) => x.type === type).length + 1;
  const doc = db.docs.insert({ userId: user.id, type, number: `${type === 'invoice' ? 'INV' : 'CTR'}-${String(n).padStart(4, '0')}`, status: 'draft', token: crypto.randomBytes(18).toString('hex'), createdAt: Date.now(), data: cleanDoc(type, body.data || {}) });
  return { doc: row(doc) };
}, { auth: true, limit: [60, 600000] });
route('PUT', '/api/docs/:id', (ctx) => { const x = mine(ctx); if (x.status === 'accepted') throw new HttpError(409, 'locked'); return { doc: row(db.docs.update(x.id, { data: cleanDoc(x.type, ctx.body.data || {}) })) }; }, { auth: true });
route('DELETE', '/api/docs/:id', (ctx) => { db.docs.remove(mine(ctx).id); return { ok: true }; }, { auth: true });
route('POST', '/api/docs/:id/mark', (ctx) => { const x = mine(ctx), s = ['draft', 'sent', 'paid'].includes(ctx.body.status) ? ctx.body.status : null; if (!s) throw new HttpError(400, 'invalid_status'); return { doc: row(db.docs.update(x.id, { status: s })) }; }, { auth: true });
route('POST', '/api/docs/:id/send', async (ctx) => {
  const x = mine(ctx), link = `${origin(ctx.req)}/doc/${x.token}`;
  const to = txt(ctx.body.email || x.data.client.email, 120);
  let mailed = false;
  if (to && mailConfigured()) {
    const L = { en: ['sent you', 'View document'], fr: ['vous a envoyé', 'Voir le document'], ar: ['أرسل لك', 'عرض المستند'] }[x.data.lang];
    const dir = x.data.lang === 'ar' ? 'rtl' : 'ltr';
    try { await sendMail({ to, subject: `${x.number} — ${x.data.from.name || ctx.user.name}`, html: `<div dir="${dir}" style="font-family:Segoe UI,Tahoma,Arial;padding:24px"><p><b>${esc(x.data.from.name || ctx.user.name)}</b> ${L[0]} ${esc(x.number)}</p><p><a href="${esc(link)}" style="background:#6d28d9;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none">${L[1]}</a></p></div>` }); mailed = true; }
    catch (e) { console.error('[nexora] فشل إرسال المستند:', e.message); }
  }
  if (x.status === 'draft') db.docs.update(x.id, { status: 'sent', sentAt: Date.now() });
  return { link, mailed };
}, { auth: true, limit: [30, 600000] });

// ----- الصفحة العامة التي يراها العميل -----
const LBL = {
  en: { invoice: 'Invoice', contract: 'Service Agreement', from: 'From', to: 'Billed to', date: 'Date', due: 'Due', desc: 'Description', qty: 'Qty', price: 'Price', amount: 'Amount', sub: 'Subtotal', tax: 'Tax', total: 'Total', notes: 'Notes', print: 'Print / Save PDF', scope: 'Scope of work', fee: 'Fee', start: 'Start date', deadline: 'Deadline', pay: 'Payment terms', rev: 'Revisions included', clauses: 'Terms', provider: 'Service provider', client: 'Client', accept: 'Accept contract', typeName: 'Type your full name to sign', signed: 'Accepted by', on: 'on', paid: 'PAID', defaults: ['The provider delivers the work described in the scope of work.', 'The client provides content and feedback in a timely manner.', 'Ownership of the final work transfers to the client after full payment.', 'Either party may terminate with written notice; completed work is payable.'] },
  fr: { invoice: 'Facture', contract: 'Contrat de prestation', from: 'De', to: 'Facturé à', date: 'Date', due: 'Échéance', desc: 'Description', qty: 'Qté', price: 'Prix', amount: 'Montant', sub: 'Sous-total', tax: 'Taxe', total: 'Total', notes: 'Notes', print: 'Imprimer / PDF', scope: 'Périmètre', fee: 'Honoraires', start: 'Début', deadline: 'Date limite', pay: 'Conditions de paiement', rev: 'Révisions incluses', clauses: 'Conditions', provider: 'Prestataire', client: 'Client', accept: 'Accepter le contrat', typeName: 'Saisissez votre nom complet pour signer', signed: 'Accepté par', on: 'le', paid: 'PAYÉ', defaults: ['Le prestataire livre le travail décrit dans le périmètre.', 'Le client fournit contenus et retours dans les délais.', 'La propriété du travail final est transférée au client après paiement intégral.', 'Chaque partie peut résilier par écrit ; le travail réalisé reste dû.'] },
  ar: { invoice: 'فاتورة', contract: 'عقد خدمة', from: 'من', to: 'إلى', date: 'التاريخ', due: 'الاستحقاق', desc: 'الوصف', qty: 'الكمية', price: 'السعر', amount: 'المبلغ', sub: 'المجموع الفرعي', tax: 'الضريبة', total: 'الإجمالي', notes: 'ملاحظات', print: 'طباعة / حفظ PDF', scope: 'نطاق العمل', fee: 'الأتعاب', start: 'تاريخ البدء', deadline: 'موعد التسليم', pay: 'شروط الدفع', rev: 'عدد التعديلات المشمولة', clauses: 'الشروط', provider: 'مقدّم الخدمة', client: 'العميل', accept: 'قبول العقد', typeName: 'اكتب اسمك الكامل للتوقيع', signed: 'تم القبول من', on: 'بتاريخ', paid: 'مدفوعة', defaults: ['يسلّم مقدّم الخدمة العمل الموضح في نطاق العمل.', 'يوفّر العميل المحتوى والملاحظات في الوقت المناسب.', 'تنتقل ملكية العمل النهائي للعميل بعد السداد الكامل.', 'يحق لأي طرف إنهاء العقد بإشعار كتابي، ويُستحق مقابل ما أُنجز.'] }
};
const money = (n, cur, lang) => new Intl.NumberFormat(lang, { style: 'currency', currency: cur }).format(n);
const partyHtml = (p) => `<b>${esc(p.name)}</b><br>${esc(p.email)}<br>${esc(p.address).replace(/\n/g, '<br>')}`;
export function renderDocHtml(x) {
  const d = x.data, L = LBL[d.lang], dir = d.lang === 'ar' ? 'rtl' : 'ltr';
  let body;
  if (x.type === 'invoice') {
    const t = invoiceTotals(d);
    body = `<div class="grid"><div><h4>${L.from}</h4>${partyHtml(d.from)}</div><div><h4>${L.to}</h4>${partyHtml(d.client)}</div></div>
    <p class="meta">${L.date}: ${esc(d.issueDate)}${d.dueDate ? ` · ${L.due}: ${esc(d.dueDate)}` : ''}</p>
    <table><tr><th>${L.desc}</th><th>${L.qty}</th><th>${L.price}</th><th>${L.amount}</th></tr>${d.items.map((i) => `<tr><td>${esc(i.desc)}</td><td>${i.qty}</td><td>${money(i.price, d.currency, d.lang)}</td><td>${money(i.qty * i.price, d.currency, d.lang)}</td></tr>`).join('')}</table>
    <div class="tot"><div>${L.sub}: ${money(t.sub, d.currency, d.lang)}</div>${d.taxPercent ? `<div>${L.tax} (${d.taxPercent}%): ${money(t.tax, d.currency, d.lang)}</div>` : ''}<div class="big">${L.total}: ${money(t.total, d.currency, d.lang)}</div></div>${d.notes ? `<h4>${L.notes}</h4><p>${esc(d.notes)}</p>` : ''}${x.status === 'paid' ? `<div class="stamp">${L.paid}</div>` : ''}`;
  } else {
    const clauses = d.clauses.length ? d.clauses : L.defaults;
    body = `<div class="grid"><div><h4>${L.provider}</h4>${partyHtml(d.from)}</div><div><h4>${L.client}</h4>${partyHtml(d.client)}</div></div>
    <h4>${L.scope}</h4><p>${esc(d.scope).replace(/\n/g, '<br>')}</p>
    <p class="meta">${L.fee}: <b>${money(d.price, d.currency, d.lang)}</b>${d.startDate ? ` · ${L.start}: ${esc(d.startDate)}` : ''}${d.deadline ? ` · ${L.deadline}: ${esc(d.deadline)}` : ''} · ${L.rev}: ${d.revisions}</p>
    ${d.paymentTerms ? `<h4>${L.pay}</h4><p>${esc(d.paymentTerms)}</p>` : ''}<h4>${L.clauses}</h4><ol>${clauses.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>${d.notes ? `<p>${esc(d.notes)}</p>` : ''}
    ${x.status === 'accepted' ? `<div class="sign">✔ ${L.signed}: <b>${esc(x.acceptedBy)}</b> ${L.on} ${esc(new Date(x.acceptedAt).toISOString().slice(0, 10))}</div>` : `<form class="sign" onsubmit="event.preventDefault();var n=this.n.value.trim();if(n.length<3)return;fetch('/api/public/doc/${x.token}/accept',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n})}).then(function(){location.reload()})"><label>${L.typeName}<input name="n" required minlength="3" maxlength="80"></label><button>${L.accept}</button></form>`}`;
  }
  return `<!DOCTYPE html><html lang="${d.lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(x.number)} — ${esc(L[x.type])}</title><style>
body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#eef0f7;color:#161a33;margin:0;padding:2rem 1rem;line-height:1.6}.sheet{max-width:780px;margin:auto;background:#fff;border-radius:16px;padding:2.4rem;box-shadow:0 20px 60px rgba(20,20,60,.15);position:relative}
h1{margin:0 0 .2rem;font-size:1.9rem;background:linear-gradient(135deg,#7c3aed,#2563eb);-webkit-background-clip:text;background-clip:text;color:transparent}h4{margin:1.4rem 0 .3rem;color:#6b7194;font-size:.8rem;text-transform:uppercase;letter-spacing:.06em}.num{color:#6b7194}.grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:1.4rem}.meta{color:#6b7194}
table{width:100%;border-collapse:collapse;margin-top:1rem}th,td{padding:.6rem;border-bottom:1px solid #e6e8f2;text-align:start}th{font-size:.8rem;color:#6b7194}.tot{margin-top:1rem;text-align:end;display:grid;gap:.2rem}.big{font-size:1.4rem;font-weight:700}
.stamp{position:absolute;inset-inline-end:2rem;top:6rem;border:4px solid #16a34a;color:#16a34a;padding:.3rem 1rem;font-weight:800;font-size:1.6rem;transform:rotate(-12deg);border-radius:8px;opacity:.8}
.sign{margin-top:2rem;padding:1rem;border:1px dashed #8b5cf6;border-radius:12px;display:grid;gap:.6rem}.sign input{padding:.6rem;border:1px solid #c9cde0;border-radius:8px;font:inherit;width:100%;box-sizing:border-box}.sign button,.pr{background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;border:0;padding:.7rem 1.4rem;border-radius:10px;font:600 1rem inherit;cursor:pointer}
.pr{display:block;margin:1.2rem auto 0}@media print{body{background:#fff;padding:0}.sheet{box-shadow:none}.pr,.sign button{display:none}}@media(max-width:600px){.grid{grid-template-columns:1fr}}</style></head><body><div class="sheet"><h1>${L[x.type]}</h1><div class="num">${esc(x.number)}</div>${body}</div><button class="pr" onclick="window.print()">${L.print}</button></body></html>`;
}
export function serveDoc(res, token) {
  const x = /^[a-f0-9]{36}$/.test(token) ? db.docs.find((d) => d.token === token) : null;
  if (!x) return send(res, 404, 'Not found');
  send(res, 200, renderDocHtml(x), { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src data:; frame-ancestors 'none'", 'X-Robots-Tag': 'noindex' });
}
route('POST', '/api/public/doc/:token/accept', ({ params, body, ip }) => {
  const x = db.docs.find((d) => d.token === params.token);
  if (!x || x.type !== 'contract') throw new HttpError(404, 'not_found');
  if (x.status === 'accepted') return { ok: true };
  const name = txt(body.name, 80); if (name.length < 3) throw new HttpError(400, 'name_required');
  db.docs.update(x.id, { status: 'accepted', acceptedAt: Date.now(), acceptedBy: name, acceptedIp: ip });
  return { ok: true };
}, { limit: [10, 600000] });
