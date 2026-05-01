"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Flame,
  ListTree,
  LogOut,
  Mail,
  Server,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBar } from "@/components/status-bar";
import { clearToken, getToken } from "@/lib/api";
import { useMe } from "@/lib/queries";

const NAV = [
  { href: "/warmups", label: "Warmups", icon: Flame },
  { href: "/mail-servers", label: "Mail servers", icon: Server },
  { href: "/email-lists", label: "Email lists", icon: ListTree },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();

  useEffect(() => {
    if (typeof window !== "undefined" && !getToken()) {
      router.replace("/login");
    }
  }, [router]);

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div className="grid grid-cols-[220px_1fr] min-h-screen">
      <aside className="border-r border-border bg-background flex flex-col">
        <div className="px-5 py-4 flex items-center gap-2.5">
          <div className="grid place-items-center h-7 w-7 rounded-md bg-card border border-border">
            <Mail className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-semibold tracking-tight text-sm">WarmAI</span>
        </div>

        <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px]",
                  "transition-all duration-200 ease-out",
                  active
                    ? "bg-card text-foreground border border-border"
                    : "text-muted-foreground border border-transparent hover:text-foreground hover:bg-card/60 hover:translate-x-0.5",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full bg-primary transition-all duration-300 ease-out",
                    active ? "h-5 opacity-100" : "h-0 opacity-0",
                  )}
                />
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    active ? "text-primary" : "group-hover:scale-110",
                  )}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-border flex flex-col gap-1">
          <div className="flex items-center gap-2 px-3 py-2 text-[13px] text-muted-foreground">
            <UserIcon className="h-3.5 w-3.5" />
            {me.isLoading ? (
              <Skeleton className="h-3 w-20" />
            ) : (
              <span className="truncate">{me.data?.username ?? "—"}</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="justify-start text-muted-foreground hover:text-foreground h-8 px-3 text-[13px]"
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <div className="flex flex-col min-h-screen">
        <div className="flex justify-end items-center px-8 h-12 border-b border-border">
          <StatusBar />
        </div>
        <main className="flex-1 px-8 py-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
