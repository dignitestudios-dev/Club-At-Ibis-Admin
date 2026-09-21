"use client";

import { useMemo } from "react";
import { cn } from "@/utils/cn";

export interface PasswordRule {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: "Too weak" | "Weak" | "Fair" | "Good" | "Strong";
  colorClass: string;
  textColorClass: string;
  percent: number;
  rules: PasswordRule[];
}

export function getPasswordStrength(password: string): PasswordStrength {
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const rules: PasswordRule[] = [
    { id: "length", label: "At least 8 characters", met: hasLength },
    { id: "upper", label: "One uppercase letter (A-Z)", met: hasUpper },
    { id: "lower", label: "One lowercase letter (a-z)", met: hasLower },
    { id: "digit", label: "One number (0-9)", met: hasDigit },
    { id: "special", label: "One special character (!@#$%)", met: hasSpecial },
  ];

  const metCount = rules.filter((r) => r.met).length;

  if (!password || password.length === 0) {
    return {
      score: 0,
      label: "Too weak",
      colorClass: "bg-slate-200",
      textColorClass: "text-muted-foreground",
      percent: 0,
      rules,
    };
  }

  if (metCount === 5) {
    return {
      score: 4,
      label: "Strong",
      colorClass: "bg-emerald-600 dark:bg-emerald-500",
      textColorClass: "text-emerald-700 dark:text-emerald-400 font-semibold",
      percent: 100,
      rules,
    };
  }

  if (metCount === 4) {
    return {
      score: 3,
      label: "Good",
      colorClass: "bg-blue-600 dark:bg-blue-500",
      textColorClass: "text-blue-700 dark:text-blue-400 font-medium",
      percent: 75,
      rules,
    };
  }

  if (metCount >= 2) {
    return {
      score: 2,
      label: "Fair",
      colorClass: "bg-amber-500 dark:bg-amber-400",
      textColorClass: "text-amber-700 dark:text-amber-400 font-medium",
      percent: 50,
      rules,
    };
  }

  return {
    score: 1,
    label: "Weak",
    colorClass: "bg-rose-500 dark:bg-rose-400",
    textColorClass: "text-rose-700 dark:text-rose-400 font-medium",
    percent: 25,
    rules,
  };
}

export function PasswordStrengthMeter({
  password = "",
  visible = true,
  className,
}: {
  password?: string;
  visible?: boolean;
  className?: string;
}) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "mt-1.5 space-y-1 transition-all duration-200 animate-in fade-in-50",
        className
      )}
    >
      <div className="flex h-1.5 w-full gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={cn(
              "h-full flex-1 rounded-full transition-all duration-300",
              step <= strength.score ? strength.colorClass : "bg-slate-200 dark:bg-slate-800"
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Password strength</span>
        <span className={cn(strength.textColorClass)}>
          {strength.label}
        </span>
      </div>
    </div>
  );
}
