"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pause, Play, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { errorMessage } from "@/lib/api";
import {
  useDeleteWarmups,
  useUpdateWarmupState,
  useWarmups,
} from "@/lib/queries";
import type { Warmup, WarmupState } from "@/lib/types";

const STATE_TONE: Record<WarmupState, string> = {
  notStarted: "text-muted-foreground border-border",
  running: "text-status-ok border-status-ok/40",
  paused: "text-status-warn border-status-warn/40",
  completed: "text-foreground border-border",
  failed: "text-status-err border-status-err/40",
};

function StatBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "ok" | "warn" | "err" | "muted";
}) {
  const toneClass =
    tone === "ok"
      ? "text-status-ok"
      : tone === "warn"
        ? "text-status-warn"
        : tone === "err"
          ? "text-status-err"
          : tone === "muted"
            ? "text-muted-foreground"
            : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

export default function WarmupsPage() {
  const warmups = useWarmups();
  const updateState = useUpdateWarmupState();
  const remove = useDeleteWarmups();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const items: Warmup[] = warmups.data?.items ?? [];
    const c = { running: 0, paused: 0, failed: 0, completed: 0, notStarted: 0 };
    for (const w of items) c[w.state] += 1;
    return c;
  }, [warmups.data]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function bulk(action: "pause" | "resume" | "delete") {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      if (action === "delete") {
        await remove.mutateAsync(ids);
        toast.success(`Deleted ${ids.length} warmup(s)`);
      } else {
        await updateState.mutateAsync({ ids, action });
        toast.success(action === "pause" ? "Paused" : "Resumed");
      }
      setSelected(new Set());
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Warmups"
        subtitle="Email warmup campaigns and their current state"
        actions={
          <>
            {selected.size > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={() => bulk("pause")}>
                  <Pause className="h-3.5 w-3.5 mr-1.5" /> Pause
                </Button>
                <Button variant="outline" size="sm" onClick={() => bulk("resume")}>
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Resume
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-status-err border-status-err/40 hover:text-status-err"
                  onClick={() => bulk("delete")}
                >
                  <Trash className="h-3.5 w-3.5 mr-1.5" /> Delete
                </Button>
              </>
            )}
            <Button asChild size="sm">
              <Link href="/warmups/new">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New warmup
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {[
          { label: "Running", value: counts.running, tone: "ok" as const },
          { label: "Paused", value: counts.paused, tone: "warn" as const },
          { label: "Failed", value: counts.failed, tone: "err" as const },
          { label: "Completed", value: counts.completed, tone: "muted" as const },
          { label: "Not started", value: counts.notStarted, tone: "muted" as const },
        ].map((s, i) => (
          <div
            key={s.label}
            className="animate-slide-in"
            data-stagger={i}
          >
            <StatBlock {...s} />
          </div>
        ))}
      </div>

      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-[40px]" />
              <TableHead>Name</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Mail server</TableHead>
              <TableHead className="text-right">Day</TableHead>
              <TableHead className="text-right">Sent</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warmups.isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell colSpan={7}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {warmups.data?.items.length === 0 && (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12 text-sm"
                >
                  No warmups yet — create your first one.
                </TableCell>
              </TableRow>
            )}
            {warmups.data?.items.map((w, i) => (
              <TableRow
                key={w._id}
                className="border-border animate-fade-in"
                data-stagger={Math.min(i, 14)}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={selected.has(w._id)}
                    onChange={() => toggle(w._id)}
                    aria-label={`Select ${w.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/warmups/${w._id}`}
                    className="hover:text-primary transition-colors"
                  >
                    {w.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`uppercase text-[10px] tracking-wider ${STATE_TONE[w.state]}`}
                  >
                    {w.state}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {w.mailserverName ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {w.currentWarmupDay}
                  {w.maxDays > 0 ? ` / ${w.maxDays}` : ""}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {w.totalAddressesMailed}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs truncate max-w-[280px]">
                  {w.statusText ?? ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
