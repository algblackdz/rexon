// ============================================================
// مصنع المكوّنات الافتراضية — يُستخدم في المولّد وفي مكتبة Components داخل Editor
// كل النصوص ثلاثية اللغات: إذا كان الموقع متعدد اللغات يصبح النص {en, fr, ar}
// ============================================================
import { uid } from './schema.js';

// حركات تفاعلية افتراضية لكل مكوّن (يمكن تغييرها من لوحة الخصائص)
const MICRO_DEFAULT = { features: 'spotlight', cards: 'spotlight', pricing: 'spotlight', testimonials: 'spotlight', reviews: 'spotlight', team: 'spotlight', productGrid: 'tilt', gallery: 'tilt', hero: 'magnetic', cta: 'magnetic' };

export function makeSection(component, ctx, over = {}) {
  const L = (en, fr, ar) => (ctx.multi ? { en, fr, ar } : { en, fr, ar }[ctx.lang] ?? en);
  const name = ctx.name || 'NEXORA';
  const items = (n, fn) => Array.from({ length: n }, (_, i) => fn(i + 1));
  const P = {
    navbar: () => ({ brand: name, links: [], cta: { label: L('Get started', 'Commencer', 'ابدأ الآن'), href: 'page:contact' } }),
    hero: () => ({
      showcase: true,
      badge: L('New', 'Nouveau', 'جديد'),
      title: L('Your website, built beautifully', 'Votre site, magnifiquement conçu', 'موقعك، بتصميم يليق بك'),
      subtitle: L('A short, clear promise about what you offer.', 'Une promesse courte et claire sur ce que vous proposez.', 'وعد قصير وواضح عمّا تقدمه.'),
      primary: { label: L('Get started', 'Commencer', 'ابدأ الآن'), href: 'page:contact' },
      secondary: { label: L('Learn more', 'En savoir plus', 'اعرف المزيد'), href: '#features' }
    }),
    features: () => ({
      title: L('Why choose us', 'Pourquoi nous choisir', 'لماذا تختارنا'),
      subtitle: L('Three things we do better.', 'Trois choses que nous faisons mieux.', 'ثلاثة أشياء نتميّز بها.'),
      items: [
        { icon: '✦', title: L('Fast', 'Rapide', 'سريع'), text: L('Quick results without the wait.', 'Des résultats rapides, sans attente.', 'نتائج سريعة بدون انتظار.') },
        { icon: '◈', title: L('Reliable', 'Fiable', 'موثوق'), text: L('Built to work every single day.', 'Conçu pour fonctionner chaque jour.', 'مصمم ليعمل كل يوم.') },
        { icon: '⬢', title: L('Personal', 'Personnalisé', 'مخصص'), text: L('Tailored to what you actually need.', 'Adapté à vos vrais besoins.', 'مفصّل حسب احتياجك الفعلي.') }
      ]
    }),
    cards: () => ({
      title: L('What we offer', 'Ce que nous offrons', 'ما نقدمه'),
      items: items(3, (i) => ({ title: L('Item ' + i, 'Élément ' + i, 'عنصر ' + i), text: L('A short description of this item.', 'Une courte description de cet élément.', 'وصف قصير لهذا العنصر.') }))
    }),
    pricing: () => ({
      title: L('Simple pricing', 'Des tarifs simples', 'أسعار بسيطة'),
      items: [
        { name: L('Starter', 'Départ', 'البداية'), price: '$0', period: L('/month', '/mois', '/شهر'), features: [L('Core features', 'Fonctions de base', 'المزايا الأساسية'), L('Email support', 'Support par e-mail', 'دعم بالبريد')], cta: L('Choose', 'Choisir', 'اختر'), highlight: false },
        { name: L('Pro', 'Pro', 'احترافي'), price: '$19', period: L('/month', '/mois', '/شهر'), features: [L('Everything in Starter', 'Tout dans Départ', 'كل مزايا البداية'), L('Priority support', 'Support prioritaire', 'دعم أولوية'), L('Advanced tools', 'Outils avancés', 'أدوات متقدمة')], cta: L('Choose', 'Choisir', 'اختر'), highlight: true }
      ]
    }),
    testimonials: () => ({
      title: L('What people say', 'Ce que disent nos clients', 'آراء عملائنا'),
      items: items(3, (i) => ({ name: L('Client ' + i, 'Client ' + i, 'عميل ' + i), role: L('Customer', 'Client', 'عميل'), text: L('Great experience from start to finish.', 'Une excellente expérience du début à la fin.', 'تجربة رائعة من البداية إلى النهاية.'), rating: 5 }))
    }),
    reviews: () => ({
      title: L('Reviews', 'Avis', 'التقييمات'),
      items: items(3, (i) => ({ name: L('Reviewer ' + i, 'Auteur ' + i, 'مقيّم ' + i), role: '', text: L('Exactly what I was looking for.', 'Exactement ce que je cherchais.', 'بالضبط ما كنت أبحث عنه.'), rating: 5 }))
    }),
    faq: () => ({
      title: L('Frequently asked questions', 'Questions fréquentes', 'الأسئلة الشائعة'),
      items: items(3, (i) => ({ q: L('Question ' + i + '?', 'Question ' + i + ' ?', 'السؤال ' + i + '؟'), a: L('A clear, honest answer goes here.', 'Une réponse claire et honnête va ici.', 'إجابة واضحة وصادقة تكتب هنا.') }))
    }),
    contact: () => ({
      title: L('Get in touch', 'Contactez-nous', 'تواصل معنا'),
      subtitle: L('We usually reply within a day.', 'Nous répondons en général sous un jour.', 'نرد عادةً خلال يوم واحد.'),
      labels: { name: L('Name', 'Nom', 'الاسم'), email: L('Email', 'E-mail', 'البريد الإلكتروني'), message: L('Message', 'Message', 'الرسالة') },
      button: L('Send message', 'Envoyer', 'إرسال الرسالة'),
      success: L('Thank you! Your message was sent.', 'Merci ! Votre message a été envoyé.', 'شكرًا لك! تم إرسال رسالتك.')
    }),
    gallery: () => ({ title: L('Gallery', 'Galerie', 'المعرض'), items: items(6, (i) => ({ image: '', caption: L('Work ' + i, 'Réalisation ' + i, 'عمل ' + i) })) }),
    productGrid: () => ({
      title: L('Products', 'Produits', 'المنتجات'),
      items: items(4, (i) => ({ name: L('Product ' + i, 'Produit ' + i, 'منتج ' + i), price: '$' + (10 + i * 7), image: '', badge: i === 1 ? L('New', 'Nouveau', 'جديد') : '' }))
    }),
    stats: () => ({
      items: [
        { value: '120+', label: L('Projects', 'Projets', 'مشروع') },
        { value: '98%', label: L('Happy clients', 'Clients satisfaits', 'عملاء راضون') },
        { value: '24/7', label: L('Support', 'Support', 'دعم') },
        { value: '5★', label: L('Average rating', 'Note moyenne', 'متوسط التقييم') }
      ]
    }),
    timeline: () => ({
      title: L('Our journey', 'Notre parcours', 'رحلتنا'),
      items: items(3, (i) => ({ date: String(2022 + i), title: L('Milestone ' + i, 'Étape ' + i, 'محطة ' + i), text: L('What happened and why it mattered.', 'Ce qui s’est passé et pourquoi c’était important.', 'ماذا حدث ولماذا كان مهمًا.') }))
    }),
    team: () => ({
      title: L('The team', 'L’équipe', 'الفريق'),
      items: items(3, (i) => ({ name: L('Member ' + i, 'Membre ' + i, 'عضو ' + i), role: L('Role', 'Rôle', 'المنصب'), image: '' }))
    }),
    cta: () => ({
      title: L('Ready to start?', 'Prêt à commencer ?', 'جاهز للبدء؟'),
      subtitle: L('Tell us what you need.', 'Dites-nous ce dont vous avez besoin.', 'أخبرنا بما تحتاجه.'),
      button: { label: L('Contact us', 'Nous contacter', 'تواصل معنا'), href: 'page:contact' }
    }),
    login: () => ({ title: L('Log in', 'Connexion', 'تسجيل الدخول'), labels: { email: L('Email', 'E-mail', 'البريد الإلكتروني'), password: L('Password', 'Mot de passe', 'كلمة المرور') }, button: L('Log in', 'Se connecter', 'دخول') }),
    signup: () => ({ title: L('Create an account', 'Créer un compte', 'إنشاء حساب'), labels: { name: L('Name', 'Nom', 'الاسم'), email: L('Email', 'E-mail', 'البريد الإلكتروني'), password: L('Password', 'Mot de passe', 'كلمة المرور') }, button: L('Sign up', 'S’inscrire', 'تسجيل') }),
    footer: () => ({
      text: L('© ' + new Date().getFullYear() + ' ' + name + '. All rights reserved.', '© ' + new Date().getFullYear() + ' ' + name + '. Tous droits réservés.', '© ' + new Date().getFullYear() + ' ' + name + '. جميع الحقوق محفوظة.'),
      links: [{ label: L('Home', 'Accueil', 'الرئيسية'), href: 'page:index' }, { label: L('Contact', 'Contact', 'اتصل بنا'), href: 'page:contact' }]
    })
  };
  const base = P[component]();
  return {
    id: uid('sec'),
    component,
    props: { ...base, ...(over.props || {}) },
    style: over.style || {},
    animation: over.animation || ctx.animation || 'fade-up',
    hover: over.hover || 'none',
    micro: over.micro || MICRO_DEFAULT[component] || 'none'
  };
}

export const PAGE_PRESETS = ['index', 'about', 'services', 'products', 'portfolio', 'contact', 'faq', 'blog'];
export const PAGE_TITLES = {
  index: { en: 'Home', fr: 'Accueil', ar: 'الرئيسية' },
  about: { en: 'About', fr: 'À propos', ar: 'من نحن' },
  services: { en: 'Services', fr: 'Services', ar: 'الخدمات' },
  products: { en: 'Products', fr: 'Produits', ar: 'المنتجات' },
  portfolio: { en: 'Portfolio', fr: 'Portfolio', ar: 'الأعمال' },
  contact: { en: 'Contact', fr: 'Contact', ar: 'اتصل بنا' },
  faq: { en: 'FAQ', fr: 'FAQ', ar: 'الأسئلة' },
  blog: { en: 'Blog', fr: 'Blog', ar: 'المدونة' }
};
