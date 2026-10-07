// ============================================================
// Exporter — يحوّل Website Schema إلى مشروع ملفات منظم:
// index.html / style.css / script.js / assets / sitemap.xml / robots.txt
// نفس الدالة تُستخدم للتصدير (ZIP) وللنشر (تقديم الملفات من الذاكرة).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/config.js';
import { renderDocument } from '../../shared/render.js';
import { buildCSS } from '../../shared/css.js';
import { siteLangs } from '../../shared/schema.js';

const RUNTIME = fs.readFileSync(path.join(ROOT, 'shared/site.runtime.js'), 'utf8') + '\n' + fs.readFileSync(path.join(ROOT, 'shared/site.premium.js'), 'utf8');
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

export function buildProjectFiles(site, { baseUrl = 'https://YOUR-DOMAIN', allowCustomCode = true } = {}) {
  const files = {};
  const multi = site.language === 'multi';
  const langs = siteLangs(site);
  const rootPrefix = multi ? '../' : '';

  // الصور: تتحول من data URL إلى ملفات حقيقية داخل assets/images
  const assetFile = {};
  for (const a of site.assets) {
    const m = /^data:(image\/[a-z]+);base64,(.*)$/.exec(a.dataUrl);
    if (!m) continue;
    const base = a.name.replace(/\.[a-z0-9]+$/i, '') || 'image';
    assetFile[a.id] = `assets/images/${a.id.slice(-6)}-${base}.${EXT[m[1]] || 'png'}`;
    files[assetFile[a.id]] = Buffer.from(m[2], 'base64');
  }
  files['assets/fonts/README.txt'] = 'ضع هنا ملفات الخطوط المحلية (woff2) إذا أردت التوقف عن استخدام Google Fonts.\n';

  files['style.css'] = buildCSS(site);
  files['script.js'] = RUNTIME;

  const urls = [];
  for (const lang of langs) {
    for (const page of site.pages) {
      const dir = multi ? lang + '/' : '';
      const file = dir + (page.slug === 'index' ? 'index' : page.slug) + '.html';
      files[file] = renderDocument(site, page, lang, {
        cssHref: rootPrefix + 'style.css',
        jsSrc: rootPrefix + 'script.js',
        comments: true,
        allowCustomCode,
        assetUrl: (a) => rootPrefix + (assetFile[a.id] || ''),
        langHref: (l) => `../${l}/${page.slug === 'index' ? 'index' : page.slug}.html`
      });
      urls.push(`${baseUrl}/${file.replace(/index\.html$/, '')}`);
    }
  }
  if (multi) {
    files['index.html'] = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${site.name.replace(/[<>&"]/g, '')}</title>
<meta http-equiv="refresh" content="0; url=en/index.html">
<!-- هذه الصفحة تختار اللغة المناسبة للزائر ثم تحوّله إليها -->
<script>
(function(){var l='en';try{l=localStorage.getItem('nx_site_lang')||'';}catch(e){}
if(['en','fr','ar'].indexOf(l)<0){var n=(navigator.language||'en').slice(0,2);l=['fr','ar'].indexOf(n)>=0?n:'en';}
location.replace(l+'/index.html');})();
</script></head><body><a href="en/index.html">EN</a> · <a href="fr/index.html">FR</a> · <a href="ar/index.html">AR</a></body></html>
`;
  }
  files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  files['robots.txt'] = `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`;
  return files;
}

// حزمة التصدير: الملفات + ملف المشروع (للاستيراد لاحقًا) + شرح عربي مختصر
export function buildExportBundle(site, website) {
  const files = buildProjectFiles(site);
  const out = {};
  for (const [k, v] of Object.entries(files)) out['project/' + k] = v;
  out['project/nexora.project.json'] = JSON.stringify({ nexora: 1, website: site }, null, 2);
  out['project/README.txt'] = `مشروع "${site.name}" — تم تصديره من NEXORA\n\nالملفات:\n- index.html : الصفحة الرئيسية (صفحات أخرى بجانبها)\n- style.css : كل التنسيقات (الألوان في أعلى الملف)\n- script.js : الحركات والقائمة والنماذج\n- assets/ : الصور والخطوط\n- nexora.project.json : يمكنك استيراده في NEXORA لمتابعة التعديل\n\nافتح index.html مباشرة في المتصفح أو ارفع المجلد إلى أي استضافة.\n`;
  return out;
}

export const MIME = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', xml: 'application/xml', txt: 'text/plain; charset=utf-8', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', json: 'application/json' };
