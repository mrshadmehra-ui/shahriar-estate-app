import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "gold-gradient relative inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_-10px_rgb(184_137_28/0.7)] ring-1 ring-white/60",
        className,
      )}
    >
      <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/35 to-transparent" />
      <Building2 className="relative size-6" strokeWidth={2.2} />
    </span>
  );
}

interface LogoProps {
  subtitle?: boolean;
  className?: string;
  light?: boolean;
}

export function Logo({ subtitle = true, className, light = false }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-lg font-extrabold tracking-tight",
            light ? "text-white" : "gold-gradient-text",
          )}
        >
          مجتمع شهریار
        </span>
        {subtitle && (
          <span
            className={cn(
              "mt-1.5 text-[11px] font-medium",
              light ? "text-white/75" : "text-muted-foreground",
            )}
          >
            سامانه مدیریت مجتمع
          </span>
        )}
      </span>
    </span>
  );
}