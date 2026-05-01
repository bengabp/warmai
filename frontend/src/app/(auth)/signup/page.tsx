"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/api";
import { useSignup } from "@/lib/queries";

const initial = { username: "", email: "", password: "", fullname: "", accessCode: "" };

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignup();
  const [form, setForm] = useState(initial);

  function update(field: keyof typeof initial, v: string) {
    setForm((f) => ({ ...f, [field]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await signup.mutateAsync(form);
      toast.success("Account created — please sign in");
      router.push("/login");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Sign up requires an access code</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="fullname">Full name</Label>
            <Input id="fullname" value={form.fullname} onChange={(e) => update("fullname", e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={form.username} onChange={(e) => update("username", e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="accessCode">Access code</Label>
            <Input id="accessCode" value={form.accessCode} onChange={(e) => update("accessCode", e.target.value)} required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={signup.isPending}>
            {signup.isPending ? "Creating…" : "Sign up"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
