"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";

type Stat = { label: string; value: string; tone?: "ok" | "warn" | "err" };

function Pill({ stat }: { stat: Stat }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
      <span
        className={cn(
          "font-medium tabular-nums",
          stat.tone === "ok" && "text-status-ok",
          stat.tone === "warn" && "text-status-warn",
          stat.tone === "err" && "text-status-err",
          !stat.tone && "text-foreground",
        )}
      >
        {stat.value}
      </span>
      <span className="text-muted-foreground">{stat.label}</span>
    </span>
  );
}

async function ping(): Promise<{ ok: boolean; ms: number; env: string; version: string }> {
  const t = performance.now();
  try {
    const r = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    const ms = Math.round(performance.now() - t);
    if (!r.ok) return { ok: false, ms, env: "unknown", version: "?" };
    const data = (await r.json()) as { env: string; version: string };
    return { ok: true, ms, env: data.env, version: data.version };
  } catch {
    return { ok: false, ms: -1, env: "down", version: "?" };
  }
}

export function StatusBar() {
  const [data, setData] = useState<Awaited<ReturnType<typeof ping>> | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const result = await ping();
      if (alive) setData(result);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="flex items-center gap-5 text-[11px]">
      <span className="inline-flex items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            data?.ok
              ? "bg-status-ok text-status-ok animate-pulse-dot"
              : "bg-status-err text-status-err",
          )}
        />
      </span>
      {data?.ok && (
        <>
          <Pill stat={{ label: "Env", value: data.env, tone: "ok" }} />
          <Pill stat={{ label: "API", value: `v${data.version}` }} />
          <Pill
            stat={{
              label: "ms",
              value: `${data.ms}`,
              tone: data.ms < 200 ? "ok" : data.ms < 800 ? "warn" : "err",
            }}
          />
        </>
      )}
      {!data?.ok && data && (
        <Pill stat={{ label: "API", value: "down", tone: "err" }} />
      )}
      <ThemeToggle />
    </div>
  );
}
