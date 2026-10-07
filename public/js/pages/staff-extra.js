// ============================================================
// لوحة المؤسس: التكاملات (بديل ملف .env) وتسعير الإعلانات
// ============================================================
import { t } from '../i18n.js';
import { esc, $, $$, api, toast, errText } from '../core.js';

const GROUPS = ['google', 'mail', 'ai', 'payments', 'ads', 'security'];
const TOPIC = { google: 'GOOGLE_CLIENT_ID', mail: 'SMTP_USER' };

export async function viewIntegrations(el) {
  const { items } = await api('GET', '/api/staff/integrations');
  el.innerHTML = `<div class="card mb"><h3>${esc(t('ads.int_title'))}</h3><p class="muted small">${esc(t('ads.int_help'))}</p></div>
  <form id="int-form" class="ads-grid">${GROUPS.map((g) => `<fieldset class="card"><legend class="pill">${esc(t('ads.int_g_' + g))}</legend><p class="muted small">${esc(t('ads.int_h_' + g))}</p>${items.filter((i) => i.group === g).map((i) => `<label class="field sm"><span dir="ltr">${i.key} <span class="badge ${i.set ? 'st-published' : 'st-draft'}">${esc(t('ads.int_src_' + i.source))}</span></span><input name="${i.key}" dir="ltr" autocomplete="off" spellcheck="false" ${i.secret ? 'type="password"' : ''} value="${esc(i.source === 'env' ? '' : i.value)}" placeholder="${i.source === 'env' ? esc(t('ads.int_fromEnv')) : ''}" ${i.source === 'env' ? 'disabled' : ''}></label>`).join('')}</fieldset>`).join('')}
  <div class="row wrap" style="grid-column:1/-1"><button class="btn btn-primary">${esc(t('common.save'))}</button><button type="button" class="btn btn-ghost" id="test-mail">${esc(t('ads.int_testMail'))}</button><span class="muted small">${esc(t('ads.int_secretHint'))}</span></div></form>`;
  $('#int-form', el).addEventListener('submit', async (e) => {
    e.preventDefault(); const values = {};
    $$('input:not([disabled])', e.target).forEach((i) => { values[i.name] = i.value; });
    try { await api('PUT', '/api/staff/integrations', { values }); toast(t('common.saved'), 'ok'); viewIntegrations(el); } catch (er) { toast(errText(er), 'err'); }
  });
  $('#test-mail', el).addEventListener('click', async () => { try { await api('POST', '/api/staff/integrations/test-mail', {}); toast(t('ads.int_mailOk'), 'ok'); } catch (er) { toast(er.data?.detail ? `${errText(er)}: ${er.data.detail}` : errText(er), 'err'); } });
}

export async function viewAdsPricing(el) {
  const { pricing: p } = await api('GET', '/api/staff/ads-pricing');
  const keys = ['baseFee', 'perExtraPlatform', 'perExtraVariant', 'aiCopy', 'scheduling', 'advancedTargeting', 'retargeting', 'spendPercent', 'minFee', 'maxFee'];
  el.innerHTML = `<form class="card st-price" id="ap"><h3>${esc(t('ads.ap_title'))}</h3><p class="muted small">${esc(t('ads.ap_help'))}</p><div class="grid2">${keys.map((k) => `<label class="field"><span>${esc(t('ads.ap_' + k))}${k === 'spendPercent' ? ' %' : ' (USD)'}</span><input name="${k}" type="number" min="0" step="0.5" value="${p[k]}"></label>`).join('')}</div><div><button class="btn btn-primary">${esc(t('common.save'))}</button></div></form>`;
  $('#ap', el).addEventListener('submit', async (e) => { e.preventDefault(); try { await api('PUT', '/api/staff/ads-pricing', Object.fromEntries(new FormData(e.target))); toast(t('common.saved'), 'ok'); } catch (er) { toast(errText(er), 'err'); } });
}
