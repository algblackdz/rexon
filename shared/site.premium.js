// ============================================================
// script.js (الجزء المتقدم): الوضع الليلي/النهاري، شريط التقدم، عدّاد الأرقام، Micro-interactions
// يُضاف تلقائيًا بعد السكربت الأساسي في المواقع المُصدَّرة. لا يعمل مع تفضيل تقليل الحركة.
// ============================================================
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  // زر الوضع الليلي/النهاري: يحفظ اختيار الزائر
  document.querySelectorAll('[data-nx-theme]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cur = root.getAttribute('data-theme') || (root.getAttribute('data-default') || 'dark');
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('nx_theme', next); } catch (e) {}
    });
  });

  // شريط تقدم القراءة + ظل الـ Navbar عند التمرير
  var bar = document.createElement('div'); bar.className = 'nx-progress'; document.body.appendChild(bar);
  var nav = document.querySelector('.nx-nav'), tick = false;
  function onScroll() {
    if (tick) return; tick = true;
    requestAnimationFrame(function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
      if (nav) nav.classList.toggle('is-scrolled', scrollY > 16);
      tick = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // عدّاد الأرقام في قسم الإحصائيات
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; io.unobserve(e.target);
        var el = e.target, m = /^(\D*)(\d+(?:[.,]\d+)?)(.*)$/.exec(el.textContent.trim()); if (!m) return;
        var end = parseFloat(m[2].replace(',', '.')), dec = (m[2].split(/[.,]/)[1] || '').length, t0 = performance.now();
        (function step(t) {
          var p = Math.min(1, (t - t0) / 1100), v = end * (1 - Math.pow(1 - p, 3));
          el.textContent = m[1] + v.toFixed(dec) + m[3];
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.nx-stat strong').forEach(function (el) { io.observe(el); });
  }

  if (reduce || !fine) return;

  // Micro-interactions: spotlight / tilt / magnetic
  document.querySelectorAll('.mi-spotlight .nx-card').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
  document.querySelectorAll('.mi-tilt .nx-card, .mi-tilt .nx-tile').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      c.style.transform = 'perspective(800px) rotateY(' + (x * 10) + 'deg) rotateX(' + (-y * 10) + 'deg) translateY(-4px)';
    });
    c.addEventListener('pointerleave', function () { c.style.transform = ''; });
  });
  document.querySelectorAll('.mi-magnetic .nx-btn').forEach(function (b) {
    b.addEventListener('pointermove', function (e) {
      var r = b.getBoundingClientRect();
      b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.3) + 'px)';
    });
    b.addEventListener('pointerleave', function () { b.style.transform = ''; });
  });
})();
