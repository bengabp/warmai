"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import {
  useDeleteEmailLists,
  useEmailLists,
  useUploadEmailList,
} from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import type { EmailListType } from "@/lib/types";

export default function EmailListsPage() {
  const lists = useEmailLists();
  const remove = useDeleteEmailLists();
  const upload = useUploadEmailList();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [listType, setListType] = useState<EmailListType>("clientEmails");
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Pick a CSV first");
      return;
    }
    try {
      await upload.mutateAsync({ name, listType, file });
      toast.success("List uploaded");
      setOpen(false);
      setName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Email lists"
        subtitle="CSV-uploaded contacts (client) or reply mailboxes"
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
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Upload list
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload email list</DialogTitle>
                </DialogHeader>
                <form onSubmit={onUpload} className="grid gap-4 mt-2">
                  <div className="grid gap-2">
                    <Label htmlFor="lname">Name</Label>
                    <Input
                      id="lname"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>List type</Label>
                    <Select
                      value={listType}
                      onValueChange={(v) => setListType(v as EmailListType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clientEmails">Client</SelectItem>
                        <SelectItem value="replyEmails">Reply</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="file">CSV file</Label>
                    <Input id="file" type="file" accept=".csv" ref={fileRef} required />
                    <p className="text-xs text-muted-foreground">
                      Required column: <code>email</code>. Reply lists also require{" "}
                      <code>password</code>.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={upload.isPending}>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {upload.isPending ? "Uploading…" : "Upload"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-[40px]" />
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lists.isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {lists.data?.items.length === 0 && (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-12 text-sm"
                >
                  No email lists yet.
                </TableCell>
              </TableRow>
            )}
            {lists.data?.items.map((l, i) => (
              <TableRow
                key={l._id}
                className="border-border animate-fade-in"
                data-stagger={Math.min(i, 14)}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={selected.has(l._id)}
                    onChange={() => toggle(l._id)}
                    aria-label={`Select ${l.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`uppercase text-[10px] tracking-wider ${
                      l.emailListType === "replyEmails"
                        ? "text-accent border-accent/40"
                        : "text-muted-foreground border-border"
                    }`}
                  >
                    {l.emailListType === "replyEmails" ? "Reply" : "Client"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{l.totalEmails}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(l.createdAt * 1000).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
