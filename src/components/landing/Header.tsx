import { useState } from "react";
import {
  Building2,
  Factory,
  Home,
  Info,
  LayoutGrid,
  Menu,
  Phone,
  Settings,
  Star,
} from "lucide-react";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { PHONE_TEL } from "@/lib/fa";

const NAV_ITEMS = [
  { label: "صفحه اصلی", href: "#top", icon: Home },
  { label: "خدمات", href: "#services", icon: LayoutGrid },
  { label: "فایل‌های ملکی", href: "#listings", icon: Building2 },
  { label: "فایل‌های صنعتی", href: "#industrial", icon: Factory },
  { label: "چرا املاک شهریار؟", href: "#why-us", icon: Star },
  { label: "درباره ما", href: "#about", icon: Info },
  { label: "تماس با ما", href: "#contact", icon: Phone },
  { label: "پنل مدیریت", href: "/dashboard", icon: Settings },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[74px] sm:px-6 lg:px-8">
        <a href="#top" aria-label="املاک شهریار — صفحه اصلی" className="shrink-0">
          <Logo />
        </a>

        <div className="flex items-center gap-2.5">
          <Button
            asChild
            className="gold-gradient h-10 rounded-full px-4 text-sm font-bold text-white shadow-[0_12px_28px_-12px_rgb(184_137_28/0.85)] ring-1 ring-white/60 transition hover:brightness-105 sm:px-5"
          >
            <a href={PHONE_TEL}>
              <Phone className="size-4" />
              <span className="hidden sm:inline">تماس با مشاور</span>
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="باز کردن منو"
            onClick={() => setOpen(true)}
            className="glass-soft size-10 rounded-xl text-navy hover:bg-white/70"
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="glass w-[86%] max-w-sm gap-0 border-l border-white/60 p-0">
          <SheetHeader className="border-b border-white/60 bg-white/40 px-5 py-5">
            <SheetTitle className="text-start">
              <Logo />
            </SheetTitle>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-navy transition hover:bg-white/80 hover:text-primary"
                  >
                    <span className="glass-soft flex size-9 items-center justify-center rounded-lg text-gold-deep transition group-hover:bg-gold-soft">
                      <item.icon className="size-4" />
                    </span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <SheetFooter className="border-t border-white/60 bg-white/40 p-4">
            <Button
              asChild
              className="gold-gradient h-12 w-full rounded-xl text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgb(184_137_28/0.9)] ring-1 ring-white/60 transition hover:brightness-105"
            >
              <a href={PHONE_TEL} onClick={() => setOpen(false)}>
                <Phone className="size-4" />
                تماس با مشاور
              </a>
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </header>
  );
}