import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type CornerGlowBackgroundProps = {
  className?: string;
};

const CornerGlowBackground = ({ className = "" }: CornerGlowBackgroundProps) => {
  return (
    <div className={cn("inset-0 -z-10 overflow-hidden pointer-events-none select-none", className)} aria-hidden="true">
      <div
        className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-9/10 md:w-6/10 aspect-square rounded-full opacity-20 [background:radial-gradient(circle_at_center,var(--color-primary)_35%,transparent_70%)]"
      />
      <div
        className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-9/10 md:w-6/10 aspect-square rounded-full opacity-20 [background:radial-gradient(circle_at_center,var(--color-primary)_35%,transparent_70%)]"
      />
    </div>
  );
};

export default CornerGlowBackground;
