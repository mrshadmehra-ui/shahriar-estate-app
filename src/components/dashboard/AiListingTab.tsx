import { useRef, useState } from "react";
import { useAction } from "convex/react";
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  Wand2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AiDraft } from "./PropertyFormDialog";

interface AiListingTabProps {
  onDraft: (draft: AiDraft) => void;
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
  }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const EXAMPLE =
  "آپارتمان ۸۵ متری نوساز در فاز ۱ اندیشه، خیابان گلستان، دو خواب و دو پارکینگ، طبقه سوم، نزدیک مراکز خرید و حمل و نقل، قیمت دو میلیارد و هشتصد و پنجاه میلیون تومان";

export function AiListingTab({ onDraft }: AiListingTabProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const extract = useAction(api.ai.extractListing);

  const getRecognition = () => {
    if (typeof window === "undefined") return null;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  };
  const supported = getRecognition() !== null;

  const toggleMic = () => {
    const SR = getRecognition();
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "fa-IR";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setText((current) => (current ? `${current} ${transcript}` : transcript));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const handleExtract = async () => {
    setError(null);
    setDone(false);
    if (!text.trim()) {
      setError("ابتدا توضیحات فایل را بنویسید یا با میکروفون بگویید.");
      return;
    }
    setBusy(true);
    try {
      const result = await extract({ text: text.trim() });
      onDraft(result);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "استخراج اطلاعات با خطا مواجه شد.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass relative overflow-hidden rounded-[1.75rem] p-6 sm:p-8">
      <span className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-gold-soft/80 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="gold-gradient flex size-11 items-center justify-center rounded-xl text-white shadow-md ring-1 ring-white/60">
            <Wand2 className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-navy sm:text-xl">
              ثبت فایل با هوش مصنوعی
            </h2>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              توضیحات فایل را تایپ کنید یا با میکروفون بگویید؛ هوش مصنوعی اطلاعات را
              استخراج می‌کند و فرم فایل را برای شما پر می‌کند.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="relative">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={EXAMPLE}
              rows={6}
              className="resize-none rounded-2xl border-white/80 bg-white/60 pr-4 pb-12 shadow-sm backdrop-blur-md"
            />
            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
              <button
                type="button"
                onClick={toggleMic}
                disabled={!supported}
                title={supported ? "گفتار به متن" : "مرورگر شما از ورودی صوتی پشتیبانی نمی‌کند"}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition",
                  listening
                    ? "animate-pulse bg-destructive text-white shadow-md"
                    : "glass-soft text-navy hover:bg-white/80",
                  !supported && "opacity-40",
                )}
              >
                {listening ? (
                  <>
                    <MicOff className="size-4" />
                    در حال گوش دادن... (برای پایان، همین دکمه را بزنید)
                  </>
                ) : (
                  <>
                    <Mic className="size-4" />
                    صحبت کنید
                  </>
                )}
              </button>
              <span className="hidden text-[10px] text-muted-foreground sm:block">
                پشتیبانی صوتی در مرورگر کروم
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleExtract}
              disabled={busy}
              className="gold-gradient h-11 rounded-xl px-6 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgb(184_137_28/0.9)] ring-1 ring-white/60 transition hover:brightness-105 disabled:opacity-70"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  در حال استخراج اطلاعات...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  استخراج و ساخت فایل
                </>
              )}
            </Button>
            {done && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <CheckCircle2 className="size-4" />
                اطلاعات استخراج شد؛ در فرم باز شده بررسی و ثبت کنید.
              </span>
            )}
          </div>

          {error && (
            <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive">
              <CircleAlert className="size-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="glass-soft flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl px-4 py-3 text-[11px] text-muted-foreground">
            <span className="font-bold text-navy">هوش مصنوعی پر می‌کند:</span>
            <span>عنوان و آدرس</span>
            <span>دسته‌بندی و نوع معامله</span>
            <span>منطقه</span>
            <span>متراژ و خواب</span>
            <span>امکانات</span>
            <span>قیمت و توضیحات</span>
          </div>
        </div>
      </div>
    </div>
  );
}