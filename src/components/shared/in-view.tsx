"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

/** Renders `children` only once the wrapper first scrolls into view. */
export function InView({
  children,
  fallback,
  className,
  rootMargin = "0px 0px -8% 0px",
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={cn(className)}>
      {visible ? children : fallback}
    </div>
  );
}
