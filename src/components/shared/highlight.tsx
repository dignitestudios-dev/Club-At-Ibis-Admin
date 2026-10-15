import { cn } from "@/utils/cn";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Renders `text` with every part that matches the search `query` highlighted. The query is split on spaces and
 * each word is matched anywhere in the text, case-insensitively (the same way the search itself matches).
 * With no query it renders the text unchanged.
 */
export function Highlight({ text, query, className }: { text?: string | number | null; query?: string | null; className?: string }) {
  const value = text === null || text === undefined ? "" : String(text);
  const words = Array.from(new Set((query ?? "").trim().split(/\s+/).filter(Boolean)));
  if (!value || words.length === 0) return <>{value}</>;

  const pattern = new RegExp(`(${words.sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})`, "gi");
  const parts = value.split(pattern);
  if (parts.length === 1) return <>{value}</>;

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className={cn("rounded-[3px] bg-amber-200/90 px-0.5 text-inherit dark:bg-amber-400/35", className)}>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
