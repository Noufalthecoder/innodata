"use client";

import { useEffect, useState } from "react";
import { DEADLINE_ISO } from "@/lib/content";

export default function Countdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const t = Math.max(0, now === null ? 0 : new Date(DEADLINE_ISO).getTime() - now);
  const units = [
    ["days", Math.floor(t / 86400000)],
    ["hours", Math.floor(t / 3600000) % 24],
    ["min", Math.floor(t / 60000) % 60],
    ["sec", Math.floor(t / 1000) % 60],
  ] as const;

  return (
    <div className="flex items-baseline gap-5 text-white" aria-label="Time until submission deadline">
      {units.map(([label, v]) => (
        <div key={label}>
          <span className="text-3xl font-semibold tabular-nums">{String(v).padStart(2, "0")}</span>
          <span className="ml-1.5 text-sm text-zinc-500">{label}</span>
        </div>
      ))}
    </div>
  );
}
