// يعمل داخل iframe المعاينة: يستقبل HTML/CSS من Editor ويحدّث الصفحة بدون إعادة تحميل
// (يحافظ على موضع التمرير)، ويرسل للمحرر القسم الذي ضُغط عليه.
(function () {
  var style = document.getElementById('nx-style'), fonts = document.getElementById('nx-fonts');
  function mark(id, scroll) {
    document.querySelectorAll('.nx-selected').forEach(function (e) { e.classList.remove('nx-selected'); });
    if (!id) return;
    var el = document.querySelector('[data-nx-id="' + id + '"]');
    if (el) { el.classList.add('nx-selected'); if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
  addEventListener('message', function (e) {
    if (e.origin !== location.origin) return;
    var m = e.data || {};
    if (m.type === 'render') {
      var y = scrollY;
      if (m.fontsHref && fonts.getAttribute('href') !== m.fontsHref) fonts.setAttribute('href', m.fontsHref);
      style.textContent = m.css;
      document.documentElement.lang = m.lang; document.documentElement.dir = m.dir; if (m.style) document.body.setAttribute('data-style', m.style);
      document.body.innerHTML = m.html;
      mark(m.selected, false);
      scrollTo(0, y);
    } else if (m.type === 'select') mark(m.id, m.scroll);
  });
  document.addEventListener('click', function (e) {
    e.preventDefault();
    var el = e.target.closest && e.target.closest('[data-nx-id]');
    parent.postMessage({ type: 'select', id: el ? el.getAttribute('data-nx-id') : null }, location.origin);
  }, true);
  document.addEventListener('submit', function (e) { e.preventDefault(); }, true);
  parent.postMessage({ type: 'ready' }, location.origin);
})();
