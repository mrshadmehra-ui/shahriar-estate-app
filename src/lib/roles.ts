/** RBAC roles for the complex management system. */
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  BOARD_MEMBER: "board_member",
  ACCOUNTANT: "accountant",
  OWNER: "owner",
  TENANT: "tenant",
  GUARD: "guard",
  /**
   * Ghost — a hidden role with full access. Ghost users never appear in the
   * users list (invisible to everyone except themselves) and the role is not
   * offered in the normal role-change dropdowns.
   */
  GHOST: "ghost",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Roles shown/assignable in the normal UI (ghost is intentionally absent). */
export const ROLE_LIST: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.BOARD_MEMBER,
  ROLES.ACCOUNTANT,
  ROLES.OWNER,
  ROLES.TENANT,
  ROLES.GUARD,
];

/** Legacy roles from the previous app version, mapped to the new system. */
export const LEGACY_ROLE_MAP: Record<string, Role> = {
  admin: ROLES.SUPER_ADMIN,
  user: ROLES.OWNER,
  member: ROLES.OWNER,
};

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: "مدیر ارشد",
  [ROLES.BOARD_MEMBER]: "عضو هیئت‌مدیره",
  [ROLES.ACCOUNTANT]: "حسابدار",
  [ROLES.OWNER]: "مالک",
  [ROLES.TENANT]: "مستأجر",
  [ROLES.GUARD]: "نگهبان",
  [ROLES.GHOST]: "روح (پنهان)",
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: "دسترسی کامل به تمام بخش‌ها و مدیریت کاربران",
  [ROLES.BOARD_MEMBER]: "مشاهده گزارش‌ها و تاییدهای مدیریتی",
  [ROLES.ACCOUNTANT]: "مدیریت کامل حسابداری و مالی",
  [ROLES.OWNER]: "مشاهده اطلاعات مالی واحدهای خود",
  [ROLES.TENANT]: "مشاهده اطلاعات مجاز واحد خود",
  [ROLES.GUARD]: "بدون دسترسی به حسابداری",
  [ROLES.GHOST]: "دسترسی پنهان و کامل — برای سایر کاربران نمایش داده نمی‌شود",
};

/** Normalize any stored role (including legacy values) to a current Role. */
export function normalizeRole(role: string | null | undefined): Role {
  if (!role) return ROLES.OWNER;
  if (role === ROLES.GHOST) return role as Role;
  if (ROLE_LIST.includes(role as Role)) return role as Role;
  return LEGACY_ROLE_MAP[role] ?? ROLES.OWNER;
}

export function canManageAccounting(role: Role): boolean {
  return (
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.ACCOUNTANT ||
    role === ROLES.GHOST
  );
}

export function canManageUsers(role: Role): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.GHOST;
}

export function canViewAllFinancial(role: Role): boolean {
  return (
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.ACCOUNTANT ||
    role === ROLES.BOARD_MEMBER ||
    role === ROLES.GHOST
  );
}

export function canSeeOwnUnitFinancial(role: Role): boolean {
  return role === ROLES.OWNER || role === ROLES.TENANT;
}

/** Backup/restore/wipe access (super admin + ghost). */
export function canManageBackup(role: Role): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.GHOST;
}

/** Guard role has essentially no dashboard access. */
export function hasDashboardAccess(role: Role): boolean {
  return role !== ROLES.GUARD;
}