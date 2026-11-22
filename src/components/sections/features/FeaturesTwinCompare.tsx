import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { carDuo, useCarDuo } from "@/components/kit/carDuo";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type Row = { label: string; values: string[] };

type FeaturesTwinCompareProps = {
  label?: string;
  title?: string;
  titleEnd?: string;
  titleMuted?: string;
  description?: string;
  columns?: string[];
  rows?: Row[];
  buttonText?: string;
  className?: string;
};

const EASE: [number, number, number, number] = [0.2, 0.7, 0.2, 1];

export default function FeaturesTwinCompare({
  label = "Versus",
  title = "Two ways",
  titleEnd = "to",
  titleMuted = "300",
  description = "One is the everyday weapon, refined over sixty years. The other is a hybrid hypercar built in a run of 918. Switch between them; the whole page follows.",
  columns = ["911 Turbo S", "918 Spyder"],
  rows = [
    { label: "Engine", values: ["Twin-turbo flat-six", "V8 + two e-motors"] },
    { label: "Power", values: ["650 PS", "887 PS"] },
    { label: "Torque", values: ["800 Nm", "1,280 Nm"] },
    { label: "0–100 km/h", values: ["2.7 s", "2.6 s"] },
    { label: "Top speed", values: ["330 km/h", "345 km/h"] },
    { label: "Layout", values: ["Rear engine, AWD", "Mid engine, AWD"] },
    { label: "Built", values: ["In series", "918 units"] },
  ],
  buttonText = "Switch car",
  className,
}: FeaturesTwinCompareProps) {
  const reduce = useReducedMotion();
  const { car } = useCarDuo();
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 26 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 1, ease: EASE, delay },
  });
  const repeat = `repeat(${Math.max(1, columns.length)}, minmax(0,1fr))`;

  return (
    <section aria-label={label} data-car-copy className={cn("relative py-[14vh]", className)}>
      <div data-car-pose="versus" aria-hidden="true" className="pointer-events-none absolute left-0 top-[40%] size-px" />
      <div className="mx-auto w-[var(--container)]">
        <div className="flex flex-col items-center text-center">
          <motion.div {...rise(0)} className="flex items-center gap-[0.625rem]">
            <div aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-accent transition-colors duration-500" />
            <p className="text-[length:var(--text-label)] font-medium leading-[normal] tracking-[0.01em] text-foreground">{label}</p>
          </motion.div>
          <motion.h2 {...rise(0)} className="mb-[1.625rem] mt-[1.375rem] text-[length:var(--text-h1)] text-foreground">
            <div className="block">{title}</div>
            <div className="block">
              {titleEnd && <div className="inline">{titleEnd}</div>} {titleMuted &&<div className="inline text-[color:var(--muted-heading)]">{titleMuted}</div>}
            </div>
          </motion.h2>
          {description && (
            <motion.p {...rise(0)} className="max-w-[23.75rem] text-[length:var(--text-body)] leading-[1.65] text-muted-foreground [text-shadow:var(--text-halo)]">
              {description}
            </motion.p>
          )}
        </div>
        <motion.div {...rise(0)} style={{ "--vs-cols": repeat } as CSSProperties} className="kit-card mx-auto mt-[40vh] grid max-w-[61.25rem] grid-cols-[minmax(0,0.8fr)_var(--vs-cols)] rounded-[1.375rem] px-[0.875rem] pb-[0.375rem] pt-[0.25rem] backdrop-blur-[16px] lg:mt-[46vh] lg:grid-cols-[minmax(0,1.2fr)_var(--vs-cols)] lg:px-[1.75rem] lg:pb-[0.625rem] lg:pt-[0.375rem]">
          <div className="border-b border-border" />
          {columns.map((name, i) => (
            <div key={i} className="flex items-center gap-[0.3125rem] whitespace-nowrap border-b border-border py-[0.75rem] pr-[0.5rem] pt-[1.25rem] lg:gap-[0.625rem] lg:py-[1.0625rem] lg:pr-[1.125rem] lg:pt-[1.25rem]">
              {car === i && <div aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-accent" />}
              <p className={cn("min-w-0 text-[length:0.6875rem] font-normal uppercase leading-[normal] tracking-[-0.03em] [font-family:var(--font-heading)] lg:text-[length:1.25rem]", car === i ? "text-foreground" : "text-[color:var(--muted-heading)]")}>{name}</p>
            </div>
          ))}
          {rows.map((row, r) => {
            const edge = r < rows.length - 1 ? "border-b border-border" : "";
            return [
              <p key={`k${r}`} className={cn("py-[0.75rem] pr-[0.5rem] text-[length:var(--text-label)] text-muted-foreground lg:py-[1.0625rem] lg:pr-[1.125rem]", edge)}>{row.label}</p>,
              ...columns.map((_, c) => (
                <p key={`v${r}-${c}`} className={cn("py-[0.75rem] pr-[0.5rem] text-[length:var(--text-label)] text-foreground tabular-nums lg:py-[1.0625rem] lg:pr-[1.125rem] lg:text-[length:var(--text-small)]", edge)}>{row.values[c] ?? ""}</p>
              )),
            ];
          })}
        </motion.div>
        <motion.div {...rise(0.1)} className="mt-[2.75rem] flex justify-center">
          <button type="button" onClick={() => carDuo.pick((car + 1) % Math.max(1, columns.length))} className="btn-primary">
            <p className="btn-label">{buttonText}</p>
            <div className="btn-arrow" aria-hidden="true" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
