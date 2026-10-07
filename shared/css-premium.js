// ============================================================
// التصميم الفاخر: Mesh متحرك، Hero متوهج، حدود متدرجة للبطاقات، Spotlight،
// نافذة عرض عائمة، أزرار لامعة، وأنماط مختلفة لكل أسلوب (gaming / luxury / ...).
// كل الحركات تعتمد transform/opacity فقط وتتوقف عند تفضيل تقليل الحركة.
// ============================================================
export function premiumCSS(site) {
  return `
/* ===== تصحيحات هيكلية: الـ Navbar الثابت لا يأخذ مسافات الأقسام ===== */
.nx-navbar{position:sticky;top:0;z-index:60;padding:0}
.nx-nav{position:relative;top:auto;transition:background .3s,box-shadow .3s}
.nx-nav.is-scrolled{box-shadow:0 10px 40px rgba(0,0,0,.28);background:color-mix(in srgb,var(--bg) 88%,transparent)}
.nx-nav::after{content:"";position:absolute;inset-inline:0;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent,var(--primary),var(--secondary),transparent);opacity:.55}
.nx-theme{width:2.3rem;height:2.3rem;border-radius:50%;border:1px solid var(--line);background:color-mix(in srgb,var(--surface) 70%,transparent);color:var(--text);cursor:pointer;font-size:1rem;transition:transform .3s,background .3s}
.nx-theme:hover{transform:rotate(25deg) scale(1.08);background:color-mix(in srgb,var(--primary) 25%,transparent)}
.nx-progress{position:fixed;top:0;inset-inline-start:0;height:3px;width:100%;z-index:100;transform-origin:left;transform:scaleX(0);background:linear-gradient(90deg,var(--primary),var(--secondary));box-shadow:0 0 12px var(--primary)}
[dir=rtl] .nx-progress{transform-origin:right}

/* ===== خلفية Mesh حية + شبكة ناعمة ===== */
body::before{background:
  radial-gradient(55% 45% at 12% 0%,color-mix(in srgb,var(--primary) 34%,transparent),transparent 70%),
  radial-gradient(45% 40% at 92% 14%,color-mix(in srgb,var(--secondary) 28%,transparent),transparent 70%),
  radial-gradient(40% 40% at 50% 100%,color-mix(in srgb,var(--primary) 16%,transparent),transparent 70%);
  background-size:130% 130%;animation:nx-mesh 28s ease-in-out infinite alternate}
body::after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.55;
  background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:56px 56px;
  -webkit-mask-image:radial-gradient(ellipse at 50% 0%,#000 15%,transparent 70%);mask-image:radial-gradient(ellipse at 50% 0%,#000 15%,transparent 70%)}
@keyframes nx-mesh{to{background-position:100% 60%,0 40%,50% 0}}
@keyframes nx-rot{to{rotate:360deg}}
@keyframes nx-float{50%{translate:0 -12px}}
@keyframes nx-pulse{50%{opacity:.35;scale:.7}}
@keyframes nx-shimmer{to{background-position:200% 0}}
@keyframes nx-flow{to{background-position:0 0,300% 300%}}

/* ===== Hero ===== */
.nx-hero{position:relative;isolation:isolate;overflow:hidden;padding-block:clamp(4.5rem,13vw,9.5rem) clamp(3rem,8vw,6rem)}
.nx-hero::before{content:"";position:absolute;z-index:-1;width:62vmax;height:62vmax;left:50%;top:-30vmax;translate:-50% 0;border-radius:50%;
  background:conic-gradient(from 90deg,var(--primary),var(--secondary),transparent 60%,var(--primary));filter:blur(110px);opacity:.3;animation:nx-rot 36s linear infinite}
.nx-hero::after{content:"";position:absolute;z-index:-1;inset:0;pointer-events:none;
  background:radial-gradient(circle at 14% 72%,color-mix(in srgb,var(--secondary) 30%,transparent) 0 5rem,transparent 5.1rem),radial-gradient(circle at 88% 30%,color-mix(in srgb,var(--primary) 34%,transparent) 0 3.5rem,transparent 3.6rem);filter:blur(30px);animation:nx-float 9s ease-in-out infinite}
.nx-h1{background:linear-gradient(180deg,var(--text) 35%,color-mix(in srgb,var(--primary) 65%,var(--text)));-webkit-background-clip:text;background-clip:text;color:transparent;text-wrap:balance;filter:drop-shadow(0 0 40px color-mix(in srgb,var(--primary) 30%,transparent))}
.nx-lead{text-wrap:pretty}
.nx-badge{display:inline-flex;align-items:center;backdrop-filter:blur(8px)}
.nx-badge::before{content:"";width:.45rem;height:.45rem;border-radius:50%;background:var(--secondary);margin-inline-end:.55rem;box-shadow:0 0 10px var(--secondary);animation:nx-pulse 2s ease-in-out infinite}
.nx-showcase{width:min(880px,100%);margin-block-start:2.6rem;border-radius:calc(var(--radius) * 1.5);border:1px solid var(--line);overflow:hidden;
  background:color-mix(in srgb,var(--surface) 62%,transparent);backdrop-filter:blur(16px);box-shadow:0 50px 120px -30px color-mix(in srgb,var(--primary) 55%,transparent),inset 0 1px 0 rgba(255,255,255,.08);
  transform:perspective(1400px) rotateX(7deg);transform-origin:50% 100%;animation:nx-float 8s ease-in-out infinite}
.nx-sc-bar{display:flex;gap:.4rem;padding:.7rem .9rem;border-block-end:1px solid var(--line)}
.nx-sc-bar i{width:.6rem;height:.6rem;border-radius:50%;background:color-mix(in srgb,var(--text) 22%,transparent)}
.nx-sc-body{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;padding:1.1rem}
.nx-sc-body b{height:5.5rem;border-radius:calc(var(--radius) * .7);background:linear-gradient(110deg,color-mix(in srgb,var(--primary) 30%,transparent) 30%,color-mix(in srgb,var(--secondary) 38%,transparent) 50%,color-mix(in srgb,var(--primary) 30%,transparent) 70%);background-size:220% 100%;animation:nx-shimmer 4.5s linear infinite;border:1px solid var(--line)}
.nx-sc-body b:nth-child(2){animation-delay:-1.5s}.nx-sc-body b:nth-child(3){animation-delay:-3s}
.nx-sc-body span{grid-column:1/-1;height:.9rem;border-radius:6px;background:color-mix(in srgb,var(--text) 14%,transparent);width:60%}

/* ===== العناوين والأقسام ===== */
.nx-title{text-wrap:balance}
.nx-title::after{content:"";display:block;width:3.6rem;height:3px;border-radius:3px;margin:.9rem auto 0;background:linear-gradient(90deg,var(--primary),var(--secondary));box-shadow:0 0 18px var(--primary)}
.nx-sec:not(.nx-hero):not(.nx-navbar):not(.nx-footer):not(.nx-cta){position:relative}

/* ===== الأزرار ===== */
.nx-btn{position:relative;overflow:hidden;isolation:isolate;box-shadow:0 10px 34px -8px color-mix(in srgb,var(--primary) 70%,transparent),inset 0 1px 0 rgba(255,255,255,.28)}
.nx-btn::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.4) 50%,transparent 70%);transform:translateX(-130%)}
.nx-btn:hover::after{transform:translateX(130%);transition:transform .9s}
.nx-btn.ghost{backdrop-filter:blur(8px);box-shadow:none}.nx-btn.ghost:hover{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 14%,transparent)}

/* ===== البطاقات: حد متدرج + Spotlight ===== */
.nx-card{overflow:hidden;isolation:isolate;box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 20px 50px -25px rgba(0,0,0,.5)}
.nx-card::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;opacity:.55;transition:opacity .4s;
  background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 75%,transparent),transparent 35%,transparent 65%,color-mix(in srgb,var(--secondary) 65%,transparent));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.nx-card::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:0;transition:opacity .4s;
  background:radial-gradient(420px circle at var(--mx,50%) var(--my,0%),color-mix(in srgb,var(--primary) 24%,transparent),transparent 62%)}
.nx-card:hover::before,.nx-card:hover::after{opacity:1}
.nx-icon{box-shadow:0 12px 30px -6px color-mix(in srgb,var(--primary) 70%,transparent),inset 0 1px 0 rgba(255,255,255,.3);font-weight:700}
.nx-pricing .is-hl{border:1px solid transparent;background:linear-gradient(var(--surface),var(--surface)) padding-box,linear-gradient(135deg,var(--primary),var(--secondary),var(--primary)) border-box;background-size:auto,300% 300%;animation:nx-flow 7s linear infinite}
.nx-pricing .is-hl::before{display:none}
.nx-price{background:linear-gradient(135deg,var(--text),color-mix(in srgb,var(--primary) 70%,var(--text)));-webkit-background-clip:text;background-clip:text;color:transparent}
.nx-price small{-webkit-text-fill-color:var(--muted)}
.nx-faq{transition:border-color .3s,box-shadow .3s;backdrop-filter:blur(8px)}
.nx-faq[open]{border-color:var(--primary);box-shadow:0 12px 40px -18px var(--primary)}
.nx-faq summary{list-style:none;display:flex;justify-content:space-between;gap:1rem}.nx-faq summary::-webkit-details-marker{display:none}
.nx-faq summary::after{content:"+";font-size:1.4rem;line-height:1;color:var(--secondary);transition:transform .3s}.nx-faq[open] summary::after{transform:rotate(45deg)}
.nx-stat strong{background:linear-gradient(110deg,var(--primary),var(--secondary),var(--primary));background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:nx-shimmer 6s linear infinite;font-variant-numeric:tabular-nums}
.nx-tile{transition:transform .5s cubic-bezier(.2,.7,.2,1),box-shadow .5s;box-shadow:0 20px 50px -26px rgba(0,0,0,.6)}
.nx-tile::before{content:"";position:absolute;inset:0;z-index:1;opacity:.35;background:radial-gradient(rgba(255,255,255,.35) 1px,transparent 1.5px) 0 0/16px 16px;mix-blend-mode:overlay;pointer-events:none}
.nx-tile:hover{transform:translateY(-8px) scale(1.02);box-shadow:0 36px 70px -24px color-mix(in srgb,var(--primary) 60%,transparent)}
.nx-tile img{transition:transform .8s}.nx-tile:hover img{transform:scale(1.08)}
.nx-gal figcaption{z-index:2;transform:translateY(30%);opacity:0;transition:all .4s}.nx-tile:hover figcaption{transform:none;opacity:1}
.nx-tl{border-image:linear-gradient(var(--primary),var(--secondary)) 1}
.nx-cta-in{position:relative;overflow:hidden;isolation:isolate;border-color:color-mix(in srgb,var(--primary) 45%,transparent)}
.nx-cta-in::before{content:"";position:absolute;z-index:-1;width:60%;aspect-ratio:1;inset-inline-end:-15%;top:-60%;border-radius:50%;background:var(--secondary);filter:blur(90px);opacity:.35;animation:nx-float 9s ease-in-out infinite}
.nx-footer,footer.nx-sec{position:relative}
footer.nx-sec::before{content:"";position:absolute;inset-inline:10%;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--primary),var(--secondary),transparent)}

/* ===== Micro-interactions (تُختار لكل قسم من لوحة الخصائص) ===== */
.mi-float .nx-card{animation:nx-float 7s ease-in-out infinite}.mi-float .nx-card:nth-child(2n){animation-delay:-3s}
.mi-tilt .nx-card,.mi-tilt .nx-tile{transition:transform .2s ease-out;will-change:transform}
.mi-magnetic .nx-btn{transition:transform .25s cubic-bezier(.2,.7,.2,1)}

/* ===== أنماط حسب الأسلوب ===== */
body[data-style="gaming"] .nx-btn{border-radius:0;clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);text-transform:uppercase;letter-spacing:.08em;font-weight:800}
body[data-style="gaming"] .nx-h1,body[data-style="gaming"] .nx-title{text-transform:uppercase;letter-spacing:.02em}
body[data-style="gaming"] .nx-card{border-color:color-mix(in srgb,var(--primary) 55%,transparent);box-shadow:0 0 28px -8px color-mix(in srgb,var(--primary) 70%,transparent)}
body[data-style="gaming"] .nx-hero::before{opacity:.45}
body[data-style="futuristic"] body::after,body[data-style="futuristic"]::after{opacity:.9}
body[data-style="futuristic"] .nx-card{backdrop-filter:blur(18px);border-color:color-mix(in srgb,var(--secondary) 40%,transparent)}
body[data-style="futuristic"] .nx-badge,body[data-style="futuristic"] .nx-title{letter-spacing:.06em}
body[data-style="luxury"] .nx-h1,body[data-style="luxury"] .nx-title{font-weight:500;letter-spacing:.01em}
body[data-style="luxury"] .nx-btn{letter-spacing:.14em;text-transform:uppercase;font-size:.82rem;border-radius:2px}
body[data-style="luxury"] .nx-card{border-radius:2px;box-shadow:none;background:transparent}
body[data-style="luxury"] .nx-sec{padding-block:clamp(4rem,10vw,8rem)}
body[data-style="minimal"] body::after,body[data-style="minimal"]::after{display:none}
body[data-style="minimal"] .nx-hero::before,body[data-style="minimal"] .nx-hero::after{display:none}
body[data-style="minimal"] .nx-card{box-shadow:none}
body[data-style="creative"] .nx-card:nth-child(odd):hover{transform:rotate(-1.2deg) translateY(-6px)}
body[data-style="creative"] .nx-card:nth-child(even):hover{transform:rotate(1.2deg) translateY(-6px)}
body[data-style="creative"] .nx-btn{border-radius:999px}
body[data-style="corporate"] .nx-card{box-shadow:0 8px 24px -14px rgba(0,0,0,.35)}
body[data-style="corporate"] .nx-hero::after{display:none}

/* ===== تقليل الحركة ===== */
@media (prefers-reduced-motion:reduce){body::before,.nx-hero::before,.nx-hero::after,.nx-showcase,.nx-sc-body b,.nx-badge::before,.nx-stat strong,.nx-pricing .is-hl,.nx-cta-in::before,.mi-float .nx-card{animation:none!important}}
@media (max-width:760px){.nx-showcase{transform:none}.nx-sc-body{grid-template-columns:1fr 1fr}.nx-sc-body b:nth-child(3){display:none}}
`;
}
