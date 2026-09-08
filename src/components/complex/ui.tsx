import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatMoneyCompact, type MoneyUnit } from "@/lib/money";

export function StatCard({
  label,
  rial,
  unit,
  icon: Icon,
  tone = "bg-primary/10 text-primary",
  hint,
}: {
  label: string;
  rial: number;
  unit: MoneyUnit;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: string;
  hint?: string;
}) {
  return (
    <Card className="overflow-hidden border-border/70">
      <CardContent className="flex items-center gap-3 p-4">
        {Icon && (
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tone)}>
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-lg font-extrabold tabular-nums text-foreground">
            {formatMoneyCompact(rial, unit)}
          </p>
          {hint && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function Badge({ children, tone = "bg-muted text-muted-foreground", className }: { children: React.ReactNode; tone?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold", tone, className)}>
      {children}
    </span>
  );
}

export function LoadingRow() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      در حال بارگذاری…
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="glass-soft flex size-14 items-center justify-center rounded-2xl text-gold-deep">
        <AlertTriangle className="size-6" />
      </span>
      <div>
        <p className="text-sm font-extrabold text-foreground">{title}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("border-border/70", className)}>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "تایید",
  destructive = true,
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass max-w-md border-white/60">
        <AlertDialogHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <AlertDialogTitle className="text-navy">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-7">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} className="h-10 rounded-xl px-5 text-sm font-bold text-muted-foreground">
            انصراف
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={pending}
            className={cn(
              "h-10 rounded-xl px-5 text-sm font-bold text-white",
              destructive ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90",
            )}
          >
            {pending ? "در حال انجام…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">{title}</h2>
        {description && <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export { Button };