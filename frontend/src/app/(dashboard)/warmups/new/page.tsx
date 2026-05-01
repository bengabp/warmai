"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { errorMessage } from "@/lib/api";
import {
  useCreateWarmup,
  useEmailLists,
  useMailServers,
} from "@/lib/queries";

export default function NewWarmupPage() {
  const router = useRouter();
  const create = useCreateWarmup();
  const mailServers = useMailServers();
  const replyLists = useEmailLists("replyEmails");
  const clientLists = useEmailLists("clientEmails");

  const [name, setName] = useState("");
  const [mailserverId, setMailserverId] = useState("");
  const [autoResponderEnabled, setAutoResponder] = useState(false);
  const [clientEmailListId, setClientList] = useState("");
  const [replyEmailListId, setReplyList] = useState("");
  const [maxDays, setMaxDays] = useState(30);
  const [increaseRate, setIncreaseRate] = useState(0.5);
  const [startVolume, setStartVolume] = useState(20);
  const [dailySendLimit, setDailySendLimit] = useState(200);
  const [targetOpenRate, setTargetOpenRate] = useState(0.5);
  const [targetReplyRate, setTargetReplyRate] = useState(0.3);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({
        name,
        mailserverId,
        clientEmailListId: clientEmailListId || null,
        replyEmailListId: replyEmailListId || null,
        maxDays,
        increaseRate,
        startVolume,
        dailySendLimit,
        autoResponderEnabled,
        targetOpenRate,
        targetReplyRate,
        scheduledAt: Math.floor(Date.now() / 1000),
      });
      toast.success("Warmup created");
      router.push("/warmups");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">New warmup</h1>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>Mail server</Label>
              <Select value={mailserverId} onValueChange={setMailserverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a mail server" />
                </SelectTrigger>
                <SelectContent>
                  {mailServers.data?.map((ms) => (
                    <SelectItem key={ms._id} value={ms._id}>
                      {ms.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Targets</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-3">
              <input
                id="autoresponder"
                type="checkbox"
                checked={autoResponderEnabled}
                onChange={(e) => setAutoResponder(e.target.checked)}
              />
              <Label htmlFor="autoresponder">Enable auto-responder (reply traffic)</Label>
            </div>

            {autoResponderEnabled ? (
              <div className="grid gap-2">
                <Label>Reply email list</Label>
                <Select value={replyEmailListId} onValueChange={setReplyList}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reply list" />
                  </SelectTrigger>
                  <SelectContent>
                    {replyLists.data?.items.map((el) => (
                      <SelectItem key={el._id} value={el._id}>
                        {el.name} ({el.totalEmails})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Client email list</Label>
                <Select value={clientEmailListId} onValueChange={setClientList}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client list" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientLists.data?.items.map((el) => (
                      <SelectItem key={el._id} value={el._id}>
                        {el.name} ({el.totalEmails})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <NumberField label="Open rate (0–1)" value={targetOpenRate} onChange={setTargetOpenRate} step={0.1} />
              <NumberField label="Reply rate (0–1)" value={targetReplyRate} onChange={setTargetReplyRate} step={0.1} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <NumberField label="Max days (0 = forever)" value={maxDays} onChange={setMaxDays} />
            <NumberField label="Increase rate" value={increaseRate} onChange={setIncreaseRate} step={0.1} />
            <NumberField label="Start volume" value={startVolume} onChange={setStartVolume} />
            <NumberField label="Daily send limit" value={dailySendLimit} onChange={setDailySendLimit} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create warmup"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        type="number"
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
