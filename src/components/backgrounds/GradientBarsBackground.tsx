import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type GradientBarsBackgroundProps = {
  className?: string;
};

const GradientBarsBackground = ({ className = "" }: GradientBarsBackgroundProps) => {
  return (
    <div className={cn("inset-0 -z-10 overflow-hidden pointer-events-none select-none", className)} aria-hidden="true">
      <div className="flex h-4/5 w-full justify-between mask-[linear-gradient(0deg,transparent_0%,black_100%)]">
        <div className="flex h-full w-[35%] overflow-hidden mask-[linear-gradient(270deg,transparent_0%,black_100%)]">
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(90deg,var(--color-primary),transparent)]" />
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(90deg,var(--color-primary),transparent)]" />
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(90deg,var(--color-primary),transparent)]" />
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(90deg,var(--color-primary),transparent)]" />
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(90deg,var(--color-primary),transparent)]" />
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(90deg,var(--color-primary),transparent)]" />
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(90deg,var(--color-primary),transparent)]" />
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(90deg,var(--color-primary),transparent)]" />
        </div>

        <div className="flex h-full w-[35%] justify-end overflow-hidden mask-[linear-gradient(90deg,transparent_0%,black_100%)]">
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(270deg,var(--color-primary),transparent)]" />
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(270deg,var(--color-primary),transparent)]" />
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(270deg,var(--color-primary),transparent)]" />
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(270deg,var(--color-primary),transparent)]" />
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(270deg,var(--color-primary),transparent)]" />
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(270deg,var(--color-primary),transparent)]" />
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(270deg,var(--color-primary),transparent)]" />
          <div className="h-full flex-1 min-w-7.5 max-w-20.5 opacity-[0.075] bg-[linear-gradient(270deg,var(--color-primary),transparent)]" />
        </div>
      </div>
    </div>
  );
};

export default GradientBarsBackground;
