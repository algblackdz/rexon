// ============================================================
// Asset Export: تصدير أي قسم كـ CSS أو Tailwind أو SVG
// (CSS = أنماط الموقع كاملة + HTML القسم، Tailwind = إعداد الألوان + أصناف القسم، SVG = صورة متجهة قابلة للفتح)
// ============================================================
import { t } from './i18n.js';
import { esc, modal, toast } from './core.js';
import { renderBody, renderDocument } from '/shared/render.js';
import { buildCSS } from '/shared/css.js';

const slim = (site, section, lang) => {
  const tmp = { ...site, layout: { navbar: null, footer: null }, pages: [{ id: 'x', slug: 'index', title: 'x', sections: [section] }] };
  return { tmp, html: renderBody(tmp, tmp.pages[0], lang, { comments: true }) };
};

function tailwind(site, section, html) {
  const c = site.theme.colors, st = section.style || {}, u = [];
  if (st.padding) u.push(`p-[${st.padding.replace(/\s+/g, '_')}]`);
  if (st.margin) u.push(`m-[${st.margin.replace(/\s+/g, '_')}]`);
  if (st.width) u.push(`w-[${st.width}]`);
  if (st.height) u.push(`min-h-[${st.height}]`);
  if (st.borderRadius) u.push(`rounded-[${st.borderRadius}]`);
  if (st.fontSize) u.push(`text-[${st.fontSize}]`);
  if (st.color) u.push(`text-[${st.color}]`);
  if (st.background) u.push(`bg-[${st.background}]`);
  if (st.gradient) u.push(`bg-gradient-to-br from-[${st.gradient.from}] to-[${st.gradient.to}]`);
  if (st.boxShadow) u.push(`shadow-[${st.boxShadow.replace(/\s+/g, '_')}]`);
  return `// tailwind.config.js — ${t('tools.ax_twNote')}
module.exports = {
  theme: { extend: {
    colors: { primary: '${c.primary}', secondary: '${c.secondary}', bg: '${c.bg}', surface: '${c.surface}', ink: '${c.text}', muted: '${c.muted}' },
    borderRadius: { brand: '${site.theme.radius}px' },
    fontFamily: { brand: ['${site.theme.fonts.latin}', '${site.theme.fonts.arabic}', 'sans-serif'] }
  } }
}

/* ${t('tools.ax_twWrapper')}: */
<section class="${u.join(' ') || 'py-16'} bg-bg text-ink font-brand">
${html.replace(/^/gm, '  ')}
</section>

/* ${t('tools.ax_twUse')} style.css */`;
}

async function toSvg(site, section, lang, css) {
  const docHtml = renderDocument({ ...site, layout: { navbar: null, footer: null }, pages: [{ id: 'x', slug: 'index', title: 'x', sections: [section] }] }, { id: 'x', slug: 'index', title: 'x', sections: [section] }, lang, { css, noThemeScript: true });
  const W = 1280;
  const ifr = document.createElement('iframe');
  ifr.style.cssText = `position:fixed;left:-99999px;top:0;width:${W}px;height:800px;border:0`;
  ifr.srcdoc = docHtml; document.body.append(ifr);
  await new Promise((r) => { ifr.onload = r; setTimeout(r, 2500); });
  const d = ifr.contentDocument, el = d.querySelector('main > *') || d.body;
  const H = Math.ceil(Math.max(el.scrollHeight, el.getBoundingClientRect().height, 80));
  const xhtml = new XMLSerializer().serializeToString(el);
  ifr.remove();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <foreignObject x="0" y="0" width="${W}" height="${H}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="background:${site.theme.colors.bg};color:${site.theme.colors.text};width:${W}px;font-family:sans-serif">
      <style><![CDATA[${css.replace(/body::(before|after)\{[^}]*\}/g, '')}]]></style>
      ${xhtml}
    </div>
  </foreignObject>
</svg>`;
}

export async function openAssetExport(site, section, lang) {
  const css = buildCSS(site), { html } = slim(site, section, lang);
  const out = { css: `/* ${t('tools.ax_cssNote')} */\n${css}\n\n/* ===== HTML ===== */\n/*\n${html.replace(/\*\//g, '* /')}\n*/`, html, tw: tailwind(site, section, html), svg: null };
  let cur = 'css';
  const m = modal(`<h3>${esc(t('tools.ax_title'))}</h3><div class="tabs" role="tablist">${['css', 'tw', 'svg'].map((k) => `<button role="tab" data-k="${k}" aria-selected="${k === cur}">${esc(t('tools.ax_' + k))}</button>`).join('')}</div>
    <textarea class="code-in ax-out" dir="ltr" readonly rows="16"></textarea><p class="muted small" id="ax-note"></p>
    <div class="row end"><button class="btn btn-ghost" data-copy>${esc(t('tools.ax_copy'))}</button><button class="btn btn-primary" data-dl>${esc(t('tools.ax_download'))}</button></div>`, { wide: true });
  const ta = m.el.querySelector('textarea'), note = m.el.querySelector('#ax-note');
  const show = async (k) => {
    cur = k; m.el.querySelectorAll('[data-k]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.k === k)));
    note.textContent = t('tools.ax_note_' + k);
    if (k === 'svg' && !out.svg) { ta.value = '…'; try { out.svg = await toSvg(site, section, lang, css); } catch { out.svg = ''; toast(t('common.err_server_error'), 'err'); } }
    ta.value = k === 'css' ? out.css : k === 'tw' ? out.tw : out.svg;
  };
  m.el.addEventListener('click', (e) => {
    const k = e.target.closest('[data-k]'); if (k) return show(k.dataset.k);
    if (e.target.closest('[data-copy]')) { navigator.clipboard?.writeText(ta.value); toast(t('editor.copied'), 'ok'); }
    if (e.target.closest('[data-dl]')) {
      const ext = { css: 'css', tw: 'js', svg: 'svg' }[cur], type = { css: 'text/css', tw: 'text/javascript', svg: 'image/svg+xml' }[cur];
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ta.value], { type })); a.download = `nexora-${section.component}.${ext}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
  });
  show('css');
}
