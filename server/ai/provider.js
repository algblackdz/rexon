// ============================================================
// AI Provider — يختار بين Claude الحقيقي والمولّد التجريبي
// بدون ANTHROPIC_API_KEY يعمل Mock تلقائيًا. أي فشل في الذكاء الاصطناعي يرجع للـ Mock.
// الذكاء الاصطناعي لا يكتب HTML: يرجع JSON حسب Schema ثم نتحقق منه بـ normalizeWebsite.
// ============================================================
import { config } from '../lib/config.js';
import { normalizeWebsite, COMPONENTS, WEBSITE_TYPES, ANIMATIONS } from '../../shared/schema.js';
import { makeSection } from '../../shared/defaults.js';
import { mockGenerate, mockEdit } from './mock.js';

export const aiMode = () => (config.ai.key ? 'claude' : 'mock');

function schemaGuide() {
  const examples = COMPONENTS.map((c) => `"${c}": ${JSON.stringify(makeSection(c, { lang: 'en', multi: false, name: 'Brand' }).props)}`).join('\n');
  return `You generate website definitions as STRICT JSON (no markdown, no prose).
Top-level keys: name, type (${WEBSITE_TYPES.join('|')}), language (en|fr|ar|multi), theme{mode,style,radius,colors{primary,secondary,bg,surface,text,muted} (hex #rrggbb),fonts{latin,arabic}}, seo{title,description}, pages[{slug,title,sections[]}], layout{navbar,footer}, settings{}.
First page slug must be "index". Each section: {"id":"sec_xxxx","component":one of ${COMPONENTS.join(',')},"props":{...},"style":{},"animation":one of ${ANIMATIONS.join('|')},"hover":"none|lift|glow|scale"}.
layout.navbar must use component "navbar"; layout.footer must use component "footer"; do not put them in pages.
Links use "page:<slug>" or "#anchor". Never include HTML, scripts or URLs inside text.
If language is "multi", every visible text must be an object {"en":"...","fr":"...","ar":"..."} with natural (not literal) translations; otherwise plain strings in that language.
Default props per component (follow these shapes exactly):
${examples}`;
}

async function callClaude(system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': config.ai.key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: config.ai.model, max_tokens: 12000, system, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(120000)
  });
  if (!res.ok) throw new Error('ai_http_' + res.status);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('ai_no_json');
  return JSON.parse(text.slice(a, b + 1));
}

// محادثة حرة (المساعد): ترجع نصًا أو ترمي خطأ إذا لا يوجد مفتاح
export async function chat(system, messages, maxTokens = 1200) {
  if (!config.ai.key) throw new Error('no_key');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': config.ai.key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: config.ai.model, max_tokens: maxTokens, system, messages }),
    signal: AbortSignal.timeout(60000)
  });
  if (!res.ok) throw new Error('ai_http_' + res.status);
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

export async function generate(params) {
  if (config.ai.key) {
    try {
      const out = await callClaude(schemaGuide(), `Create a website.\nType: ${params.type}\nStyle: ${params.style}\nColors: ${JSON.stringify(params.colors || {})}\nWebsite language: ${params.language}\nName: ${params.name || '(choose a fitting name)'}\nUser description (any language): ${params.prompt}`);
      return { site: normalizeWebsite(out), source: 'claude' };
    } catch (e) { console.warn('[nexora] فشل Claude، سيتم استخدام المولّد التجريبي:', e.message); }
  }
  return { site: mockGenerate(params), source: 'mock' };
}

export async function edit(site, command) {
  if (config.ai.key) {
    try {
      const slim = { ...site, assets: site.assets.map((a) => ({ id: a.id, name: a.name })) };
      const out = await callClaude(schemaGuide(), `Current website JSON:\n${JSON.stringify(slim)}\n\nApply this user request (any language) and return the FULL updated website JSON, keeping section ids and everything the request does not touch:\n${command}`);
      const next = normalizeWebsite({ ...out, assets: site.assets });
      return { website: next, message: { code: 'ai.done' }, source: 'claude' };
    } catch (e) { console.warn('[nexora] فشل Claude في التعديل:', e.message); }
  }
  return { ...mockEdit(site, command), source: 'mock' };
}
