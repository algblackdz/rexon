// عناصر الواجهة المشتركة بين الصفحات: مبدّل اللغة + زر تقليل الحركة
import { t, getLang, setLang, LANGS } from './i18n.js';
import { esc, api, state } from './core.js';
import { motion, setReduced } from './fx.js';

const NAMES = { en: 'English', fr: 'Français', ar: 'العربية' };
const SHORT = { en: 'EN', fr: 'FR', ar: 'AR' };

export function langSwitcherHTML() {
  const cur = getLang();
  return `<div class="lang" data-lang>
    <button class="lang-btn" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(t('common.changeLanguage'))}"><span>${SHORT[cur]}</span><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round"/></svg></button>
    <ul class="lang-menu glass" role="listbox" hidden>${LANGS.map((l) => `<li role="option" tabindex="-1" data-l="${l}" aria-selected="${l === cur}" lang="${l}">${NAMES[l]}</li>`).join('')}</ul></div>`;
}
export const motionToggleHTML = () => `<button class="icon-btn" type="button" data-motion aria-pressed="${motion.reduced}" aria-label="${esc(t('common.reduceMotion'))}" title="${esc(t('common.reduceMotion'))}">◐</button>`;

export function bindShell(root) {
  root.querySelectorAll('[data-lang]').forEach((box) => {
    const btn = box.querySelector('.lang-btn'), menu = box.querySelector('.lang-menu');
    const opts = [...menu.querySelectorAll('li')];
    const open = (focusIdx) => { menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); opts[focusIdx ?? Math.max(0, LANGS.indexOf(getLang()))].focus(); };
    const close = (back) => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (back) btn.focus(); };
    const choose = async (l) => {
      close(true);
      await setLang(l);
      if (state.user) api('PATCH', '/api/auth/me', { language: l }).catch(() => {});
    };
    btn.addEventListener('click', () => (menu.hidden ? open() : close()));
    btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); } });
    menu.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) choose(li.dataset.l); });
    menu.addEventListener('keydown', (e) => {
      const i = opts.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(opts[i].dataset.l); }
      else if (e.key === 'Escape') close(true);
    });
    document.addEventListener('click', (e) => { if (!box.contains(e.target) && !menu.hidden) close(); });
  });
  root.querySelectorAll('[data-motion]').forEach((b) => b.addEventListener('click', () => { setReduced(!motion.reduced); b.setAttribute('aria-pressed', String(motion.reduced)); }));
}
