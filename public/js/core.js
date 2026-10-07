// أدوات مشتركة: API، الحالة العامة، Toast، Modal، تنسيق
import { t, getLang, has } from './i18n.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const state = { user: null, config: { billingMode: 'mock', priceUsd: 5, trialDays: 7, platformDomain: 'nexora.app' } };

export async function api(method, url, body) {
  let res;
  try {
    res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, credentials: 'same-origin', body: body ? JSON.stringify(body) : undefined });
  } catch { throw Object.assign(new Error('network'), { code: 'network' }); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'server_error'), { code: data.error || 'server_error', status: res.status, data });
  return data;
}

// ترجمة كود الخطأ القادم من الخادم
export const errText = (e) => { const c = e?.code || 'server_error'; return has('common.err_' + c) ? t('common.err_' + c) : has('support.err_' + c) ? t('support.err_' + c) : has('ads.err_' + c) ? t('ads.err_' + c) : t('common.err_server_error'); };

export function toast(msg, kind = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  document.getElementById('toasts').append(el);
  setTimeout(() => el.classList.add('out'), 3200);
  setTimeout(() => el.remove(), 3700);
}

let lastFocus = null;
export function modal(html, { wide = false, onMount } = {}) {
  lastFocus = document.activeElement;
  const root = document.createElement('div');
  root.className = 'modal-wrap';
  root.innerHTML = `<div class="modal glass ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><button class="icon-btn modal-x" aria-label="${esc(t('common.close'))}" data-close>✕</button>${html}</div>`;
  document.body.append(root);
  const close = () => { root.remove(); document.removeEventListener('keydown', onKey); lastFocus?.focus?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  root.addEventListener('click', (e) => { if (e.target === root || e.target.closest('[data-close]')) close(); });
  (root.querySelector('[autofocus],input,button:not([data-close])') || root.querySelector('[data-close]')).focus();
  onMount?.(root, close);
  return { el: root, close };
}

export function confirmBox(message, okLabel) {
  return new Promise((resolve) => {
    const m = modal(`<p class="mb">${esc(message)}</p><div class="row end"><button class="btn btn-ghost" data-close>${esc(t('common.cancel'))}</button><button class="btn btn-danger" data-ok>${esc(okLabel || t('common.confirm'))}</button></div>`, {
      onMount: (el) => el.querySelector('[data-ok]').addEventListener('click', () => { resolve(true); el.remove(); })
    });
    m.el.addEventListener('click', (e) => { if (e.target === m.el || e.target.closest('[data-close]')) resolve(false); });
  });
}

export const fmtDate = (ts) => new Intl.DateTimeFormat(getLang(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts));
export const fmtDay = (ts) => new Intl.DateTimeFormat(getLang(), { dateStyle: 'medium' }).format(new Date(ts));
// يحوّل /s/xxx/ إلى رابط كامل بعنوان الموقع الحالي (يعمل على أي استضافة)
export const absUrl = (u) => (u && u.startsWith('/') ? location.origin + u : u);
export const debounce = (fn, ms) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; };

export const logoHTML = (cls = '') => `<span class="logo ${cls}"><svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><defs><linearGradient id="lg${cls.length}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#lg${cls.length})"/><path d="M10 23V9l12 14V9" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><b>NEXORA</b></span>`;
