// ============================================================
// القنوات المجانية: Telegram (قناة/مجموعة)، Discord (Webhook)، وروابط المشاركة لبقية المنصات.
// لا تحتاج موافقة من أي منصة: يكفي توكن بوت تيليجرام أو رابط Webhook من ديسكورد.
// ============================================================
const tgBase = () => process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';
const DISCORD_RE = /^https:\/\/(?:canary\.|ptb\.)?(?:discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;
const post = async (url, body) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  return { r, j };
};
const full = (c) => [c.headline, c.text, c.url].filter(Boolean).join('\n\n');

export const telegram = {
  id: 'telegram',
  validate: (v) => /^\d{5,}:[\w-]{20,}$/.test(v.token || '') && /^(@[\w]{4,}|-?\d{5,})$/.test(v.chatId || ''),
  async send(s, camp) {
    const c = camp.creative, url = (m) => `${tgBase()}/bot${s.token}/${m}`;
    const { r, j } = c.imageUrl ? await post(url('sendPhoto'), { chat_id: s.chatId, photo: c.imageUrl, caption: full(c).slice(0, 1024) }) : await post(url('sendMessage'), { chat_id: s.chatId, text: full(c).slice(0, 4096), disable_web_page_preview: false });
    if (!r.ok || !j.ok) throw new Error(j.description || 'telegram_http_' + r.status);
    return { id: String(j.result?.message_id || '') };
  },
  async test(s) { const { r, j } = await post(`${tgBase()}/bot${s.token}/sendMessage`, { chat_id: s.chatId, text: '✅ NEXORA: connection works' }); if (!r.ok || !j.ok) throw new Error(j.description || 'telegram_http_' + r.status); return true; }
};
export const discord = {
  id: 'discord',
  validate: (v) => DISCORD_RE.test(v.webhook || ''),
  async send(s, camp) {
    const c = camp.creative;
    const { r } = await post(s.webhook + '?wait=true', { username: 'NEXORA', embeds: [{ title: c.headline.slice(0, 256), description: c.text.slice(0, 2000), url: c.url, color: 0x7c3aed, ...(c.imageUrl ? { image: { url: c.imageUrl } } : {}) }] });
    if (!r.ok) throw new Error('discord_http_' + r.status);
    return { id: '' };
  },
  async test(s) { const { r } = await post(s.webhook, { content: '✅ NEXORA: connection works' }); if (!r.ok) throw new Error('discord_http_' + r.status); return true; }
};
// روابط مشاركة جاهزة (تفتح نافذة النشر المعبّأة في كل منصة؛ المستخدم يضغط "نشر")
export function shareLinks(camp) {
  const c = camp.creative, u = encodeURIComponent(c.url), t = encodeURIComponent([c.headline, c.text].filter(Boolean).join(' — ')), both = encodeURIComponent(full(c));
  return [
    ['x', `https://twitter.com/intent/tweet?text=${t.slice(0, 230)}&url=${u}`], ['facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`],
    ['linkedin', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`], ['whatsapp', `https://wa.me/?text=${both}`], ['telegram', `https://t.me/share/url?url=${u}&text=${t}`],
    ['reddit', `https://www.reddit.com/submit?url=${u}&title=${encodeURIComponent(c.headline)}`], ['pinterest', `https://pinterest.com/pin/create/button/?url=${u}&description=${t}${c.imageUrl ? '&media=' + encodeURIComponent(c.imageUrl) : ''}`],
    ['threads', `https://www.threads.net/intent/post?text=${both}`], ['email', `mailto:?subject=${encodeURIComponent(c.headline)}&body=${both}`]
  ].map(([id, url]) => ({ id, url }));
}
