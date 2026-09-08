import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  ExternalLink,
  Lock,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scene } from "./Scene";
import { OFFICE_ADDRESS, PHONE_DISPLAY, PHONE_TEL, toFa } from "@/lib/fa";
import {
  AREAS,
  CATEGORIES,
  REQUEST_TYPES,
  type Property,
} from "@/lib/estate";

const PHONE_REGEX = /^(\+98|0098|0)?9\d{9}$/;
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  "مجتمع اداری تجاری شهریار، شهریار، روبروی شهرک اداری",
)}`;

interface MatchRow {
  property: Property;
  score: number;
  reason: string;
}

interface ContactSectionProps {
  onDetails: (property: Property) => void;
}

export function ContactSection({ onDetails }: ContactSectionProps) {
  const submitConsultation = useMutation(api.consultations.submit);
  const matchNeeds = useAction(api.ai.matchNeeds);
  const properties = useQuery(api.properties.list);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [requestType, setRequestType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [transaction, setTransaction] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState<MatchRow[] | null>(null);

  const reset = () => {
    setName("");
    setPhone("");
    setRequestType("");
    setDescription("");
    setTransaction("");
    setCategory("");
    setArea("");
    setBudget("");
    setSubmitted(false);
    setMatches(null);
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("لطفا نام و نام خانوادگی خود را وارد کنید.");
      return;
    }
    const digits = phone.replace(/[\s-]/g, "");
    if (!digits) {
      setError("لطفا شماره موبایل خود را وارد کنید.");
      return;
    }
    if (!PHONE_REGEX.test(digits)) {
      setError("شماره موبایل وارد شده معتبر نیست. مثال: ۰۹۱۲۱۲۳۴۵۶۷");
      return;
    }

    const budgetValue = Number(budget) * 1_000_000;

    setPending(true);
    try {
      await submitConsultation({
        name: name.trim(),
        phone: digits,
        requestType: requestType || undefined,
        description: description.trim() || undefined,
        transaction: transaction || undefined,
        category: category || undefined,
        area: area || undefined,
        budgetValue: budget && budgetValue > 0 ? budgetValue : undefined,
      });
      toast.success("درخواست شما ثبت شد", {
        description: "کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت.",
      });
      setSubmitted(true);

      // AI smart matching (best effort — site works without it too)
      setMatching(true);
      try {
        const { matches: found } = await matchNeeds({
          transaction: transaction || undefined,
          category: category || undefined,
          area: area || undefined,
          budgetValue: budget && budgetValue > 0 ? budgetValue : undefined,
          description: description.trim() || undefined,
        });
        const byId = new Map<Id<"properties">, Property>(
          (properties ?? []).map((p) => [p._id, p]),
        );
        const matched = found
          .map((m) => ({
            property: byId.get(m.id as Id<"properties">),
            score: m.score,
            reason: m.reason,
          }))
          .filter((m): m is MatchRow => m.property !== undefined)
          .sort((a, b) => b.score - a.score);
        setMatches(matched);
      } catch {
        setMatches([]);
      } finally {
        setMatching(false);
      }
    } catch {
      setError("ارسال درخواست با خطا مواجه شد. لطفا دوباره تلاش کنید.");
      setSubmitted(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="contact" className="relative py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Consultation form / result */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:col-span-3"
          >
            <span className="pointer-events-none absolute -top-16 -left-16 size-44 rounded-full bg-gold-soft/80 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="gold-gradient flex size-11 items-center justify-center rounded-xl text-white shadow-md ring-1 ring-white/60">
                  <MessageSquare className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-navy sm:text-xl">
                    {submitted ? "درخواست شما ثبت شد" : "نیاز به مشاوره دارید؟"}
                  </h2>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    {submitted
                      ? "کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت."
                      : "فرم زیر را تکمیل کنید تا کارشناسان ما در اسرع وقت با شما تماس بگیرند."}
                  </p>
                </div>
              </div>

              {!submitted ? (
                <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="consult-name"
                        className="block text-xs font-semibold text-navy"
                      >
                        نام و نام خانوادگی <span className="text-destructive">*</span>
                      </label>
                      <Input
                        id="consult-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="نام خود را وارد کنید"
                        className="h-12 rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="consult-phone"
                        className="block text-xs font-semibold text-navy"
                      >
                        شماره موبایل <span className="text-destructive">*</span>
                      </label>
                      <Input
                        id="consult-phone"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="۰۹۱۲ ۱۲۳ ۴۵ ۶۷"
                        className="h-12 rounded-xl border-white/80 bg-white/60 text-end shadow-sm backdrop-blur-md"
                      />
                    </div>
                  </div>

                  <div className="glass-soft rounded-2xl p-4">
                    <p className="flex items-center gap-1.5 text-xs font-extrabold text-navy">
                      <Sparkles className="size-3.5 text-gold-deep" />
                      نیازهای خود را بگویید تا فایل‌های مناسب پیشنهاد شود (اختیاری)
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-muted-foreground">
                          نوع معامله
                        </label>
                        <Select value={transaction || undefined} onValueChange={setTransaction}>
                          <SelectTrigger className="h-11 w-full rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md">
                            <SelectValue placeholder="انتخاب کنید" />
                          </SelectTrigger>
                          <SelectContent className="glass-soft border-white/70 bg-white/85 backdrop-blur-xl">
                            <SelectItem value="فروش">فروش</SelectItem>
                            <SelectItem value="اجاره">اجاره</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-muted-foreground">
                          دسته‌بندی
                        </label>
                        <Select value={category || undefined} onValueChange={setCategory}>
                          <SelectTrigger className="h-11 w-full rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md">
                            <SelectValue placeholder="انتخاب کنید" />
                          </SelectTrigger>
                          <SelectContent className="glass-soft border-white/70 bg-white/85 backdrop-blur-xl">
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-muted-foreground">
                          منطقه
                        </label>
                        <Select value={area || undefined} onValueChange={setArea}>
                          <SelectTrigger className="h-11 w-full rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md">
                            <SelectValue placeholder="انتخاب کنید" />
                          </SelectTrigger>
                          <SelectContent className="glass-soft border-white/70 bg-white/85 backdrop-blur-xl">
                            {AREAS.map((a) => (
                              <SelectItem key={a} value={a}>
                                {a}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-muted-foreground">
                          بودجه (میلیون تومان)
                        </label>
                        <Input
                          dir="ltr"
                          type="number"
                          min={0}
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          placeholder="مثال: ۳۰۰۰"
                          className="h-11 rounded-xl border-white/80 bg-white/60 text-end shadow-sm backdrop-blur-md"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-navy">
                      نوع درخواست
                    </label>
                    <Select value={requestType || undefined} onValueChange={setRequestType}>
                      <SelectTrigger className="h-12 w-full rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md">
                        <SelectValue placeholder="انتخاب کنید" />
                      </SelectTrigger>
                      <SelectContent className="glass-soft border-white/70 bg-white/85 backdrop-blur-xl">
                        {REQUEST_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="consult-desc"
                      className="block text-xs font-semibold text-navy"
                    >
                      توضیحات
                    </label>
                    <Textarea
                      id="consult-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="مثال: دنبال آپارتمان ۸۵ متری دو خواب در اندیشه هستم..."
                      rows={3}
                      className="resize-none rounded-xl border-white/80 bg-white/60 shadow-sm backdrop-blur-md"
                    />
                  </div>

                  {error && (
                    <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={pending}
                    className="gold-gradient h-12 w-full rounded-xl text-sm font-bold text-white shadow-[0_16px_34px_-14px_rgb(184_137_28/0.9)] ring-1 ring-white/60 transition hover:brightness-105 disabled:opacity-70"
                  >
                    {pending ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        در حال ارسال...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        ارسال درخواست
                      </>
                    )}
                  </Button>

                  <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                    <Lock className="size-3" />
                    اطلاعات شما محرمانه است و تنها برای تماس کارشناسان استفاده می‌شود.
                  </p>
                </form>
              ) : (
                <div className="mt-7 space-y-4">
                  <div className="glass-soft flex items-start gap-3 rounded-2xl p-4 ring-1 ring-emerald-500/20">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/90 text-white shadow-md">
                      <CheckCircle2 className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-navy">
                        درخواست شما با موفقیت ثبت شد
                      </p>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">
                        کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت؛ در همین
                        حین، فایل‌های زیر با نیاز شما مطابقت داده شده‌اند.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <p className="flex items-center gap-1.5 text-sm font-extrabold text-navy">
                      <Sparkles className="size-4 text-gold-deep" />
                      فایل‌های پیشنهادی هوشمند
                    </p>

                    {matching ? (
                      <div className="glass-soft flex items-center gap-3 rounded-2xl px-4 py-6">
                        <span className="size-4 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
                        <p className="text-xs font-medium text-muted-foreground">
                          در حال یافتن بهترین فایل‌ها برای شما...
                        </p>
                      </div>
                    ) : matches && matches.length > 0 ? (
                      <div className="space-y-2.5">
                        {matches.map((match) => (
                          <div
                            key={match.property._id}
                            className="glass-soft flex gap-3 rounded-2xl p-3"
                          >
                            <Scene
                              src={match.property.image}
                              alt={match.property.title}
                              className="h-16 w-24 shrink-0 rounded-xl"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <p className="line-clamp-1 text-sm font-extrabold text-navy">
                                  {match.property.title}
                                </p>
                                <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-bold text-gold-deep">
                                  ٪{toFa(match.score)} تطابق
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                                {match.property.location} —{" "}
                                {match.property.price ??
                                  toFa(match.property.priceValue)}
                              </p>
                              {match.reason && (
                                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                                  {match.reason}
                                </p>
                              )}
                              <Button
                                variant="ghost"
                                onClick={() => onDetails(match.property)}
                                className="mt-1.5 h-7 rounded-full px-2.5 text-[11px] font-bold text-primary hover:bg-white/80"
                              >
                                مشاهده جزئیات
                                <ChevronLeft className="size-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="glass-soft rounded-2xl px-4 py-6 text-center">
                        <p className="text-xs font-bold text-navy">
                          فعلا فایل منطبقی یافت نشد
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                          به‌محض ثبت فایل‌های جدید، کارشناسان ما بهترین گزینه‌ها را
                          به شما معرفی می‌کنند.
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    onClick={reset}
                    className="h-10 rounded-xl px-4 text-xs font-bold text-muted-foreground hover:bg-white/80"
                  >
                    ثبت درخواست جدید
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Contact info */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
            className="glass flex flex-col gap-4 rounded-[2rem] p-6 sm:p-8 lg:col-span-2"
          >
            <div>
              <h2 className="text-lg font-extrabold text-navy sm:text-xl">
                اطلاعات تماس
              </h2>
              <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
                برای مشاوره رایگان در تمام روزهای کاری با ما در ارتباط باشید.
              </p>
            </div>

            <div className="glass-soft flex items-start gap-3.5 rounded-2xl p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-primary ring-1 ring-white/70">
                <MapPin className="size-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-navy">آدرس دفتر</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  {OFFICE_ADDRESS}
                </p>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-gold-deep transition hover:text-gold"
                >
                  مشاهده روی نقشه
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>

            <div className="glass-soft flex items-center gap-3.5 rounded-2xl p-4">
              <span className="gold-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md">
                <Phone className="size-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-navy">تلفن تماس</p>
                <a
                  href={PHONE_TEL}
                  dir="ltr"
                  className="mt-1 block text-sm font-extrabold tracking-wide text-navy transition hover:text-gold-deep"
                >
                  {PHONE_DISPLAY}
                </a>
              </div>
            </div>

            <div className="glass-soft flex items-start gap-3.5 rounded-2xl p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-primary ring-1 ring-white/70">
                <Clock className="size-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-navy">ساعت کاری</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  شنبه تا پنجشنبه: <span className="font-bold text-navy">۹ تا ۲۱</span>
                  <br />
                  جمعه: <span className="font-bold text-navy">۱۶ تا ۲۱</span>
                </p>
              </div>
            </div>

            <div className="glass-soft mt-auto flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              <p className="text-xs leading-6 text-muted-foreground">
                پاسخگویی سریع به پیام‌های <span className="font-bold text-navy">{toFa(7)} روز هفته</span> از طریق
                تلفن و شبکه‌های اجتماعی.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}