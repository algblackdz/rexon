// ============================================================
// CSS Builder — يبني style.css للموقع من الـ Theme ومن أنماط كل قسم
// يعتمد على Logical Properties (inline-start / inline-end) ليعمل RTL و LTR دون كسر.
// ============================================================
import { siteLangs } from './schema.js';
import { premiumCSS } from './css-premium.js';

const DARK = { bg: '#070816', surface: '#10122b', text: '#f4f5ff', muted: '#9aa0c4' };
const LIGHT = { bg: '#f7f8ff', surface: '#ffffff', text: '#10122b', muted: '#5b6088' };

// opts.mode: يسمح بمعاينة الوضع الداكن/الفاتح دون تغيير الموقع نفسه
export function buildCSS(site, opts = {}) {
  const t = site.theme;
  const mode = opts.mode || t.mode;
  const c = { ...t.colors, ...(mode === t.mode ? {} : t.alt || (mode === 'light' ? LIGHT : DARK)) };
  const dk = t.mode === 'dark' ? t.colors : t.alt || DARK, lt = t.mode === 'light' ? t.colors : t.alt || LIGHT;
  const pal = (p) => `--bg:${p.bg};--surface:${p.surface};--text:${p.text};--muted:${p.muted}`;
  const multiAr = siteLangs(site).includes('ar');
  const lat = `'${t.fonts.latin}'`, ar = `'${t.fonts.arabic}'`;
  const glow = t.style === 'luxury' || t.style === 'futuristic' || t.style === 'gaming' ? '0 0 40px' : '0 8px 30px';

  let css = `/* ===== المتغيرات العامة: الألوان والخطوط والحواف ===== */
:root{
  --primary:${c.primary};      /* اللون الأساسي للأزرار والعناوين المميزة */
  --secondary:${c.secondary};  /* اللون الثانوي للتدرجات */
  --bg:${c.bg};                /* لون الخلفية الرئيسي للموقع */
  --surface:${c.surface};      /* لون البطاقات */
  --text:${c.text};            /* لون النص */
  --muted:${c.muted};          /* لون النص الثانوي */
  --radius:${t.radius}px;      /* استدارة الحواف */
  --font:${lat},${multiAr ? ar + ',' : ''}system-ui,sans-serif;
  --line:color-mix(in srgb,var(--text) 12%,transparent);
}
${multiAr ? `html[lang="ar"]{--font:${ar},${lat},system-ui,sans-serif}` : ''}
/* ===== الوضع الليلي والنهاري (يختاره زر الموقع أو جهاز الزائر) ===== */
html[data-theme="dark"]{${pal(dk)}}
html[data-theme="light"]{${pal(lt)}}

/* ===== إعادة الضبط والأساسيات ===== */
*,*::before,*::after{box-sizing:border-box;margin:0}
html{scroll-behavior:smooth}
body{font-family:var(--font);background:var(--bg);color:var(--text);line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}
body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:radial-gradient(60% 50% at 15% 0%,color-mix(in srgb,var(--primary) 28%,transparent),transparent 70%),
             radial-gradient(50% 45% at 90% 20%,color-mix(in srgb,var(--secondary) 22%,transparent),transparent 70%)}
img{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
:focus-visible{outline:2px solid var(--secondary);outline-offset:3px}
main{display:block}

/* ===== التخطيط ===== */
.nx-wrap{width:min(1140px,100% - 2rem);margin-inline:auto}
.nx-narrow{width:min(760px,100% - 2rem)}
.nx-sec{padding-block:clamp(3rem,8vw,6rem)}
.nx-title{font-size:clamp(1.7rem,4vw,2.6rem);line-height:1.2;margin-block-end:.6rem;text-align:center}
.nx-sub{color:var(--muted);text-align:center;margin-block-end:2.2rem;max-width:60ch;margin-inline:auto}
.nx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:1.25rem}

/* ===== الأزرار ===== */
.nx-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;padding:.8rem 1.5rem;border-radius:var(--radius);border:1px solid transparent;font:600 1rem var(--font);color:#fff;cursor:pointer;
  background:linear-gradient(135deg,var(--primary),var(--secondary));box-shadow:${glow} color-mix(in srgb,var(--primary) 35%,transparent);transition:transform .25s,box-shadow .25s}
.nx-btn:hover{transform:translateY(-2px)}
.nx-btn.ghost{background:transparent;color:var(--text);border-color:var(--line);box-shadow:none}
.nx-btn.sm{padding:.5rem 1.1rem;font-size:.92rem}

/* ===== البطاقات ===== */
.nx-card{background:color-mix(in srgb,var(--surface) 78%,transparent);border:1px solid var(--line);border-radius:var(--radius);padding:1.5rem;backdrop-filter:blur(10px);transition:transform .3s,box-shadow .3s,border-color .3s}
.nx-card h3{margin-block-end:.4rem}
.nx-card p,.nx-card li{color:var(--muted)}
.nx-icon{display:inline-grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:calc(var(--radius) * .7);margin-block-end:.8rem;background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff}

/* ===== شريط التنقل ===== */
.nx-nav{position:sticky;top:0;z-index:50;backdrop-filter:blur(14px);background:color-mix(in srgb,var(--bg) 70%,transparent);border-block-end:1px solid var(--line)}
.nx-nav-in{display:flex;align-items:center;gap:1.2rem;min-height:4rem}
.nx-brand{font-weight:700;font-size:1.2rem;background:linear-gradient(135deg,var(--primary),var(--secondary));-webkit-background-clip:text;background-clip:text;color:transparent}
.nx-links{display:flex;gap:1.2rem;margin-inline-start:auto}
.nx-links a{color:var(--muted);transition:color .2s}
.nx-links a:hover{color:var(--text)}
.nx-nav-end{display:flex;align-items:center;gap:.8rem}
.nx-lang{display:flex;gap:.2rem;border:1px solid var(--line);border-radius:999px;padding:.15rem}
.nx-lang a{padding:.15rem .6rem;border-radius:999px;font-size:.8rem;color:var(--muted)}
.nx-lang a[aria-current]{background:var(--primary);color:#fff}
.nx-burger{display:none;background:none;border:0;margin-inline-start:auto;width:2.4rem;height:2.4rem;cursor:pointer}
.nx-burger span{display:block;height:2px;background:var(--text);margin:6px 8px}

/* ===== Hero ===== */
.nx-hero{padding-block:clamp(4rem,12vw,9rem)}
.nx-hero-in{text-align:center;display:grid;justify-items:center;gap:1.2rem}
.nx-h1{font-size:clamp(2.2rem,7vw,4.6rem);line-height:1.08;letter-spacing:-.02em;max-width:18ch}
.nx-lead{color:var(--muted);font-size:clamp(1.05rem,2vw,1.3rem);max-width:56ch}
.nx-actions{display:flex;flex-wrap:wrap;gap:.8rem;justify-content:center}
.nx-badge{display:inline-block;padding:.25rem .8rem;border-radius:999px;font-size:.8rem;border:1px solid var(--line);background:color-mix(in srgb,var(--primary) 18%,transparent)}
.nx-hero-img{margin-block-start:1.5rem;border-radius:var(--radius);overflow:hidden;border:1px solid var(--line)}

/* ===== أقسام متنوعة ===== */
.nx-pricing .is-hl{border-color:var(--primary);box-shadow:${glow} color-mix(in srgb,var(--primary) 30%,transparent)}
.nx-price{font-size:2.4rem;font-weight:700;margin-block:.4rem}
.nx-price small{font-size:.9rem;color:var(--muted);font-weight:400}
.nx-price.sm{font-size:1.2rem}
.nx-pricing ul{list-style:none;padding:0;margin-block:1rem 1.5rem;display:grid;gap:.4rem}
.nx-pricing li::before{content:"✓";margin-inline-end:.5rem;color:var(--secondary)}
.nx-stars{color:#fbbf24;letter-spacing:2px}
.nx-card blockquote{margin-block:.6rem}
.nx-card figcaption span{color:var(--muted);font-size:.9rem}
.nx-faq{border:1px solid var(--line);border-radius:var(--radius);padding:1rem 1.2rem;margin-block-end:.7rem;background:color-mix(in srgb,var(--surface) 70%,transparent)}
.nx-faq summary{cursor:pointer;font-weight:600}
.nx-faq p{color:var(--muted);margin-block-start:.6rem}
.nx-form{display:grid;gap:1rem}
.nx-form label{display:grid;gap:.35rem;font-size:.92rem;color:var(--muted)}
.nx-form input,.nx-form textarea{font:inherit;color:var(--text);background:color-mix(in srgb,var(--bg) 60%,transparent);border:1px solid var(--line);border-radius:calc(var(--radius) * .6);padding:.7rem .9rem}
.nx-ok{color:var(--secondary)}
.nx-gal{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:1rem}
.nx-tile{position:relative;aspect-ratio:4/3;border-radius:var(--radius);overflow:hidden;border:1px solid var(--line);
  background:linear-gradient(135deg,var(--primary),var(--secondary));filter:hue-rotate(calc(var(--n,0) * 28deg))}
.nx-tile img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
.nx-gal figure{margin:0}
.nx-gal figcaption{position:absolute;inset-inline:0;inset-block-end:0;padding:.7rem 1rem;background:linear-gradient(transparent,rgba(0,0,0,.65));color:#fff;font-size:.92rem}
.nx-prod .nx-tile{margin-block-end:.8rem}
.nx-prod .nx-badge{position:absolute;inset-block-start:.6rem;inset-inline-start:.6rem;color:#fff;background:rgba(0,0,0,.45)}
.nx-stats{text-align:center}
.nx-stat strong{display:block;font-size:clamp(2rem,5vw,3rem);background:linear-gradient(135deg,var(--primary),var(--secondary));-webkit-background-clip:text;background-clip:text;color:transparent}
.nx-stat span{color:var(--muted)}
.nx-tl{list-style:none;padding:0;border-inline-start:2px solid var(--line);margin-inline-start:.5rem}
.nx-tl li{padding-inline-start:1.5rem;padding-block-end:1.8rem;position:relative}
.nx-tl li::before{content:"";position:absolute;inset-inline-start:-.43rem;top:.45rem;width:.8rem;height:.8rem;border-radius:50%;background:var(--primary);box-shadow:0 0 14px var(--primary)}
.nx-tl time{color:var(--secondary);font-size:.85rem}
.nx-member{text-align:center}
.nx-avatar{width:5.5rem;height:5.5rem;border-radius:50%;margin:0 auto 1rem;overflow:hidden;background:linear-gradient(135deg,var(--primary),var(--secondary));filter:hue-rotate(calc(var(--n,0) * 35deg))}
.nx-avatar img{width:100%;height:100%;object-fit:cover}
.nx-cta-in{text-align:center;padding:clamp(2rem,6vw,4rem) 1rem;border-radius:calc(var(--radius) * 1.6);border:1px solid var(--line);background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 25%,transparent),color-mix(in srgb,var(--secondary) 18%,transparent))}
.nx-foot{display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between;color:var(--muted);font-size:.92rem}
.nx-foot-links{display:flex;gap:1rem;flex-wrap:wrap}
.nx-foot-links a:hover{color:var(--text)}
footer.nx-sec,.nx-footer{padding-block:2rem;border-block-start:1px solid var(--line)}

/* ===== تأثيرات Hover (تُختار لكل قسم) ===== */
.hv-lift .nx-card:hover{transform:translateY(-6px)}
.hv-glow .nx-card:hover{box-shadow:0 0 36px color-mix(in srgb,var(--primary) 45%,transparent);border-color:var(--primary)}
.hv-scale .nx-card:hover,.hv-scale .nx-tile:hover{transform:scale(1.04)}

/* ===== حركات الظهور عند التمرير (تعمل فقط إذا فعّل script.js الصنف nx-anim) ===== */
html.nx-anim [data-anim]{opacity:0;transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1),filter .7s}
html.nx-anim [data-anim="fade-up"]{transform:translateY(28px)}
html.nx-anim [data-anim="scale"]{transform:scale(.94)}
html.nx-anim [data-anim="blur"]{filter:blur(12px)}
html.nx-anim [data-anim].is-in{opacity:1;transform:none;filter:none}

/* ===== الاستجابة للشاشات الصغيرة ===== */
@media (max-width:760px){
  .nx-burger{display:block}
  .nx-links,.nx-nav-end .nx-btn{display:none}
  .nx-nav[data-open] .nx-links{display:grid;position:absolute;inset-inline:0;top:100%;padding:1rem;gap:.8rem;background:var(--bg);border-block-end:1px solid var(--line);margin:0}
  .nx-nav-end{margin-inline-start:auto}
  .nx-burger{margin-inline-start:0}
}
/* ===== احترام تفضيل تقليل الحركة ===== */
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  html.nx-anim [data-anim]{opacity:1;transform:none;filter:none;transition:none}
  *{animation:none!important}
}
`;

  css += premiumCSS(site);

  // أنماط مخصصة لكل قسم (من لوحة Properties)
  const rules = [];
  const all = [...site.pages.flatMap((p) => p.sections), site.layout?.navbar, site.layout?.footer].filter(Boolean);
  for (const s of all) {
    const st = s.style || {};
    const d = [];
    if (st.fontFamily) d.push(`font-family:${st.fontFamily}`);
    if (st.fontSize) d.push(`font-size:${st.fontSize}`);
    if (st.width) d.push(`width:${st.width};margin-inline:auto`);
    if (st.height) d.push(`min-height:${st.height}`);
    if (st.margin) d.push(`margin:${st.margin}`);
    if (st.padding) d.push(`padding:${st.padding}`);
    if (st.border) d.push(`border:${st.border}`);
    if (st.borderRadius) d.push(`border-radius:${st.borderRadius}`);
    if (st.boxShadow) d.push(`box-shadow:${st.boxShadow}`);
    if (st.color) d.push(`color:${st.color}`);
    if (st.gradient) d.push(`background:linear-gradient(${st.gradient.angle}deg,${st.gradient.from},${st.gradient.to})`);
    else if (st.background) d.push(`background:${st.background}`);
    if (st.position) d.push(`position:${st.position}` + (st.position === 'sticky' ? ';top:0;z-index:40' : ''));
    if (d.length) rules.push(`.nx-sec.nx-s-${s.id}{${d.join(';')}}`);
  }
  if (rules.length) css += `\n/* ===== أنماط الأقسام المخصصة ===== */\n${rules.join('\n')}\n`;
  if (site.settings.customCSS) css += `\n/* ===== CSS مخصص من المستخدم ===== */\n${site.settings.customCSS}\n`;
  return css;
}
