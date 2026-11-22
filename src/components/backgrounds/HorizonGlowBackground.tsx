import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type HorizonGlowBackgroundProps = {
  className?: string;
};

const HorizonGlowBackground = ({ className = "" }: HorizonGlowBackgroundProps) => {
  return (
    <div className={cn("@container-size inset-0 -z-10 overflow-hidden pointer-events-none select-none mask-[linear-gradient(180deg,rgb(0,0,0)_0%,rgb(0,0,0)_80%,rgba(0,0,0,0)_100%)]", className)} aria-hidden="true">
      <div className="absolute left-1/2 -translate-x-1/2 w-full h-full bottom-[-9cqh] overflow-hidden z-0">
        <div className="absolute left-1/2 -translate-x-1/2 w-[49cqw] h-[12cqh] bottom-[25cqh] overflow-hidden blur-[57px] [background:radial-gradient(50%_50%_at_50%_50%,color-mix(in_srgb,var(--color-primary)_25%,transparent),transparent)]" />
        <div className="absolute bottom-[-61cqh] left-[-33cqw] right-[-33cqw] h-[100cqh] rounded-[100%] [background:linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_30%,transparent),transparent)]" />
        <div className="absolute bottom-[-62cqh] left-[-36cqw] right-[-36cqw] h-[105cqh] rounded-[100%] bg-background [box-shadow:inset_0_2px_20px_color-mix(in_srgb,var(--color-primary)_30%,transparent),0_-10px_50px_1px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]" />
      </div>
    </div>
  );
};

export default HorizonGlowBackground;
