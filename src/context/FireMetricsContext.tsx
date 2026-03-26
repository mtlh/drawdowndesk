"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface FireMetricsContextValue {
  fiPercent: number | null;
  setFiPercent: (v: number | null) => void;
}

const FireMetricsContext = createContext<FireMetricsContextValue>({
  fiPercent: null,
  setFiPercent: () => {},
});

export function FireMetricsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [fiPercent, setFiPercent] = useState<number | null>(null);

  // Sync to localStorage so the sidebar can read it
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (fiPercent !== null) {
      localStorage.setItem("fireMetricsFi", JSON.stringify(fiPercent));
    } else {
      localStorage.removeItem("fireMetricsFi");
    }
  }, [fiPercent]);

  return (
    <FireMetricsContext.Provider value={{ fiPercent, setFiPercent }}>
      {children}
    </FireMetricsContext.Provider>
  );
}

export function useFireMetrics() {
  return useContext(FireMetricsContext);
}
