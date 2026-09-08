/** RBAC roles for the complex management system. */
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  BOARD_MEMBER: "board_member",
  ACCOUNTANT: "accountant",
  OWNER: "owner",
  TENANT: "tenant",
  GUARD: "guard",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

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
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: "دسترسی کامل به تمام بخش‌ها و مدیریت کاربران",
  [ROLES.BOARD_MEMBER]: "مشاهده گزارش‌ها و تاییدهای مدیریتی",
  [ROLES.ACCOUNTANT]: "مدیریت کامل حسابداری و مالی",
  [ROLES.OWNER]: "مشاهده اطلاعات مالی واحدهای خود",
  [ROLES.TENANT]: "مشاهده اطلاعات مجاز واحد خود",
  [ROLES.GUARD]: "بدون دسترسی به حسابداری",
};

/** Normalize any stored role (including legacy values) to a current Role. */
export function normalizeRole(role: string | null | undefined): Role {
  if (!role) return ROLES.OWNER;
  if (ROLE_LIST.includes(role as Role)) return role as Role;
  return LEGACY_ROLE_MAP[role] ?? ROLES.OWNER;
}

export function canManageAccounting(role: Role): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ACCOUNTANT;
}

export function canManageUsers(role: Role): boolean {
  return role === ROLES.SUPER_ADMIN;
}

export function canViewAllFinancial(role: Role): boolean {
  return (
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.ACCOUNTANT ||
    role === ROLES.BOARD_MEMBER
  );
}

export function canSeeOwnUnitFinancial(role: Role): boolean {
  return role === ROLES.OWNER || role === ROLES.TENANT;
}

/** Guard role has essentially no dashboard access. */
export function hasDashboardAccess(role: Role): boolean {
  return role !== ROLES.GUARD;
}