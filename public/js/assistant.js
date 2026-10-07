// ============================================================
// المساعد الذكي (AI) + محادثة الدعم البشري: زر عائم في كل الصفحات (عدا المحرر)
// تبويب "المساعد": يجيب الجميع. تبويب "الدعم": محادثة مع الطاقم (يتطلب تسجيل الدخول).
// ============================================================
import { t, getLang } from './i18n.js';
import { esc, api, state, errText } from './core.js';

let box, fab, panel, tab = 'ai', open = false, busy = false, timer = null, ticket = null;
const KEY = 'nx_chat';
const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch { return []; } };
let msgs = load();
const save = () => sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30)));

// تنسيق خفيف آمن: **غامق** و `كود` وأسطر جديدة
const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');

function bubble(m) { return `<div class="am ${m.r}">${fmt(m.text)}</div>`; }

function bodyAI() {
  const sug = [1, 2, 3, 4].map((n) => `<button class="chip" data-sug="${n}">${esc(t('support.sug' + n))}</button>`).join('');
  return `<div class="a-log" id="a-log">${msgs.length ? msgs.map(bubble).join('') : `<div class="am b">${esc(t('support.intro'))}</div><div class="chips">${sug}</div>`}${busy ? `<div class="am b typing"><i></i><i></i><i></i></div>` : ''}</div>`;
}
function bodySupport() {
  if (!state.user) return `<div class="a-log"><div class="am b">${esc(t('support.needLogin'))}</div><a class="btn btn-primary btn-sm" href="#/login">${esc(t('common.nav_login'))}</a></div>`;
  const list = ticket?.messages || [];
  return `<div class="a-log" id="a-log"><div class="am b">${esc(t('support.humanIntro'))}</div>${list.map((m) => `<div class="am ${m.from === 'user' ? 'u' : 'b staff'}">${m.from === 'staff' ? `<small>${esc(m.name)} · ${esc(t('support.role_' + (m.role || 'support')))}</small>` : ''}${fmt(m.text)}</div>`).join('')}</div>${ticket ? `<button class="mini a-close" data-close-ticket>${esc(t('support.closeChat'))}</button>` : ''}`;
}

function draw() {
  if (!panel) return;
  panel.innerHTML = `<header><b>✦ NEXORA</b><div class="a-tabs" role="tablist"><button role="tab" data-t="ai" aria-selected="${tab === 'ai'}">${esc(t('support.tab_ai'))}</button><button role="tab" data-t="support" aria-selected="${tab === 'support'}">${esc(t('support.tab_support'))}</button></div><button class="icon-btn" data-x aria-label="${esc(t('common.close'))}">✕</button></header>
    ${tab === 'ai' ? bodyAI() : bodySupport()}
    ${tab === 'ai' || state.user ? `<form class="a-form"><textarea rows="1" maxlength="1000" placeholder="${esc(t(tab === 'ai' ? 'support.placeholder' : 'support.placeholderHuman'))}" ${busy ? 'disabled' : ''}></textarea><button class="btn btn-primary btn-sm" ${busy ? 'disabled' : ''}>${esc(t('editor.send'))}</button></form>` : ''}`;
  const log = panel.querySelector('#a-log'); if (log) log.scrollTop = log.scrollHeight;
}

async function pollTicket() {
  if (!open || tab !== 'support' || !state.user) return;
  try { const r = await api('GET', '/api/support/mine'); const n = r.ticket?.messages.length || 0; if (n !== (ticket?.messages.length || 0)) { ticket = r.ticket; draw(); } else ticket = r.ticket; } catch { /* تجاهل */ }
}
function startPoll() { clearInterval(timer); timer = setInterval(pollTicket, 5000); pollTicket(); }

async function sendAI(text) {
  msgs.push({ r: 'u', text }); busy = true; save(); draw();
  try {
    const r = await api('POST', '/api/assistant', { lang: getLang(), messages: msgs.slice(-10).map((m) => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.text })) });
    msgs.push({ r: 'b', text: r.reply });
  } catch (e) { msgs.push({ r: 'b', text: errText(e) }); }
  busy = false; save(); draw();
}
async function sendHuman(text) {
  try { await api('POST', '/api/support/message', { text }); const r = await api('GET', '/api/support/mine'); ticket = r.ticket; draw(); } catch (e) { msgs.push({ r: 'b', text: errText(e) }); tab = 'ai'; draw(); }
}

function toggle(v) {
  open = v; box.classList.toggle('open', v); fab.setAttribute('aria-expanded', String(v));
  if (v) { draw(); if (tab === 'support') startPoll(); panel.querySelector('textarea')?.focus(); } else clearInterval(timer);
}

export function initAssistant() {
  if (box) return;
  box = document.createElement('div'); box.className = 'assist';
  box.innerHTML = `<button class="assist-fab" aria-expanded="false" aria-label="${esc(t('support.open'))}" data-magnetic>✦</button><section class="assist-panel glass" role="dialog" aria-label="NEXORA Assistant"></section>`;
  document.body.append(box); fab = box.querySelector('.assist-fab'); panel = box.querySelector('.assist-panel');
  fab.addEventListener('click', () => toggle(!open));
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.x !== undefined) toggle(false);
    else if (b.dataset.t) { tab = b.dataset.t; draw(); if (tab === 'support') startPoll(); else clearInterval(timer); }
    else if (b.dataset.sug) sendAI(t('support.sug' + b.dataset.sug));
    else if (b.dataset.closeTicket !== undefined) api('POST', '/api/support/close').then(() => { ticket = null; draw(); });
  });
  panel.addEventListener('submit', (e) => { e.preventDefault(); const ta = panel.querySelector('textarea'); const v = ta.value.trim(); if (!v || busy) return; ta.value = ''; tab === 'ai' ? sendAI(v) : sendHuman(v); });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && e.target.tagName === 'TEXTAREA') { e.preventDefault(); panel.querySelector('form').requestSubmit(); } else if (e.key === 'Escape') toggle(false); });
  addEventListener('nx:lang', () => open && draw());
  addEventListener('hashchange', () => { ticket = null; if (open && tab === 'support') startPoll(); });
}
