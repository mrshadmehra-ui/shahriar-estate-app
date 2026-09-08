import { motion } from "framer-motion";
import { FolderOpen, Layers, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Scene } from "./Scene";
import { IMAGES } from "@/lib/estate";
import { PHONE_TEL } from "@/lib/fa";

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: "easeOut" as const },
  }),
};

const TRUST = [
  { value: "+۱۵", label: "سال تجربه" },
  { value: "+۲۵۰", label: "فایل فعال" },
  { value: "۱۰۰٪", label: "بررسی حقوقی" },
];

export function Hero() {
  return (
    <section id="top" className="relative">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:pb-24 lg:pt-16">
        {/* Copy */}
        <div className="relative z-10">
          <motion.span
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0}
            className="glass-soft inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-primary sm:text-sm"
          >
            <MapPin className="size-4 text-gold-deep" />
            شهریار، روبروی شهرک اداری، مجتمع اداری تجاری شهریار
          </motion.span>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="mt-6 text-[2.1rem] font-black leading-[1.35] tracking-tight text-navy sm:text-5xl sm:leading-[1.3] lg:text-[3.4rem]"
          >
            انتخاب مطمئن
            <br />
            برای خرید، فروش
            <br />
            و اجاره ملک در{" "}
            <span className="gold-gradient-text">شهریار</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="mt-6 max-w-xl text-sm leading-8 text-muted-foreground sm:text-base sm:leading-9"
          >
            با تیمی متخصص و متعهد، بهترین پیشنهادها را برای سرمایه‌گذاری و
            یافتن خانه‌ی ایده‌آل شما ارائه می‌دهیم. مشاوره تخصصی در تمام مراحل
            خرید، فروش و اجاره.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button
              asChild
              className="gold-gradient h-12 rounded-full px-7 text-sm font-bold text-white shadow-[0_16px_34px_-14px_rgb(184_137_28/0.9)] ring-1 ring-white/60 transition hover:brightness-105 sm:text-base"
            >
              <a href={PHONE_TEL}>
                <Phone className="size-4" />
                تماس با مشاور
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="glass h-12 rounded-full border-white/80 bg-white/40 px-7 text-sm font-bold text-navy shadow-sm transition hover:bg-white/70 sm:text-base"
            >
              <a href="#listings">
                <FolderOpen className="size-4 text-gold-deep" />
                مشاهده فایل‌ها
              </a>
            </Button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            className="mt-10 flex flex-wrap gap-3"
          >
            {TRUST.map((item) => (
              <div
                key={item.label}
                className="glass-soft flex items-center gap-2.5 rounded-2xl px-4 py-3"
              >
                <Sparkles className="size-4 text-gold-deep" />
                <div className="leading-tight">
                  <p className="text-sm font-extrabold text-navy">{item.value}</p>
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
          className="relative"
        >
          <div className="glass rounded-[2rem] p-2.5">
            <Scene
              src={IMAGES.hero}
              alt="نمای ساختمان مدرن"
              className="h-[340px] rounded-[1.6rem] sm:h-[440px] lg:h-[520px]"
              imgClassName="rounded-[1.6rem]"
            />
          </div>

          {/* floating chips */}
          <div className="glass-soft absolute -top-5 left-4 flex items-center gap-2.5 rounded-2xl px-4 py-3 sm:left-8">
            <span className="gold-gradient flex size-9 items-center justify-center rounded-xl text-white shadow-md">
              <Layers className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-extrabold text-navy">۲۵۰+ فایل فعال</p>
              <p className="text-[11px] text-muted-foreground">در تمام مناطق شهریار</p>
            </div>
          </div>

          <div className="glass-soft absolute -bottom-5 right-4 flex items-center gap-2.5 rounded-2xl px-4 py-3 sm:right-8">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/90 text-white shadow-md">
              <ShieldCheck className="size-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-extrabold text-navy">بررسی حقوقی فایل‌ها</p>
              <p className="text-[11px] text-muted-foreground">قبل از انتشار</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}