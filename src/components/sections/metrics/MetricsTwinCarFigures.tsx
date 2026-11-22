import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useCarDuo } from "@/components/kit/carDuo";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type Figure = { label: string; suffix?: string; values: number[]; decimals?: number };

type MetricsTwinCarFiguresProps = {
  label?: string;
  items?: Figure[];
  className?: string;
};

const EASE: [number, number, number, number] = [0.2, 0.7, 0.2, 1];
const COUNT: [number, number, number, number] = [0.215, 0.61, 0.355, 1];

const format = (value: number, decimals = 0) => (decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString("en-GB"));

function Count({ values, decimals, car, active }: { values: number[]; decimals?: number; car: number; active: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);
  const value = useMotionValue(0);
  const goal = values.length ? values[Math.min(car, values.length - 1)] : 0;

  useEffect(() => value.on("change", (v) => {
    if (ref.current) ref.current.textContent = format(v, decimals);
  }), [value, decimals]);

  useEffect(() => {
    if (!active) return;
    const controls = animate(value, goal, { duration: reduce ? 0 : 1.6, ease: COUNT });
    return () => controls.stop();
  }, [active, goal, reduce, value]);

  return (
    <p ref={ref} className="tabular-nums">
      {format(0, decimals)}
    </p>
  );
}

export default function MetricsTwinCarFigures({
  label = "By the numbers",
  items = [
    { label: "Power", suffix: "PS", values: [650, 887] },
    { label: "Torque", suffix: "Nm", values: [800, 1280] },
    { label: "0–100 km/h", suffix: "s", values: [2.7, 2.6], decimals: 1 },
    { label: "Top speed", suffix: "km/h", values: [330, 345] },
    { label: "Weight", suffix: "kg", values: [1640, 1634] },
  ],
  className,
}: MetricsTwinCarFiguresProps) {
  const reduce = useReducedMotion();
  const { car } = useCarDuo();
  const row = useRef<HTMLDivElement>(null);
  const seen = useInView(row, { once: true, amount: 0.25 });
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 26 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 1, ease: EASE, delay },
  });

  return (
    <section aria-label={label} data-car-copy className={cn("relative h-[150vh]", className)}>
      <div data-car-pose="stats" aria-hidden="true" className="pointer-events-none absolute left-0 top-[35%] size-px" />
      <div className="sticky top-0 flex h-svh items-end pb-[8vh]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[46vh] bg-[linear-gradient(transparent,color-mix(in_srgb,var(--background)_82%,transparent)_40%,color-mix(in_srgb,var(--background)_82%,transparent)_62%,transparent)] [mask-image:linear-gradient(90deg,transparent,black_18%,black_82%,transparent)]" />
        <div className="absolute inset-x-0 top-[15vh]">
          <motion.div {...rise(0)} className="mx-auto flex w-[var(--container)] items-center gap-[0.625rem]">
            <div aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-accent transition-colors duration-500" />
            <p className="text-[length:var(--text-label)] font-medium leading-[normal] tracking-[0.01em] text-foreground">{label}</p>
          </motion.div>
        </div>
        <div className="relative mx-auto w-[var(--container)]">
          <div ref={row} className="grid w-full grid-cols-3 gap-y-[0.875rem] border-t border-border lg:grid-cols-5 lg:gap-y-[1.5rem]">
            {items.map((item, i) => (
              <motion.div key={i} {...rise(0)} className="min-w-0 pr-[1.125rem] pt-[1.5rem] [&:nth-child(n+4)]:hidden lg:[&:nth-child(n+4)]:block">
                <div className="flex items-start text-[length:var(--text-stat)] font-light leading-none tracking-[-0.045em] text-foreground [font-family:var(--font-heading)]">
                  <Count values={item.values} decimals={item.decimals} car={car} active={seen} />
                  {item.suffix && <p className="ml-[0.5rem] whitespace-nowrap text-[length:var(--text-label)] font-medium tracking-normal text-muted-foreground [font-family:var(--font-body)] [font-stretch:100%] [font-weight:500]">{item.suffix}</p>}
                </div>
                <p className="mt-[0.75rem] text-[length:var(--text-label)] leading-[1.3] text-muted-foreground">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
