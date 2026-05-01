"use client";

import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWarmup } from "@/lib/queries";

export default function WarmupDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useWarmup(id);

  if (q.isLoading) return <Skeleton className="h-40 w-full" />;
  if (!q.data) return <p className="text-muted-foreground">Not found.</p>;
  const w = q.data;

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{w.name}</h1>
          <p className="text-sm text-muted-foreground">{w.statusText ?? "—"}</p>
        </div>
        <Badge>{w.state}</Badge>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Stat label="Day" value={`${w.currentWarmupDay}${w.maxDays ? ` / ${w.maxDays}` : ""}`} />
        <Stat label="Addresses mailed" value={w.totalAddressesMailed.toString()} />
        <Stat label="Start volume" value={w.startVolume.toString()} />
        <Stat label="Daily limit" value={w.dailySendLimit.toString()} />
        <Stat label="Increase rate" value={w.increaseRate.toString()} />
        <Stat label="Auto-responder" value={w.autoResponderEnabled ? "On" : "Off"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Linked resources</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Mail server:</span>{" "}
            {w.mailserverName ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Client list:</span>{" "}
            {w.clientEmailListName ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Reply list:</span>{" "}
            {w.replyEmailListName ?? "—"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
