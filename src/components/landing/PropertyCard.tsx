import { motion } from "framer-motion";
import { ChevronLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Scene } from "./Scene";
import { cn } from "@/lib/utils";
import { specIcon, type Property } from "@/lib/estate";

const badgeStyles = {
  فروش: "bg-emerald-500/95",
  اجاره: "bg-orange-500/95",
} as const;

interface PropertyCardProps {
  property: Property;
  index: number;
  onDetails: (property: Property) => void;
}

export function PropertyCard({ property, index, onDetails }: PropertyCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: (index % 3) * 0.08, ease: "easeOut" }}
      className="glass group flex flex-col overflow-hidden rounded-3xl transition duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-[0_28px_60px_-26px_rgb(23_63_128/0.32)]"
    >
      <div className="relative">
        <Scene
          src={property.image}
          alt={property.title}
          className="h-52 transition-transform duration-500 group-hover:scale-[1.03] sm:h-56"
        />
        <span
          className={cn(
            "absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-bold text-white shadow-md ring-1 ring-white/50",
            badgeStyles[property.transaction],
          )}
        >
          {property.transaction}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="line-clamp-1 text-base font-extrabold text-navy">
            {property.title}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0 text-gold-deep" />
            <span className="line-clamp-1">{property.location}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/70 pt-3">
          {property.specs.slice(0, 3).map((spec) => {
            const Icon = specIcon(spec.icon);
            return (
              <span
                key={spec.label}
                className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
              >
                <Icon className="size-3.5 text-primary/70" />
                {spec.label}
              </span>
            );
          })}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-white/70 pt-3">
          <div className="leading-tight">
            <p className="text-sm font-extrabold text-navy">{property.price}</p>
            {property.pricePerMeter && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                هر متر: {property.pricePerMeter}
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={() => onDetails(property)}
          className="mt-1 h-10 w-full rounded-xl bg-white/70 text-sm font-bold text-navy shadow-sm ring-1 ring-white/80 transition hover:bg-white"
        >
          جزئیات
          <ChevronLeft className="size-4 text-gold-deep" />
        </Button>
      </div>
    </motion.article>
  );
}

/** Placeholder shown while listings are loading. */
export function PropertyCardSkeleton() {
  return (
    <div className="glass flex flex-col overflow-hidden rounded-3xl">
      <div className="h-52 animate-pulse bg-sky-200/50 sm:h-56" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-sky-200/60" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-sky-200/50" />
        <div className="h-3 w-full animate-pulse rounded-full bg-sky-100" />
        <div className="h-9 w-full animate-pulse rounded-xl bg-sky-100" />
      </div>
    </div>
  );
}