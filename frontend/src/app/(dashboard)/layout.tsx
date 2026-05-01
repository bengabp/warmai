"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Mail,
  Server,
  ListTree,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clearToken, getToken } from "@/lib/api";
import { useMe } from "@/lib/queries";

const NAV = [
  { href: "/warmups", label: "Warmups", icon: LayoutDashboard },
  { href: "/mail-servers", label: "Mail servers", icon: Server },
  { href: "/email-lists", label: "Email lists", icon: ListTree },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
    <div className="grid grid-cols-[240px_1fr] min-h-screen">
      <aside className="border-r bg-card flex flex-col">
        <div className="px-6 py-5 border-b">
          <Link href="/warmups" className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <span className="font-semibold tracking-tight">WarmAI</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t flex flex-col gap-2">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <UserIcon className="h-4 w-4" />
            {me.isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span className="truncate">{me.data?.username ?? "—"}</span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="justify-start">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="px-8 py-6 overflow-auto">{children}</main>
    </div>
  );
}
