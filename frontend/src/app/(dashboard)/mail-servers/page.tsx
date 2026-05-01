"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { errorMessage } from "@/lib/api";
import { useDeleteMailServers, useMailServers } from "@/lib/queries";

export default function MailServersPage() {
  const ms = useMailServers();
  const remove = useDeleteMailServers();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function onDelete() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      await remove.mutateAsync(ids);
      setSelected(new Set());
      toast.success(`Deleted ${ids.length}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Mail servers"
        subtitle="SMTP credentials used for sending warmup mail"
        actions={
          <>
            {selected.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="text-status-err border-status-err/40 hover:text-status-err"
              >
                <Trash className="h-3.5 w-3.5 mr-1.5" /> Delete
              </Button>
            )}
            <Button asChild size="sm">
              <Link href="/mail-servers/new">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add server
              </Link>
            </Button>
          </>
        }
      />

      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-[40px]" />
              <TableHead>Name</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Port</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Security</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ms.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {ms.data?.length === 0 && (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-12 text-sm"
                >
                  No mail servers yet — add one to start.
                </TableCell>
              </TableRow>
            )}
            {ms.data?.map((s, i) => (
              <TableRow
                key={s._id}
                className="border-border animate-fade-in"
                data-stagger={Math.min(i, 14)}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={selected.has(s._id)}
                    onChange={() => toggle(s._id)}
                    aria-label={`Select ${s.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.smtpHostname}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{s.smtpPort}</TableCell>
                <TableCell className="text-muted-foreground">{s.smtpEmail}</TableCell>
                <TableCell className="uppercase text-[10px] tracking-wider text-muted-foreground">
                  {s.smtpSecurity}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
