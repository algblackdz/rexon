// قاعدة معرفة المساعد (تعمل بدون API key). كل إجابة بثلاث لغات.
const E = (keys, en, fr, ar) => ({ keys, a: { en, fr, ar } });
export const KB = [
  E(['create', 'generate', 'new website', 'start', 'إنشاء', 'انشاء', 'أنشئ', 'ابدأ', 'créer', 'générer'],
    'To create a website: open **Create**, choose the website type, describe what you want, pick style and colors, then press **Generate Website**. You can edit everything afterwards in the editor.',
    'Pour créer un site : ouvrez **Créer**, choisissez le type, décrivez votre besoin, choisissez style et couleurs, puis **Générer le site**. Vous pourrez tout modifier dans l’éditeur.',
    'لإنشاء موقع: افتح **إنشاء**، اختر نوع الموقع، اكتب وصفًا لما تريد، اختر الأسلوب والألوان، ثم اضغط **ولّد الموقع**. بعدها تستطيع تعديل كل شيء في المحرر.'),
  E(['edit', 'change', 'color', 'colour', 'text', 'تعديل', 'تغيير', 'لون', 'نص', 'modifier', 'couleur'],
    'In the editor click any section in the preview, then use the right panel to change text, fonts, colors, spacing, shadows and animations. Use **Ask AI** for quick requests like “change purple to blue” or “add pricing”.',
    'Dans l’éditeur, cliquez sur une section de l’aperçu puis utilisez le panneau de droite (texte, polices, couleurs, marges, ombres, animations). **Demander à l’IA** permet « remplace le violet par du bleu » ou « ajoute les tarifs ».',
    'في المحرر اضغط على أي قسم في المعاينة ثم عدّل من اللوحة اليمنى (النص، الخطوط، الألوان، المسافات، الظلال، الحركات). وزر **اسأل AI** يفهم طلبات مثل «غيّر البنفسجي إلى أزرق» أو «أضف أسعار».'),
  E(['publish', 'live', 'online', 'نشر', 'انشر', 'publier', 'en ligne'],
    'Press **Publish Website** in the editor. During the free trial publishing is free; afterwards a payment is required according to the current plan. You get a free link immediately and can connect your own domain.',
    'Cliquez sur **Publier le site** dans l’éditeur. Pendant l’essai gratuit la publication est gratuite ; ensuite un paiement est requis selon l’offre. Vous obtenez un lien gratuit et pouvez connecter votre domaine.',
    'اضغط **نشر الموقع** في المحرر. خلال التجربة المجانية النشر مجاني، وبعدها يلزم الدفع حسب الباقة الحالية. تحصل على رابط مجاني فورًا ويمكنك ربط نطاقك الخاص.'),
  E(['domain', 'dns', 'cname', 'نطاق', 'دومين', 'domaine'],
    'Open **Connect Domain**, enter your domain, then create a **CNAME** record at your registrar pointing to the value shown. DNS can take from a few minutes to a few hours.',
    'Ouvrez **Connecter un domaine**, saisissez votre domaine puis créez chez votre registrar un enregistrement **CNAME** vers la valeur indiquée. Le DNS peut prendre de quelques minutes à quelques heures.',
    'افتح **ربط نطاق** وأدخل نطاقك، ثم أنشئ سجل **CNAME** عند مزوّد النطاق يشير إلى القيمة الظاهرة. قد يستغرق DNS من دقائق إلى ساعات.'),
  E(['export', 'download', 'code', 'zip', 'تصدير', 'كود', 'تحميل', 'exporter', 'télécharger'],
    'Use **Export Code** to download a ZIP with index.html, style.css, script.js and assets (with Arabic comments). You can also export a single section as CSS, Tailwind or SVG from the editor.',
    'Utilisez **Exporter le code** pour télécharger un ZIP (index.html, style.css, script.js, assets) avec commentaires en arabe. Vous pouvez aussi exporter une section en CSS, Tailwind ou SVG.',
    'استخدم **تصدير الكود** لتحميل ملف ZIP يحتوي index.html وstyle.css وscript.js والملفات، مع تعليقات عربية. ويمكنك أيضًا تصدير قسم واحد بصيغة CSS أو Tailwind أو SVG.'),
  E(['price', 'pricing', 'cost', 'how much', 'pay', 'trial', 'combien', 'coût', 'cout', 'تكلفة', 'تكلف', 'كم ', 'سعر', 'أسعار', 'اسعار', 'دفع', 'تجربة', 'prix', 'tarif', 'payer', 'essai'],
    '{{PRICING}}', '{{PRICING}}', '{{PRICING}}'),
  E(['language', 'arabic', 'french', 'rtl', 'لغة', 'عربي', 'فرنسي', 'langue', 'arabe'],
    'The platform and your websites support English, Français and العربية with real RTL. When creating a website choose its language or **Multi-language**; the dashboard language is separate from the website language.',
    'La plateforme et vos sites supportent English, Français et العربية avec un vrai RTL. À la création choisissez la langue du site ou **Multilingue** ; la langue du tableau de bord est indépendante.',
    'المنصة ومواقعك تدعم الإنجليزية والفرنسية والعربية مع RTL حقيقي. عند الإنشاء اختر لغة الموقع أو **متعدد اللغات**، ولغة لوحة التحكم مستقلة عن لغة الموقع.'),
  E(['seo', 'google search', 'meta', 'ranking', 'سيو', 'محركات', 'référencement'],
    'Open Settings in the editor and press **Generate SEO** to get a title and description for every page. Also add a social preview image and submit your sitemap.xml to Google Search Console.',
    'Dans Paramètres de l’éditeur, cliquez sur **Générer le SEO** pour obtenir titre et description de chaque page. Ajoutez une image d’aperçu et soumettez sitemap.xml à Google Search Console.',
    'من إعدادات المحرر اضغط **توليد SEO** للحصول على عنوان ووصف لكل صفحة. أضف صورة معاينة اجتماعية وارفع ملف sitemap.xml إلى Google Search Console.'),
  E(['password', 'forgot', 'login', 'كلمة المرور', 'نسيت', 'دخول', 'mot de passe', 'connexion'],
    'Use **Forgot password?** on the login page; we email you a reset link valid for 1 hour. You can also sign in with Google.',
    'Utilisez **Mot de passe oublié ?** sur la page de connexion ; un lien valable 1 heure vous est envoyé. Vous pouvez aussi vous connecter avec Google.',
    'استخدم **نسيت كلمة المرور؟** في صفحة الدخول وسيصلك رابط صالح لساعة. ويمكنك أيضًا الدخول عبر Google.'),
  E(['invoice', 'contract', 'freelance', 'فاتورة', 'عقد', 'facture', 'contrat'],
    'In Dashboard → **Tools** you can create invoices and contracts, send them to clients by email or link, and the client can accept a contract online. The pricing calculator helps you quote projects.',
    'Dans Tableau de bord → **Outils** vous créez factures et contrats, les envoyez par e-mail ou lien, et le client peut accepter un contrat en ligne. La calculatrice aide à chiffrer vos projets.',
    'من لوحة التحكم ← **الأدوات** تستطيع إنشاء فواتير وعقود وإرسالها للعميل بالبريد أو برابط، ويقبل العميل العقد إلكترونيًا. وحاسبة الأسعار تساعدك في تسعير المشاريع.'),
  E(['support', 'human', 'agent', 'help', 'دعم', 'موظف', 'مساعدة', 'aide', 'humain'],
    'For account or payment problems, open the **Support** tab in this chat to talk to our team (log in required).',
    'Pour un problème de compte ou de paiement, ouvrez l’onglet **Support** de ce chat pour parler à notre équipe (connexion requise).',
    'لمشاكل الحساب أو الدفع افتح تبويب **الدعم** في هذه المحادثة للتحدث مع فريقنا (يلزم تسجيل الدخول).')
];
const NONE = {
  en: 'I can help with creating, editing, publishing and exporting websites, pricing, domains, SEO and languages. Ask me something specific, or open the **Support** tab to talk to our team.',
  fr: 'Je peux aider pour créer, modifier, publier et exporter un site, les tarifs, domaines, SEO et langues. Posez une question précise, ou ouvrez l’onglet **Support**.',
  ar: 'أستطيع مساعدتك في إنشاء المواقع وتعديلها ونشرها وتصديرها، والأسعار والنطاقات وSEO واللغات. اسألني سؤالًا محددًا أو افتح تبويب **الدعم** للتحدث مع الفريق.'
};
export function kbAnswer(question, lang, pricingText) {
  const q = String(question || '').toLowerCase();
  let best = null, score = 0;
  for (const e of KB) { const s = e.keys.filter((k) => q.includes(k.toLowerCase())).length; if (s > score) { best = e; score = s; } }
  const txt = best ? best.a[lang] || best.a.en : NONE[lang] || NONE.en;
  return txt.replace('{{PRICING}}', pricingText);
}
