import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type HealthCheck = { ok: boolean; latencyMs?: number; error?: string };
type Health = {
  status: "ok" | "degraded";
  timestamp: string;
  checks: Record<string, HealthCheck>;
};

export function ServiceStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/public/health", { cache: "no-store" });
        const json = (await res.json()) as Health;
        if (!cancelled) {
          setHealth(json);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "unreachable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchHealth();
    const id = setInterval(fetchHealth, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const dotColor = error
    ? "bg-destructive"
    : loading
      ? "bg-muted-foreground animate-pulse"
      : health?.status === "ok"
        ? "bg-emerald-500"
        : "bg-amber-500";

  const label = error
    ? "Offline"
    : loading
      ? "Checking…"
      : health?.status === "ok"
        ? "All systems normal"
        : "Degraded";

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground"
      title={
        health
          ? Object.entries(health.checks)
              .map(([k, v]) => `${k}: ${v.ok ? "ok" : "fail"}${v.latencyMs != null ? ` (${v.latencyMs}ms)` : ""}`)
              .join("\n")
          : error ?? ""
      }
    >
      <span className={cn("inline-block size-2 rounded-full", dotColor)} />
      <span className="truncate">{label}</span>
    </div>
  );
}
