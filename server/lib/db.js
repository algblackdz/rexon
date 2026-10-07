// ============================================================
// طبقة البيانات — ملفان منفصلان:
//   accounts.json : الحسابات فقط (users, resets)
//   db.json       : المواقع والإصدارات والإعدادات والدعم والمستندات
// الواجهة (insert/get/find/list/update/remove) جاهزة للاستبدال بـ PostgreSQL لاحقًا.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';

function openStore(file, defaults) {
  let state = structuredClone(defaults);
  try { state = { ...state, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { /* ملف جديد */ }
  let timer = null;
  const flushNow = () => {
    clearTimeout(timer); timer = null;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify(state));
    fs.renameSync(file + '.tmp', file); // كتابة ذرية: لا يتلف الملف عند الانقطاع
  };
  const flush = () => { if (!timer) timer = setTimeout(flushNow, 150); };
  process.on('exit', () => { if (timer) flushNow(); });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { if (timer) flushNow(); process.exit(0); });
  return { state, flush, flushNow };
}

const accounts = openStore(config.accountsFile, { users: {}, resets: {} });
const content = openStore(config.dataFile, { websites: {}, versions: {}, settings: {}, tickets: {}, docs: {}, adconns: {}, campaigns: {} });

// ترحيل تلقائي: إذا وُجدت حسابات في الملف القديم تُنقل إلى ملف الحسابات
if (content.state.users && Object.keys(content.state.users).length && !Object.keys(accounts.state.users).length) {
  accounts.state.users = content.state.users; accounts.flushNow();
  delete content.state.users; delete content.state.resets; content.flushNow();
}

export const newId = (p) => p + '_' + crypto.randomBytes(8).toString('hex');
const clone = (x) => (x == null ? x : structuredClone(x));

function col(store, name) {
  const { state, flush } = store;
  state[name] = state[name] || {};
  return {
    insert(row) { const r = { id: row.id || newId(name.slice(0, 3)), ...row }; state[name][r.id] = r; flush(); return clone(r); },
    get: (id) => clone(state[name][id]),
    find: (fn) => clone(Object.values(state[name]).find(fn)),
    list: (fn = () => true) => clone(Object.values(state[name]).filter(fn)),
    update(id, patch) { if (!state[name][id]) return null; Object.assign(state[name][id], patch); flush(); return clone(state[name][id]); },
    remove(id) { const had = !!state[name][id]; delete state[name][id]; if (had) flush(); return had; }
  };
}

export const db = {
  users: col(accounts, 'users'), resets: col(accounts, 'resets'),
  websites: col(content, 'websites'), versions: col(content, 'versions'),
  settings: col(content, 'settings'), tickets: col(content, 'tickets'), docs: col(content, 'docs'),
  adconns: col(content, 'adconns'), campaigns: col(content, 'campaigns')
};
