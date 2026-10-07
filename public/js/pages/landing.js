// الصفحة الرئيسية: 15 قسمًا بالترتيب المطلوب
import { t, getLang } from '../i18n.js';
import { esc, $, $$, state, api } from '../core.js';
import { motion } from '../fx.js';
import { templateCard, bindTemplateCards } from './templates.js';

const s = (k, v) => esc(t(k, v));
const TYPES = ['store', 'portfolio', 'business', 'landing', 'blog', 'restaurant', 'gaming', 'agency', 'personal', 'saas', 'other'];
const TYPE_ICON = { store: '🛒', portfolio: '🎨', business: '🏢', landing: '📄', blog: '✍️', restaurant: '🍽️', gaming: '🎮', agency: '🚀', personal: '👤', saas: '⚡', other: '＋' };

export function pricingCards() {
  const li = (p, n) => Array.from({ length: n }, (_, i) => `<li>${s(`pricing.${p}F${i + 1}`)}</li>`).join('');
  return `<div class="price-grid">
    <article class="card price" data-tilt data-reveal><span class="pill">${s('pricing.trialBadge')}</span><h3>${s('pricing.trialName')}</h3><div class="amount">$0<small>${s('pricing.trialNote')}</small></div><ul class="ticks">${li('trial', 6)}</ul><a class="btn btn-primary" data-magnetic href="#/signup">${s('pricing.startTrial')}</a></article>
    <article class="card price hl" data-tilt data-reveal style="--d:.1s"><span class="pill alt">${s('pricing.afterTrial')}</span><h3>${s('pricing.siteName')}</h3><div class="amount">$${state.config.priceUsd}<small>${esc(t('tools.note_' + (state.config.pricing?.model || 'once') + '_' + (state.config.pricing?.scope || 'website')))}</small></div><ul class="ticks">${li('site', 6)}</ul><a class="btn btn-ghost" data-magnetic href="#/signup">${s('pricing.getWebsite')}</a></article>
  </div>`;
}

export function demoHTML(size = '') {
  return `<div class="demo ${size}" data-demo>
    <ol class="demo-steps" aria-label="${s('landing.demoAria')}"><li data-s>${s('landing.demoStep1')}</li><li data-s>${s('landing.demoStep2')}</li><li data-s>${s('landing.demoStep3')}</li></ol>
    <div class="demo-body">
      <div class="demo-prompt glass"><small>${s('landing.demoPromptLabel')}</small><p><span class="typed"></span><i class="caret"></i></p><div class="bar-shimmer"></div></div>
      <div class="demo-browser glass" data-parallax="0">
        <div class="chrome"><i></i><i></i><i></i><span class="url">yourname.nexora.app</span></div>
        <div class="canvas"><div class="mk m-nav"><b></b><u></u><u></u><u></u></div><div class="mk m-hero"><em></em><em></em><span></span></div><div class="mk m-row"><b></b><b></b><b></b></div><div class="mk m-foot"></div></div>
        <div class="ready-tag">✓ ${s('landing.demoReady')}</div>
      </div>
    </div></div>`;
}

export function runDemo(el) {
  const typed = $('.typed', el), steps = $$('[data-s]', el), blocks = $$('.mk', el);
  const prompt = t('landing.demoPrompt');
  let alive = true, visible = true;
  const timers = [];
  const wait = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)));
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.2 });
  io.observe(el);
  (async function cycle() {
    while (alive) {
      while (!visible && alive) await wait(300);
      blocks.forEach((b) => b.classList.remove('on')); steps.forEach((x) => x.className = ''); typed.textContent = ''; el.classList.remove('done', 'thinking');
      if (motion.reduced) {
        typed.textContent = prompt; blocks.forEach((b) => b.classList.add('on')); steps.forEach((x) => x.classList.add('done')); el.classList.add('done');
        await wait(2500); continue;
      }
      steps[0].classList.add('active');
      for (let i = 1; i <= prompt.length && alive; i++) { typed.textContent = prompt.slice(0, i); await wait(26); }
      await wait(350);
      steps[0].className = 'done'; steps[1].className = 'active'; el.classList.add('thinking');
      await wait(1500);
      el.classList.remove('thinking'); steps[1].className = 'done'; steps[2].className = 'active';
      for (const b of blocks) { b.classList.add('on'); await wait(420); }
      steps[2].className = 'done'; el.classList.add('done');
      await wait(3600);
    }
  })();
  return () => { alive = false; timers.forEach(clearTimeout); io.disconnect(); };
}

const CODE = {
  'index.html': `<!-- هذا القسم مسؤول عن عرض الـ Hero الرئيسي -->\n<section class="nx-sec nx-hero" id="hero" data-anim="blur">\n  <div class="nx-wrap nx-hero-in">\n    <h1 class="nx-h1">Build Your Website.</h1>\n    <a class="nx-btn" href="contact.html">Get started</a>\n  </div>\n</section>`,
  'style.css': `/* لون الخلفية الرئيسي للموقع */\n:root{\n  --bg:#070816;\n  --primary:#7c3aed;   /* اللون الأساسي للأزرار */\n  --secondary:#3b82f6; /* اللون الثانوي للتدرجات */\n}\n/* استدارة الحواف تعمل مع RTL و LTR */\n.nx-card{padding-inline-start:1.5rem}`,
  'script.js': `// هذا الكود مسؤول عن تشغيل Animation عند ظهور العنصر\nvar io = new IntersectionObserver(function (entries) {\n  entries.forEach(function (e) {\n    if (e.isIntersecting) e.target.classList.add('is-in');\n  });\n});\ndocument.querySelectorAll('[data-anim]').forEach(function (el) { io.observe(el); });`
};

const FAQ = [1, 2, 3, 4, 5];
const FEATS = [['✦', 1], ['⇄', 2], ['◈', 3], ['</>', 4], ['⬡', 5], ['⚡', 6]];

export default {
  title: 'common.pageTitle',
  render() {
    return `
<section class="hero" id="top"><div class="container hero-grid">
  <div class="hero-copy">
    <span class="pill" data-reveal>${s('landing.heroBadge')}</span>
    <h1 class="display" data-split>${s('landing.heroTitle1')}<br>${s('landing.heroTitle2')}</h1>
    <p class="lead" data-reveal style="--d:.25s">${s('landing.heroSub')}</p>
    <div class="cta-row" data-reveal style="--d:.35s"><a class="btn btn-primary btn-lg" data-magnetic href="#/generator">${s('common.createMyWebsite')}</a><a class="btn btn-ghost btn-lg" data-magnetic href="#/templates">${s('common.exploreTemplates')}</a></div>
    <p class="muted small" data-reveal style="--d:.45s">${s('landing.heroNote', { days: state.config.trialDays })}</p>
  </div>
  <div class="hero-visual" data-reveal style="--d:.2s">${demoHTML('compact')}</div>
</div></section>

<section class="sec" id="demo"><div class="container">
  <header class="sec-head" data-reveal><h2>${s('landing.demoTitle')}</h2><p class="muted">${s('landing.demoText')}</p></header>
  <div data-reveal>${demoHTML('large')}</div>
</div></section>

<section class="sec" id="how"><div class="container">
  <header class="sec-head" data-reveal><h2>${s('landing.howTitle')}</h2></header>
  <ol class="steps">${[1, 2, 3].map((n) => `<li class="step card" data-tilt data-reveal style="--d:${n * 0.12}s"><span class="step-n">0${n}</span><h3>${s(`landing.how${n}t`)}</h3><p class="muted">${s(`landing.how${n}d`)}</p></li>`).join('')}</ol>
</div></section>

<section class="sec" id="types"><div class="container">
  <header class="sec-head" data-reveal><h2>${s('landing.typesTitle')}</h2><p class="muted">${s('landing.typesSub')}</p></header>
  <div class="type-grid">${TYPES.map((k, i) => `<a class="type-chip card" data-reveal style="--d:${i * 0.04}s" href="#/generator?type=${k}"><span aria-hidden="true">${TYPE_ICON[k]}</span>${s(`generator.type_${k}`)}</a>`).join('')}</div>
</div></section>

<section class="sec" id="templates"><div class="container">
  <header class="sec-head" data-reveal><h2>${s('landing.tplTitle')}</h2><p class="muted">${s('landing.tplSub')}</p></header>
  <div class="tpl-grid" id="landing-tpls"><p class="muted">${s('common.loading')}</p></div>
  <p class="center" data-reveal><a class="btn btn-ghost" data-magnetic href="#/templates">${s('landing.tplAll')}</a></p>
</div></section>

<section class="sec" id="editor"><div class="container">
  <header class="sec-head" data-reveal><h2>${s('landing.editorTitle')}</h2><p class="muted">${s('landing.editorSub')}</p></header>
  <div class="ed-mock glass" data-reveal aria-hidden="true">
    <aside><b>${s('editor.tab_pages')}</b><i class="on"></i><i></i><i></i><b>${s('editor.tab_sections')}</b><i></i><i class="sel"></i><i></i></aside>
    <div class="ed-canvas"><div class="mk-line w40"></div><div class="mk-hero"><em></em><em></em><span></span></div><div class="mk-cards"><i></i><i class="selbox"></i><i></i></div></div>
    <aside class="props"><b>${s('editor.properties')}</b><label>${s('editor.p_padding')}<span class="range"><i style="width:60%"></i></span></label><label>${s('editor.p_radius')}<span class="range"><i style="width:35%"></i></span></label><label>${s('editor.p_background')}<span class="swatches"><i></i><i></i><i></i></span></label></aside>
  </div>
</div></section>

<section class="sec" id="features"><div class="container">
  <header class="sec-head" data-reveal><h2>${s('landing.featTitle')}</h2></header>
  <div class="feat-grid">${FEATS.map(([ic, n], i) => `<article class="card feat" data-tilt data-reveal style="--d:${i * 0.07}s"><span class="ico" aria-hidden="true">${ic}</span><h3>${s(`landing.f${n}t`)}</h3><p class="muted">${s(`landing.f${n}d`)}</p></article>`).join('')}</div>
</div></section>

<section class="sec" id="ai"><div class="container two">
  <div data-reveal><h2>${s('landing.aiTitle')}</h2><p class="muted">${s('landing.aiSub')}</p></div>
  <div class="chat glass" data-reveal aria-hidden="true">
    <p class="u">${s('landing.aiMsg1')}</p><p class="b">${s('landing.aiReply1')}</p>
    <p class="u">${s('landing.aiMsg2')}</p><p class="b">${s('landing.aiReply2')}</p>
    <div class="chat-in"><span>${s('landing.aiMsg3')}</span><b class="btn btn-primary btn-sm">${s('editor.askAI')}</b></div>
  </div>
</div></section>

<section class="sec" id="export"><div class="container two">
  <div data-reveal><h2>${s('landing.codeTitle')}</h2><p class="muted">${s('landing.codeSub')}</p><ul class="ticks"><li>${s('landing.codeB1')}</li><li>${s('landing.codeB2')}</li><li>${s('landing.codeB3')}</li></ul></div>
  <div class="code glass" data-reveal>
    <div class="tabs" role="tablist">${Object.keys(CODE).map((f, i) => `<button class="${i ? '' : 'on'}" role="tab" data-file="${f}">${f}</button>`).join('')}</div>
    <pre dir="ltr"><code id="code-view">${esc(CODE['index.html'])}</code></pre>
  </div>
</div></section>

<section class="sec" id="domain"><div class="container two">
  <div data-reveal><h2>${s('landing.domTitle')}</h2><p class="muted">${s('landing.domSub')}</p>
    <label class="field"><span>${s('landing.domLabel')}</span><input id="dom-in" dir="ltr" placeholder="example.com" autocomplete="off" spellcheck="false"></label>
    <p class="pill alt" dir="ltr">username.${esc(state.config.platformDomain)}</p></div>
  <ol class="dom-steps card" data-reveal>
    <li><b>${s('landing.domStep1t')}</b><span class="muted">${s('landing.domStep1d')}</span></li>
    <li><b>${s('landing.domStep2t')}</b><code dir="ltr" id="dom-dns">CNAME  example.com → cname.${esc(state.config.platformDomain)}</code></li>
    <li><b>${s('landing.domStep3t')}</b><span class="muted">${s('landing.domStep3d')}</span></li>
  </ol>
</div></section>

<section class="sec" id="pricing"><div class="container">
  <header class="sec-head" data-reveal><h2>${s('pricing.title')}</h2><p class="muted">${s('pricing.sub')}</p></header>
  ${pricingCards()}
</div></section>

<section class="sec" id="faq"><div class="container narrow">
  <header class="sec-head" data-reveal><h2>${s('landing.faqTitle')}</h2></header>
  ${FAQ.map((n) => `<details class="faq card" data-reveal><summary>${s(`landing.faq${n}q`)}</summary><p class="muted">${s(`landing.faq${n}a`)}</p></details>`).join('')}
</div></section>

<section class="sec"><div class="container"><div class="final glass" data-reveal>
  <h2>${s('landing.ctaTitle')}</h2><p class="muted">${s('landing.ctaSub')}</p>
  <a class="btn btn-primary btn-lg" data-magnetic href="#/generator">${s('common.createMyWebsite')}</a>
</div></div></section>`;
  },
  async mount(root) {
    const stops = $$('[data-demo]', root).map(runDemo);
    const tabs = $$('.tabs button', root), view = $('#code-view', root);
    tabs.forEach((b) => b.addEventListener('click', () => { tabs.forEach((x) => x.classList.toggle('on', x === b)); view.textContent = CODE[b.dataset.file]; }));
    $('#dom-in', root).addEventListener('input', (e) => {
      const v = e.target.value.trim().toLowerCase().replace(/[^a-z0-9.-]/g, '') || 'example.com';
      $('#dom-dns', root).textContent = `CNAME  ${v} → cname.${state.config.platformDomain}`;
    });
    const rerun = () => {};
    try {
      const { templates } = await api('GET', '/api/templates');
      const box = $('#landing-tpls', root);
      box.innerHTML = [templates[2], templates[4], templates[6], templates[10]].filter(Boolean).map((tp, i) => templateCard(tp, i)).join('');
      bindTemplateCards(box, { preview: true });
    } catch { /* القوالب اختيارية في هذه الصفحة */ }
    return () => { stops.forEach((f) => f()); rerun(); };
  }
};
