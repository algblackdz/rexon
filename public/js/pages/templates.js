// معرض القوالب (Marketplace): معاينة + استخدام القالب
import { t, getLang } from '../i18n.js';
import { esc, $, $$, api, state, modal, toast, errText } from '../core.js';
import { navigate } from '../main.js';

const CATS = ['Business', 'Portfolio', 'Gaming', 'Store', 'Restaurant', 'Agency', 'SaaS', 'Creative'];
const previewSrc = (id) => `/api/templates/${id}/preview?lang=${getLang()}`;

export function templateCard(tp, i = 0) {
  return `<article class="card tpl" data-reveal data-tilt data-cursor="card" style="--d:${i * 0.06}s" data-id="${esc(tp.id)}">
    <div class="tpl-thumb"><iframe src="${previewSrc(tp.id)}" loading="lazy" tabindex="-1" title="${esc(tp.name[getLang()] || tp.name.en)}"></iframe></div>
    <div class="tpl-meta"><div><h3>${esc(tp.name[getLang()] || tp.name.en)}</h3><span class="muted small">${esc(t('generator.cat_' + tp.category.toLowerCase()))}</span></div>
    <div class="row"><button class="btn btn-ghost btn-sm" data-act="preview">${esc(t('common.preview'))}</button><button class="btn btn-primary btn-sm" data-act="use">${esc(t('common.useTemplate'))}</button></div></div></article>`;
}

export async function useTemplate(id) {
  if (!state.user) return navigate(`/login?next=${encodeURIComponent('/templates')}`);
  try {
    const r = await api('POST', `/api/templates/${id}/use`, { lang: getLang(), language: getLang() });
    navigate(`/editor/${r.website.id}`);
  } catch (e) { toast(errText(e), 'err'); }
}

export function bindTemplateCards(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    const card = e.target.closest('.tpl');
    if (!b || !card) return;
    const id = card.dataset.id;
    if (b.dataset.act === 'use') useTemplate(id);
    else modal(`<h3>${esc(card.querySelector('h3').textContent)}</h3><iframe class="tpl-full" src="${previewSrc(id)}" title="preview"></iframe><div class="row end mt"><button class="btn btn-primary" data-use>${esc(t('common.useTemplate'))}</button></div>`, { wide: true, onMount: (el, close) => el.querySelector('[data-use]').addEventListener('click', () => { close(); useTemplate(id); }) });
  });
}

export default {
  title: 'common.nav_templates',
  render() {
    return `<section class="sec page-head"><div class="container"><header class="sec-head" data-reveal><h1 class="h2">${esc(t('common.nav_templates'))}</h1><p class="muted">${esc(t('landing.tplSub'))}</p></header>
      <div class="chips" role="tablist" id="tpl-cats"><button class="chip on" data-cat="">${esc(t('common.all'))}</button>${CATS.map((c) => `<button class="chip" data-cat="${c}">${esc(t('generator.cat_' + c.toLowerCase()))}</button>`).join('')}</div>
      <div class="tpl-grid" id="tpl-grid"></div></div></section>`;
  },
  async mount(root) {
    const { templates } = await api('GET', '/api/templates');
    const grid = $('#tpl-grid', root);
    const draw = (cat) => { grid.innerHTML = templates.filter((x) => !cat || x.category === cat).map(templateCard).join(''); $$('[data-reveal]', grid).forEach((el) => el.classList.add('in')); };
    draw('');
    bindTemplateCards(grid);
    $('#tpl-cats', root).addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      $$('.chip', root).forEach((x) => x.classList.toggle('on', x === b)); draw(b.dataset.cat);
    });
  }
};
