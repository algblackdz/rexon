// صفحات الدخول والتسجيل واستعادة كلمة المرور
import { t, setLang, getLang } from '../i18n.js';
import { esc, $, api, state, toast, errText, logoHTML } from '../core.js';
import { navigate } from '../main.js';

const FORMS = {
  login: { fields: ['email', 'password'], title: 'auth.loginTitle', cta: 'common.nav_login' },
  signup: { fields: ['name', 'email', 'password'], title: 'auth.signupTitle', cta: 'auth.createAccount' },
  forgot: { fields: ['email'], title: 'auth.forgotTitle', cta: 'auth.sendLink' },
  reset: { fields: ['password'], title: 'auth.resetTitle', cta: 'auth.setPassword' }
};
const AC = { name: 'name', email: 'email', password: 'current-password' };

function loadGoogle(clientId, onCredential, slot) {
  const init = () => { google.accounts.id.initialize({ client_id: clientId, callback: (r) => onCredential(r.credential) }); google.accounts.id.renderButton(slot, { theme: 'filled_black', size: 'large', shape: 'pill', width: 300 }); };
  if (window.google?.accounts) return init();
  const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = init; document.head.append(s);
}

export default {
  title: 'common.nav_login',
  render({ name }) {
    const f = FORMS[name];
    const social = name === 'login' || name === 'signup';
    return `<section class="auth"><div class="auth-card glass" data-reveal>
      <a class="brand center" href="#/">${logoHTML()}</a><h1 class="h3 center">${esc(t(f.title))}</h1>
      <form id="auth-form" novalidate>${f.fields.map((k) => `<label class="field"><span>${esc(t('auth.f_' + k))}</span><input name="${k}" type="${k === 'password' ? 'password' : k === 'email' ? 'email' : 'text'}" autocomplete="${k === 'password' && name === 'signup' || name === 'reset' ? 'new-password' : AC[k]}" required ${k === 'password' ? 'minlength="8"' : ''} ${k === f.fields[0] ? 'autofocus' : ''}></label>`).join('')}
        <p class="form-err" role="alert" hidden></p>
        <button class="btn btn-primary btn-lg block" data-magnetic type="submit">${esc(t(f.cta))}</button></form>
      ${social ? `<div class="or"><span>${esc(t('auth.or'))}</span></div><div id="g-slot" class="center"><button class="btn btn-ghost block" id="g-btn" type="button">G&nbsp; ${esc(t('auth.google'))}</button></div>` : ''}
      <p class="center muted small">${name === 'login' ? `<a href="#/forgot">${esc(t('auth.forgotLink'))}</a> · <a href="#/signup">${esc(t('auth.noAccount'))}</a>` : name === 'signup' ? `<a href="#/login">${esc(t('auth.haveAccount'))}</a>` : `<a href="#/login">${esc(t('auth.backToLogin'))}</a>`}</p>
    </div></section>`;
  },
  mount(root, { name, query }) {
    const form = $('#auth-form', root), err = $('.form-err', root);
    const showErr = (m) => { err.textContent = m; err.hidden = !m; };
    const done = async (user) => {
      state.user = user;
      if (user.language && !localStorage.getItem('nx_lang') && user.language !== getLang()) await setLang(user.language);
      navigate(query.next ? decodeURIComponent(query.next) : '/dashboard');
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); showErr('');
      const d = Object.fromEntries(new FormData(form));
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      try {
        if (name === 'login') await done((await api('POST', '/api/auth/login', d)).user);
        else if (name === 'signup') await done((await api('POST', '/api/auth/signup', { ...d, language: getLang() })).user);
        else if (name === 'forgot') {
          const r = await api('POST', '/api/auth/forgot', d);
          toast(t('auth.linkSent'), 'ok');
          if (r.devLink) { showErr(''); form.insertAdjacentHTML('beforeend', `<p class="small muted" dir="ltr">DEV: <a href="${esc(r.devLink)}">${esc(r.devLink)}</a></p>`); }
        } else { await api('POST', '/api/auth/reset', { token: query.token, password: d.password }); toast(t('auth.passwordUpdated'), 'ok'); navigate('/login'); }
      } catch (er) { showErr(errText(er)); } finally { btn.disabled = false; }
    });
    const g = $('#g-btn', root);
    if (g) {
      if (state.config.googleClientId) loadGoogle(state.config.googleClientId, async (cred) => { try { await done((await api('POST', '/api/auth/google', { credential: cred })).user); } catch (er) { showErr(errText(er)); } }, $('#g-slot', root));
      else g.addEventListener('click', () => toast(t('common.err_google_not_configured'), 'err'));
    }
  }
};
