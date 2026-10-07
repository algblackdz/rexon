# NEXORA — منصة بناء المواقع بالذكاء الاصطناعي

منصة SaaS لإنشاء مواقع كاملة بضغطة زر: اختر نوع الموقع، اكتب وصفًا بسيطًا، ثم عدّل النتيجة في Editor مرئي، وصدّر الكود أو انشره.

- **اللغات:** English · Français · العربية (مع RTL كامل) — من البداية وليس إضافة لاحقة.
- **التسعير:** تجربة مجانية 7 أيام، ثم 5$ لكل موقع.
- **يعمل فورًا بدون أي مفاتيح:** المولّد (Mock) والدفع التجريبي وقاعدة بيانات ملفية. تفعيل الخدمات الحقيقية لاحقًا يتم بوضع المفاتيح في `.env` فقط.

---

## 1) المتطلبات

- **Node.js 18 أو أحدث** (يُفضَّل 20+). لا توجد مكتبات خارجية، فلا حاجة لـ `npm install`.

## 2) التثبيت والتشغيل (Development)

```bash
cd nexora
cp .env.example .env        # اختياري في التطوير
npm run dev                 # أو: node server/index.js
```

افتح: <http://localhost:3000>

> **تثبيت Dependencies:** المشروع لا يعتمد على حزم npm عمدًا (أقل مخاطر وأسرع تشغيلًا). إن أضفت حزمًا لاحقًا (مثل `pg` أو `stripe`) استخدم `npm install`.

## 3) إعداد Environment Variables

كل الإعدادات في ملف `.env` (انسخه من `.env.example`). **لا تضع أي مفتاح داخل الكود ولا ترفع `.env` إلى Git.**

| المتغير | الوظيفة |
|---|---|
| `SESSION_SECRET` | سرّ توقيع الجلسات. **إجباري في الإنتاج** |
| `APP_URL` | رابط المنصة العام (روابط الدفع واستعادة كلمة المرور) |
| `PLATFORM_DOMAIN` | نطاق المواقع المنشورة (مثل `nexora.app` ليصبح `user.nexora.app`) |
| `DATA_FILE` / `DATABASE_URL` | قاعدة البيانات |
| `ANTHROPIC_API_KEY`, `AI_MODEL` | الذكاء الاصطناعي الحقيقي |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | الدفع |
| `GOOGLE_CLIENT_ID` | تسجيل الدخول عبر Google |
| `WEBSITE_PRICE_USD`, `TRIAL_DAYS` | السعر (5) وأيام التجربة (7) |

لتوليد سرّ قوي:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4) ربط قاعدة البيانات

الوضع الافتراضي ملف JSON في `data/db.json` (كتابة ذرية) — مناسب للتطوير والعرض.

للإنتاج استخدم **PostgreSQL**:

1. نفّذ `database/schema.sql` على قاعدتك.
2. ثبّت `npm install pg`.
3. استبدل محتوى `server/lib/db.js` بتنفيذ يستخدم `pg` **بنفس الواجهة** (`insert/get/find/list/update/remove` لكل من `users, websites, versions, resets`). بقية الكود لا يتغير.
4. ضع `DATABASE_URL` في `.env`.

## 5) ربط الذكاء الاصطناعي

1. أنشئ مفتاحًا من Anthropic وضعه في `ANTHROPIC_API_KEY`.
2. (اختياري) غيّر `AI_MODEL`.
3. أعد تشغيل الخادم. ستظهر رسالة «الذكاء الاصطناعي: Claude (حقيقي)».

كيف يعمل: الذكاء الاصطناعي **لا يكتب HTML**؛ يرجع JSON حسب **Website Schema** (`shared/schema.js`)، ثم يتحقق منه الخادم وينظّفه، ثم يحوّله `shared/render.js` إلى موقع. لهذا يستطيع المستخدم التعديل لاحقًا دون إعادة بناء. عند أي فشل يرجع النظام تلقائيًا للمولّد التجريبي.

> المولّد التجريبي (`server/ai/mock.js`) يعتمد على قوالب وكلمات مفتاحية (ألوان، أسلوب، نوع الموقع) بالعربية والفرنسية والإنجليزية. ترجمة المواقع متعددة اللغات في وضع Mock جاهزة مسبقًا؛ الترجمة الحقيقية الحرة تحتاج مفتاح الذكاء الاصطناعي.

## 6) ربط الدفع (Stripe)

1. ضع `STRIPE_SECRET_KEY` في `.env`.
2. في لوحة Stripe أنشئ Webhook إلى: `https://YOUR-DOMAIN/api/billing/webhook` للحدث `checkout.session.completed`، وضع سرّه في `STRIPE_WEBHOOK_SECRET`.
3. للتجربة المحلية: `stripe listen --forward-to localhost:3000/api/billing/webhook`.

الأمان: بيانات البطاقة لا تمر عبر موقعنا أبدًا (Stripe Checkout). الموقع يُعلَّم **مدفوعًا فقط** بعد Webhook موقّع يتحقق منه الخادم، والنشر بعد التجربة يتحقق من الدفع في الخادم. الدفع التجريبي معطّل تلقائيًا في الإنتاج وعند وجود مفاتيح Stripe.

## 7) البناء والنشر (Build / Deploy)

لا توجد خطوة Build (الواجهة ملفات ES Modules جاهزة).

```bash
NODE_ENV=production SESSION_SECRET=... APP_URL=https://nexora.app node server/index.js
```

نصائح للإنتاج:

- ضع الخادم خلف Nginx/Caddy أو منصة (Railway / Fly.io / Render) مع **HTTPS** (الكوكي يصبح `Secure` تلقائيًا).
- لنطاقات `username.nexora.app`: أضف DNS wildcard `*.nexora.app` إلى الخادم وضع `PLATFORM_DOMAIN=nexora.app`.
- **مهم أمنيًا:** استخدم نطاقًا مختلفًا للمواقع المنشورة عن نطاق المنصة. في وضع `/s/<name>/` يتم تعطيل JavaScript/HTML المخصص وعزل الصفحة بـ sandbox.
- حدود الطلبات (Rate limit) في الذاكرة؛ مع عدة خوادم استبدلها بـ Redis (`server/lib/ratelimit.js`).
- أرسل بريد استعادة كلمة المرور عبر مزوّد بريد (انظر `TODO` في `server/api/auth.js`).

## 8) الاختبار

```bash
npm test      # يشغّل خادمًا مؤقتًا ويجرب: تسجيل، توليد، تعديل بالـ AI، حفظ، نشر، تصدير ZIP، الدفع
```

## 9) هيكل المشروع

```
nexora/
├── shared/                 # يعمل في المتصفح والخادم (نفس الكود)
│   ├── schema.js           #   Website Schema + التحقق والتنظيف
│   ├── defaults.js         #   مصنع المكوّنات (ثلاثي اللغات)
│   ├── render.js           #   Schema → HTML (+ تعليقات عربية في التصدير)
│   ├── css.js              #   Theme → style.css (Logical Properties للـ RTL)
│   └── site.runtime.js     #   script.js الخاص بالمواقع المُصدَّرة
├── server/
│   ├── index.js            #   الخادم: static + API + تقديم المواقع المنشورة
│   ├── api/                #   auth, websites, ai (+templates), billing, sites
│   ├── ai/                 #   provider (Claude/Mock), mock, copy, templates
│   ├── export/exporter.js  #   إنشاء ملفات المشروع (للتصدير والنشر)
│   └── lib/                #   config, http(router), db, auth, ratelimit, zip
├── public/
│   ├── index.html
│   ├── css/app.css
│   ├── locales/{en,fr,ar}/ #   common, landing, generator, dashboard, editor, pricing, auth
│   └── js/
│       ├── main.js         #   Router + Layouts
│       ├── i18n.js         #   نظام الترجمة المركزي + RTL + Fallback
│       ├── fx.js           #   Cursor, Particles, Reveal, Tilt, Parallax, Reduce Motion
│       ├── core.js shell.js siteops.js
│       └── pages/          #   landing, generator, templates, auth, dashboard, editor
├── database/schema.sql
├── scripts/smoke-test.js
└── .env.example
```

## 10) نظام الترجمة

- كل نص ظاهر في `public/locales/<lang>/<namespace>.json` ويُستدعى بـ `t('namespace.key')`.
- لإضافة نص: أضف المفتاح في الملفات الثلاثة. إن فُقد في لغة ما يُستخدم الإنجليزي ولا يظهر `undefined`.
- أخطاء الخادم تُرجع **أكواد** (مثل `invalid_email`) والواجهة تترجمها (`common.err_invalid_email`).
- تغيير اللغة بدون Reload: Fade out ← تغيير ← Fade in، ويُحفظ الاختيار (localStorage + Cookie + حساب المستخدم)، وأول زيارة تأخذ لغة المتصفح.
- لغة المنصة مستقلة عن لغة الموقع الذي ينشئه المستخدم (en / fr / ar / multi).

## 11) ما هو جاهز وما يحتاج إكمالًا

**جاهز:** المصادقة، توليد وتعديل (Mock + Claude)، Editor (Pages/Sections/Components/Assets/Themes/Animations/Settings، Undo/Redo، Auto Save، Version History، Drag & Drop، رفع صور، CSS/JS/HTML مخصص)، معاينة Desktop/Tablet/Mobile، نشر/إلغاء نشر، Subdomain ودومين مخصص، تصدير ZIP واستيراد، القوالب، الفوترة (Stripe + وضع تجريبي)، SEO (Title/Description/OG/Favicon/Sitemap/Robots)، تعدد اللغات وRTL.

**يحتاج منك للإنتاج:** مزوّد بريد، PostgreSQL، Redis للحدود، إعداد DNS/SSL للدومينات المخصصة (Caddy On-Demand TLS أو Cloudflare for SaaS)، وتفعيل Google Login بإضافة `GOOGLE_CLIENT_ID`.
