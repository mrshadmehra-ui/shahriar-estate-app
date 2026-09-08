import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isMoneyUnit, type MoneyUnit } from "@/lib/money";

const STORAGE_KEY = "shahriar-money-unit";

const MoneyPrefContext = createContext<{
  unit: MoneyUnit;
  setUnit: (unit: MoneyUnit) => void;
}>({ unit: "toman", setUnit: () => {} });

export function MoneyPrefProvider({ children }: { children: React.ReactNode }) {
  const [unit, setUnitState] = useState<MoneyUnit>(() => {
    if (typeof window === "undefined") return "toman";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isMoneyUnit(stored) ? stored : "toman";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, unit);
  }, [unit]);

  const value = useMemo(() => ({ unit, setUnit: setUnitState }), [unit]);

  return <MoneyPrefContext.Provider value={value}>{children}</MoneyPrefContext.Provider>;
}

export function useMoneyPref() {
  return useContext(MoneyPrefContext);
}