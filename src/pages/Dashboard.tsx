import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router";
import {
  ArrowLeftRight,
  Banknote,
  Building2,
  CalendarRange,
  ChartColumn,
  DatabaseBackup,
  FileText,
  HandCoins,
  Home,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ScrollText,
  ShieldAlert,
  Sparkles,
  UserCog,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { normalizeRole, ROLE_LABELS, ROLES, type Role } from "@/lib/roles";
import { MONEY_UNIT_LABELS, type MoneyUnit } from "@/lib/money";
import { formatJalaliLong } from "@/lib/jalali";
import { cn } from "@/lib/utils";
import { useMoneyPref } from "@/components/complex/money-context";
import { FinDashboardSection } from "@/components/complex/FinDashboardSection";
import { UnitsSection } from "@/components/complex/UnitsSection";
import { ChargesSection } from "@/components/complex/ChargesSection";
import { InvoicesSection } from "@/components/complex/InvoicesSection";
import { PaymentsSection } from "@/components/complex/PaymentsSection";
import { ExpensesSection } from "@/components/complex/ExpensesSection";
import { TreasurySection } from "@/components/complex/TreasurySection";
import { LedgerSection } from "@/components/complex/LedgerSection";
import { ReportsSection } from "@/components/complex/ReportsSection";
import { FiscalSection } from "@/components/complex/FiscalSection";
import { UsersSection } from "@/components/complex/UsersSection";
import { MyUnitsSection } from "@/components/complex/MyUnitsSection";
import { BackupSection } from "@/components/complex/BackupSection";

type SectionId =
  | "fin"
  | "units"
  | "charges"
  | "invoices"
  | "payments"
  | "expenses"
  | "treasury"
  | "ledger"
  | "reports"
  | "fiscal"
  | "users"
  | "backup"
  | "my";

interface NavItem {
  id: SectionId;
  label: string;
  icon: typeof Home;
  roles: Role[];
}

const NAV: NavItem[] = [
  { id: "fin", label: "داشبورد مالی", icon: LayoutDashboard, roles: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.BOARD_MEMBER] },
  { id: "units", label: "واحدها", icon: Building2, roles: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.BOARD_MEMBER] },
  { id: "charges", label: "شارژها", icon: Sparkles, roles: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.BOARD_MEMBER] },
  { id: "invoices", label: "فاکتورها", icon: FileText, roles: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.BOARD_MEMBER] },
  { id: "payments", label: "دریافت و پرداخت", icon: HandCoins, roles: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.BOARD_MEMBER] },
  { id: "expenses", label: "هزینه‌ها", icon: ReceiptText, roles: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.BOARD_MEMBER] },
  { id: "treasury", label: "صندوق و بانک", icon: Banknote, roles: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.BOARD_MEMBER] },
  { id: "ledger", label: "دفتر کل", icon: ScrollText, roles: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.BOARD_MEMBER] },
  { id: "reports", label: "گزارش‌ها", icon: ChartColumn, roles: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.BOARD_MEMBER] },
  { id: "fiscal", label: "دوره مالی", icon: CalendarRange, roles: [ROLES.SUPER_ADMIN, ROLES.ACCOUNTANT, ROLES.BOARD_MEMBER] },
  { id: "users", label: "کاربران و نقش‌ها", icon: UserCog, roles: [ROLES.SUPER_ADMIN] },
  { id: "backup", label: "پشتیبان‌گیری و پاک‌سازی", icon: DatabaseBackup, roles: [ROLES.SUPER_ADMIN, ROLES.OWNER] },
  { id: "my", label: "واحدهای من", icon: Home, roles: [ROLES.OWNER, ROLES.TENANT] },
];

export default function Dashboard() {
  const { user, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  const { unit, setUnit } = useMoneyPref();
  const ensureRole = useMutation(api.complex.ensureRole);
  const seedDefaults = useMutation(api.seed.seedDefaults);

  const [section, setSection] = useState<SectionId>("fin");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = useMemo(() => normalizeRole(user?.role ?? undefined), [user]);

  // Normalize / assign the user's role on mount (first user becomes super_admin).
  // For the first super_admin, provision the base data (COA, fiscal period,
  // treasury, charge rules, demo units) — idempotent, never overwrites.
  useEffect(() => {
    if (user && !isLoading) {
      ensureRole().catch(() => {});
      if (role === ROLES.SUPER_ADMIN) {
        seedDefaults({ withDemo: true }).catch(() => {});
      }
    }
  }, [user, isLoading, ensureRole, seedDefaults, role]);

  const nav = useMemo(() => {
    if (!role) return [];
    // Ghost sees every section, but is never announced anywhere.
    if (role === ROLES.GHOST) return NAV;
    return NAV.filter((n) => n.roles.includes(role));
  }, [role]);

  const defaultSection = useMemo<SectionId>(() => {
    if (role === ROLES.OWNER || role === ROLES.TENANT) return "my";
    return "fin";
  }, [role]);

  const activeSection = nav.some((n) => n.id === section) ? section : defaultSection;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (isLoading || user === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">در حال بارگذاری…</div>
      </main>
    );
  }

  // Guard role has no dashboard access (spec: guard بدون دسترسی).
  if (role === ROLES.GUARD) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldAlert className="size-7" />
          </span>
          <h1 className="mt-4 text-lg font-extrabold text-foreground">دسترسی محدود</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            حساب شما با نقش «نگهبان» ثبت شده است و به پنل مدیریت مالی دسترسی ندارد. برای دریافت دسترسی، با مدیر مجتمع تماس بگیرید.
          </p>
          <Button className="mt-6" onClick={handleSignOut}>
            <LogOut className="size-4" />
            خروج
          </Button>
        </div>
      </main>
    );
  }

  const renderSection = (id: SectionId) => {
    switch (id) {
      case "fin":
        return <FinDashboardSection />;
      case "units":
        return <UnitsSection />;
      case "charges":
        return <ChargesSection />;
      case "invoices":
        return <InvoicesSection />;
      case "payments":
        return <PaymentsSection />;
      case "expenses":
        return <ExpensesSection />;
      case "treasury":
        return <TreasurySection />;
      case "ledger":
        return <LedgerSection />;
      case "reports":
        return <ReportsSection />;
      case "fiscal":
        return <FiscalSection />;
      case "users":
        return <UsersSection />;
      case "backup":
        return <BackupSection />;
      case "my":
        return <MyUnitsSection />;
      default:
        return <FinDashboardSection />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-2 text-sm font-extrabold text-foreground"
        >
          <ArrowLeftRight className="size-5 rotate-90 text-primary" />
          منوی پنل
        </button>
        <span className="text-xs font-bold text-muted-foreground">{ROLE_LABELS[role]}</span>
      </header>

      {/* mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 overflow-y-auto border-l border-border/70 bg-card p-4">
            <SidebarContent
              role={role}
              unit={unit}
              setUnit={setUnit}
              nav={nav}
              activeSection={activeSection}
              onSelect={(id) => {
                setSection(id);
                setSidebarOpen(false);
              }}
              onSignOut={handleSignOut}
              userName={user?.name}
              compact
            />
          </aside>
        </div>
      )}

      <div className="flex">
        {/* desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-l border-border/70 bg-card lg:block">
          <SidebarContent
            role={role}
            unit={unit}
            setUnit={setUnit}
            nav={nav}
            activeSection={activeSection}
            onSelect={setSection}
            onSignOut={handleSignOut}
            userName={user?.name}
          />
        </aside>

        {/* main content */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
            {/* desktop header */}
            <div className="mb-6 hidden items-center justify-between gap-4 lg:flex">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-foreground">
                  مجتمع تجاری اداری شهریار
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatJalaliLong(Date.now())}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-xs font-bold text-foreground">
                  {user?.name ?? "کاربر"}
                  <span className="ms-2 text-muted-foreground">— {ROLE_LABELS[role]}</span>
                </span>
                <Button variant="outline" size="sm" className="h-9 gap-1 text-xs font-bold" onClick={handleSignOut}>
                  <LogOut className="size-3.5" />
                  خروج
                </Button>
              </div>
            </div>

            {renderSection(activeSection)}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  role,
  unit,
  setUnit,
  nav,
  activeSection,
  onSelect,
  onSignOut,
  userName,
  compact = false,
}: {
  role: Role;
  unit: MoneyUnit;
  setUnit: (unit: MoneyUnit) => void;
  nav: NavItem[];
  activeSection: SectionId;
  onSelect: (id: SectionId) => void;
  onSignOut: () => void;
  userName?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-2.5 border-b border-border/70 px-4 py-4", compact && "py-3")}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Building2 className="size-5" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-extrabold text-foreground">مجتمع شهریار</p>
          <p className="truncate text-[11px] text-muted-foreground">{userName ?? "پنل مدیریت"}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {ROLE_LABELS[role]}
        </p>
        {nav.map((item) => {
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-border/70 p-3">
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
          <span className="text-[11px] font-bold text-muted-foreground">واحد نمایش مبالغ</span>
          <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5">
            {(["toman", "rial"] as MoneyUnit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-bold transition",
                  unit === u ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {MONEY_UNIT_LABELS[u]}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-bold text-destructive transition hover:bg-destructive/10 lg:hidden"
        >
          <LogOut className="size-3.5" />
          خروج از حساب
        </button>
      </div>
    </div>
  );
}