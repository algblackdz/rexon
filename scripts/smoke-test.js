// اختبار سريع شامل: يشغّل الخادم ويجرب التسجيل والتوليد والحفظ والنشر والتصدير
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
const PORT = 3999, BASE = `http://localhost:${PORT}`;
const tmp = './data/test-' + Date.now() + '.json';
const acc = tmp.replace('test-', 'acc-');
// خادم SMTP وهمي لاختبار إرسال البريد (بروتوكول حقيقي بدون TLS)
let mailData = '';
const smtp = net.createServer((sock) => {
  let inData = false, buf = '';
  sock.write('220 fake\r\n');
  sock.on('data', (d) => {
    buf += d.toString();
    let i;
    while (inData ? buf.includes('\r\n.\r\n') : (i = buf.indexOf('\r\n')) >= 0) {
      if (inData) { const k = buf.indexOf('\r\n.\r\n'); mailData += buf.slice(0, k); buf = buf.slice(k + 5); inData = false; sock.write('250 queued\r\n'); continue; }
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      if (/^EHLO/.test(line)) sock.write('250 ok\r\n'); else if (/^AUTH LOGIN/.test(line)) sock.write('334 VXNlcg==\r\n');
      else if (/^(dXNlcg==|cGFzcw==)$/.test(line)) sock.write(line === 'dXNlcg==' ? '334 UGFzcw==\r\n' : '235 ok\r\n');
      else if (/^MAIL|^RCPT/.test(line)) sock.write('250 ok\r\n'); else if (/^DATA/.test(line)) { inData = true; sock.write('354 go\r\n'); }
      else if (/^QUIT/.test(line)) { sock.write('221 bye\r\n'); sock.end(); }
    }
  });
});
await new Promise((r) => smtp.listen(2526, r));
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
let cookie = '';
const call = async (m, p, b) => {
  const r = await fetch(BASE + p, { method: m, headers: { 'content-type': 'application/json', cookie }, body: b ? JSON.stringify(b) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  const ct = r.headers.get('content-type') || '';
  return { status: r.status, data: ct.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
};
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
try {
  // تطابق مفاتيح الترجمة بين اللغات الثلاث
  for (const ns of ['common','landing','generator','dashboard','editor','pricing','auth']) {
    const k = (l) => Object.keys(JSON.parse(fs.readFileSync(`public/locales/${l}/${ns}.json`, 'utf8'))).sort().join();
    ok(k('en') === k('fr') && k('en') === k('ar'), `locale parity: ${ns}`);
  }
  let r = await call('POST', '/api/auth/signup', { email: 'a@b.co', password: 'password123', name: 'Test' });
  ok(r.status === 200, 'signup');
  r = await call('POST', '/api/auth/signup', { email: 'x', password: '1', name: '' }); ok(r.status === 400, 'validation');
  r = await call('POST', '/api/ai/generate', { type: 'portfolio', prompt: 'Portfolio for a GFX artist', style: 'futuristic', colors: { preset: 'purple-blue' }, language: 'multi', name: 'Pixel' });
  ok(r.status === 200 && r.data.website.data.pages.length >= 2, 'generate multi-language');
  const id = r.data.website.id; const site = r.data.website.data;
  r = await call('POST', '/api/ai/edit', { website: site, command: 'غير اللون البنفسجي إلى أخضر' }); ok(r.data.message.code === 'ai.colorChanged', 'ai edit (arabic)');
  r = await call('PUT', '/api/websites/' + id, { website: r.data.website }); ok(r.status === 200, 'save');
  r = await call('POST', `/api/websites/${id}/publish`); ok(r.status === 200 && r.data.website.url, 'publish');
  const url = r.data.website.url.replace(BASE, '');
  const pub = await call('GET', url + 'en/index.html'); ok(pub.status === 200 && String(pub.data).includes('dir="ltr"'), 'published page en');
  const pa = await call('GET', url + 'ar/index.html'); ok(String(pa.data).includes('dir="rtl"') && String(pa.data).includes('<!-- هذا القسم'), 'published page ar RTL + Arabic comments');
  r = await call('GET', `/api/websites/${id}/export`); ok(r.status === 200 && r.data.subarray(0, 2).toString() === 'PK', 'export zip');
  fs.writeFileSync('/tmp/nexora-export.zip', r.data);
  r = await call('POST', '/api/billing/checkout', { websiteId: id }); ok(r.data.mock, 'checkout mock');
  r = await call('GET', '/api/templates/biz-nova/preview?lang=fr'); ok(r.status === 200, 'template preview');
  const other = await fetch(BASE + `/api/websites/${id}`); ok(other.status === 401, 'authorization required');

  // ===== الميزات الجديدة =====
  const me0 = (await call('GET', '/api/auth/me')).data.user; ok(me0.role === 'user' && me0.perms.length === 0, 'default role is user');
  r = await call('GET', '/api/staff/overview'); ok(r.status === 403, 'staff API forbidden for normal user');
  r = await call('POST', '/api/staff/claim-founder', { key: 'wrong' }); ok(r.status === 403, 'claim founder wrong key');
  const setupTok = /\(يُستخدم مرة واحدة\): ([a-f0-9]+)/.exec(serverOut)?.[1]; ok(!!setupTok, 'founder code printed in server logs');
  r = await call('POST', '/api/staff/claim-founder', { key: setupTok }); ok(r.status === 200, 'claim founder with code from logs');
  r = await call('GET', '/api/auth/me'); ok(r.data.user.role === 'founder' && r.data.user.perms.includes('pricing.edit'), 'founder perms');
  r = await call('PUT', '/api/staff/pricing', { model: 'monthly', scope: 'account', priceUsd: 9, trialDays: 0 }); ok(r.data.pricing.model === 'monthly' && r.data.pricing.trialDays === 0, 'pricing edit (monthly/account/no trial)');
  r = await call('GET', '/api/config'); ok(r.data.pricing.priceUsd === 9 && r.data.founderClaimable === false, 'public config follows pricing');
  r = await call('POST', `/api/websites/${id}/publish`); ok(r.status === 402, 'publish blocked after trial without payment');
  r = await call('POST', '/api/billing/checkout', {}); ok(r.data.mock, 'checkout (account scope, no websiteId)');
  r = await call('POST', '/api/billing/mock-confirm', { token: r.data.token }); ok(r.status === 200, 'mock payment');
  r = await call('GET', '/api/billing'); ok(r.data.accountPaid && r.data.accountUntil > Date.now(), 'monthly account paid until date');
  r = await call('POST', `/api/websites/${id}/publish`); ok(r.status === 200, 'publish after payment');
  r = await call('PUT', '/api/staff/pricing', { model: 'once', scope: 'website', priceUsd: 5, trialDays: 7 }); ok(r.status === 200, 'pricing back to once/website');
  // حسابان آخران: مستخدم عادي + دعم فني
  const saved = cookie; cookie = '';
  const u2 = (await call('POST', '/api/auth/signup', { email: 'u2@b.co', password: 'password123', name: 'User Two' })).data.user;
  const cookieU2 = cookie; cookie = saved;
  r = await call('GET', '/api/staff/users?q=u2'); const u2row = r.data.users.find((x) => x.email === 'u2@b.co'); ok(!!u2row, 'staff lists users');
  r = await call('POST', `/api/staff/users/${u2row.id}/role`, { role: 'support' }); ok(r.status === 200, 'founder sets support role');
  cookie = cookieU2;
  r = await call('GET', '/api/staff/tickets'); ok(r.status === 200, 'support role can read tickets');
  r = await call('GET', '/api/staff/users'); ok(r.status === 403, 'support role cannot list users');
  r = await call('PUT', '/api/staff/pricing', { priceUsd: 1 }); ok(r.status === 403, 'support role cannot edit pricing');
  r = await call('POST', `/api/staff/users/${u2.id}/role`, { role: 'founder' }); ok(r.status === 403, 'support cannot promote');
  // محادثة دعم: مستخدم ثالث يكتب والدعم يرد
  cookie = ''; await call('POST', '/api/auth/signup', { email: 'u3@b.co', password: 'password123', name: 'Asker' }); const cookieU3 = cookie;
  r = await call('POST', '/api/support/message', { text: 'I need help with billing' }); ok(r.status === 200, 'user opens support chat');
  cookie = cookieU2; r = await call('GET', '/api/staff/tickets'); const tk = r.data.tickets[0]; ok(tk && tk.needsReply, 'staff sees ticket needing reply');
  r = await call('POST', `/api/staff/tickets/${tk.id}/reply`, { text: 'Sure, how can I help?' }); ok(r.status === 200, 'staff replies');
  cookie = cookieU3; r = await call('GET', '/api/support/mine'); ok(r.data.ticket.messages.length === 2 && r.data.ticket.messages[1].from === 'staff', 'user receives staff reply');
  cookie = cookieU3; r = await call('GET', '/api/staff/tickets'); ok(r.status === 403, 'normal user cannot read staff inbox');
  // حظر حساب
  cookie = saved; r = await call('POST', `/api/staff/users/${(await call('GET', '/api/staff/users?q=u3')).data.users[0].id}/ban`, { banned: true }); ok(r.status === 200, 'ban user');
  cookie = cookieU3; r = await call('GET', '/api/auth/me'); ok(r.data.user === null, 'banned session is rejected');
  cookie = ''; r = await call('POST', '/api/auth/login', { email: 'u3@b.co', password: 'password123' }); ok(r.status === 403, 'banned cannot login');
  cookie = saved;
  // قاعدة الحسابات منفصلة
  await new Promise((x) => setTimeout(x, 500)); // انتظار الكتابة المؤجلة للقاعدة
  const accDb = JSON.parse(fs.readFileSync(acc, 'utf8')), cDb = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  ok(Object.keys(accDb.users).length >= 3 && !cDb.users && Object.keys(cDb.websites).length >= 1, 'accounts DB separate from content DB');
  // المساعد (بدون مفتاح: قاعدة معرفة)
  r = await call('POST', '/api/assistant', { lang: 'ar', messages: [{ role: 'user', content: 'كيف أنشر موقعي؟' }] }); ok(r.data.source === 'kb' && /نشر/.test(r.data.reply), 'assistant answers (Arabic)');
  r = await call('POST', '/api/assistant', { lang: 'fr', messages: [{ role: 'user', content: 'Combien coûte le service ?' }] }); ok(/\$|\d/.test(r.data.reply), 'assistant pricing answer uses live pricing');
  // SEO + Portfolio
  r = await call('POST', '/api/ai/seo', { website: site }); ok(r.data.site.title.length <= 60 && r.data.site.description.length <= 160, 'SEO generator');
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  r = await call('POST', '/api/portfolio/generate', { name: 'Zed', bio: 'GFX artist', language: 'ar', style: 'gaming', colors: { preset: 'green-black' }, projects: [{ title: 'Logo A', category: 'Logo', description: 'd', image: png }, { title: 'Thumb B' }] });
  ok(r.status === 200 && r.data.website.data.assets.length === 1 && r.data.website.data.pages[0].sections.some((s) => s.component === 'gallery' && s.props.items[0].image.startsWith('asset:')), 'portfolio generator with images');
  // الفواتير والعقود
  r = await call('POST', '/api/docs', { type: 'invoice', data: { lang: 'ar', currency: 'USD', from: { name: 'Me' }, client: { name: 'Client', email: 'c@x.co' }, items: [{ desc: 'Logo', qty: 2, price: 50 }], taxPercent: 10 } }); ok(r.status === 200 && r.data.doc.total === 110, 'invoice total with tax');
  const doc = r.data.doc; const page = await call('GET', '/doc/' + doc.token); ok(page.status === 200 && String(page.data).includes('dir="rtl"'), 'public invoice page (RTL)');
  r = await call('POST', '/api/docs', { type: 'contract', data: { lang: 'en', scope: 'Design a logo', price: 300, from: { name: 'Me' }, client: { name: 'C' } } }); const ctr = r.data.doc;
  r = await call('POST', `/api/public/doc/${ctr.token}/accept`, { name: 'John Client' }); ok(r.status === 200, 'client accepts contract'); r = await call('GET', '/api/docs'); ok(r.data.docs.find((d) => d.id === ctr.id).status === 'accepted', 'contract status accepted');
  r = await call('POST', `/api/docs/${doc.id}/send`, { email: 'c@x.co' }); ok(r.data.mailed === true, 'document emailed via SMTP');
  // استعادة كلمة المرور عبر SMTP
  mailData = ''; cookie = '';
  r = await call('POST', '/api/auth/forgot', { email: 'a@b.co', lang: 'ar' }); await new Promise((x) => setTimeout(x, 300));
  const body64 = (mailData.split('\r\n\r\n')[1] || '').replace(/\r\n/g, ''); const html = Buffer.from(body64, 'base64').toString('utf8');
  ok(r.data.ok && !r.data.devLink && html.includes('#/reset?token=') && html.includes('dir="rtl"'), 'password reset email sent through SMTP (Arabic, RTL)');
  const token = /token=([^"]+)"/.exec(html)[1]; r = await call('POST', '/api/auth/reset', { token, password: 'newpassword99' }); ok(r.status === 200, 'reset password with emailed token');
  r = await call('POST', '/api/auth/login', { email: 'a@b.co', password: 'newpassword99' }); ok(r.status === 200, 'login with new password'); cookie = cookie;
  r = await call('POST', '/api/auth/reset', { token, password: 'another12345' }); ok(r.status === 400, 'reset token cannot be reused');

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
