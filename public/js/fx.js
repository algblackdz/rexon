// ============================================================
// المؤثرات: Custom Cursor، جسيمات الخلفية، Reveal، Tilt، Parallax، Magnetic
// كلها خفيفة (rAF + transform فقط) وتتوقف عند "تقليل الحركة" أو عند إخفاء التبويب.
// ============================================================
const fine = matchMedia('(pointer:fine)').matches;
export const motion = { reduced: false };

export function initMotion() {
  const saved = localStorage.getItem('nx_motion');
  motion.reduced = saved ? saved === 'reduced' : matchMedia('(prefers-reduced-motion: reduce)').matches;
  applyMotion();
}
export function setReduced(v) {
  motion.reduced = v;
  localStorage.setItem('nx_motion', v ? 'reduced' : 'full');
  applyMotion();
  window.dispatchEvent(new CustomEvent('nx:motion'));
}
function applyMotion() {
  const r = document.documentElement;
  r.dataset.motion = motion.reduced ? 'reduced' : 'full';
  // الـ cursor المخصص فقط مع الماوس الحقيقي؛ غير ذلك نترك المؤشر العادي
  r.classList.toggle('custom-cursor', fine && !motion.reduced);
}

// ----- Custom Cursor: نقطة تتبع الماوس + دائرة أكبر خلفها + Glow + حالات حسب العنصر -----
export function initCursor() {
  if (!fine) return;
  const dot = document.getElementById('cur-dot'), ring = document.getElementById('cur-ring');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, seen = false;
  const STATES = [['is-text', 'input,textarea,select'], ['is-btn', 'a,button,[role=button],.btn,summary,label[for]'], ['is-card', '.card,[data-cursor=card]'], ['is-img', 'img'], ['is-drag', '[draggable=true]']];
  const clear = () => STATES.forEach(([c]) => ring.classList.remove(c));
  document.addEventListener('mousemove', (e) => {
    x = e.clientX; y = e.clientY;
    if (!seen) { seen = true; rx = x; ry = y; document.documentElement.classList.add('cursor-live'); }
    const m = e.target.closest?.('[data-magnetic]');
    document.querySelectorAll('[data-magnetic].mag').forEach((el) => { if (el !== m) { el.style.transform = ''; el.classList.remove('mag'); } });
    if (m && !motion.reduced) {
      const b = m.getBoundingClientRect();
      m.classList.add('mag');
      m.style.transform = `translate(${(x - (b.left + b.width / 2)) * 0.22}px, ${(y - (b.top + b.height / 2)) * 0.3}px)`;
    }
  }, { passive: true });
  document.addEventListener('mouseover', (e) => {
    clear();
    for (const [c, sel] of STATES) if (e.target.closest?.(sel)) { ring.classList.add(c); break; }
  });
  document.addEventListener('mousedown', () => ring.classList.add('is-down'));
  document.addEventListener('mouseup', () => ring.classList.remove('is-down'));
  document.addEventListener('mouseleave', () => document.documentElement.classList.remove('cursor-live'));
  document.addEventListener('mouseenter', () => seen && document.documentElement.classList.add('cursor-live'));
  (function loop() {
    if (!motion.reduced) {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      dot.style.transform = `translate3d(${x}px,${y}px,0)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    }
    requestAnimationFrame(loop);
  })();
}

// ----- جسيمات خلفية خفيفة (عددها قليل عمدًا) -----
export function initAmbient() {
  const cv = document.getElementById('ambient'), ctx = cv.getContext('2d');
  let w, h, pts = [], last = 0;
  const resize = () => { w = cv.width = innerWidth; h = cv.height = innerHeight; pts = Array.from({ length: Math.min(46, Math.floor(w / 32)) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.4 + 0.4, vx: (Math.random() - 0.5) * 0.15, vy: -Math.random() * 0.2 - 0.03, c: Math.random() > 0.5 ? '167,139,250' : '56,189,248' })); };
  resize(); addEventListener('resize', resize);
  (function frame(ts) {
    requestAnimationFrame(frame);
    if (motion.reduced || document.hidden || ts - last < 33) return;
    last = ts;
    ctx.clearRect(0, 0, w, h);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
      ctx.fillStyle = `rgba(${p.c},.5)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
  })(0);
}

// ----- Reveal / Text split / Tilt / Parallax: تُربط بعد كل عرض صفحة -----
export function bindFx(root) {
  const cleanups = [];
  // تقسيم العنوان إلى كلمات تظهر بتأثير Blur-to-focus
  root.querySelectorAll('[data-split]').forEach((el) => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    let i = 0;
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok.trim()) { frag.append(tok); return; }
          const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = tok; frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
    walk(el);
  });
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  root.querySelectorAll('[data-reveal],[data-split]').forEach((el) => io.observe(el));
  cleanups.push(() => io.disconnect());

  // Card tilt
  const onMove = (e) => {
    if (motion.reduced || !fine) return;
    const el = e.target.closest?.('[data-tilt]');
    if (!el || !root.contains(el)) return;
    const b = el.getBoundingClientRect();
    const px = (e.clientX - b.left) / b.width - 0.5, py = (e.clientY - b.top) / b.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg) translateZ(0)`;
    el.style.setProperty('--mx', `${(px + 0.5) * 100}%`); el.style.setProperty('--my', `${(py + 0.5) * 100}%`);
  };
  const onOut = (e) => { const el = e.target.closest?.('[data-tilt]'); if (el && !el.contains(e.relatedTarget)) el.style.transform = ''; };
  root.addEventListener('mousemove', onMove, { passive: true });
  root.addEventListener('mouseout', onOut);

  // Parallax
  const px = [...root.querySelectorAll('[data-parallax]')];
  let ticking = false;
  const onScroll = () => {
    if (ticking || motion.reduced) return;
    ticking = true;
    requestAnimationFrame(() => { px.forEach((el) => { el.style.transform = `translate3d(0,${scrollY * parseFloat(el.dataset.parallax)}px,0)`; }); ticking = false; });
  };
  if (px.length) addEventListener('scroll', onScroll, { passive: true });
  cleanups.push(() => { removeEventListener('scroll', onScroll); root.removeEventListener('mousemove', onMove); root.removeEventListener('mouseout', onOut); });
  return () => cleanups.forEach((c) => c());
}
