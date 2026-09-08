import { Building2, Home, MessageSquare, Phone } from "lucide-react";
import { PHONE_TEL } from "@/lib/fa";

const ITEMS = [
  { label: "خانه", href: "#top", icon: Home },
  { label: "فایل‌ها", href: "#listings", icon: Building2 },
  { label: "تماس", href: PHONE_TEL, icon: Phone },
  { label: "مشاوره", href: "#contact", icon: MessageSquare },
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 md:hidden" aria-label="ناوبری پایین">
      <div className="glass flex items-center justify-around rounded-2xl px-2 py-2">
        {ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-navy transition hover:bg-white/70"
          >
            <item.icon className="size-5" />
            <span className="text-[10px] font-bold">{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}