import { useId, useState } from "react";
import { formatMoneyValue, numberToWordsRial, parseRialInput, MONEY_UNIT_LABELS, type MoneyUnit } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * Money input — the only place users type amounts.
 * The user types in their chosen unit (تومان/ریال); the component reports the
 * normalized RIAL integer via onRial. The database is never touched by the unit.
 */
export function MoneyInput({
  label = "مبلغ",
  valueRial,
  onChange,
  unit,
  onUnitChange,
  placeholder,
  disabled,
  hint = true,
  compact = false,
}: {
  label?: string;
  valueRial: number;
  onChange: (rial: number) => void;
  unit: MoneyUnit;
  onUnitChange: (unit: MoneyUnit) => void;
  placeholder?: string;
  disabled?: boolean;
  hint?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  const [raw, setRaw] = useState<string>(valueRial > 0 ? String(Math.round(valueRial)) : "");

  const handleChange = (value: string) => {
    setRaw(value);
    const parsed = parseRialInput(value, unit);
    if (parsed === 0) onChange(0);
    else if (!Number.isNaN(parsed)) onChange(parsed);
  };

  const display = raw !== "" ? raw : valueRial > 0 ? String(valueRial) : "";
  const words = valueRial > 0 ? numberToWordsRial(valueRial) : "";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-bold text-foreground/80">
          {label}
        </Label>
        <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/50 p-0.5">
          {(["toman", "rial"] as MoneyUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => {
                onUnitChange(u);
                setRaw("");
              }}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-bold transition",
                unit === u ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {MONEY_UNIT_LABELS[u]}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <Input
          id={id}
          dir="ltr"
          inputMode="numeric"
          className={cn("h-10 pl-14 text-end font-bold tabular-nums", compact && "h-9 text-sm")}
          value={display}
          placeholder={placeholder ?? `مبلغ به ${MONEY_UNIT_LABELS[unit]}`}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          onFocus={(e) => e.target.select()}
        />
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[11px] font-bold text-muted-foreground">
          {MONEY_UNIT_LABELS[unit]}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        {hint && valueRial > 0 ? (
          <p className="text-[11px] text-muted-foreground">≈ {formatMoneyValue(valueRial, unit)} {MONEY_UNIT_LABELS[unit]}</p>
        ) : (
          <span />
        )}
        {hint && words && <p className="truncate text-[11px] text-gold-deep">{words}</p>}
      </div>
    </div>
  );
}