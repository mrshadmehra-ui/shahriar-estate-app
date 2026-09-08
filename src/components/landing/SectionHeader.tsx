import type { LucideIcon } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  chip: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
  className?: string;
}

export function SectionHeader({
  chip,
  icon: Icon,
  title,
  subtitle,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "mb-10 flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div className="space-y-3">
        <span className="glass-soft inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-gold-deep">
          <Icon className="size-3.5" />
          {chip}
        </span>
        <h2 className="text-2xl font-extrabold text-navy sm:text-3xl lg:text-[2.1rem] lg:leading-[1.3]">
          {title}
        </h2>
        {subtitle && (
          <p className="max-w-xl text-sm leading-7 text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <a
          href={action.href}
          className="glass-soft group inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-primary transition hover:bg-white/70"
        >
          {action.label}
          <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        </a>
      )}
    </motion.div>
  );
}