"use client";

import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";

/** True one frame after mount, so CSS transitions play from their start state. */
function useGrow() {
  const [go, setGo] = useState(false);
  useEffect(() => {
    let a = 0;
    let b = 0;
    a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => setGo(true));
    });
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
    };
  }, []);
  return go;
}

/** Counts a number up from 0 with an ease-out curve. */
function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/* ------------------------------------------------------------------ */
/* Donut: segments draw themselves around the ring                     */
/* ------------------------------------------------------------------ */

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number,
  endAngle: number
) {
  const isFull = endAngle - startAngle >= 2 * Math.PI - 0.001;
  if (isFull) {
    return [
      `M ${cx} ${cy - rOuter}`,
      `A ${rOuter} ${rOuter} 0 1 1 ${cx} ${cy + rOuter}`,
      `A ${rOuter} ${rOuter} 0 1 1 ${cx} ${cy - rOuter}`,
      `M ${cx} ${cy - rInner}`,
      `A ${rInner} ${rInner} 0 1 0 ${cx} ${cy + rInner}`,
      `A ${rInner} ${rInner} 0 1 0 ${cx} ${cy - rInner}`,
      "Z",
    ].join(" ");
  }

  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p3 = polarToCartesian(cx, cy, rInner, endAngle);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);

  return [
    `M ${p1.x.toFixed(3)} ${p1.y.toFixed(3)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`,
    `L ${p3.x.toFixed(3)} ${p3.y.toFixed(3)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x.toFixed(3)} ${p4.y.toFixed(3)}`,
    "Z",
  ].join(" ");
}

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
  href?: string;
}

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  hoveredKey: controlledHoveredKey,
  onHoverKeyChange,
  onSegmentClick,
  className,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: number;
  hoveredKey?: string | null;
  onHoverKeyChange?: (key: string | null) => void;
  onSegmentClick?: (segment: DonutSegment) => void;
  className?: string;
}) {
  const go = useGrow();
  const count = useCountUp(centerValue);
  const [internalHover, setInternalHover] = useState<string | null>(null);

  const activeKey = controlledHoveredKey !== undefined ? controlledHoveredKey : internalHover;
  const handleHover = (key: string | null) => {
    setInternalHover(key);
    onHoverKeyChange?.(key);
  };

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);

  const cx = 100;
  const cy = 100;
  const rInnerBase = 58;
  const rOuterBase = 84;

  const gapAngle = visible.length > 1 ? (1.5 * Math.PI) / 180 : 0;

  let currentAngle = -Math.PI / 2; // start at 12 o'clock

  const arcs = visible.map((s) => {
    const fraction = total > 0 ? s.value / total : 0;
    const span = fraction * 2 * Math.PI;
    const isHovered = activeKey === s.key;
    const rOuter = isHovered ? rOuterBase + 3 : rOuterBase;
    const rInner = isHovered ? rInnerBase - 2 : rInnerBase;

    let start = currentAngle;
    let end = currentAngle + span;

    if (visible.length > 1 && span > gapAngle * 1.2) {
      start += gapAngle / 2;
      end -= gapAngle / 2;
    }

    const pathData = describeArc(cx, cy, rInner, rOuter, start, end);
    currentAngle += span;

    return {
      segment: s,
      pathData,
      isHovered,
      pct: fraction * 100,
    };
  });

  const activeSegment = segments.find((s) => s.key === activeKey);
  const activePct =
    activeSegment && total > 0
      ? ((activeSegment.value / total) * 100).toFixed(1)
      : null;

  return (
    <div
      className={cn("relative aspect-square w-full max-w-[220px]", className)}
      onMouseLeave={() => handleHover(null)}
    >
      {/* Interactive hover tooltip displaying status name, request count, and percentage */}
      {activeSegment && activeSegment.value > 0 && (
        <div
          role="tooltip"
          className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 z-20 min-w-36 rounded-xl border border-border/80 bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-xs animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: activeSegment.color }}
            />
            <span className="font-semibold text-foreground truncate">
              {activeSegment.label}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-muted-foreground">
            <span>Requests</span>
            <span className="font-bold tabular-nums text-foreground">
              {activeSegment.value} ({activePct}%)
            </span>
          </div>
        </div>
      )}

      <svg
        viewBox="0 0 200 200"
        className="size-full overflow-visible"
        role="img"
        aria-label={`${centerLabel}: ${centerValue}`}
      >
        {/* Background track ring when total is 0 or empty */}
        {total === 0 && (
          <path
            d={describeArc(cx, cy, rInnerBase, rOuterBase, 0, 2 * Math.PI)}
            className="fill-muted/40 stroke-border/40"
          />
        )}

        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: go ? "scale(1)" : "scale(0.88)",
            opacity: go ? 1 : 0,
            transition: "transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease",
          }}
        >
          {arcs.map(({ segment, pathData, isHovered }) => {
            const isDimmed = activeKey !== null && activeKey !== undefined && !isHovered;
            return (
              <path
                key={segment.key}
                d={pathData}
                fill={segment.color}
                opacity={isDimmed ? 0.45 : 1}
                cursor="pointer"
                onMouseEnter={() => handleHover(segment.key)}
                onClick={() => onSegmentClick?.(segment)}
                className="transition-all duration-200"
                style={{
                  filter: isHovered
                    ? `drop-shadow(0 3px 8px ${segment.color}55)`
                    : undefined,
                }}
              >
                <title>{`${segment.label}: ${segment.value}`}</title>
              </path>
            );
          })}
        </g>
      </svg>

      {/* Center Label & Value */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span className="font-heading text-3xl font-semibold tabular-nums text-foreground transition-all duration-200">
          {activeSegment && activeSegment.value > 0 ? activeSegment.value : count}
        </span>
        <span
          className="text-[10px] font-semibold tracking-wider uppercase truncate max-w-[110px] transition-colors duration-200"
          style={{
            color: activeSegment && activeSegment.value > 0 ? activeSegment.color : undefined,
          }}
        >
          {activeSegment && activeSegment.value > 0 ? activeSegment.label : centerLabel}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stacked monthly bars: gridlines, y-axis, hover tooltip              */
/* ------------------------------------------------------------------ */

export interface MonthBar {
  label: string;
  parts: { key: string; label: string; value: number; color: string }[];
}

function niceMax(v: number) {
  if (v <= 4) return 4;
  const step = v <= 10 ? 2 : v <= 20 ? 5 : 10;
  return Math.ceil(v / step) * step;
}

export function StackedMonthBars({ months }: { months: MonthBar[] }) {
  const go = useGrow();
  const [hover, setHover] = useState<number | null>(null);

  const W = 640;
  const H = 260;
  const pad = { l: 34, r: 8, t: 14, b: 30 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const totals = months.map((m) => m.parts.reduce((s, p) => s + p.value, 0));
  const max = niceMax(Math.max(1, ...totals));
  const ticks = 4;
  const slot = plotW / months.length;
  const barW = Math.min(46, slot * 0.56);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Submissions per month, stacked by outcome" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const y = pad.t + (plotH / ticks) * i;
          const v = Math.round(max - (max / ticks) * i);
          return (
            <g key={i}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} className="stroke-border" strokeDasharray={i === ticks ? undefined : "3 4"} />
              <text x={pad.l - 8} y={y + 3.5} textAnchor="end" className="fill-muted-foreground" fontSize="10">
                {v}
              </text>
            </g>
          );
        })}

        {months.map((m, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const x = cx - barW / 2;
          let acc = 0;
          const isHover = hover === i;
          return (
            <g key={m.label} onMouseEnter={() => setHover(i)} style={{ cursor: "pointer" }}>
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={plotH} fill="transparent" />
              {isHover && <rect x={pad.l + slot * i + 4} y={pad.t} width={slot - 8} height={plotH} rx="8" className="fill-muted/60" />}
              <g
                style={{
                  transformOrigin: `${cx}px ${pad.t + plotH}px`,
                  transform: go ? "scaleY(1)" : "scaleY(0)",
                  transition: `transform 900ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 90}ms`,
                }}
              >
                {m.parts.map((p) => {
                  if (p.value <= 0) return null;
                  const h = (p.value / max) * plotH;
                  const y = pad.t + plotH - ((acc + p.value) / max) * plotH;
                  acc += p.value;
                  const isTop = acc === totals[i];
                  return (
                    <rect
                      key={p.key}
                      x={x}
                      y={y}
                      width={barW}
                      height={Math.max(h - 1.5, 0)}
                      rx={isTop ? 6 : 2}
                      fill={p.color}
                      opacity={hover === null || isHover ? 1 : 0.45}
                      className="transition-opacity duration-150"
                    />
                  );
                })}
              </g>
              <text
                x={cx}
                y={pad.t + plotH - (totals[i] / max) * plotH - 7}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                className="fill-foreground"
                style={{ opacity: go ? 1 : 0, transition: `opacity 500ms ease ${400 + i * 90}ms` }}
              >
                {totals[i]}
              </text>
              <text x={cx} y={H - 9} textAnchor="middle" fontSize="11" className={isHover ? "fill-foreground font-semibold" : "fill-muted-foreground"}>
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-xl border border-border bg-popover p-3 text-xs shadow-lg animate-in fade-in zoom-in-95 duration-150"
          style={{ left: `clamp(0px, calc(${((pad.l + slot * hover + slot / 2) / W) * 100}% - 80px), calc(100% - 10rem))` }}
        >
          <p className="mb-1.5 font-semibold text-foreground">
            {months[hover].label} · {totals[hover]} request{totals[hover] === 1 ? "" : "s"}
          </p>
          <ul className="space-y-1">
            {months[hover].parts.map((p) => (
              <li key={p.key} className="flex items-center gap-2 text-muted-foreground">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                <span className="flex-1">{p.label}</span>
                <span className="font-semibold tabular-nums text-foreground">{p.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal bars: fill from the left                                 */
/* ------------------------------------------------------------------ */

export function GrowBar({
  fraction,
  index = 0,
  className,
  trackClassName,
}: {
  /** 0-1 */
  fraction: number;
  index?: number;
  className?: string;
  trackClassName?: string;
}) {
  const go = useGrow();
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", trackClassName)}>
      <div
        className={cn("h-full rounded-full bg-primary dark:bg-amber-400", className)}
        style={{
          width: go ? `${Math.max(0, Math.min(1, fraction)) * 100}%` : "0%",
          transition: `width 900ms cubic-bezier(0.22, 1, 0.36, 1) ${index * 90}ms`,
        }}
      />
    </div>
  );
}

export function HBarList({
  rows,
}: {
  rows: { key: string; label: string; value: number; sublabel?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium text-foreground">{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {r.sublabel ? `${r.sublabel} · ` : ""}
              <span className="font-semibold text-foreground">{r.value}</span>
            </span>
          </div>
          <GrowBar fraction={r.value / max} index={i} />
        </li>
      ))}
    </ul>
  );
}
