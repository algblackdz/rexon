// ============================================================
// TikTok Ads (Marketing API v1.3): ربط OAuth وإنشاء Campaign ← Ad Group ← Ad
// تنبيه صريح: حقول TikTok كثيرة وتتغير بحسب الهدف والدولة. هذا الكود يغطي حملة "زيارات الموقع" الأساسية،
// وإن أرجع الخادم خطأ في حقل معيّن فعدّل الحقل المذكور في الرسالة حسب توثيق Marketing API الحالي.
// ============================================================
import { config } from '../../lib/config.js';

const base = () => process.env.TIKTOK_BASE || 'https://business-api.tiktok.com';
async function tt(method, path, body, token, query) {
  const url = new URL(`${base()}/open_api/v1.3/${path}`);
  if (query) url.search = new URLSearchParams(query).toString();
  const init = { method, headers: { 'Content-Type': 'application/json', ...(token ? { 'Access-Token': token } : {}) }, signal: AbortSignal.timeout(30000) };
  if (body) init.body = JSON.stringify(body);
  const r = await fetch(url, init), j = await r.json().catch(() => ({}));
  if (!r.ok || j.code !== 0) throw new Error(j.message || 'tiktok_http_' + r.status);
  return j.data || {};
}
const CTA = { LEARN_MORE: 'LEARN_MORE', SHOP_NOW: 'SHOP_NOW', SIGN_UP: 'SIGN_UP', CONTACT_US: 'CONTACT_US', GET_QUOTE: 'GET_QUOTE', BOOK_NOW: 'BOOK_NOW' };

export const tiktok = {
  id: 'tiktok', configured: () => !!(config.ads.tiktokId && config.ads.tiktokSecret),
  authUrl: (redirect, state) => `https://business-api.tiktok.com/portal/auth?` + new URLSearchParams({ app_id: config.ads.tiktokId, state, redirect_uri: redirect }),
  async exchange(authCode) {
    const d = await tt('POST', 'oauth2/access_token/', { app_id: config.ads.tiktokId, secret: config.ads.tiktokSecret, auth_code: authCode });
    const ids = d.advertiser_ids || [];
    let names = {};
    try { const info = await tt('GET', 'advertiser/info/', null, d.access_token, { advertiser_ids: JSON.stringify(ids), fields: JSON.stringify(['name', 'currency']) }); (info.list || []).forEach((a) => { names[a.advertiser_id] = a; }); } catch { /* الأسماء اختيارية */ }
    return { expiresAt: null, secrets: { token: d.access_token }, info: { advertisers: ids.map((id) => ({ id, name: names[id]?.name || id, currency: names[id]?.currency || '' })) } };
  },
  async launchPaid(conn, s, camp, activate) {
    const adv = conn.selected.advertiserId; if (!adv) throw new Error('select_advertiser');
    const token = s.token, b = camp.budget, a = camp.audience, op = activate ? 'ENABLE' : 'DISABLE';
    const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
    const start = b.startDate ? new Date(b.startDate + 'T00:00:00Z') : new Date(Date.now() + 10 * 60000), end = new Date(start.getTime() + b.days * 86400000);
    const campaign = await tt('POST', 'campaign/create/', { advertiser_id: adv, campaign_name: camp.name, objective_type: 'TRAFFIC', budget_mode: 'BUDGET_MODE_INFINITE', operation_status: op }, token);
    const adgroup = await tt('POST', 'adgroup/create/', {
      advertiser_id: adv, campaign_id: campaign.campaign_id, adgroup_name: camp.name + ' — group', placement_type: 'PLACEMENT_TYPE_AUTOMATIC', promotion_type: 'WEBSITE', promotion_target_type: 'EXTERNAL_WEBSITE',
      budget_mode: 'BUDGET_MODE_DAY', budget: b.daily, schedule_type: 'SCHEDULE_START_END', schedule_start_time: fmt(start), schedule_end_time: fmt(end),
      optimization_goal: 'CLICK', bid_type: 'BID_TYPE_NO_BID', billing_event: 'CPC', pacing: 'PACING_MODE_SMOOTH', operation_status: op,
      age_groups: ageGroups(a.ageMin, a.ageMax), ...(a.gender === 'male' ? { gender: 'GENDER_MALE' } : a.gender === 'female' ? { gender: 'GENDER_FEMALE' } : { gender: 'GENDER_UNLIMITED' }),
      ...(a.countries.length ? { location_ids: a.countries } : {})
    }, token);
    let imageId;
    if (camp.creative.imageUrl) { const up = await tt('POST', 'file/image/ad/upload/', { advertiser_id: adv, upload_type: 'UPLOAD_BY_URL', image_url: camp.creative.imageUrl }, token); imageId = up.image_id; }
    const identity = await tt('POST', 'identity/create/', { advertiser_id: adv, display_name: camp.name.slice(0, 40) }, token);
    const creatives = [camp.creative, ...camp.variants].map((v, i) => ({ ad_name: `${camp.name} — ad ${i + 1}`, ad_text: v.text.slice(0, 100), identity_type: 'CUSTOMIZED_USER', identity_id: identity.identity_id, ad_format: 'SINGLE_IMAGE', ...(imageId ? { image_ids: [imageId] } : {}), landing_page_url: camp.creative.url, call_to_action: CTA[camp.creative.cta] || 'LEARN_MORE', operation_status: op }));
    const ad = await tt('POST', 'ad/create/', { advertiser_id: adv, adgroup_id: adgroup.adgroup_id, creatives }, token);
    return { id: campaign.campaign_id, ids: { campaign: campaign.campaign_id, adgroup: adgroup.adgroup_id, ads: ad.ad_ids || [] }, status: activate ? 'ACTIVE' : 'PAUSED' };
  },
  async setStatus(conn, s, ids, action) { await tt('POST', 'campaign/status/update/', { advertiser_id: conn.selected.advertiserId, campaign_ids: [ids.campaign], operation_status: action === 'pause' ? 'DISABLE' : 'ENABLE' }, s.token); return true; }
};
function ageGroups(min, max) {
  const G = [['AGE_13_17', 13, 17], ['AGE_18_24', 18, 24], ['AGE_25_34', 25, 34], ['AGE_35_44', 35, 44], ['AGE_45_54', 45, 54], ['AGE_55_100', 55, 100]];
  return G.filter(([, lo, hi]) => hi >= min && lo <= max).map(([k]) => k);
}
