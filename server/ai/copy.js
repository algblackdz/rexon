// ============================================================
// محتوى المولّد التجريبي (Mock) + لوحات الألوان + كشف الكلمات المفتاحية
// يعمل بدون أي API key. عند توفر مفتاح الذكاء الاصطناعي يُستخدم provider.js بدلًا منه.
// ============================================================
export const PRESETS = {
  'purple-blue': { primary: '#7c3aed', secondary: '#3b82f6' },
  'black-red': { primary: '#ef4444', secondary: '#991b1b', bg: '#0a0a0a', surface: '#171717' },
  'white-blue': { primary: '#2563eb', secondary: '#06b6d4', light: true },
  'green-black': { primary: '#22c55e', secondary: '#047857', bg: '#050806', surface: '#101712' },
  'orange-black': { primary: '#f97316', secondary: '#b45309', bg: '#0a0806', surface: '#17120d' }
};
export const STYLES = {
  minimal: { radius: 8, latin: 'Inter' }, modern: { radius: 14, latin: 'Inter' }, luxury: { radius: 4, latin: 'Manrope' },
  futuristic: { radius: 18, latin: 'Poppins' }, gaming: { radius: 10, latin: 'Poppins' }, dark: { radius: 12, latin: 'Inter' },
  clean: { radius: 10, latin: 'Manrope' }, creative: { radius: 24, latin: 'Poppins' }, corporate: { radius: 6, latin: 'Manrope' }
};

export const COLOR_WORDS = [
  ['#7c3aed', ['purple', 'violet', 'mauve', 'بنفسج', 'أرجوان']], ['#2563eb', ['blue', 'bleu', 'أزرق', 'ازرق']],
  ['#ef4444', ['red', 'rouge', 'أحمر', 'احمر']], ['#22c55e', ['green', 'vert', 'أخضر', 'اخضر']],
  ['#f97316', ['orange', 'برتقال']], ['#ec4899', ['pink', 'rose', 'وردي']], ['#06b6d4', ['cyan', 'turquoise', 'سماوي', 'تركواز']]
];
// يرجع الألوان المذكورة في النص بترتيب ظهورها
export function findColors(text) {
  const low = String(text || '').toLowerCase();
  const hits = [];
  for (const [hex, words] of COLOR_WORDS) for (const w of words) { const i = low.indexOf(w); if (i >= 0) { hits.push([i, hex]); break; } }
  return hits.sort((a, b) => a[0] - b[0]).map((h) => h[1]);
}

const STYLE_WORDS = { luxury: ['luxury', 'luxe', 'فخم', 'فخامة'], futuristic: ['futuristic', 'futuriste', 'مستقبلي'], gaming: ['gaming', 'game', 'jeu', 'ألعاب', 'العاب'], minimal: ['minimal', 'minimaliste', 'بسيط'], corporate: ['corporate', 'entreprise', 'رسمي'], creative: ['creative', 'créatif', 'إبداعي'] };
export function findStyle(text) {
  const low = String(text || '').toLowerCase();
  for (const [s, ws] of Object.entries(STYLE_WORDS)) if (ws.some((w) => low.includes(w))) return s;
  return null;
}
const TYPE_WORDS = { store: ['store', 'shop', 'boutique', 'متجر'], portfolio: ['portfolio', 'معرض أعمال'], restaurant: ['restaurant', 'مطعم', 'cafe', 'café'], gaming: ['gaming', 'ألعاب'], blog: ['blog', 'مدونة'], agency: ['agency', 'agence', 'وكالة'], saas: ['saas'], business: ['company', 'entreprise', 'شركة'] };
export function findType(text) {
  const low = String(text || '').toLowerCase();
  for (const [t, ws] of Object.entries(TYPE_WORDS)) if (ws.some((w) => low.includes(w))) return t;
  return null;
}
export function detectLang(text) {
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/\b(je|veux|un|une|des|pour|moderne|site|créer)\b/i.test(text)) return 'fr';
  return 'en';
}

// [title, subtitle, [3 مزايا], cta]
export const TYPE_COPY = {
  store: { en: ['Shop what you love', 'Carefully chosen products, delivered fast.', ['Fast delivery', 'Secure payment', 'Easy returns'], 'Shop now'], fr: ['Achetez ce que vous aimez', 'Des produits soigneusement choisis, livrés rapidement.', ['Livraison rapide', 'Paiement sécurisé', 'Retours faciles'], 'Acheter'], ar: ['تسوّق ما تحب', 'منتجات مختارة بعناية، تصلك بسرعة.', ['توصيل سريع', 'دفع آمن', 'إرجاع سهل'], 'تسوّق الآن'] },
  portfolio: { en: ['Work that speaks for itself', 'A selection of recent projects and the story behind them.', ['Original ideas', 'Careful details', 'On-time delivery'], 'See my work'], fr: ['Un travail qui parle de lui-même', 'Une sélection de projets récents et leur histoire.', ['Idées originales', 'Détails soignés', 'Livraison dans les délais'], 'Voir mes projets'], ar: ['أعمال تتحدث عن نفسها', 'مختارات من أحدث المشاريع والقصة وراءها.', ['أفكار أصيلة', 'تفاصيل دقيقة', 'تسليم في الموعد'], 'شاهد أعمالي'] },
  business: { en: ['Solutions that move your business forward', 'Trusted expertise for companies that want to grow.', ['Proven expertise', 'Clear process', 'Dedicated support'], 'Talk to us'], fr: ['Des solutions qui font avancer votre entreprise', 'Une expertise de confiance pour les entreprises qui veulent grandir.', ['Expertise prouvée', 'Processus clair', 'Support dédié'], 'Parlons-en'], ar: ['حلول تدفع عملك إلى الأمام', 'خبرة موثوقة للشركات التي تريد النمو.', ['خبرة مثبتة', 'عملية واضحة', 'دعم مخصص'], 'تحدث معنا'] },
  landing: { en: ['One page. One clear promise.', 'Explain what you offer and let visitors act right away.', ['Clear message', 'Fast to read', 'Built to convert'], 'Get started'], fr: ['Une page. Une promesse claire.', 'Expliquez votre offre et laissez les visiteurs agir tout de suite.', ['Message clair', 'Lecture rapide', 'Pensé pour convertir'], 'Commencer'], ar: ['صفحة واحدة. وعد واضح.', 'اشرح ما تقدمه ودع الزائر يتصرف فورًا.', ['رسالة واضحة', 'قراءة سريعة', 'مصممة للتحويل'], 'ابدأ الآن'] },
  blog: { en: ['Stories worth reading', 'Ideas, notes and guides, published regularly.', ['Fresh posts', 'Clear writing', 'Easy to follow'], 'Read the blog'], fr: ['Des histoires qui valent la lecture', 'Idées, notes et guides publiés régulièrement.', ['Articles récents', 'Écriture claire', 'Facile à suivre'], 'Lire le blog'], ar: ['قصص تستحق القراءة', 'أفكار وملاحظات وأدلة تُنشر باستمرار.', ['مقالات جديدة', 'كتابة واضحة', 'سهلة المتابعة'], 'اقرأ المدونة'] },
  restaurant: { en: ['Good food, made fresh', 'Seasonal dishes cooked with care, served warm.', ['Fresh ingredients', 'Family recipes', 'Warm welcome'], 'Book a table'], fr: ['Une bonne cuisine, toujours fraîche', 'Des plats de saison cuisinés avec soin, servis chauds.', ['Produits frais', 'Recettes de famille', 'Accueil chaleureux'], 'Réserver une table'], ar: ['طعام جيد، يُحضَّر طازجًا', 'أطباق موسمية تُطهى بعناية وتُقدَّم ساخنة.', ['مكونات طازجة', 'وصفات عائلية', 'استقبال دافئ'], 'احجز طاولة'] },
  gaming: { en: ['Level up your presence', 'Your community, your content, your game.', ['Epic visuals', 'Live community', 'Always online'], 'Join now'], fr: ['Passez au niveau supérieur', 'Votre communauté, votre contenu, votre jeu.', ['Visuels épiques', 'Communauté active', 'Toujours en ligne'], 'Rejoindre'], ar: ['ارفع مستوى حضورك', 'مجتمعك ومحتواك ولعبتك.', ['مرئيات ملحمية', 'مجتمع نشط', 'متصل دائمًا'], 'انضم الآن'] },
  agency: { en: ['We build brands people remember', 'Strategy, design and development under one roof.', ['Strategy', 'Design', 'Development'], 'Start a project'], fr: ['Nous créons des marques mémorables', 'Stratégie, design et développement sous un même toit.', ['Stratégie', 'Design', 'Développement'], 'Lancer un projet'], ar: ['نبني علامات لا تُنسى', 'استراتيجية وتصميم وتطوير تحت سقف واحد.', ['الاستراتيجية', 'التصميم', 'التطوير'], 'ابدأ مشروعًا'] },
  personal: { en: ['Hi, I’m glad you’re here', 'A short introduction, what I do and how to reach me.', ['My story', 'My skills', 'My projects'], 'Say hello'], fr: ['Bonjour, ravi de vous voir', 'Une courte présentation, mon travail et comment me joindre.', ['Mon histoire', 'Mes compétences', 'Mes projets'], 'Me contacter'], ar: ['مرحبًا، سعيد بزيارتك', 'مقدمة قصيرة عمّا أفعله وكيف تتواصل معي.', ['قصتي', 'مهاراتي', 'مشاريعي'], 'تواصل معي'] },
  saas: { en: ['Software that gets out of your way', 'Automate the boring parts and focus on what matters.', ['Easy setup', 'Powerful automation', 'Secure by default'], 'Start free trial'], fr: ['Un logiciel qui ne vous gêne pas', 'Automatisez le répétitif et concentrez-vous sur l’essentiel.', ['Installation simple', 'Automatisation puissante', 'Sécurisé par défaut'], 'Essai gratuit'], ar: ['برنامج لا يعطّل عملك', 'أتمت المهام المملة وركّز على ما يهم.', ['إعداد سهل', 'أتمتة قوية', 'آمن افتراضيًا'], 'ابدأ تجربة مجانية'] },
  other: { en: ['A website made for you', 'Tell your story clearly and let people find you.', ['Clear', 'Fast', 'Yours'], 'Get in touch'], fr: ['Un site fait pour vous', 'Racontez votre histoire clairement et faites-vous trouver.', ['Clair', 'Rapide', 'À vous'], 'Nous contacter'], ar: ['موقع صُنع لأجلك', 'اروِ قصتك بوضوح ودع الناس يجدونك.', ['واضح', 'سريع', 'خاص بك'], 'تواصل معنا'] }
};

// الأقسام الوسطى لكل نوع موقع + الصفحة الإضافية
export const TYPE_LAYOUT = {
  store: { mid: ['productGrid', 'testimonials'], extra: 'products', extraSecs: ['productGrid'] },
  portfolio: { mid: ['gallery', 'stats'], extra: 'portfolio', extraSecs: ['gallery'] },
  business: { mid: ['stats', 'team', 'testimonials'], extra: 'about', extraSecs: ['timeline', 'team'] },
  landing: { mid: ['stats', 'pricing'], extra: null },
  blog: { mid: ['cards'], extra: 'blog', extraSecs: ['cards'] },
  restaurant: { mid: ['cards', 'gallery'], extra: 'about', extraSecs: ['timeline'] },
  gaming: { mid: ['gallery', 'stats', 'cards'], extra: 'portfolio', extraSecs: ['gallery'] },
  agency: { mid: ['cards', 'team'], extra: 'services', extraSecs: ['cards', 'pricing'] },
  personal: { mid: ['timeline', 'gallery'], extra: 'about', extraSecs: ['timeline'] },
  saas: { mid: ['pricing', 'faq'], extra: 'faq', extraSecs: ['faq'] },
  other: { mid: ['stats'], extra: 'about', extraSecs: ['timeline'] }
};
