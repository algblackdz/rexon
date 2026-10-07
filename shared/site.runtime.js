// ============================================================
// script.js — السلوك الأساسي للموقع المُصدَّر
// ملف عادي (بدون مكتبات) وخفيف، ويحترم تفضيل تقليل الحركة.
// ============================================================
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // هذا الكود مسؤول عن تشغيل Animation عند ظهور العنصر في الشاشة
  var items = document.querySelectorAll('[data-anim]');
  if (!reduce && 'IntersectionObserver' in window && items.length) {
    root.classList.add('nx-anim');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  // قائمة الموبايل: فتح وإغلاق عند الضغط على زر القائمة
  var nav = document.querySelector('.nx-nav');
  var burger = document.querySelector('.nx-burger');
  if (nav && burger) {
    burger.addEventListener('click', function () {
      var open = nav.hasAttribute('data-open');
      if (open) nav.removeAttribute('data-open'); else nav.setAttribute('data-open', '');
      burger.setAttribute('aria-expanded', String(!open));
    });
  }

  // حفظ لغة الزائر في المواقع متعددة اللغات
  document.querySelectorAll('.nx-lang a').forEach(function (a) {
    a.addEventListener('click', function () {
      try { localStorage.setItem('nx_site_lang', a.getAttribute('hreflang')); } catch (e) {}
    });
  });

  // نماذج التواصل: ترسل إلى endpoint إن وُجد (مثل Formspree) وإلا تعرض رسالة نجاح فقط
  var endpoint = (document.querySelector('meta[name="nx-form-endpoint"]') || {}).content;
  document.querySelectorAll('[data-nx-form]').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var ok = form.querySelector('.nx-ok');
      var done = function () { if (ok) ok.hidden = false; form.reset(); };
      if (endpoint) {
        var data = {};
        new FormData(form).forEach(function (v, k) { data[k] = v; });
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) }).then(done).catch(done);
      } else { done(); }
    });
  });
})();
