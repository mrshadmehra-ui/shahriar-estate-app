import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import {
  Loader2,
  Phone,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { faNumber, toFa } from "@/lib/fa";
import type { Property } from "@/lib/estate";
import { MatchesDialog, type MatchResult } from "./MatchesDialog";

type Consultation = Doc<"consultations">;

function needsChips(request: Consultation): string[] {
  const chips: string[] = [];
  if (request.transaction) chips.push(request.transaction);
  if (request.category) chips.push(request.category);
  if (request.area) chips.push(request.area);
  if (request.budgetValue) chips.push(`${faNumber(request.budgetValue)} تومان`);
  if (request.requestType) chips.push(request.requestType);
  return chips;
}

export function ApplicantsTab() {
  const requests = useQuery(api.consultations.list);
  const properties = useQuery(api.properties.list);
  const matchNeeds = useAction(api.ai.matchNeeds);

  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    request: Consultation;
    matches: MatchResult[];
  } | null>(null);

  const handleMatch = async (request: Consultation) => {
    setMatchingId(request._id);
    try {
      const { matches } = await matchNeeds({
        transaction: request.transaction ?? undefined,
        category: request.category ?? undefined,
        area: request.area ?? undefined,
        budgetValue: request.budgetValue,
        description: request.description ?? undefined,
      });
      const propertyMap = new Map<Id<"properties">, Property>(
        (properties ?? []).map((p) => [p._id, p]),
      );
      const merged = matches
        .map((m) => ({
          property: propertyMap.get(m.id as Id<"properties">),
          score: m.score,
          reason: m.reason,
        }))
        .filter(
          (m): m is MatchResult => m.property !== undefined,
        )
        .sort((a, b) => b.score - a.score);
      setResult({ request, matches: merged });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "پیشنهاد هوشمند با خطا مواجه شد.",
      );
    } finally {
      setMatchingId(null);
    }
  };

  return (
    <div className="glass overflow-hidden rounded-[1.75rem]">
      {requests === undefined ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-sky-100/80" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="glass-soft flex size-16 items-center justify-center rounded-2xl text-gold-deep">
            <Users className="size-7" />
          </span>
          <div>
            <p className="text-base font-extrabold text-navy">
              هنوز درخواستی ثبت نشده است
            </p>
            <p className="mt-1.5 text-sm leading-7 text-muted-foreground">
              وقتی متقاضی‌ها از فرم «نیاز به مشاوره دارید؟» در سایت درخواست ثبت
              کنند، اینجا نمایش داده می‌شود و می‌توانید فایل‌های مناسب را با هوش
              مصنوعی پیشنهاد دهید.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-white/60">
          {requests.map((request) => {
            const chips = needsChips(request);
            return (
              <div
                key={request._id}
                className="flex flex-wrap items-center gap-4 p-4 sm:p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-extrabold text-navy">
                      {request.name}
                    </p>
                    <a
                      href={`tel:${request.phone}`}
                      dir="ltr"
                      className="text-xs font-bold text-gold-deep hover:underline"
                    >
                      {toFa(request.phone)}
                    </a>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(request._creationTime).toLocaleDateString(
                        "fa-IR",
                        { year: "numeric", month: "long", day: "numeric" },
                      )}
                    </span>
                  </div>
                  {chips.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {chips.map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full bg-sky-100/80 px-2.5 py-1 text-[10px] font-bold text-primary ring-1 ring-white/70"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                  {request.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted-foreground">
                      {request.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    aria-label="تماس با متقاضی"
                    className="size-10 rounded-xl text-navy hover:bg-white/80"
                  >
                    <a href={`tel:${request.phone}`}>
                      <Phone className="size-4" />
                    </a>
                  </Button>
                  <Button
                    onClick={() => handleMatch(request)}
                    disabled={matchingId !== null}
                    className={cn(
                      "h-10 rounded-xl px-4 text-xs font-bold shadow-sm transition",
                      matchingId === request._id
                        ? "bg-primary/80 text-white"
                        : "gold-gradient text-white shadow-[0_12px_26px_-12px_rgb(184_137_28/0.9)] ring-1 ring-white/60 hover:brightness-105",
                    )}
                  >
                    {matchingId === request._id ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        در حال بررسی...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        پیشنهاد هوشمند فایل‌ها
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MatchesDialog
        open={result !== null}
        onOpenChange={(open) => {
          if (!open) setResult(null);
        }}
        applicantName={result?.request.name}
        applicantPhone={result?.request.phone}
        matches={result?.matches ?? []}
      />
    </div>
  );
}