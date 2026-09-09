import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Database, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
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
};

export function UsersSection() {
  const users = useQuery(api.complex.listUsers);
  const setRole = useMutation(api.complex.setUserRole);
  const seed = useMutation(api.seed.seedDefaults);
  const [seeding, setSeeding] = useState(false);
  const [seedConfirm, setSeedConfirm] = useState(false);
  const [changing, setChanging] = useState<Id<"users"> | null>(null);

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

  const doSetRole = async (userId: Id<"users">, role: Role) => {
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
        description="مدیریت نقش کاربران — دسترسی مالی فقط به حسابدار و مدیر ارشد داده می‌شود."
        action={
          <Button variant="outline" size="sm" onClick={() => setSeedConfirm(true)}>
            <Database className="size-4" />
            ساخت داده‌های پایه
          </Button>
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
                      <Select value={u.role} onValueChange={(v) => doSetRole(u._id, v as Role)} disabled={changing === u._id}>
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
          <p className="font-extrabold text-foreground">نکات دسترسی</p>
          <p>
            کاربری که واحد به او متصل نشده باشد، با نقش «مالک» یا «مستأجر» فقط بخش «واحدهای من» را می‌بیند.
            برای اتصال واحد به حساب کاربر، از بخش واحدها استفاده کنید (مالک/مستأجر باید قبلاً وارد سامانه شده باشند).
          </p>
        </div>
      </div>

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