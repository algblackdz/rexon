// قوالب Marketplace: كل قالب = معاملات توليد جاهزة (نفس مسار المولّد، فيبقى قابلًا للتعديل بالكامل)
export const TEMPLATES = [
  { id: 'biz-nova', category: 'Business', type: 'business', style: 'corporate', colors: { preset: 'white-blue' }, name: { en: 'Nova Consulting', fr: 'Nova Conseil', ar: 'نوفا للاستشارات' } },
  { id: 'biz-atlas', category: 'Business', type: 'business', style: 'modern', colors: { preset: 'purple-blue' }, name: { en: 'Atlas Group', fr: 'Groupe Atlas', ar: 'مجموعة أطلس' } },
  { id: 'port-pixel', category: 'Portfolio', type: 'portfolio', style: 'creative', colors: { preset: 'purple-blue' }, name: { en: 'Pixel Studio', fr: 'Studio Pixel', ar: 'استوديو بكسل' } },
  { id: 'port-mono', category: 'Portfolio', type: 'portfolio', style: 'minimal', colors: { preset: 'white-blue' }, name: { en: 'Mono Folio', fr: 'Mono Folio', ar: 'مونو' } },
  { id: 'game-arena', category: 'Gaming', type: 'gaming', style: 'gaming', colors: { preset: 'green-black' }, name: { en: 'Arena Hub', fr: 'Arena Hub', ar: 'ساحة اللاعبين' } },
  { id: 'game-neon', category: 'Gaming', type: 'gaming', style: 'futuristic', colors: { preset: 'black-red' }, name: { en: 'Neon Clan', fr: 'Clan Néon', ar: 'كلان نيون' } },
  { id: 'store-urban', category: 'Store', type: 'store', style: 'modern', colors: { preset: 'orange-black' }, name: { en: 'Urban Goods', fr: 'Urban Goods', ar: 'متجر أوربان' } },
  { id: 'store-lux', category: 'Store', type: 'store', style: 'luxury', colors: { preset: 'black-red' }, name: { en: 'Maison Lux', fr: 'Maison Lux', ar: 'ميزون لوكس' } },
  { id: 'rest-olive', category: 'Restaurant', type: 'restaurant', style: 'clean', colors: { preset: 'green-black' }, name: { en: 'Olive & Fire', fr: 'Olive & Feu', ar: 'زيتون ونار' } },
  { id: 'agency-wave', category: 'Agency', type: 'agency', style: 'futuristic', colors: { preset: 'purple-blue' }, name: { en: 'Wave Agency', fr: 'Agence Wave', ar: 'وكالة ويف' } },
  { id: 'saas-flow', category: 'SaaS', type: 'saas', style: 'modern', colors: { preset: 'purple-blue' }, name: { en: 'Flowdesk', fr: 'Flowdesk', ar: 'فلو ديسك' } },
  { id: 'creative-bloom', category: 'Creative', type: 'personal', style: 'creative', colors: { primary: '#ec4899' }, name: { en: 'Bloom', fr: 'Bloom', ar: 'بلوم' } }
];
export const templateParams = (t, lang = 'en', language) => ({ type: t.type, style: t.style, colors: t.colors, language: language || lang, name: t.name[lang] || t.name.en, prompt: '' });
