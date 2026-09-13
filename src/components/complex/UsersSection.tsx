import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Database, Eye, EyeOff, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABELS, ROLE_LIST, type Role } from "@/lib/roles";
import { toFa } from "@/lib/fa";
import { Badge, ConfirmDialog, LoadingRow, Panel, SectionHeader } from "./ui";

const ROLE_TONES: Record<string, string> = {
  super_admin: "bg-rose-100 text-rose-700",
  board_member: "bg-amber-100 text-amber-700",
  accountant: "bg-sky-100 text-sky-700",
  owner: "bg-emerald-100 text-emerald-700",
  tenant: "bg-indigo-100 text-indigo-700",
  guard: "bg-slate-100 text-slate-600",
  ghost: "bg-violet-100 text-violet-700",
};

type AssignableRole = "super_admin" | "board_member" | "accountant" | "owner" | "tenant" | "guard";

export function UsersSection() {
  const users = useQuery(api.complex.listUsers);
  const setRole = useMutation(api.complex.setUserRole);
  const seed = useMutation(api.seed.seedDefaults);
  const adminCreateUser = useAction(api.complex.adminCreateUser);
  const [seeding, setSeeding] = useState(false);
  const [seedConfirm, setSeedConfirm] = useState(false);
  const [changing, setChanging] = useState<Id<"users"> | null>(null);

  // new user form
  const [userOpen, setUserOpen] = useState(false);
  const [nuName, setNuName] = useState("");
  const [nuEmail, setNuEmail] = useState("");
  const [nuPhone, setNuPhone] = useState("");
  const [nuRole, setNuRole] = useState<Role>("accountant");
  const [nuPassword, setNuPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const resetNewUser = () => {
    setNuName("");
    setNuEmail("");
    setNuPhone("");
    setNuRole("accountant");
    setNuPassword("");
    setShowPassword(false);
  };

  const submitNewUser = async () => {
    if (!nuName.trim() || !nuEmail.trim() || !nuPassword) {
      toast.error("نام، ایمیل و رمز عبور را وارد کنید");
      return;
    }
    setCreating(true);
    try {
      await adminCreateUser({
        email: nuEmail.trim(),
        password: nuPassword,
        name: nuName.trim(),
        phone: nuPhone.trim() || undefined,
        role: nuRole,
      });
      toast.success("حساب کاربری ساخته شد", {
        description: `کاربر «${nuName.trim()}» با نقش «${ROLE_LABELS[nuRole]}» می‌تواند با همین ایمیل و رمز وارد شود.`,
      });
      setUserOpen(false);
      resetNewUser();
    } catch (e) {
      toast.error((e as Error).message ?? "ساخت کاربر ناموفق بود");
    } finally {
      setCreating(false);
    }
  };

  const doSeed = async () => {
    setSeeding(true);
    try {
      const report = await seed({ withDemo: true });
      const parts = Object.entries(report)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}: ${toFa(v)}`);
      toast.success("داده‌های پایه ساخته شد", {
        description: parts.length ? parts.join(" — ") : "همه داده‌های پایه از قبل موجود بودند.",
      });
      setSeedConfirm(false);
    } catch (e) {
      toast.error((e as Error).message ?? "ساخت داده‌های پایه ناموفق بود");
    } finally {
      setSeeding(false);
    }
  };

  const doSetRole = async (userId: Id<"users">, role: AssignableRole) => {
    setChanging(userId);
    try {
      await setRole({ userId, role });
      toast.success("نقش کاربر به‌روزرسانی شد");
    } catch (e) {
      toast.error((e as Error).message ?? "تغییر نقش ناموفق بود");
    } finally {
      setChanging(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="کاربران و نقش‌ها"
        description="ساخت حساب کاربری با ایمیل/نام کاربری و رمز، و مدیریت نقش‌ها — ثبت‌نام عمومی فقط با نقش «مالک» امکان‌پذیر است."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSeedConfirm(true)}>
              <Database className="size-4" />
              ساخت داده‌های پایه
            </Button>
            <Button size="sm" onClick={() => { resetNewUser(); setUserOpen(true); }}>
              <UserPlus className="size-4" />
              کاربر جدید
            </Button>
          </div>
        }
      />

      <Panel>
        {users === undefined ? (
          <LoadingRow />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-extrabold text-foreground">نام</TableHead>
                  <TableHead className="text-xs font-extrabold text-foreground">ایمیل</TableHead>
                  <TableHead className="hidden text-xs font-extrabold text-foreground md:table-cell">تلفن</TableHead>
                  <TableHead className="text-xs font-extrabold text-foreground">نقش</TableHead>
                  <TableHead className="text-end text-xs font-extrabold text-foreground">تغییر نقش</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u._id} className="hover:bg-muted/40">
                    <TableCell className="text-xs font-bold">{u.name}</TableCell>
                    <TableCell dir="ltr" className="text-end text-xs text-muted-foreground">{u.email}</TableCell>
                    <TableCell dir="ltr" className="hidden text-end text-xs text-muted-foreground md:table-cell">{u.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge tone={ROLE_TONES[u.role] ?? "bg-muted text-muted-foreground"}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Select value={u.role} onValueChange={(v) => doSetRole(u._id, v as AssignableRole)} disabled={changing === u._id}>
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_LIST.map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-4" />
        </span>
        <div className="text-xs leading-6 text-muted-foreground">
          <p className="font-extrabold text-foreground">نکات دسترسی و ثبت‌نام</p>
          <p>
            <span className="font-bold text-foreground">ثبت‌نام عمومی:</span> فقط به‌عنوان «مالک» امکان‌پذیر است؛ اولین کاربر ثبت‌نام‌شده خودکار «مدیر ارشد» می‌شود.
          </p>
          <p>
            <span className="font-bold text-foreground">حسابدار، هیئت‌مدیره، نگهبان و مستأجر:</span> فقط توسط مدیر ارشد با دکمه «کاربر جدید» ساخته می‌شوند (ایمیل + رمز).
          </p>
          <p>
            کاربری که واحد به او متصل نشده باشد، فقط بخش «واحدهای من» را می‌بیند. برای اتصال واحد به حساب کاربر، از بخش واحدها استفاده کنید.
          </p>
        </div>
      </div>

      {/* new user dialog */}
      <Dialog open={userOpen} onOpenChange={setUserOpen}>
        <DialogContent className="glass max-w-md border-white/60">
          <DialogHeader>
            <DialogTitle className="text-navy">ساخت حساب کاربری جدید</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              ایمیل همان «نام کاربری» است؛ کاربر با همین ایمیل و رمز وارد می‌شود (بدون نیاز به کد تایید).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نام و نام خانوادگی</Label>
              <Input dir="rtl" value={nuName} onChange={(e) => setNuName(e.target.value)} placeholder="مثلاً: حسابدار مجتمع" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">ایمیل (نام کاربری)</Label>
              <Input dir="ltr" className="text-end" type="email" value={nuEmail} onChange={(e) => setNuEmail(e.target.value)} placeholder="accountant@shahriar.ir" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">تلفن (اختیاری)</Label>
              <Input dir="ltr" className="text-end" value={nuPhone} onChange={(e) => setNuPhone(e.target.value)} placeholder="0912-…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نقش</Label>
              <Select value={nuRole} onValueChange={(v) => setNuRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_LIST.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                  <SelectItem value="ghost">
                    روح (پنهان) — دسترسی کامل نامرئی
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {nuRole === "ghost" && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] leading-5 text-violet-800">
                حساب «روح» در فهرست کاربران به هیچ‌کس (حتی مدیر ارشد) نمایش داده نمی‌شود و دسترسی کامل دارد — فقط از طریق همین فرم ساخته می‌شود.
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">رمز عبور (حداقل ۸ کاراکتر)</Label>
              <div className="relative">
                <Input
                  dir="ltr"
                  className="pe-9 text-end"
                  type={showPassword ? "text" : "password"}
                  value={nuPassword}
                  onChange={(e) => setNuPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "پنهان‌کردن رمز" : "نمایش رمز"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserOpen(false)}>انصراف</Button>
            <Button onClick={submitNewUser} disabled={creating}>
              {creating ? "در حال ساخت…" : "ساخت حساب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={seedConfirm}
        onOpenChange={setSeedConfirm}
        title="ساخت داده‌های پایه"
        description="سرفصل حساب‌ها، دوره مالی ۱۴۰۵، صندوق/بانک، قوانین شارژ و واحدهای نمونه ساخته می‌شوند — اگر از قبل وجود داشته باشند، تغییری ایجاد نمی‌شود."
        confirmLabel="ساخت داده‌ها"
        pending={seeding}
        onConfirm={doSeed}
      />
    </div>
  );
}