import Image from "next/image";
import Link from "next/link";
import { cn } from "@/utils/cn";

interface LogoProps {
  /** Kept so existing callers still compile; the new logo is a single navy badge that works on light and dark. */
  variant?: "navy" | "ivory" | "blue" | "gold";
  /** Kept for existing callers; the logo image already contains the "The Club at Ibis" wordmark. */
  showWordmark?: boolean;
  href?: string;
  /** Sizing hint used by callers; the badge is rendered at size × LOGO_SCALE px tall because it now includes the wordmark. */
  size?: number;
  layout?: "horizontal" | "vertical";
  subtitle?: string;
  titleClassName?: string;
  className?: string;
}

const LOGO_SRC = "/brand/club-at-ibis-logo.png";

// Intrinsic size of the logo file (240x198).
const LOGO_ASPECT_RATIO = 240 / 198;

// The badge carries its own wordmark, so it is drawn larger than the old mark-only sizes for the text to stay legible.
const LOGO_SCALE = 1.8;

export function Logo({ href, size = 28, layout = "horizontal", subtitle, className }: LogoProps) {
  const isVertical = layout === "vertical";
  const height = Math.round(size * LOGO_SCALE);

  const content = (
    <span
      className={cn(
        "inline-flex",
        isVertical ? "flex-col items-center justify-center text-center gap-2" : "items-center gap-2",
        className
      )}
    >
      <Image
        src={LOGO_SRC}
        alt="The Club at Ibis"
        width={Math.round(height * LOGO_ASPECT_RATIO)}
        height={height}
        className="shrink-0 object-contain"
        priority
      />
      {subtitle && (
        <span className="text-[10px] font-semibold tracking-widest text-brand-gold uppercase">{subtitle}</span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {content}
      </Link>
    );
  }

  return content;
}
