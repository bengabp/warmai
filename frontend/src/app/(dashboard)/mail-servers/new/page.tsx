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
import { useCreateMailServer, useVerifyMailServer } from "@/lib/queries";
import type { MailServerSecurity } from "@/lib/types";

export default function NewMailServerPage() {
  const router = useRouter();
  const create = useCreateMailServer();
  const verify = useVerifyMailServer();

  const [name, setName] = useState("");
  const [smtpHostname, setHostname] = useState("");
  const [smtpPort, setPort] = useState(587);
  const [smtpEmail, setEmail] = useState("");
  const [smtpPassword, setPassword] = useState("");
  const [smtpSecurity, setSecurity] = useState<MailServerSecurity>("tls");
  const [verifyTo, setVerifyTo] = useState("");

  async function onVerify() {
    if (!verifyTo) {
      toast.error("Provide a verification recipient email");
      return;
    }
    try {
      const res = await verify.mutateAsync({
        hostname: smtpHostname,
        port: smtpPort,
        email: smtpEmail,
        password: smtpPassword,
        security: smtpSecurity,
        recipientEmail: verifyTo,
      });
      if (res.status === "success") toast.success("SMTP works");
      else toast.error(`Verification failed: ${res.message}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({
        name,
        smtpHostname,
        smtpPort,
        smtpEmail,
        smtpPassword,
        smtpSecurity,
      });
      toast.success("Mail server saved");
      router.push("/mail-servers");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Add mail server</h1>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>SMTP credentials</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div className="grid gap-2">
                <Label htmlFor="host">Hostname</Label>
                <Input id="host" value={smtpHostname} onChange={(e) => setHostname(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setPort(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={smtpEmail} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pwd">Password</Label>
              <Input id="pwd" type="password" value={smtpPassword} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>Security</Label>
              <Select value={smtpSecurity} onValueChange={(v) => setSecurity(v as MailServerSecurity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls">STARTTLS</SelectItem>
                  <SelectItem value="ssl">SSL</SelectItem>
                  <SelectItem value="unsecure">Unsecure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verify (optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Send a probe email to confirm the credentials work before saving.
            </p>
            <div className="grid gap-2">
              <Label htmlFor="vto">Recipient</Label>
              <Input id="vto" type="email" value={verifyTo} onChange={(e) => setVerifyTo(e.target.value)} />
            </div>
            <Button type="button" variant="outline" onClick={onVerify} disabled={verify.isPending}>
              {verify.isPending ? "Verifying…" : "Send test email"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
