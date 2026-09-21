import Image from "next/image";
import Link from "next/link";
import { cn } from "@/utils/cn";

interface LogoProps {
  variant?: "navy" | "ivory" | "blue" | "gold";
  showWordmark?: boolean;
  href?: string;
  size?: number;
  layout?: "horizontal" | "vertical";
  subtitle?: string;
  titleClassName?: string;
  className?: string;
}

const MARKS: Record<NonNullable<LogoProps["variant"]>, string> = {
  navy: "/brand/ibis-mark-navy.png",
  ivory: "/brand/ibis-mark-ivory.png",
  blue: "/brand/ibis-mark-blue.png",
  gold: "/brand/ibis-mark-gold.png",
};

// Intrinsic aspect ratio of the source marks (640x421).
const MARK_ASPECT_RATIO = 640 / 421;

export function Logo({
  variant = "navy",
  showWordmark = true,
  href,
  size = 28,
  layout = "horizontal",
  subtitle,
  titleClassName,
  className,
}: LogoProps) {
  const wordmarkColor = variant === "ivory" ? "text-white" : "text-foreground";
  const isVertical = layout === "vertical";

  const content = (
    <span
      className={cn(
        "inline-flex",
        isVertical
          ? "flex-col items-center justify-center text-center gap-2"
          : "items-center gap-2",
        className
      )}
    >
      {variant === "navy" ? (
        <>
          <Image
            src={MARKS.navy}
            alt="Club At Ibis"
            width={Math.round(size * MARK_ASPECT_RATIO)}
            height={size}
            className="shrink-0 object-contain dark:hidden"
            priority
          />
          <Image
            src={MARKS.gold}
            alt="Club At Ibis"
            width={Math.round(size * MARK_ASPECT_RATIO)}
            height={size}
            className="hidden shrink-0 object-contain dark:block"
            priority
          />
        </>
      ) : (
        <Image
          src={MARKS[variant]}
          alt="Club At Ibis"
          width={Math.round(size * MARK_ASPECT_RATIO)}
          height={size}
          className="shrink-0 object-contain"
          priority
        />
      )}
      {showWordmark && (
        <div className={cn("flex flex-col", isVertical && "items-center")}>
          <span
            className={cn(
              "font-heading font-medium tracking-tight leading-tight",
              isVertical ? "text-2xl sm:text-[26px]" : "text-xl sm:text-2xl",
              wordmarkColor,
              titleClassName
            )}
          >
            Club At Ibis
          </span>
          {subtitle && (
            <span className="text-[10px] font-semibold tracking-widest text-brand-gold uppercase">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </span>
  );

  if (href) {
    return <Link href={href} className="inline-block">{content}</Link>;
  }

  return content;
}
