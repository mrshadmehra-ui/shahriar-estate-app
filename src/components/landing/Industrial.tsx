import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Factory, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Scene } from "./Scene";
import { SectionHeader } from "./SectionHeader";
import { cn } from "@/lib/utils";
import { PHONE_TEL } from "@/lib/fa";
import { properties, type Property } from "@/lib/estate";

const industrial = properties.filter((p) => p.category === "صنعتی");

interface IndustrialProps {
  onDetails: (property: Property) => void;
}

export function Industrial({ onDetails }: IndustrialProps) {
  const [index, setIndex] = useState(0);
  const item = industrial[index];

  return (
    <section id="industrial" className="relative py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          chip="فایل‌های صنعتی"
          icon={Factory}
          title="املاک صنعتی در شهرک‌های شهریار"
          subtitle="سوله، کارگاه و زمین صنعتی با سند رسمی و برق سه‌فاز؛ برای تولید، انبارداری و سرمایه‌گذاری."
          action={{ label: "مشاهده همه", href: "#listings" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="glass relative overflow-hidden rounded-[2rem]"
        >
          <span className="pointer-events-none absolute -top-20 -right-20 size-56 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="relative grid lg:grid-cols-2">
            {/* image */}
            <div className="relative">
              <Scene
                src={item.image}
                alt={item.title}
                className="h-60 sm:h-72 lg:h-full lg:min-h-[420px]"
              />
              <span className="absolute top-4 right-4 rounded-full bg-emerald-500/95 px-3 py-1 text-xs font-bold text-white shadow-md ring-1 ring-white/50">
                {item.transaction}
              </span>
            </div>

            {/* info */}
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="flex flex-col gap-5 p-6 sm:p-8"
            >
              <div>
                <h3 className="text-xl font-extrabold leading-8 text-navy sm:text-2xl">
                  {item.title}
                </h3>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                  <MapPin className="size-4 shrink-0 text-gold-deep" />
                  {item.location}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {item.specs.map((spec) => (
                  <span
                    key={spec.label}
                    className="glass-soft flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-navy"
                  >
                    <spec.icon className="size-4 text-gold-deep" />
                    {spec.label}
                  </span>
                ))}
              </div>

              <p className="text-sm leading-7 text-muted-foreground">
                {item.description}
              </p>

              <div className="glass-soft mt-auto flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3.5">
                <span className="text-xs font-medium text-muted-foreground">
                  قیمت
                </span>
                <div className="text-start leading-tight">
                  <p className="text-base font-extrabold text-navy">{item.price}</p>
                  {item.pricePerMeter && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      هر متر: {item.pricePerMeter}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Button
                  onClick={() => onDetails(item)}
                  className="h-12 rounded-xl bg-white/70 text-sm font-bold text-navy shadow-sm ring-1 ring-white/80 transition hover:bg-white"
                >
                  جزئیات
                  <ChevronLeft className="size-4 text-gold-deep" />
                </Button>
                <Button
                  asChild
                  size="icon"
                  aria-label="تماس با مشاور"
                  className="gold-gradient size-12 rounded-xl text-white shadow-[0_14px_30px_-14px_rgb(184_137_28/0.9)] ring-1 ring-white/60"
                >
                  <a href={PHONE_TEL}>
                    <Phone className="size-5" />
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>

          {/* pagination dots */}
          <div className="relative flex items-center justify-center gap-2 border-t border-white/70 py-4">
            {industrial.map((p, i) => (
              <button
                key={p.id}
                aria-label={`فایل ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === index
                    ? "w-8 bg-primary shadow-sm"
                    : "w-2 bg-sky-200 hover:bg-sky-300",
                )}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}