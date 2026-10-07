// ============================================================
// الرتب والصلاحيات — عدّل هذا الجدول فقط لتغيير من يستطيع فعل ماذا
// الرتب: founder (المؤسس) > admin > moderator > support > (user عادي بدون رتبة)
// ============================================================
export const ROLES = ['user', 'support', 'moderator', 'admin', 'founder'];
export const RANK = { user: 0, support: 1, moderator: 2, admin: 3, founder: 4 };

export const PERMS = {
  founder: ['support.read', 'support.reply', 'users.view', 'users.setRole', 'users.ban', 'sites.moderate', 'pricing.edit', 'settings.edit', 'stats.view'],
  admin: ['support.read', 'support.reply', 'users.view', 'users.setRole', 'users.ban', 'sites.moderate', 'stats.view'],
  moderator: ['support.read', 'support.reply', 'users.view', 'sites.moderate'],
  support: ['support.read', 'support.reply']
};
export const roleOf = (u) => (ROLES.includes(u?.role) ? u.role : 'user');
export const permsOf = (u) => PERMS[roleOf(u)] || [];
export const can = (u, perm) => permsOf(u).includes(perm);
export const isStaff = (u) => roleOf(u) !== 'user';
// هل يستطيع الفاعل تعديل رتبة الهدف إلى newRole؟ (لا أحد يرفع أحدًا لرتبة أعلى من رتبته أو يعدّل من هو أعلى منه)
export function canAssign(actor, target, newRole) {
  if (!can(actor, 'users.setRole') || !ROLES.includes(newRole)) return false;
  const a = RANK[roleOf(actor)];
  if (roleOf(actor) === 'founder') return target.id !== actor.id || newRole === 'founder';
  return RANK[roleOf(target)] < a && RANK[newRole] < a;
}
