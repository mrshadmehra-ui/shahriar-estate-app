import { motion } from "framer-motion";
import { Info, MapPin, Star } from "lucide-react";
import { WHY_US } from "@/lib/estate";
import { OFFICE_ADDRESS, PHONE_TEL } from "@/lib/fa";
import { SectionHeader } from "./SectionHeader";

export function WhyUs() {
  return (
    <section id="about" className="relative py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div id="why-us">
          <SectionHeader
            chip="درباره ما"
            icon={Info}
            title="چرا املاک شهریار؟"
            subtitle="دپارتمان املاک شهریار با سال‌ها تجربه در بازار ملک شهریار، در دفتری واقع در مرکز شهر، کنار شماست تا مسیر خرید، فروش یا اجاره را امن و مطمئن طی کنید."
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {WHY_US.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
              className="glass group flex items-start gap-4 rounded-3xl p-5 transition duration-300 hover:-translate-y-0.5 hover:bg-white/80 sm:p-6"
            >
              <span className="gold-gradient flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_-10px_rgb(184_137_28/0.7)] ring-1 ring-white/60 transition group-hover:scale-105">
                <feature.icon className="size-6" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-navy">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-7 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* office strip */}
        <motion.a
          href={PHONE_TEL}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="glass-cool mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl px-6 py-5 transition hover:bg-white/70"
        >
          <div className="flex items-center gap-3">
            <span className="glass-soft flex size-11 items-center justify-center rounded-xl text-gold-deep">
              <MapPin className="size-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                دفتر مرکزی دپارتمان املاک شهریار
              </p>
              <p className="mt-1 text-sm font-bold text-navy sm:text-base">
                {OFFICE_ADDRESS}
              </p>
            </div>
          </div>
          <span className="glass-soft inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-gold-deep">
            <Star className="size-3.5" />
            انتخاب مطمئن شما
          </span>
        </motion.a>
      </div>
    </section>
  );
}