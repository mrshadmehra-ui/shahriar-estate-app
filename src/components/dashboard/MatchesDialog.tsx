import { Phone, Sparkles, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { faNumber } from "@/lib/fa";
import type { Property } from "@/lib/estate";

export interface MatchResult {
  property: Property;
  score: number;
  reason: string;
}

interface MatchesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantName?: string;
  applicantPhone?: string;
  matches: MatchResult[];
}

export function MatchesDialog({
  open,
  onOpenChange,
  applicantName,
  applicantPhone,
  matches,
}: MatchesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[88dvh] max-w-2xl overflow-y-auto border-white/60 sm:rounded-[2rem]">
        <DialogHeader className="pe-10">
          <div className="flex items-center gap-2.5">
            <span className="gold-gradient flex size-10 items-center justify-center rounded-xl text-white shadow-md ring-1 ring-white/60">
              <Sparkles className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-extrabold text-navy">
                پیشنهاد هوشمند فایل‌ها
              </DialogTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {applicantName ? `متقاضی: ${applicantName}` : "متقاضی"} — بهترین
                فایل‌ها بر اساس نیازهای ثبت‌شده
              </p>
            </div>
          </div>
        </DialogHeader>

        {matches.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="glass-soft flex size-14 items-center justify-center rounded-2xl text-gold-deep">
              <Users className="size-6" />
            </span>
            <p className="text-sm font-extrabold text-navy">
              فایل منطبقی یافت نشد
            </p>
            <p className="text-xs leading-6 text-muted-foreground">
              فعلا فایلی متناسب با نیازهای این متقاضی ثبت نشده است؛ با ثبت فایل جدید،
              دوباره پیشنهاد هوشمند را امتحان کنید.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.property._id}
                className="glass-soft rounded-2xl p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-extrabold text-navy">
                    {match.property.title}
                  </p>
                  <span className="rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-bold text-gold-deep">
                    ٪{faNumber(match.score)} تطابق
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                  {match.property.location} — {match.property.area}
                </p>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sky-100">
                  <div
                    className="gold-gradient h-full rounded-full"
                    style={{ width: `${match.score}%` }}
                  />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="line-clamp-1 text-xs font-bold text-navy">
                    {match.property.price ?? faNumber(match.property.priceValue)}
                  </p>
                  <p className="line-clamp-1 text-[11px] text-muted-foreground">
                    دلیل: {match.reason || "مناسب با نیازهای متقاضی"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {applicantPhone && (
          <div className="flex justify-end border-t border-white/70 pt-4">
            <Button
              asChild
              className="gold-gradient h-11 rounded-xl px-5 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgb(184_137_28/0.9)] ring-1 ring-white/60 transition hover:brightness-105"
            >
              <a href={`tel:${applicantPhone}`}>
                <Phone className="size-4" />
                تماس با متقاضی
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}