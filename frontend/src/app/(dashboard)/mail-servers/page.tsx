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
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mail servers</h1>
          <p className="text-sm text-muted-foreground">
            SMTP credentials used for sending warmup mail
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
          <Button asChild>
            <Link href="/mail-servers/new">
              <Plus className="h-4 w-4 mr-1" /> Add server
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
              <TableHead>Host</TableHead>
              <TableHead>Port</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Security</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ms.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {ms.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No mail servers yet — add one to start.
                </TableCell>
              </TableRow>
            )}
            {ms.data?.map((s) => (
              <TableRow key={s._id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(s._id)}
                    onChange={() => toggle(s._id)}
                    aria-label={`Select ${s.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.smtpHostname}</TableCell>
                <TableCell className="text-muted-foreground">{s.smtpPort}</TableCell>
                <TableCell className="text-muted-foreground">{s.smtpEmail}</TableCell>
                <TableCell className="uppercase text-xs">{s.smtpSecurity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
