import { StatusBar } from "@/components/status-bar";
import { Mail } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex justify-between items-center px-8 h-12 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center h-7 w-7 rounded-md bg-card border border-border">
            <Mail className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-semibold tracking-tight text-sm">WarmAI</span>
        </div>
        <StatusBar />
      </div>
      <div className="flex-1 grid place-items-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
