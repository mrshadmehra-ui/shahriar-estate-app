import { motion } from "framer-motion";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChartColumn,
  FileCheck2,
  HandCoins,
  Landmark,
  LayoutDashboard,
  Lock,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Background } from "@/components/landing/Background";
import { cn } from "@/lib/utils";
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/fa";

const DASH_URL = "/auth?returnTo=%2Fdashboard";

const FEATURES = [
  {
    icon: ScrollText,
    title: "حسابداری دوبل و دفتر کل",
    desc: "هر شارژ، دریافت، هزینه و انتقال، سند بدهکار/بستانکار خود را در دفتر کل دارد؛ هیچ عملیات مالی بدون سند باقی نمی‌ماند.",
    tone: "bg-sky-100 text-sky-700",
  },
  {
    icon: Sparkles,
    title: "تولید خودکار شارژ ماهانه",
    desc: "با تعریف قانون شارژ (ثابت، متراژی، پارکینگ)، شارژ همه واحدها در یک کلیک صادر می‌شود — بدون شارژ تکراری.",
    tone: "bg-amber-100 text-amber-700",
  },
  {
    icon: FileCheck2,
    title: "فاکتور و دریافت با تخصیص",
    desc: "دریافت هر واحد به فاکتورهایش تخصیص می‌یابد؛ پرداخت اضافه به‌صورت بستانکاری ثبت می‌شود و هرگز گم نمی‌شود.",
    tone: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: ReceiptText,
    title: "هزینه‌ها و بدهی‌ها",
    desc: "قبض برق، نگهبانی، تعمیرات و پیمانکاران با دسته‌بندی سرفصل ثبت می‌شوند؛ هزینه پرداخت‌نشده به‌صورت بدهی (پرداختنی) پیگیری می‌شود.",
    tone: "bg-orange-100 text-orange-700",
  },
  {
    icon: Landmark,
    title: "صندوق، بانک و انتقال وجه",
    desc: "موجودی صندوق و بانک به‌صورت زنده به‌روز می‌شود و هر انتقال وجه بین حساب‌ها در دفتر کل منعکس می‌شود.",
    tone: "bg-indigo-100 text-indigo-700",
  },
  {
    icon: ChartColumn,
    title: "گزارش‌های مالی",
    desc: "گزارش بدهکاران (۱، ۳ و ۶ ماه)، درآمد، هزینه، جریان نقدی و صورت‌حساب چاپی هر واحد — همه سمت سرور محاسبه می‌شود.",
    tone: "bg-rose-100 text-rose-700",
  },
  {
    icon: CalendarClock,
    title: "دوره مالی و بستن سال",
    desc: "با بستن دوره مالی، تراکنش‌های جدید در آن بازه قفل می‌شود و اصلاحات فقط از طریق سند معکوس انجام می‌شود.",
    tone: "bg-teal-100 text-teal-700",
  },
  {
    icon: ShieldCheck,
    title: "امنیت نقش‌محور",
    desc: "مدیر ارشد، حسابدار، عضو هیئت‌مدیره، مالک، مستأجر و نگهبان — هر نقش فقط داده‌ای را می‌بیند که مجاز است.",
    tone: "bg-slate-100 text-slate-700",
  },
];

const ROLES = [
  {
    icon: Users,
    title: "مالک و مستأجر",
    desc: "وضعیت مالی واحد خود را می‌بینند: فاکتورها، پرداخت‌ها، بدهی و بستانکاری — بدون دسترسی به داده‌های دیگران.",
  },
  {
    icon: LayoutDashboard,
    title: "حسابدار",
    desc: "ثبت دریافت و هزینه، صدور فاکتور، تولید شارژ، انتقال وجه، دفتر کل و گزارش‌های کامل مالی.",
  },
  {
    icon: Landmark,
    title: "هیئت‌مدیره",
    desc: "دسترسی مشاهده‌ای به گزارش‌ها و وضعیت مالی مجتمع برای نظارت و تصمیم‌گیری.",
  },
  {
    icon: Lock,
    title: "مدیر ارشد",
    desc: "دسترسی کامل، مدیریت نقش کاربران، بستن دوره مالی، برگشت وجه و تنظیمات سامانه.",
  },
];

const STEPS = [
  { n: "۱", title: "واحدها را تعریف کنید", desc: "ساختمان و واحدها را با مالک و مستأجر ثبت کنید — حساب مالی هر واحد خودکار ساخته می‌شود." },
  { n: "۲", title: "قوانین شارژ را بسازید", desc: "شارژ ثابت، متراژی یا پارکینگ را تعریف و برای هر دوره تولید کنید." },
  { n: "۳", title: "فاکتور و دریافت کنید", desc: "فاکتور صادر کنید، دریافت‌ها را تخصیص دهید و گزارش بدهکاران را دنبال کنید." },
];

function Landing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen overflow-x-clip"
      dir="rtl"
    >
      <Background />

      {/* header */}
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[74px] sm:px-6 lg:px-8">
          <a href="#top" className="flex shrink-0 items-center gap-3" aria-label="مجتمع شهریار — صفحه اصلی">
            <span className="gold-gradient relative inline-flex size-11 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_-10px_rgb(184_137_28/0.7)] ring-1 ring-white/60">
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/35 to-transparent" />
              <Building2 className="relative size-6" strokeWidth={2.2} />
            </span>
            <span className="flex flex-col leading-none">
              <span className="gold-gradient-text text-lg font-extrabold tracking-tight">مجتمع شهریار</span>
              <span className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                تجاری و اداری — سامانه مدیریت
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex">
            {[
              { label: "امکانات", href: "#features" },
              { label: "نقش‌ها", href: "#roles" },
              { label: "روند کار", href: "#how" },
              { label: "تماس", href: "#contact" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-bold text-navy transition hover:bg-white/70"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <Button
              asChild
              className="gold-gradient h-10 rounded-full px-5 text-sm font-bold text-white shadow-[0_12px_28px_-12px_rgb(184_137_28/0.85)] ring-1 ring-white/60 transition hover:brightness-105"
            >
              <a href={DASH_URL}>
                <LayoutDashboard className="size-4" />
                ورود به پنل
              </a>
            </Button>
            <Button asChild variant="ghost" className="hidden h-10 rounded-full px-4 text-sm font-bold text-navy hover:bg-white/70 sm:inline-flex">
              <a href={PHONE_TEL}>
                <PhoneIcon />
                {PHONE_DISPLAY}
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* hero */}
        <section id="top" className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="text-center lg:text-start">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="glass-soft inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-gold-deep"
              >
                <Sparkles className="size-3.5" />
                سامانه یکپارچه مدیریت مجتمع تجاری اداری
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08 }}
                className="mt-5 text-3xl font-black leading-[1.35] tracking-tight text-navy sm:text-4xl lg:text-[2.75rem]"
              >
                مدیریت کامل مجتمع
                <span className="gold-gradient-text block">شارژ، حسابداری و گزارش‌های مالی</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.16 }}
                className="mx-auto mt-4 max-w-xl text-sm leading-8 text-muted-foreground sm:text-base lg:mx-0"
              >
                از تولید خودکار شارژ ماهانه تا فاکتور، دریافت، هزینه‌ها، صندوق و بانک —
                تمام عملیات مالی مجتمع با حسابداری دوبل و امنیت نقش‌محور در یک سامانه
                یکپارچه مدیریت می‌شود. مبالغ همواره دقیق (ریال) و قابل رهگیری‌اند.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.24 }}
                className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
              >
                <Button asChild className="gold-gradient h-12 rounded-xl px-6 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgb(184_137_28/0.9)] ring-1 ring-white/60 transition hover:brightness-105">
                  <a href={DASH_URL}>
                    ورود به پنل مدیریت
                    <ArrowLeft className="size-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="glass-soft h-12 rounded-xl px-6 text-sm font-bold text-navy hover:bg-white/70">
                  <a href="#features">مشاهده امکانات</a>
                </Button>
              </motion.div>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  { v: "۸+", l: "ماژول مالی یکپارچه" },
                  { v: "۶", l: "نقش دسترسی امن" },
                  { v: "۲۴/۷", l: "گزارش لحظه‌ای" },
                ].map((s) => (
                  <div key={s.l} className="glass rounded-2xl p-3 text-center">
                    <p className="gold-gradient-text text-xl font-black sm:text-2xl">{s.v}</p>
                    <p className="mt-1 text-[11px] font-medium text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* dashboard preview card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="glass rounded-[2rem] p-5 shadow-[0_30px_60px_-25px_rgb(23_63_128/0.35)] sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">داشبورد مالی</p>
                    <p className="mt-0.5 text-sm font-extrabold text-navy">مجتمع تجاری اداری شهریار</p>
                  </div>
                  <span className="glass-soft rounded-full px-3 py-1 text-[10px] font-bold text-gold-deep">۱۴۰۵/۰۶</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MiniCard icon={Banknote} label="موجودی صندوق" value="۴۸٬۵۰۰٬۰۰۰ تومان" tone="bg-emerald-100 text-emerald-700" />
                  <MiniCard icon={Landmark} label="موجودی بانک" value="۱۲۵٬۰۰۰٬۰۰۰ تومان" tone="bg-sky-100 text-sky-700" />
                  <MiniCard icon={Wallet} label="مطالبات واحدها" value="۴۵٬۲۰۰٬۰۰۰ تومان" tone="bg-rose-100 text-rose-700" />
                  <MiniCard icon={ReceiptText} label="هزینه ماه جاری" value="۳۲٬۴۰۰٬۰۰۰ تومان" tone="bg-orange-100 text-orange-700" />
                </div>

                <div className="mt-4 rounded-2xl border border-white/70 bg-white/50 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold text-navy">
                    <ChartColumn className="size-3.5 text-gold-deep" />
                    بدهکارترین واحدها
                  </p>
                  <div className="space-y-2">
                    {[
                      { u: "واحد ۱۰۱", b: "۳٬۵۰۰٬۰۰۰ تومان" },
                      { u: "واحد ۲۰۲", b: "۲٬۹۰۰٬۰۰۰ تومان" },
                      { u: "واحد ۳۰۱", b: "۱٬۸۰۰٬۰۰۰ تومان" },
                    ].map((r) => (
                      <div key={r.u} className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
                        <span className="text-xs font-bold text-navy">{r.u}</span>
                        <span className="text-xs font-extrabold tabular-nums text-rose-600">{r.b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* features */}
        <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-widest text-gold-deep">امکانات سامانه</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-navy sm:text-3xl">
              هرچه مجتمع برای اداره شدن نیاز دارد
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              یک معماری حسابداری واقعی و قابل توسعه — نه چند جدول ساده درآمد و هزینه.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: (i % 4) * 0.06 }}
                className="glass group rounded-3xl p-5 transition hover:-translate-y-0.5"
              >
                <span className={cn("flex size-11 items-center justify-center rounded-xl ring-1 ring-white/70", f.tone)}>
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-sm font-extrabold text-navy">{f.title}</h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* roles */}
        <section id="roles" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-gold-deep">امنیت نقش‌محور</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-navy sm:text-3xl">
                هر نقش، فقط داده‌های خودش را می‌بیند
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                دسترسی مالی فقط به حسابدار و مدیر ارشد داده می‌شود؛ مالک و مستأجر فقط
                واحد خودشان را می‌بینند و هیچ کاربری به داده مالی کاربر دیگر دسترسی ندارد.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  "محافظت در برابر دسترسی مستقیم به اشیاء (IDOR)",
                  "تمام عملیات حساس در گزارش ممیزی ثبت می‌شود",
                  "باطل‌کردن و برگشت سند فقط با علت و تایید",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLES.map((r) => (
                <div key={r.title} className="glass rounded-3xl p-4">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <r.icon className="size-5" />
                  </span>
                  <h3 className="mt-3 text-sm font-extrabold text-navy">{r.title}</h3>
                  <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
          <div className="glass rounded-[2rem] p-6 sm:p-10">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-widest text-gold-deep">روند کار</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-navy sm:text-3xl">
                از ثبت واحد تا گزارش بدهکاران
              </h2>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s.n} className="relative text-center">
                  <div className="gold-gradient mx-auto flex size-14 items-center justify-center rounded-2xl text-xl font-black text-white shadow-[0_12px_26px_-12px_rgb(184_137_28/0.8)] ring-1 ring-white/60">
                    {s.n}
                  </div>
                  <h3 className="mt-4 text-sm font-extrabold text-navy">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-xs leading-6 text-muted-foreground">{s.desc}</p>
                  {i < STEPS.length - 1 && (
                    <div className="absolute -left-3 top-7 hidden text-gold-deep/40 md:block">
                      <ArrowLeft className="size-5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="contact" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-navy p-8 text-center shadow-[0_30px_60px_-25px_rgb(20_49_92/0.6)] sm:p-12">
            <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-gold/20 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-extrabold uppercase tracking-widest text-gold">شروع کنید</p>
              <h2 className="mx-auto mt-3 max-w-xl text-2xl font-black leading-relaxed text-white sm:text-3xl">
                مدیریت مالی مجتمع را به سامانه‌ای مطمئن بسپارید
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/70">
                اولین کاربر سامانه به‌صورت خودکار «مدیر ارشد» می‌شود و می‌تواند
                واحدها، قوانین شارژ و نقش کاربران را تعریف کند.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Button asChild className="gold-gradient h-12 rounded-xl px-7 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgb(184_137_28/0.9)] ring-1 ring-white/60 transition hover:brightness-105">
                  <a href={DASH_URL}>
                    <HandCoins className="size-4" />
                    ورود به پنل مجتمع
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-xl border-white/25 bg-white/5 px-6 text-sm font-bold text-white backdrop-blur hover:bg-white/10"
                >
                  <a href={PHONE_TEL}>
                    <PhoneIcon />
                    {PHONE_DISPLAY}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="border-t border-white/60 bg-white/40 py-10 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:px-6 lg:flex-row lg:px-8">
          <div className="flex items-center gap-3">
            <span className="gold-gradient flex size-10 items-center justify-center rounded-xl text-white ring-1 ring-white/60">
              <Building2 className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-extrabold text-navy">مجتمع تجاری اداری شهریار</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                سامانه یکپارچه مدیریت مجتمع — شارژ، حسابداری و گزارش‌های مالی
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-muted-foreground">
            <a href="#features" className="transition hover:text-navy">امکانات</a>
            <a href="#roles" className="transition hover:text-navy">نقش‌ها</a>
            <a href="#how" className="transition hover:text-navy">روند کار</a>
            <a href={DASH_URL} className="transition hover:text-navy">پنل مدیریت</a>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            تمام مبالغ به ریال ذخیره و با انتخاب شما به تومان/ریال نمایش داده می‌شود.
          </p>
        </div>
      </footer>
    </motion.div>
  );
}

function MiniCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/60 p-3.5">
      <span className={cn("flex size-8 items-center justify-center rounded-lg", tone)}>
        <Icon className="size-4" />
      </span>
      <p className="mt-2 truncate text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-extrabold tabular-nums text-navy">{value}</p>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export default Landing;