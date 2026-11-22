import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type NoiseBackgroundProps = {
  className?: string;
};

const NoiseBackground = ({ className = "" }: NoiseBackgroundProps) => {
  return (
    <div className={cn("inset-0 -z-10 overflow-hidden bg-primary/10 pointer-events-none select-none", className)} aria-hidden="true">
      <div className="absolute inset-0 bg-repeat mix-blend-overlay opacity-10 bg-[url(https://storage.googleapis.com/webild/default/noise.webp)] bg-size-[512px]" />
    </div>
  );
};

export default NoiseBackground;
