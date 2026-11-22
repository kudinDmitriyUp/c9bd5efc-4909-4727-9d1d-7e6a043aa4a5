import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type MoreArrowPillProps = {
  text: string;
  href?: string;
  tone?: "primary" | "light";
  className?: string;
  type?: "submit";
};

const MoreArrowPill = ({ text, href = "#", tone = "primary", className, type }: MoreArrowPillProps) => {
  const Tag = type ? "button" : "a";
  const fill = tone === "primary" ? "bg-primary text-primary-foreground" : "bg-background text-foreground";
  const arrow = (
    <svg viewBox="0 0 16 16" className="size-[46%]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter">
      <path d="M3.5 12.5l8.5-8.5M5 3.5h7.5V11" />
    </svg>
  );
  return (
    <Tag
      {...(type ? { type } : { href })}
      className={cn("group inline-flex h-[clamp(2.5rem,2.2rem+1vw,3rem)] shrink-0 items-center outline-none [--b:clamp(2.5rem,2.2rem+1vw,3rem)]", className)}
    >
      <div aria-hidden="true" className="flex h-full w-[var(--b)] shrink-0 items-center justify-center transition-[width] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:w-0 group-focus-visible:w-0">
        <div className={cn("flex size-[var(--b)] shrink-0 items-center justify-center rounded-full transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:scale-0 group-hover:-rotate-90 group-focus-visible:scale-0", fill)}>{arrow}</div>
      </div>
      <div className={cn("flex h-full items-center justify-center rounded-full px-[1.1em]", fill)}>
        <p className="whitespace-nowrap font-[family-name:var(--font-label)] text-[length:var(--text-label)] font-semibold leading-none tracking-[var(--label-tracking)]">{text}</p>
      </div>
      <div aria-hidden="true" className="flex h-full w-0 shrink-0 items-center justify-center transition-[width] duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:w-[var(--b)] group-focus-visible:w-[var(--b)]">
        <div className={cn("flex size-[var(--b)] shrink-0 scale-0 rotate-90 items-center justify-center rounded-full transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:scale-100 group-hover:rotate-0 group-focus-visible:scale-100 group-focus-visible:rotate-0", fill)}>{arrow}</div>
      </div>
    </Tag>
  );
};

export default MoreArrowPill;
