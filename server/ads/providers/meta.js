// ============================================================
// Meta (Facebook + Instagram): ربط OAuth، حملة مدفوعة (Marketing API)، ونشر مجاني على صفحة/إنستغرام
// ملاحظة: Meta تغيّر الإصدارات والحقول باستمرار. الإصدار قابل للضبط عبر META_API_VERSION.
// في وضع التطوير (Development mode) يعمل مع مديري التطبيق والمختبرين فقط، وللعامة يلزم App Review.
// ============================================================
import { config } from '../../lib/config.js';

const base = () => process.env.META_GRAPH_BASE || 'https://graph.facebook.com';
const ver = () => process.env.META_API_VERSION || 'v21.0';
const SCOPES = 'ads_management,ads_read,business_management,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish';

async function g(method, path, params = {}, token) {
  const url = new URL(`${base()}/${ver()}/${path}`);
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) p.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  if (token) p.set('access_token', token);
  const init = { method, signal: AbortSignal.timeout(30000) };
  if (method === 'GET') url.search = p.toString(); else { init.headers = { 'Content-Type': 'application/x-www-form-urlencoded' }; init.body = p; }
  const r = await fetch(url, init), j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error?.error_user_msg || j.error?.message || 'meta_http_' + r.status);
  return j;
}

export const meta = {
  id: 'meta', configured: () => !!(config.ads.metaId && config.ads.metaSecret),
  authUrl: (redirect, state) => `https://www.facebook.com/${ver()}/dialog/oauth?` + new URLSearchParams({ client_id: config.ads.metaId, redirect_uri: redirect, state, scope: SCOPES, response_type: 'code' }),
  // يبدّل الرمز بتوكن طويل الأمد ثم يجلب الحسابات الإعلانية والصفحات
  async exchange(code, redirect) {
    const { access_token } = await g('GET', 'oauth/access_token', { client_id: config.ads.metaId, client_secret: config.ads.metaSecret, redirect_uri: redirect, code });
    const ll = await g('GET', 'oauth/access_token', { grant_type: 'fb_exchange_token', client_id: config.ads.metaId, client_secret: config.ads.metaSecret, fb_exchange_token: access_token });
    const token = ll.access_token || access_token;
    const [acc, pages] = await Promise.all([
      g('GET', 'me/adaccounts', { fields: 'id,name,currency,account_status', limit: 50 }, token).catch(() => ({ data: [] })),
      g('GET', 'me/accounts', { fields: 'id,name,access_token,instagram_business_account{id,username}', limit: 50 }, token).catch(() => ({ data: [] }))
    ]);
    return {
      expiresAt: ll.expires_in ? Date.now() + ll.expires_in * 1000 : null,
      secrets: { token, pageTokens: Object.fromEntries(pages.data.map((p) => [p.id, p.access_token])) },
      info: { adAccounts: acc.data.map((a) => ({ id: a.id, name: a.name, currency: a.currency })), pages: pages.data.map((p) => ({ id: p.id, name: p.name, igId: p.instagram_business_account?.id || '', igName: p.instagram_business_account?.username || '' })) }
    };
  },

  // ----- نشر مجاني على صفحة فيسبوك -----
  async postPage(conn, s, camp) {
    const pageId = conn.selected.pageId, tok = s.pageTokens?.[pageId];
    if (!pageId || !tok) throw new Error('select_page');
    const msg = [camp.creative.headline, camp.creative.text].filter(Boolean).join('\n\n');
    const r = camp.creative.imageUrl ? await g('POST', `${pageId}/photos`, { url: camp.creative.imageUrl, caption: `${msg}\n\n${camp.creative.url}` }, tok) : await g('POST', `${pageId}/feed`, { message: msg, link: camp.creative.url }, tok);
    return { id: r.post_id || r.id };
  },
  // ----- نشر مجاني على إنستغرام (يتطلب صورة بعنوان عام) -----
  async postInstagram(conn, s, camp) {
    const page = conn.info.pages.find((p) => p.id === conn.selected.pageId), tok = s.pageTokens?.[page?.id];
    if (!page?.igId || !tok) throw new Error('select_instagram');
    if (!camp.creative.imageUrl) throw new Error('image_required');
    const caption = [camp.creative.headline, camp.creative.text, camp.creative.url].filter(Boolean).join('\n\n');
    const c = await g('POST', `${page.igId}/media`, { image_url: camp.creative.imageUrl, caption }, tok);
    const m = await g('POST', `${page.igId}/media_publish`, { creation_id: c.id }, tok);
    return { id: m.id };
  },

  // ----- حملة مدفوعة: Campaign ← Ad Set ← Creative ← Ad (تُنشأ متوقفة PAUSED ما لم يطلب المستخدم التفعيل) -----
  async launchPaid(conn, s, camp, activate) {
    const acct = conn.selected.adAccountId, pageId = conn.selected.pageId, token = s.token;
    if (!acct) throw new Error('select_ad_account'); if (!pageId) throw new Error('select_page');
    const status = activate ? 'ACTIVE' : 'PAUSED';
    const a = camp.audience, b = camp.budget;
    const start = b.startDate ? new Date(b.startDate + 'T00:00:00Z') : new Date(Date.now() + 5 * 60000);
    const end = new Date(start.getTime() + b.days * 86400000);
    const campaign = await g('POST', `${acct}/campaigns`, { name: camp.name, objective: 'OUTCOME_TRAFFIC', status, special_ad_categories: [] }, token);
    const adset = await g('POST', `${acct}/adsets`, {
      name: camp.name + ' — set', campaign_id: campaign.id, daily_budget: Math.round(b.daily * 100), billing_event: 'IMPRESSIONS', optimization_goal: 'LINK_CLICKS', bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      start_time: start.toISOString(), end_time: end.toISOString(), status,
      targeting: { geo_locations: { countries: a.countries.length ? a.countries : ['US'] }, age_min: a.ageMin, age_max: a.ageMax, ...(a.gender === 'male' ? { genders: [1] } : a.gender === 'female' ? { genders: [2] } : {}) }
    }, token);
    const ads = [];
    for (const [i, v] of [camp.creative, ...camp.variants].entries()) {
      const link_data = { link: camp.creative.url, message: v.text, name: v.headline, call_to_action: { type: camp.creative.cta, value: { link: camp.creative.url } }, ...(camp.creative.imageUrl ? { picture: camp.creative.imageUrl } : {}) };
      const cr = await g('POST', `${acct}/adcreatives`, { name: `${camp.name} — creative ${i + 1}`, object_story_spec: { page_id: pageId, link_data } }, token);
      const ad = await g('POST', `${acct}/ads`, { name: `${camp.name} — ad ${i + 1}`, adset_id: adset.id, creative: { creative_id: cr.id }, status }, token);
      ads.push(ad.id);
    }
    return { id: campaign.id, ids: { campaign: campaign.id, adset: adset.id, ads }, status };
  },
  async setStatus(conn, s, ids, action) { await g('POST', ids.campaign, { status: action === 'pause' ? 'PAUSED' : 'ACTIVE' }, s.token); return true; }
};
