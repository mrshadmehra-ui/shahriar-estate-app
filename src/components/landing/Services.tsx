import { motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";
import { CATEGORY_META, type Category } from "@/lib/estate";
import { SectionHeader } from "./SectionHeader";

const CATEGORIES: Category[] = ["مسکونی", "اداری", "تجاری", "صنعتی"];

export function Services() {
  return (
    <section id="services" className="relative py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          chip="خدمات ما"
          icon={LayoutGrid}
          title="خدمات تخصصی خرید، فروش و اجاره"
          subtitle="از آپارتمان‌های مسکونی تا سوله‌های صنعتی؛ در هر حوزه، فایل‌های تایید شده و مشاوره‌ی دقیق در کنار شماست."
          action={{ label: "مشاهده همه خدمات", href: "#listings" }}
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category, index) => {
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;
            return (
              <motion.a
                key={category}
                href="#listings"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
                className="glass group relative overflow-hidden rounded-3xl p-6 transition duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-[0_26px_60px_-24px_rgb(23_63_128/0.3)]"
              >
                <span className="absolute -top-10 -left-10 size-28 rounded-full bg-sky-200/40 blur-2xl transition group-hover:bg-gold-soft" />
                <span className="gold-gradient relative flex size-12 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_-10px_rgb(184_137_28/0.7)] ring-1 ring-white/60 transition group-hover:scale-105">
                  <Icon className="size-6" strokeWidth={2} />
                </span>
                <h3 className="relative mt-5 text-lg font-extrabold text-navy">
                  {category}
                </h3>
                <p className="relative mt-2 text-sm leading-6 text-muted-foreground">
                  {meta.blurb}
                </p>
                <span className="relative mt-4 inline-flex items-center gap-1 text-xs font-semibold text-gold-deep opacity-80 transition group-hover:opacity-100">
                  مشاهده فایل‌ها
                  <span className="transition-transform group-hover:-translate-x-0.5">←</span>
                </span>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}