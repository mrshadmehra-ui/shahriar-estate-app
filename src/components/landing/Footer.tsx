import { useEffect, useState } from "react";
import {
  ArrowUp,
  Building2,
  Clock,
  Factory,
  Home,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OFFICE_ADDRESS, PHONE_DISPLAY, PHONE_TEL } from "@/lib/fa";
import { Logo } from "./Logo";

const SOCIALS = [
  { label: "اینستاگرام", href: "https://instagram.com", icon: Instagram },
  { label: "تلگرام", href: "https://t.me", icon: Send },
  { label: "واتس‌اپ", href: "https://wa.me/989120858095", icon: MessageCircle },
  { label: "تماس", href: PHONE_TEL, icon: Phone },
];

const LINKS = [
  { label: "صفحه اصلی", href: "#top" },
  { label: "خدمات", href: "#services" },
  { label: "فایل‌های ملکی", href: "#listings" },
  { label: "فایل‌های صنعتی", href: "#industrial" },
  { label: "درباره ما", href: "#about" },
  { label: "تماس با ما", href: "#contact" },
  { label: "پنل مدیریت", href: "/dashboard" },
];

const SERVICES = [
  { label: "مسکونی", href: "#listings", icon: Home },
  { label: "اداری", href: "#listings", icon: Building2 },
  { label: "تجاری", href: "#listings", icon: Store },
  { label: "صنعتی", href: "#listings", icon: Factory },
];

function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      aria-label="بازگشت به بالا"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "glass-soft fixed bottom-24 left-4 z-40 flex size-11 items-center justify-center rounded-full text-gold-deep shadow-lg transition-all duration-300 hover:bg-white/80 md:bottom-6 md:left-6",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="size-5" />
    </button>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-white/70 bg-white/45 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 pb-32 pt-14 sm:px-6 md:pb-10 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* brand */}
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm leading-7 text-muted-foreground">
              با ما، خانه‌ی رویایی خود را در شهریار پیدا کنید.
            </p>
            <div className="flex gap-2">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="glass-soft flex size-10 items-center justify-center rounded-xl text-navy transition hover:bg-white hover:text-gold-deep"
                >
                  <social.icon className="size-5" />
                </a>
              ))}
            </div>
          </div>

          {/* links */}
          <div>
            <h3 className="text-sm font-extrabold text-navy">دسترسی سریع</h3>
            <ul className="mt-4 space-y-2.5">
              {LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition hover:text-gold-deep"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* services */}
          <div>
            <h3 className="text-sm font-extrabold text-navy">خدمات ما</h3>
            <ul className="mt-4 space-y-2.5">
              {SERVICES.map((service) => (
                <li key={service.label}>
                  <a
                    href={service.href}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-gold-deep"
                  >
                    <service.icon className="size-4 text-gold-deep/70" />
                    خرید، فروش و اجاره {service.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* contact */}
          <div>
            <h3 className="text-sm font-extrabold text-navy">اطلاعات تماس</h3>
            <ul className="mt-4 space-y-3.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold-deep" />
                {OFFICE_ADDRESS}
              </li>
              <li>
                <a
                  href={PHONE_TEL}
                  dir="ltr"
                  className="flex items-center justify-end gap-2.5 font-extrabold tracking-wide text-navy transition hover:text-gold-deep"
                >
                  <Phone className="size-4 shrink-0 text-gold-deep" />
                  {PHONE_DISPLAY}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="mt-0.5 size-4 shrink-0 text-gold-deep" />
                <span>
                  شنبه تا پنجشنبه: ۹ تا ۲۱
                  <br />
                  جمعه: ۱۶ تا ۲۱
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/70 pt-6">
          <p className="text-xs text-muted-foreground">
            تمامی حقوق محفوظ است | دپارتمان املاک شهریار
          </p>
          <p className="text-xs text-muted-foreground">
            شهریار، روبروی شهرک اداری، مجتمع اداری تجاری شهریار
          </p>
        </div>
      </div>
      <ScrollTopButton />
    </footer>
  );
}