import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initialsOf } from "@/lib/domain";
import { cn } from "@/utils/cn";

const TONES = [
  "bg-primary text-primary-foreground",
  "bg-sky-700 text-white dark:bg-sky-600",
  "bg-emerald-700 text-white dark:bg-emerald-600",
  "bg-purple-700 text-white dark:bg-purple-600",
  "bg-amber-700 text-white dark:bg-amber-600",
  "bg-rose-700 text-white dark:bg-rose-600",
  "bg-teal-700 text-white dark:bg-teal-600",
];

function toneFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

export function PersonAvatar({
  name,
  className,
  fallbackClassName,
}: {
  name: string;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={cn("size-8", className)}>
      <AvatarFallback className={cn("text-xs font-semibold", toneFor(name), fallbackClassName)}>
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}
