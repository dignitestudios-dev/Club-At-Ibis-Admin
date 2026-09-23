import * as React from "react";
import { cn } from "@/utils/cn";

export interface LoaderProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function Loader({ className, ...props }: LoaderProps) {
  return (
    <svg
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("dexnive-loader inline-block", className)}
      viewBox="25 25 50 50"
      {...props}
    >
      <circle r="20" cy="50" cx="50" />
    </svg>
  );
}

export const Spinner = Loader;
export type SpinnerProps = LoaderProps;
