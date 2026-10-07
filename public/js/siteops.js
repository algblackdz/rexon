// عمليات مشتركة على المواقع (تُستخدم في Dashboard وEditor): نشر، دفع، دومين
import { t } from './i18n.js';
import { api, esc, modal, toast, errText, state, absUrl } from './core.js';

export const statusBadge = (st) => `<span class="badge st-${esc(st)}">${esc(t('dashboard.status_' + st))}</span>`;
const DNS_CNAME = () => `cname.${state.config.platformDomain}`;

// نافذة الدفع: Stripe الحقيقي إن كان مفعّلًا، وإلا دفع تجريبي (للتطوير فقط)
export function payModal(w, onPaid) {
  api('GET', '/api/config').then((c) => Object.assign(state.config, c)).catch(() => {});
  const price = state.config.priceUsd;
  const pr = state.config.pricing || {};
  modal(`<h3>${esc(t('dashboard.payTitle'))}</h3><p class="muted mb">${esc(t('tools.pay_' + (pr.model || 'once') + '_' + (pr.scope || 'website'), { price }))}</p>
    <div class="row end"><button class="btn btn-ghost" data-close>${esc(t('common.cancel'))}</button><button class="btn btn-primary" data-pay>${esc(t('dashboard.payNow', { price }))}</button></div>
    ${state.config.billingMode === 'mock' ? `<p class="small muted mt">${esc(t('dashboard.payDemo'))}</p>` : ''}`, {
    onMount: (el, close) => el.querySelector('[data-pay]').addEventListener('click', async () => {
      try {
        const r = await api('POST', '/api/billing/checkout', { websiteId: w.id });
        if (r.paid) { close(); onPaid?.(); return; }
        if (r.url) { location.href = r.url; return; }
        if (r.mock) { await api('POST', '/api/billing/mock-confirm', { token: r.token }); toast(t('dashboard.paid'), 'ok'); close(); onPaid?.(); }
      } catch (e) { toast(errText(e), 'err'); }
    })
  });
}

export function publishModal(w, onChange) {
  const m = modal('<div class="pub"></div>', { onMount: (el) => draw(el) });
  function draw(el) {
    const url = absUrl(w.url);
    el.querySelector('.pub').innerHTML = `<h3>${esc(t('editor.publish'))}</h3><p class="mb">${statusBadge(w.status)}</p>
      ${url ? `<div class="copybox" dir="ltr"><input readonly value="${esc(url)}" aria-label="URL"><button class="btn btn-ghost btn-sm" data-copy>${esc(t('editor.copyLink'))}</button></div>` : `<p class="muted mb">${esc(t('editor.notPublished'))}</p>`}
      <div class="row end wrap"><button class="btn btn-primary" data-pub>${esc(w.status === 'published' ? t('editor.updatePublish') : t('editor.publishWebsite'))}</button>
      ${url ? `<a class="btn btn-ghost" href="${esc(url)}" target="_blank" rel="noopener">${esc(t('editor.openWebsite'))}</a><button class="btn btn-ghost" data-unpub>${esc(t('editor.unpublish'))}</button>` : ''}</div>`;
    el.querySelector('[data-copy]')?.addEventListener('click', () => { navigator.clipboard?.writeText(url); toast(t('editor.copied'), 'ok'); });
    el.querySelector('[data-pub]').addEventListener('click', async () => {
      try {
        if (onChange.beforePublish) await onChange.beforePublish();
        const r = await api('POST', `/api/websites/${w.id}/publish`);
        Object.assign(w, r.website); onChange(w); draw(el); toast(t('editor.published'), 'ok');
      } catch (e) {
        if (e.code === 'payment_required') { m.close(); payModal(w, () => publishModal(w, onChange)); } else toast(errText(e), 'err');
      }
    });
    el.querySelector('[data-unpub]')?.addEventListener('click', async () => {
      try { const r = await api('POST', `/api/websites/${w.id}/unpublish`); Object.assign(w, r.website, { url: null }); onChange(w); draw(el); } catch (e) { toast(errText(e), 'err'); }
    });
  }
  return m;
}

export function domainModal(w, onChange) {
  modal(`<h3>${esc(t('dashboard.connectDomain'))}</h3>
    <label class="field"><span>${esc(t('dashboard.freeSubdomain'))}</span><span class="inline-input" dir="ltr"><input id="d-sub" value="${esc(w.subdomain)}" spellcheck="false"><i>.${esc(state.config.platformDomain)}</i></span></label>
    <label class="field"><span>${esc(t('dashboard.customDomain'))}</span><input id="d-dom" dir="ltr" placeholder="example.com" value="${esc(w.customDomain || '')}" spellcheck="false"></label>
    <ol class="dom-steps card"><li><b>${esc(t('landing.domStep1t'))}</b><span class="muted">${esc(t('landing.domStep1d'))}</span></li>
      <li><b>${esc(t('landing.domStep2t'))}</b><code dir="ltr">CNAME  @ → ${esc(DNS_CNAME())}</code></li>
      <li><b>${esc(t('landing.domStep3t'))}</b><span class="muted">${esc(t('landing.domStep3d'))}</span></li></ol>
    <div class="row end"><button class="btn btn-ghost" data-close>${esc(t('common.cancel'))}</button><button class="btn btn-primary" data-save>${esc(t('common.save'))}</button></div>`, {
    onMount: (el, close) => el.querySelector('[data-save]').addEventListener('click', async () => {
      try {
        const r = await api('POST', `/api/websites/${w.id}/domain`, { subdomain: el.querySelector('#d-sub').value.trim(), customDomain: el.querySelector('#d-dom').value.trim() });
        Object.assign(w, r.website); onChange?.(w); toast(t('common.saved'), 'ok'); close();
      } catch (e) { toast(errText(e), 'err'); }
    })
  });
}
