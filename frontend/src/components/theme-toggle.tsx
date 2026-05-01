"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

export function ThemeToggle({ size = "icon" }: { size?: "icon" | "sm" }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";
  const next = isDark ? "light" : "dark";

  function flip(e: React.MouseEvent<HTMLButtonElement>) {
    const doc = document as ViewTransitionDoc;
    // Fallback: just toggle if the API isn't supported (Firefox/older Safari).
    if (!doc.startViewTransition || !ref.current) {
      setTheme(next);
      return;
    }

    const rect = ref.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = doc.startViewTransition(() => {
      setTheme(next);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 520,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });

    // Don't carry the synthetic event here.
    e.currentTarget.blur();
  }

  return (
    <Button
      ref={ref}
      variant="ghost"
      size={size}
      onClick={flip}
      aria-label="Toggle theme"
      title={`Switch to ${next} mode`}
      className="relative text-muted-foreground hover:text-foreground overflow-hidden"
    >
      <Sun
        className={cn(
          "h-4 w-4 transition-all duration-300",
          mounted && isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0",
        )}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-all duration-300",
          mounted && !isDark
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-0 opacity-0",
        )}
      />
    </Button>
  );
}
