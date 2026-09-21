"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false);
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("size-9 rounded-lg text-muted-foreground", className)}
        aria-label="Toggle theme"
      >
        <span className="size-4.5 rounded-full bg-muted animate-pulse" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "relative size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                    className
                  )}
                  aria-label="Change theme"
                />
              }
            />
          }
        >
          {theme === "system" ? (
            <Laptop className="size-4.5 transition-transform duration-200" />
          ) : isDark ? (
            <Moon className="size-4.5 text-amber-400 transition-transform duration-200" />
          ) : (
            <Sun className="size-4.5 text-amber-500 transition-transform duration-200" />
          )}
          <span className="sr-only">Toggle theme</span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">Theme: {theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : "System"}</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-38 p-1">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={cn(
            "flex items-center justify-between gap-2 text-xs font-medium cursor-pointer rounded-md px-2.5 py-1.5",
            theme === "light" && "bg-slate-100 dark:bg-slate-800 text-primary font-semibold"
          )}
        >
          <span className="flex items-center gap-2">
            <Sun className="size-4 text-amber-500" />
            Light
          </span>
          {theme === "light" && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn(
            "flex items-center justify-between gap-2 text-xs font-medium cursor-pointer rounded-md px-2.5 py-1.5",
            theme === "dark" && "bg-slate-100 dark:bg-slate-800 text-primary font-semibold"
          )}
        >
          <span className="flex items-center gap-2">
            <Moon className="size-4 text-amber-400" />
            Dark
          </span>
          {theme === "dark" && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn(
            "flex items-center justify-between gap-2 text-xs font-medium cursor-pointer rounded-md px-2.5 py-1.5",
            theme === "system" && "bg-slate-100 dark:bg-slate-800 text-primary font-semibold"
          )}
        >
          <span className="flex items-center gap-2">
            <Laptop className="size-4 text-slate-400" />
            System
          </span>
          {theme === "system" && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
