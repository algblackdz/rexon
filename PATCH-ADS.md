# حزمة تحديث NEXORA — الإعلانات والتكاملات والرتب

> **مهم:** هذه الحزمة تُطبَّق **فوق** الحزمة السابقة (nexora-update). إن لم تطبّق السابقة بعد، طبّقها أولًا.

> هذه الحزمة تحتوي **التعديلات فقط**: بدون حذف أي ميزة سابقة وبدون إعادة كتابة أي ملف كاملًا.

## كيف أطبّقها؟ (3 خطوات)

**الخطوة 1 — الملفات الجديدة:** انسخ كل محتوى مجلد `new-files` إلى مجلد مشروعك **بنفس المسارات** (يدمج المجلدات ولا يحذف شيئًا عندك).

**الخطوة 2 — لا توجد ملفات تُستبدل كاملة هذه المرة**، كل شيء تعديلات صغيرة.

**الخطوة 3 — باقي الملفات:** افتح كل ملف في القائمة أدناه، وطبّق التعديلات بالترتيب. في كل تعديل: اضغط `Ctrl+F` وابحث عن النص القديم، ثم غيّره إلى الجديد. (إن قلت «أضف بعد هذا السطر» فالصق الجديد تحته مباشرة.)

## جدول الملفات
| الملف | عدد التعديلات |
|---|:-:|
| `server/lib/config.js` | 2 |
| `server/lib/db.js` | 2 |
| `server/api/billing.js` | 2 |
| `server/index.js` | 3 |
| `public/js/i18n.js` | 1 |
| `public/js/core.js` | 1 |
| `public/js/pages/dashboard.js` | 4 |
| `public/css/app.css` | 1 |
| `.env.example` | 1 |
| `scripts/smoke-test.js` | 3 |
| `.gitignore` | 1 |
| `server/api/staff.js` | 1 |
| `server/lib/roles.js` | 1 |
| `public/js/pages/staff.js` | 2 |

> ملف `scripts/smoke-test.js` اختباري فقط، تجاوزه إن أردت. والترجمات الجديدة في ملف جديد `public/locales/*/ads.json` فلا تغيّر ملفات الترجمة الموجودة.

## بعد التطبيق
1. لا تحتاج متغيرات Render: يمكنك لصق المفاتيح من داخل الموقع (الطاقم ← التكاملات والمفاتيح).
2. ارفع الملفات إلى GitHub وانتظر **Live**.
3. اقرأ `GUIDE-ADS.md` (جديد): حل مشكلة .env وكيف تصبح مؤسسًا وتعطي الرتب وإعداد Telegram وMeta وTikTok.

---

### 📄 `server/lib/config.js`  (2 تعديل)

##### تعديل 1
**ابحث عن هذا:**
```js
let secret = e.SESSION_SECRET;
if (!secret) {
  if (prod) throw new Error('SESSION_SECRET مطلوب في وضع الإنتاج');
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('[nexora] SESSION_SECRET غير مضبوط: سيتم استخدام سرّ مؤقت (الجلسات تنتهي عند إعادة التشغيل).');
```
**واستبدله بهذا:**
```js

// القيم التي يدخلها المؤسس من لوحة التحكم (الإعدادات ← التكاملات) بدل ملف .env
// يملؤها server/lib/integrations.js بعد تحميل القاعدة. متغيرات البيئة تتقدم عليها إن وُجدت.
export const overrides = {};
const val = (k, fb = '') => e[k] || overrides[k] || fb;

// السرّ: من SESSION_SECRET، وإلا يُولَّد مرة واحدة ويُحفظ في ملف بجانب البيانات
// (حتى يعمل الموقع حتى لو لم تستطع ضبط المتغيرات). الأفضل ضبطه من Render ← Environment.
let secret = e.SESSION_SECRET;
if (!secret) {
  const file = path.resolve(ROOT, e.SECRET_FILE || './data/secret.key');
  try { secret = fs.readFileSync(file, 'utf8').trim(); } catch { /* غير موجود بعد */ }
  if (!secret) {
    secret = crypto.randomBytes(32).toString('hex');
    try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, secret, { mode: 0o600 }); } catch { /* قرص للقراءة فقط */ }
  }
  console.warn('[nexora] SESSION_SECRET غير مضبوط: استُخدم سرّ محفوظ في ' + file + ' (على Render يُمسح مع كل نشر ما لم تضف Disk).');
```

##### تعديل 2
**ابحث عن هذا:**
```js
  founderKey: e.FOUNDER_SETUP_KEY || '',
  smtp: { host: e.SMTP_HOST || 'smtp.gmail.com', port: Number(e.SMTP_PORT) || 465, secure: e.SMTP_SECURE !== 'false', user: e.SMTP_USER || '', pass: e.SMTP_PASS || '', from: e.MAIL_FROM || '' },
  ai: { key: e.ANTHROPIC_API_KEY || '', model: e.AI_MODEL || 'claude-sonnet-5-5' },
  stripe: { key: e.STRIPE_SECRET_KEY || '', webhookSecret: e.STRIPE_WEBHOOK_SECRET || '' },
  google: { clientId: e.GOOGLE_CLIENT_ID || '', secret: e.GOOGLE_CLIENT_SECRET || '' },
```
**واستبدله بهذا:**
```js
  // الإعدادات التالية تُقرأ عند كل استخدام (getters) فتتغير فورًا عند حفظها من لوحة المؤسس
  get founderKey() { return val('FOUNDER_SETUP_KEY'); },
  get smtp() { return { host: val('SMTP_HOST', 'smtp.gmail.com'), port: Number(val('SMTP_PORT')) || 465, secure: e.SMTP_SECURE !== 'false', user: val('SMTP_USER'), pass: val('SMTP_PASS'), from: val('MAIL_FROM') }; },
  get ai() { return { key: val('ANTHROPIC_API_KEY'), model: val('AI_MODEL', 'claude-sonnet-5-5') }; },
  get stripe() { return { key: val('STRIPE_SECRET_KEY'), webhookSecret: val('STRIPE_WEBHOOK_SECRET') }; },
  get google() { return { clientId: val('GOOGLE_CLIENT_ID'), secret: val('GOOGLE_CLIENT_SECRET') }; },
  get ads() { return { metaId: val('META_APP_ID'), metaSecret: val('META_APP_SECRET'), tiktokId: val('TIKTOK_APP_ID'), tiktokSecret: val('TIKTOK_APP_SECRET'), maxDaily: Number(val('ADS_MAX_DAILY_BUDGET')) || 500 }; },
```

---

### 📄 `server/lib/db.js`  (2 تعديل)

##### تعديل 1
**ابحث عن هذا:**
```js
const content = openStore(config.dataFile, { websites: {}, versions: {}, settings: {}, tickets: {}, docs: {} });
```
**واستبدله بهذا:**
```js
const content = openStore(config.dataFile, { websites: {}, versions: {}, settings: {}, tickets: {}, docs: {}, adconns: {}, campaigns: {} });
```

##### تعديل 2
**ابحث عن هذا:**
```js
  settings: col(content, 'settings'), tickets: col(content, 'tickets'), docs: col(content, 'docs')
```
**واستبدله بهذا:**
```js
  settings: col(content, 'settings'), tickets: col(content, 'tickets'), docs: col(content, 'docs'),
  adconns: col(content, 'adconns'), campaigns: col(content, 'campaigns')
```

---

### 📄 `server/api/billing.js`  (2 تعديل)

##### تعديل 1
**ابحث عن هذا:**
```js
    applyPayment({ userId: m.userId, websiteId: m.websiteId, scope: m.scope, model: m.model, subId: o.subscription || undefined });
```
**واستبدله بهذا:**
```js
    if (m.kind === 'campaign') { const c = db.campaigns.get(m.campaignId); if (c && c.userId === m.userId) db.campaigns.update(c.id, { feePaid: true, feeAmount: Number(m.amount) || 0 }); }  // رسوم حملة إعلانية
    else applyPayment({ userId: m.userId, websiteId: m.websiteId, scope: m.scope, model: m.model, subId: o.subscription || undefined });
```

##### تعديل 2
**ابحث عن هذا:**
```js
  return { googleClientId: config.google.clientId, billingMode: mode(), pricing: getPricing(), priceUsd: getPricing().priceUsd, trialDays: getPricing().trialDays, platformDomain: config.platformDomain || 'nexora.app', founderClaimable: !!config.founderKey && !founder };
```
**واستبدله بهذا:**
```js
  return { googleClientId: config.google.clientId, billingMode: mode(), pricing: getPricing(), priceUsd: getPricing().priceUsd, trialDays: getPricing().trialDays, platformDomain: config.platformDomain || 'nexora.app', founderClaimable: !founder };
```

---

### 📄 `server/index.js`  (3 تعديل)

##### تعديل 1
**1) ابحث عن هذا (لا تغيّره):**
```js
import './api/staff.js';
```
**2) والصق السطور التالية تحته مباشرة:**
```js
import './api/ads.js';
import './api/admin-settings.js';
```

##### تعديل 2
**ابحث عن هذا:**
```js
const g = config.google.clientId ? ' https://accounts.google.com' : '';
const APP_CSP = `default-src 'self'; script-src 'self'${g}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com${g}; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'${g}; frame-src 'self'${g}; object-src 'none'; base-uri 'self'; frame-ancestors 'self'`;
```
**واستبدله بهذا:**
```js
// يُحسب عند كل طلب لأن مفتاح Google قد يُضاف من لوحة المؤسس بعد التشغيل
const appCsp = () => { const g = config.google.clientId ? ' https://accounts.google.com' : ''; return `default-src 'self'; script-src 'self'${g}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com${g}; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'${g}; frame-src 'self'${g}; object-src 'none'; base-uri 'self'; frame-ancestors 'self'`; };
```

##### تعديل 3
**ابحث عن هذا:**
```js
  res.setHeader('Content-Security-Policy', APP_CSP);
```
**واستبدله بهذا:**
```js
  res.setHeader('Content-Security-Policy', appCsp());
```

---

### 📄 `public/js/i18n.js`  (1 تعديل)

##### تعديل 1
**ابحث عن هذا:**
```js
const NS = ['common', 'landing', 'generator', 'dashboard', 'editor', 'pricing', 'auth', 'support', 'tools'];
```
**واستبدله بهذا:**
```js
const NS = ['common', 'landing', 'generator', 'dashboard', 'editor', 'pricing', 'auth', 'support', 'tools', 'ads'];
```

---

### 📄 `public/js/core.js`  (1 تعديل)

##### تعديل 1
**ابحث عن هذا:**
```js
export const errText = (e) => { const c = e?.code || 'server_error'; return has('common.err_' + c) ? t('common.err_' + c) : has('support.err_' + c) ? t('support.err_' + c) : t('common.err_server_error'); };
```
**واستبدله بهذا:**
```js
export const errText = (e) => { const c = e?.code || 'server_error'; return has('common.err_' + c) ? t('common.err_' + c) : has('support.err_' + c) ? t('support.err_' + c) : has('ads.err_' + c) ? t('ads.err_' + c) : t('common.err_server_error'); };
```

---

### 📄 `public/js/pages/dashboard.js`  (4 تعديل)

##### تعديل 1
**ابحث عن هذا:**
```js
const BASE_TABS = [['websites', '▦'], ['create', '＋'], ['templates', '◧'], ['tools', '✦'], ['billing', '$'], ['domains', '⌘'], ['settings', '⚙']];
// تبويب الطاقم يظهر فقط لمن لديه رتبة
const tabsFor = () => (state.user?.role && state.user.role !== 'user' ? [...BASE_TABS, ['staff', '★']] : BASE_TABS);
const tabLabel = (k) => (k === 'tools' ? t('tools.tab_tools') : k === 'staff' ? t('support.staff') : t('dashboard.tab_' + k));
```
**واستبدله بهذا:**
```js
const BASE_TABS = [['websites', '▦'], ['create', '＋'], ['templates', '◧'], ['tools', '✦'], ['ads', '📣'], ['billing', '$'], ['domains', '⌘'], ['settings', '⚙']];
// تبويب الطاقم يظهر فقط لمن لديه رتبة
const tabsFor = () => (state.user?.role && state.user.role !== 'user' ? [...BASE_TABS, ['staff', '★']] : BASE_TABS);
const tabLabel = (k) => (k === 'tools' ? t('tools.tab_tools') : k === 'ads' ? t('ads.title') : k === 'staff' ? t('support.staff') : t('dashboard.tab_' + k));
```

##### تعديل 2
**ابحث عن هذا:**
```js
  ${state.config.founderClaimable ? `<form class="card" id="claim"><h3>${esc(t('support.claimTitle'))}</h3><p class="muted small">${esc(t('support.claimText'))}</p><label class="field"><input name="key" type="password" autocomplete="off" required></label><button class="btn btn-primary">${esc(t('support.claimBtn'))}</button></form>` : ''}</div>`;
```
**واستبدله بهذا:**
```js
  ${state.config.founderClaimable ? `<form class="card" id="claim"><h3>${esc(t('support.claimTitle'))}</h3><p class="muted small">${esc(t('ads.claimTextLogs'))}</p><label class="field"><input name="key" type="password" autocomplete="off" required></label><button class="btn btn-primary">${esc(t('support.claimBtn'))}</button></form>` : ''}</div>`;
```

##### تعديل 3
**1) ابحث عن هذا (لا تغيّره):**
```js
    else if (tab === 'tools') inner = `<h1 class="h2 mb">${esc(t('tools.tab_tools'))}</h1><div id="tools-root"></div>`;
```
**2) والصق السطور التالية تحته مباشرة:**
```js
    else if (tab === 'ads') inner = `<h1 class="h2 mb">${esc(t('ads.title'))}</h1><div id="ads-root"></div>`;
```

##### تعديل 4
**1) ابحث عن هذا (لا تغيّره):**
```js
    if (tab === 'tools') import('./tools.js').then((m) => m.mount($('#tools-root', root)));
```
**2) والصق السطور التالية تحته مباشرة:**
```js
    if (tab === 'ads') import('./ads.js').then((m) => m.mount($('#ads-root', root)));
```

---

### 📄 `public/css/app.css`  (1 تعديل)

##### تعديل 1
**1) ابحث عن هذا (لا تغيّره):**
```css
@media (max-width:980px){.st-grid{grid-template-columns:1fr}.item-row{grid-template-columns:1fr 4rem 5rem auto}}
```
**2) والصق السطور التالية تحته مباشرة:**
```css
/* =====================================================================
   إضافة الإعلانات (Ads Hub) — نفس هوية الموقع
   ===================================================================== */
.ads-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem}
.ch{display:grid;gap:.6rem;align-content:start}.ch h3{font-size:1.05rem}
.ads-build{align-items:start}
.tgts{display:grid;gap:.4rem;margin-block:.5rem 1rem}
.tgt{display:flex;align-items:center;gap:.6rem;padding:.55rem .8rem;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.04);cursor:pointer;font-size:.9rem}
.tgt:hover{border-color:rgba(139,92,246,.6)}.tgt input{width:auto}.tgt.off{opacity:.55}.tgt small{margin-inline-start:auto}
.var{padding:.8rem;margin-block:.6rem;display:grid;gap:.4rem;position:relative}.var .mini{position:absolute;inset-block-start:.5rem;inset-inline-end:.5rem}
.quote{margin-block:1rem;padding:1rem;border:1px dashed rgba(139,92,246,.5);border-radius:14px;background:rgba(139,92,246,.07)}.quote h4{margin-block:0 .5rem}
.big-sm{font:800 1.4rem var(--head);background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.pub-btns{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}.pub-btns .btn{flex-direction:column;gap:.15rem;padding-block:1rem;white-space:normal;text-align:center}.pub-btns small{font-weight:400;font-size:.72rem;opacity:.8}
@media (max-width:560px){.pub-btns{grid-template-columns:1fr}}
```

---

### 📄 `.env.example`  (1 تعديل)

##### تعديل 1
**1) ابحث عن هذا (لا تغيّره):**
```bash
MAIL_FROM=NEXORA <your-gmail@gmail.com>
```
**2) والصق السطور التالية تحته مباشرة:**
```bash
# ===== إعلانات (Ads Hub) =====
# بدل هذه المتغيرات يمكنك لصق القيم من داخل الموقع: لوحة التحكم ← الطاقم ← التكاملات والمفاتيح
META_APP_ID=
META_APP_SECRET=
TIKTOK_APP_ID=
TIKTOK_APP_SECRET=
# أقصى ميزانية يومية يسمح بها الخادم للمستخدم (حماية له)
ADS_MAX_DAILY_BUDGET=500
```

---

### 📄 `scripts/smoke-test.js`  (3 تعديل)

##### تعديل 1
**ابحث عن هذا:**
```js
const srv = spawn('node', ['server/index.js'], { env: { ...process.env, PORT, APP_URL: BASE, DATA_FILE: tmp, ACCOUNTS_FILE: acc, FOUNDER_SETUP_KEY: 'test-founder-key-123', SMTP_HOST: '127.0.0.1', SMTP_PORT: '2526', SMTP_SECURE: 'false', SMTP_USER: 'user', SMTP_PASS: 'pass', MAIL_FROM: 'NEXORA <no-reply@test.dev>' }, stdio: 'pipe' });
await new Promise((r) => srv.stdout.on('data', (d) => String(d).includes('جاهز') && r()));
```
**واستبدله بهذا:**
```js
// ----- خوادم وهمية: Telegram + Meta Graph (تسجّل الطلبات لنتحقق من التسلسل والحقول) -----
import('node:http').then(() => {});
const http = await import('node:http');
const tgLog = [], gLog = [];
const readBody = (req) => new Promise((r) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => r(b)); });
const tgSrv = http.createServer(async (req, res) => { const b = await readBody(req); tgLog.push({ url: req.url, body: b }); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: true, result: { message_id: 42 } })); });
const gSrv = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), b = await readBody(req), p = u.pathname.replace(/^\/v[\d.]+\//, ''); gLog.push({ method: req.method, path: p, params: Object.fromEntries(new URLSearchParams(req.method === 'GET' ? u.search : b)) });
  const out = p === 'oauth/access_token' ? { access_token: 'USERTOKEN-SECRET-123', expires_in: 5000000 } : p === 'me/adaccounts' ? { data: [{ id: 'act_999', name: 'Ad Acct', currency: 'USD' }] } : p === 'me/accounts' ? { data: [{ id: '555', name: 'My Page', access_token: 'PAGETOKEN-SECRET-456', instagram_business_account: { id: '777', username: 'ig' } }] }
    : /campaigns$/.test(p) ? { id: 'C1' } : /adsets$/.test(p) ? { id: 'AS1' } : /adcreatives$/.test(p) ? { id: 'CR' + gLog.length } : /\/ads$/.test(p) ? { id: 'AD' + gLog.length } : p === '555/feed' || p === '555/photos' ? { id: '555_1' } : { success: true };
  res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(out));
});
await new Promise((r) => tgSrv.listen(2527, r)); await new Promise((r) => gSrv.listen(2528, r));
const srv = spawn('node', ['server/index.js'], { env: { ...process.env, PORT, APP_URL: BASE, DATA_FILE: tmp, ACCOUNTS_FILE: acc, FOUNDER_SETUP_KEY: 'test-founder-key-123', TELEGRAM_API_BASE: 'http://127.0.0.1:2527', META_GRAPH_BASE: 'http://127.0.0.1:2528', META_APP_ID: 'test-app', META_APP_SECRET: 'test-secret', SMTP_HOST: '127.0.0.1', SMTP_PORT: '2526', SMTP_SECURE: 'false', SMTP_USER: 'user', SMTP_PASS: 'pass', MAIL_FROM: 'NEXORA <no-reply@test.dev>' }, stdio: 'pipe' });
let serverOut = '';
srv.stdout.on('data', (d) => { serverOut += d; });
await new Promise((r) => { const t = setInterval(() => { if (serverOut.includes('جاهز')) { clearInterval(t); r(); } }, 50); });
```

##### تعديل 2
**ابحث عن هذا:**
```js
  r = await call('POST', '/api/staff/claim-founder', { key: 'test-founder-key-123' }); ok(r.status === 200, 'claim founder');
```
**واستبدله بهذا:**
```js
  const setupTok = /\(يُستخدم مرة واحدة\): ([a-f0-9]+)/.exec(serverOut)?.[1]; ok(!!setupTok, 'founder code printed in server logs');
  r = await call('POST', '/api/staff/claim-founder', { key: setupTok }); ok(r.status === 200, 'claim founder with code from logs');
```

##### تعديل 3
**ابحث عن هذا:**
```js
  // تصميم المواقع الفاخر في الملفات المنشورة
  const z = (await import('node:zlib')); void z;
} catch (e) { console.error(e); process.exitCode = 1; }
srv.kill(); smtp.close(); for (const f of [tmp, acc]) try { fs.unlinkSync(f); } catch {}
```
**واستبدله بهذا:**
```js

  // ===== التكاملات من لوحة المؤسس (بديل .env) =====
  r = await call('GET', '/api/staff/integrations'); ok(r.status === 200 && r.data.items.find((i) => i.key === 'META_APP_ID').source === 'env', 'integrations view (env source)');
  r = await call('PUT', '/api/staff/integrations', { values: { TIKTOK_APP_ID: 'tt-app-id', TIKTOK_APP_SECRET: 'TT-SECRET-VALUE-999' } });
  const ttS = r.data.items.find((i) => i.key === 'TIKTOK_APP_SECRET'); ok(ttS.set && ttS.value === '••••' && !JSON.stringify(r.data).includes('TT-SECRET-VALUE-999'), 'integration secret saved and masked');
  r = await call('GET', '/api/ads/providers'); ok(r.data.configured.tiktok === true, 'panel keys apply immediately (TikTok configured)');
  await new Promise((x) => setTimeout(x, 400)); ok(!fs.readFileSync(tmp, 'utf8').includes('TT-SECRET-VALUE-999'), 'integration secrets encrypted at rest');
  // ===== الإعلانات =====
  r = await call('POST', '/api/ads/connections/telegram', { token: 'bad', chatId: 'x' }); ok(r.status === 400, 'invalid telegram details rejected');
  r = await call('POST', '/api/ads/connections/discord', { webhook: 'https://evil.example.com/api/webhooks/1/x' }); ok(r.status === 400, 'discord webhook host allow-list');
  r = await call('POST', '/api/ads/connections/telegram', { token: '123456789:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', chatId: '@mychan' }); ok(r.status === 200 && tgLog.length === 1, 'telegram connected (test message sent)');
  const camp = { name: 'Launch', mode: 'free', creative: { headline: 'Big launch', text: 'Try it now', url: 'https://example.com/shop', cta: 'SHOP_NOW' }, targets: ['telegram', 'share', 'discord', 'google_ads'] };
  r = await call('POST', '/api/ads/campaigns', camp); ok(r.status === 200 && JSON.stringify(r.data.campaign.targets) === '["telegram","share","discord"]'.replace('"discord",', '') .replace(']', ',"discord"]') || r.data.campaign.targets.length === 3, 'free campaign saved (planned platforms dropped)');
  const fc = r.data.campaign; r = await call('POST', `/api/ads/campaigns/${fc.id}/launch`, {});
  ok(r.data.campaign.status === 'partial' && r.data.campaign.results.find((x) => x.target === 'telegram').ok && r.data.campaign.results.find((x) => x.target === 'discord').error === 'not_connected' && r.data.campaign.results.find((x) => x.target === 'share').links.length >= 8, 'free launch: telegram ok, discord not connected, share links');
  ok(tgLog[1].url.includes('/sendMessage') && /Big launch/.test(tgLog[1].body) && /example\.com\/shop/.test(tgLog[1].body), 'telegram message carries headline and link');
  ok(!JSON.stringify(r.data).includes('AAAAAAAAAAAAAAAAAAAA'), 'bot token never returned by API');
  // Meta OAuth + حملة مدفوعة
  r = await call('GET', '/api/ads/oauth/meta/start'); const st = new URL(r.data.url).searchParams.get('state'); ok(r.data.url.includes('dialog/oauth') && !!st, 'meta oauth start url');
  r = await call('GET', `/api/ads/oauth/meta/callback?code=abc&state=${encodeURIComponent('bad.state')}`); ok(!gLog.some((g) => g.path === 'oauth/access_token'), 'oauth callback rejects bad state');
  await call('GET', `/api/ads/oauth/meta/callback?code=abc&state=${encodeURIComponent(st)}`);
  r = await call('GET', '/api/ads/providers'); ok(r.data.connections.meta.connected && r.data.connections.meta.selected.pageId === '555' && r.data.connections.meta.info.adAccounts[0].id === 'act_999', 'meta connected, defaults selected');
  ok(!JSON.stringify(r.data).includes('USERTOKEN-SECRET') && !JSON.stringify(r.data).includes('PAGETOKEN-SECRET'), 'meta tokens never returned by API');
  await new Promise((x) => setTimeout(x, 400)); ok(!fs.readFileSync(tmp, 'utf8').includes('USERTOKEN-SECRET'), 'meta tokens encrypted at rest');
  const pcamp = { name: 'Paid', mode: 'paid', creative: { headline: 'Buy', text: 'Great offer today', url: 'https://example.com', imageUrl: 'https://example.com/a.jpg', cta: 'SHOP_NOW' }, variants: [{ headline: 'Buy B', text: 'Variant B text' }], audience: { countries: ['sa', 'ae'], ageMin: 25, ageMax: 45, gender: 'female' }, budget: { daily: 5, days: 7 }, targets: ['meta_ads'], features: { aiCopy: true } };
  r = await call('POST', '/api/ads/quote', pcamp); const q1 = r.data.quote; ok(q1.lines.some((l) => l.key === 'q_variants') && q1.lines.some((l) => l.key === 'q_targeting') && q1.lines.some((l) => l.key === 'q_aiCopy') && q1.total > 5, 'quote grows with features');
  r = await call('POST', '/api/ads/quote', { ...pcamp, targets: ['meta_ads', 'tiktok_ads'] }); ok(r.data.quote.total > q1.total && r.data.quote.lines.some((l) => l.key === 'q_platforms'), 'quote grows with platform count');
  r = await call('POST', '/api/ads/quote', { ...pcamp, budget: { daily: 999999, days: 7 } }); ok(r.data.quote.adSpend <= 500 * 7, 'daily budget capped server-side');
  r = await call('PUT', '/api/staff/ads-pricing', { baseFee: 10, perExtraPlatform: 3, perExtraVariant: 2, aiCopy: 2, scheduling: 1, advancedTargeting: 3, retargeting: 4, spendPercent: 5, minFee: 5, maxFee: 500 }); ok(r.status === 200, 'founder edits ads pricing');
  r = await call('POST', '/api/ads/quote', pcamp); ok(r.data.quote.total === q1.total + 5, 'new ads pricing applies immediately');
  r = await call('POST', '/api/ads/campaigns', pcamp); const pc = r.data.campaign; ok(pc.quote.total > 0 && !pc.feePaid, 'paid campaign saved with fee due');
  r = await call('POST', `/api/ads/campaigns/${pc.id}/launch`, {}); ok(r.status === 402, 'paid launch blocked until fee is paid');
  r = await call('POST', `/api/ads/campaigns/${pc.id}/checkout`, {}); ok(r.data.mock, 'fee checkout (mock)');
  r = await call('POST', `/api/ads/campaigns/${pc.id}/mock-pay`, { token: r.data.token }); ok(r.status === 200, 'fee paid');
  r = await call('POST', `/api/ads/campaigns/${pc.id}/launch`, { activate: false });
  const mr = r.data.campaign.results[0]; ok(mr.ok && mr.ids.ads.length === 2 && r.data.campaign.status === 'paused', 'meta paid launch: campaign/adset/2 creatives/2 ads, created paused');
  const seq = gLog.filter((g) => g.method === 'POST' && /act_999\/(campaigns|adsets|adcreatives|ads)$/.test(g.path)).map((g) => g.path.split('/')[1]);
  ok(seq.join() === 'campaigns,adsets,adcreatives,ads,adcreatives,ads', 'meta API call order');
  const adset = gLog.find((g) => g.path === 'act_999/adsets').params; ok(adset.status === 'PAUSED' && adset.daily_budget === '500' && JSON.parse(adset.targeting).genders[0] === 2 && JSON.parse(adset.targeting).geo_locations.countries.join() === 'SA,AE', 'adset: paused, budget in minor units, targeting');
  r = await call('POST', `/api/ads/campaigns/${pc.id}/status`, { action: 'resume' }); ok(r.data.campaign.status === 'running' && gLog.some((g) => g.path === 'C1' && g.params.status === 'ACTIVE'), 'resume activates on platform');
  r = await call('POST', `/api/ads/campaigns/${pc.id}/status`, { action: 'pause' }); ok(r.data.campaign.status === 'paused', 'pause');
  // فصل البيانات بين المستخدمين
  const keepC = cookie; cookie = cookieU2;
  r = await call('POST', `/api/ads/campaigns/${pc.id}/launch`, {}); ok(r.status === 404, 'other user cannot launch my campaign');
  r = await call('GET', '/api/ads/providers'); ok(r.data.connections.meta.connected === false && r.data.connections.telegram.connected === false, 'connections are per-user');
  r = await call('GET', '/api/staff/integrations'); ok(r.status === 403, 'support role cannot read integrations');
  cookie = keepC;
  // تصميم المواقع الفاخر في الملفات المنشورة
  const z = (await import('node:zlib')); void z;
} catch (e) { console.error(e); process.exitCode = 1; }
srv.kill(); smtp.close(); tgSrv.close(); gSrv.close(); for (const f of [tmp, acc, tmp.replace('test-', 'secret-') + '.key']) try { fs.unlinkSync(f); } catch {}
```

---

### 📄 `.gitignore`  (1 تعديل)

##### تعديل 1
**1) ابحث عن هذا (لا تغيّره):**
```
data/*.tmp
```
**2) والصق السطور التالية تحته مباشرة:**
```
data/secret.key
```

---

### 📄 `server/api/staff.js`  (1 تعديل)

##### تعديل 1
**ابحث عن هذا:**
```js
// ----- المطالبة برتبة المؤسس: تتطلب مفتاحًا سريًا من متغيرات البيئة ولا تعمل إذا وُجد مؤسس -----
route('POST', '/api/staff/claim-founder', ({ user, body }) => {
  if (!config.founderKey || db.users.find((u) => u.role === 'founder')) throw new HttpError(403, 'forbidden');
  const a = Buffer.from(String(body.key || '')), b = Buffer.from(config.founderKey);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new HttpError(403, 'invalid_key');
```
**واستبدله بهذا:**
```js
// ----- المطالبة برتبة المؤسس -----
// الطريقة 1: مفتاح FOUNDER_SETUP_KEY (من البيئة أو الإعدادات). الطريقة 2 (بدون أي إعداد): رمز يُطبع في سجل الخادم
// (Render ← Logs) عند كل تشغيل طالما لا يوجد مؤسس. لا يعمل بعد وجود مؤسس.
const SETUP_TOKEN = crypto.randomBytes(12).toString('hex');
if (!db.users.find((u) => u.role === 'founder')) console.log(`\n[nexora] ★ رمز تفعيل المؤسس (يُستخدم مرة واحدة): ${SETUP_TOKEN}\n[nexora]   سجّل حسابك ثم: لوحة التحكم ← الإعدادات ← تفعيل رتبة المؤسس\n`);
const same = (x, y) => { const a = Buffer.from(String(x)), b = Buffer.from(String(y)); return a.length === b.length && crypto.timingSafeEqual(a, b); };
route('POST', '/api/staff/claim-founder', ({ user, body }) => {
  if (db.users.find((u) => u.role === 'founder')) throw new HttpError(403, 'forbidden');
  const key = String(body.key || '').trim();
  if (!(key && (same(key, SETUP_TOKEN) || (config.founderKey && same(key, config.founderKey))))) throw new HttpError(403, 'invalid_key');
```

---

### 📄 `server/lib/roles.js`  (1 تعديل)

##### تعديل 1
**ابحث عن هذا:**
```js
  founder: ['support.read', 'support.reply', 'users.view', 'users.setRole', 'users.ban', 'sites.moderate', 'pricing.edit', 'stats.view', 'docs.none'],
```
**واستبدله بهذا:**
```js
  founder: ['support.read', 'support.reply', 'users.view', 'users.setRole', 'users.ban', 'sites.moderate', 'pricing.edit', 'settings.edit', 'stats.view'],
```

---

### 📄 `public/js/pages/staff.js`  (2 تعديل)

##### تعديل 1
**ابحث عن هذا:**
```js
const SUBS = [['support', 'support.read'], ['users', 'users.view'], ['sites', 'sites.moderate'], ['pricing', 'pricing.edit'], ['overview', 'stats.view']];
```
**واستبدله بهذا:**
```js
const SUBS = [['support', 'support.read'], ['users', 'users.view'], ['sites', 'sites.moderate'], ['pricing', 'pricing.edit'], ['adsprice', 'pricing.edit'], ['integrations', 'settings.edit'], ['overview', 'stats.view']];
```

##### تعديل 2
**ابحث عن هذا:**
```js
  root.innerHTML = `<div class="chips" role="tablist">${list.map(([k]) => `<button class="chip ${k === sub ? 'on' : ''}" role="tab" data-sub="${k}">${esc(t('support.sub_' + k))}</button>`).join('')}<span class="muted small">${esc(t('support.yourRole'))}: <b>${esc(t('support.role_' + state.user.role))}</b></span></div><div id="st-body"></div>`;
  clearInterval(timer);
```
**واستبدله بهذا:**
```js
  root.innerHTML = `<div class="chips" role="tablist">${list.map(([k]) => `<button class="chip ${k === sub ? 'on' : ''}" role="tab" data-sub="${k}">${esc(t(k === 'adsprice' || k === 'integrations' ? 'ads.sub_' + k : 'support.sub_' + k))}</button>`).join('')}<span class="muted small">${esc(t('support.yourRole'))}: <b>${esc(t('support.role_' + state.user.role))}</b></span></div><div id="st-body"></div>`;
  clearInterval(timer);
  if (sub === 'adsprice' || sub === 'integrations') { import('./staff-extra.js').then((m) => (sub === 'adsprice' ? m.viewAdsPricing : m.viewIntegrations)($('#st-body', root))); return; }
```
