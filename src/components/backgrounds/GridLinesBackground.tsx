import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type GridLinesBackgroundProps = {
  className?: string;
};

const GridLinesBackground = ({ className = "" }: GridLinesBackgroundProps) => {
  return (
    <div
      className={cn("@container-size inset-0 -z-10 overflow-hidden bg-background pointer-events-none select-none", className)}
      aria-hidden="true"
    >
      <div className="absolute inset-0 mask-[radial-gradient(circle_at_center,white_0%,transparent_90%)] bg-[linear-gradient(to_right,color-mix(in_srgb,var(--color-primary)_17.5%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--color-primary)_17.5%,transparent)_1px,transparent_1px)] bg-size-[10cqw_10cqw]" />
    </div>
  );
};

export default GridLinesBackground;
