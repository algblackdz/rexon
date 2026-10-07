// واجهات الذكاء الاصطناعي: توليد موقع كامل + تعديل بالأوامر + قوالب Marketplace
import { route, HttpError, send } from '../lib/http.js';
import { WEBSITE_TYPES } from '../../shared/schema.js';
import { STYLES, PRESETS } from '../ai/copy.js';
import { generate, edit, aiMode } from '../ai/provider.js';
import { normalizeWebsite } from '../../shared/schema.js';
import { TEMPLATES, templateParams } from '../ai/templates.js';
import { mockGenerate } from '../ai/mock.js';
import { createWebsite, view } from './websites.js';
import { renderDocument } from '../../shared/render.js';
import { buildCSS } from '../../shared/css.js';
import { LANGS } from '../../shared/schema.js';

route('POST', '/api/ai/generate', async ({ user, body }) => {
  const type = WEBSITE_TYPES.includes(body.type) ? body.type : 'other';
  const prompt = String(body.prompt || '').trim().slice(0, 1500);
  if (prompt.length < 3) throw new HttpError(400, 'prompt_required');
  const colors = body.colors && typeof body.colors === 'object' ? { preset: PRESETS[body.colors.preset] ? body.colors.preset : undefined, primary: body.colors.primary, secondary: body.colors.secondary } : {};
  const params = { type, prompt, style: body.style in STYLES ? body.style : 'modern', colors, language: ['en', 'fr', 'ar', 'multi'].includes(body.language) ? body.language : undefined, name: String(body.name || '').slice(0, 80) };
  const { site, source } = await generate(params);
  return { website: view(createWebsite(user.id, site), true), source };
}, { auth: true, limit: [8, 60000] });

route('POST', '/api/ai/edit', async ({ user, body }) => {
  const command = String(body.command || '').trim().slice(0, 500);
  if (!command) throw new HttpError(400, 'prompt_required');
  let site;
  try { site = normalizeWebsite(body.website); } catch { throw new HttpError(400, 'invalid_website'); }
  const out = await edit(site, command);
  return { website: out.website, message: out.message, source: out.source };
}, { auth: true, limit: [20, 60000], bodyLimit: 12_000_000 });

route('GET', '/api/ai/status', () => ({ mode: aiMode() }));

route('GET', '/api/templates', () => ({ templates: TEMPLATES }));

// معاينة قالب كصفحة كاملة (تُعرض داخل iframe)
route('GET', '/api/templates/:id/preview', ({ params, query, res }) => {
  const t = TEMPLATES.find((x) => x.id === params.id);
  if (!t) throw new HttpError(404, 'not_found');
  const lang = LANGS.includes(query.lang) ? query.lang : 'en';
  const site = mockGenerate(templateParams(t, lang, lang));
  const html = renderDocument(site, site.pages[0], lang, { css: buildCSS(site), editor: false });
  send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: https:", 'Cache-Control': 'public, max-age=300' });
});

route('POST', '/api/templates/:id/use', ({ user, params, body }) => {
  const t = TEMPLATES.find((x) => x.id === params.id);
  if (!t) throw new HttpError(404, 'not_found');
  const lang = LANGS.includes(body.lang) ? body.lang : 'en';
  const language = ['en', 'fr', 'ar', 'multi'].includes(body.language) ? body.language : lang;
  return { website: view(createWebsite(user.id, mockGenerate(templateParams(t, lang, language))), true) };
}, { auth: true, limit: [20, 600000] });
