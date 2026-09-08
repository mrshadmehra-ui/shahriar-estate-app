import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Search, SearchX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropertyCard } from "./PropertyCard";
import { AREAS, properties, type Category, type Transaction } from "@/lib/estate";
import { cn } from "@/lib/utils";
import { faNumber } from "@/lib/fa";

interface Filters {
  transaction: "همه" | Transaction;
  category: "همه" | Category;
  area: "همه مناطق" | (typeof AREAS)[number];
  minPrice: string;
  maxPrice: string;
}

const DEFAULT_FILTERS: Filters = {
  transaction: "همه",
  category: "همه",
  area: "همه مناطق",
  minPrice: "",
  maxPrice: "",
};

const TRANSACTIONS: Filters["transaction"][] = ["همه", "فروش", "اجاره"];
const CATEGORIES: Filters["category"][] = ["همه", "مسکونی", "اداری", "تجاری", "صنعتی"];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

interface SearchSectionProps {
  onDetails: (property: (typeof properties)[number]) => void;
}

export function SearchSection({ onDetails }: SearchSectionProps) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const results = useMemo(() => {
    const min = (Number(filters.minPrice) || 0) * 1_000_000;
    const max = (Number(filters.maxPrice) || Infinity) * 1_000_000;
    return properties.filter((p) => {
      if (filters.transaction !== "همه" && p.transaction !== filters.transaction) return false;
      if (filters.category !== "همه" && p.category !== filters.category) return false;
      if (filters.area !== "همه مناطق" && p.area !== filters.area) return false;
      if (p.priceValue < min) return false;
      if (p.priceValue > max) return false;
      return true;
    });
  }, [filters]);

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <section id="listings" className="relative py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Smart search panel */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="glass relative overflow-hidden rounded-[2rem] p-5 sm:p-7"
        >
          <span className="pointer-events-none absolute -top-16 -left-16 size-48 rounded-full bg-sky-200/40 blur-3xl" />
          <span className="pointer-events-none absolute -bottom-20 -right-10 size-52 rounded-full bg-gold-soft/70 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <span className="gold-gradient flex size-11 items-center justify-center rounded-xl text-white shadow-md ring-1 ring-white/60">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-navy sm:text-xl">
                جستجوی هوشمند ملک
              </h2>
              <p className="text-xs text-muted-foreground">
                فایل‌های تایید شده را بر اساس نیاز خود فیلتر کنید
              </p>
            </div>
          </div>

          <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
            {/* transaction toggle */}
            <div className="lg:col-span-3">
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">
                نوع معامله
              </label>
              <div className="glass-soft flex w-full rounded-full p-1">
                {TRANSACTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilters((f) => ({ ...f, transaction: t }))}
                    className={cn(
                      "flex-1 rounded-full px-3 py-2 text-xs font-bold transition sm:text-sm",
                      filters.transaction === t
                        ? "bg-primary text-white shadow-md"
                        : "text-navy hover:bg-white/70",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* category */}
            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">
                نوع ملک
              </label>
              <Select
                value={filters.category}
                onValueChange={(value) =>
                  setFilters((f) => ({ ...f, category: value as Filters["category"] }))
                }
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-soft border-white/70 bg-white/85 backdrop-blur-xl">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === "همه" ? "همه" : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* area */}
            <div className="lg:col-span-3">
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">
                منطقه
              </label>
              <Select
                value={filters.area}
                onValueChange={(value) =>
                  setFilters((f) => ({ ...f, area: value as Filters["area"] }))
                }
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-soft border-white/70 bg-white/85 backdrop-blur-xl">
                  <SelectItem value="همه مناطق">همه مناطق</SelectItem>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* price range */}
            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">
                از قیمت (میلیون تومان)
              </label>
              <Input
                type="number"
                min={0}
                dir="ltr"
                value={filters.minPrice}
                onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
                placeholder="حداقل"
                className="h-11 rounded-xl border-white/80 bg-white/60 text-end shadow-sm backdrop-blur-md"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">
                تا قیمت (میلیون تومان)
              </label>
              <Input
                type="number"
                min={0}
                dir="ltr"
                value={filters.maxPrice}
                onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
                placeholder="حداکثر"
                className="h-11 rounded-xl border-white/80 bg-white/60 text-end shadow-sm backdrop-blur-md"
              />
            </div>

            <div className="lg:col-span-12">
              <Button
                onClick={() => scrollToId("results")}
                className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgb(30_86_200/0.7)] transition hover:bg-primary/90 lg:h-14"
              >
                <Search className="size-4" />
                جستجو
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Results */}
        <div id="results" className="mt-14 scroll-mt-28">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-navy sm:text-3xl">
                فایل‌های منتخب
              </h2>
              <span className="glass-soft rounded-full px-3 py-1 text-xs font-bold text-primary">
                {faNumber(results.length)} ملک یافت شد
              </span>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={resetFilters}
                className="glass-soft h-9 rounded-full px-4 text-xs font-bold text-navy hover:bg-white/70"
              >
                <RotateCcw className="size-3.5" />
                مشاهده همه
              </Button>
            )}
          </div>

          {results.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((property, index) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  index={index}
                  onDetails={onDetails}
                />
              ))}
            </div>
          ) : (
            <div className="glass flex flex-col items-center gap-4 rounded-[2rem] px-6 py-16 text-center">
              <span className="glass-soft flex size-16 items-center justify-center rounded-2xl text-gold-deep">
                <SearchX className="size-7" />
              </span>
              <div>
                <p className="text-base font-extrabold text-navy">
                  ملکی مطابق جستجوی شما یافت نشد
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  فیلترها را تغییر دهید یا برای راهنمایی دقیق‌تر با مشاوران ما تماس بگیرید.
                </p>
              </div>
              <Button
                onClick={resetFilters}
                className="gold-gradient h-10 rounded-full px-6 text-sm font-bold text-white shadow-md ring-1 ring-white/60"
              >
                <RotateCcw className="size-4" />
                مشاهده همه فایل‌ها
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}