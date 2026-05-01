"use client";

import Link from "next/link";
import { useState } from "react";
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
import { errorMessage } from "@/lib/api";
import {
  useDeleteWarmups,
  useUpdateWarmupState,
  useWarmups,
} from "@/lib/queries";
import type { WarmupState } from "@/lib/types";

const STATE_VARIANT: Record<WarmupState, "default" | "secondary" | "destructive" | "outline"> = {
  notStarted: "outline",
  running: "default",
  paused: "secondary",
  completed: "secondary",
  failed: "destructive",
};

export default function WarmupsPage() {
  const warmups = useWarmups();
  const updateState = useUpdateWarmupState();
  const remove = useDeleteWarmups();
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Warmups</h1>
          <p className="text-sm text-muted-foreground">
            Manage email warmup campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => bulk("pause")}>
                <Pause className="h-4 w-4 mr-1" /> Pause
              </Button>
              <Button variant="outline" size="sm" onClick={() => bulk("resume")}>
                <Play className="h-4 w-4 mr-1" /> Resume
              </Button>
              <Button variant="destructive" size="sm" onClick={() => bulk("delete")}>
                <Trash className="h-4 w-4 mr-1" /> Delete
              </Button>
            </>
          )}
          <Button asChild>
            <Link href="/warmups/new">
              <Plus className="h-4 w-4 mr-1" /> New warmup
            </Link>
          </Button>
        </div>
      </header>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {warmups.data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  No warmups yet — create your first one.
                </TableCell>
              </TableRow>
            )}
            {warmups.data?.items.map((w) => (
              <TableRow key={w._id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(w._id)}
                    onChange={() => toggle(w._id)}
                    aria-label={`Select ${w.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/warmups/${w._id}`} className="hover:underline">
                    {w.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={STATE_VARIANT[w.state]}>{w.state}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {w.mailserverName ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  {w.currentWarmupDay}
                  {w.maxDays > 0 ? ` / ${w.maxDays}` : ""}
                </TableCell>
                <TableCell className="text-right">{w.totalAddressesMailed}</TableCell>
                <TableCell className="text-muted-foreground text-sm truncate max-w-[280px]">
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
