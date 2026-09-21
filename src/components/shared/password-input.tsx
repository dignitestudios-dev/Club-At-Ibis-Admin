"use client";

import { useState, useEffect, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PasswordStrengthMeter } from "@/components/shared/password-strength-meter";
import { cn } from "@/utils/cn";

export interface PasswordInputProps extends React.ComponentProps<"input"> {
  showStrength?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { className, showStrength = false, placeholder = "******", onFocus, onBlur, onChange, ...props },
    ref
  ) {
    const [visible, setVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [currentValue, setCurrentValue] = useState<string>(
      props.value !== undefined
        ? String(props.value)
        : props.defaultValue !== undefined
          ? String(props.defaultValue)
          : ""
    );

    useEffect(() => {
      if (props.value !== undefined) {
        setCurrentValue(String(props.value));
      }
    }, [props.value]);

    return (
      <div className="w-full space-y-1">
        <div className="relative">
          <Input
            ref={ref}
            type={visible ? "text" : "password"}
            className={cn("pr-10", className)}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            onChange={(e) => {
              setCurrentValue(e.target.value);
              onChange?.(e);
            }}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute top-1/2 right-2.5 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        </div>

        {showStrength && isFocused && (
          <PasswordStrengthMeter password={currentValue} visible={isFocused} />
        )}
      </div>
    );
  }
);
