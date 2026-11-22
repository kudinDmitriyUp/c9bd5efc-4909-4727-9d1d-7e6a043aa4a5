import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { pickFor, useCarDuo } from "@/components/kit/carDuo";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type Step = { title: string; description: string };

type ProcessAeroPressureProps = {
  label?: string;
  title?: string;
  titleEnd?: string;
  titleMuted?: string;
  cars?: { items: Step[] }[];
  legendLabel?: string;
  lowLabel?: string;
  highLabel?: string;
  speedLabel?: string;
  forceLabel?: string;
  className?: string;
};

const EASE: [number, number, number, number] = [0.2, 0.7, 0.2, 1];
const POSES = ["aero1", "aero2", "aero3"];

const shared = [
  { title: "Stagnation", description: "At the nose the air stops dead. Highest pressure on the whole car." },
  { title: "Over the roof", description: "The flow speeds up over the glass and roof, and the pressure drops. That suction is lift." },
];

export default function ProcessAeroPressure({
  label = "Aerodynamics",
  title = "Where the",
  titleEnd = "air",
  titleMuted = "hits",
  cars = [
    { items: [...shared, { title: "The tail", description: "The active rear wing rises with speed, and the front spoiler deploys in three stages. Together they pull the car into the road." }] },
    { items: [...shared, { title: "The tail", description: "In race mode the rear wing tilts steeper and the underbody flaps open, adding grip right where the hybrid system needs it." }] },
  ],
  legendLabel = "Surface pressure",
  lowLabel = "Suction",
  highLabel = "Pressure",
  speedLabel = "km/h air",
  forceLabel = "kg downforce (est.)",
  className,
}: ProcessAeroPressureProps) {
  const reduce = useReducedMotion();
  const { car } = useCarDuo();
  const items = pickFor(cars, car)?.items ?? [];
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 26 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 1, ease: EASE, delay },
  });

  return (
    <section aria-label={label} data-car-copy className={cn("relative h-[300vh]", className)}>
      <div data-car-pose={POSES[0]} aria-hidden="true" className="pointer-events-none absolute left-0 top-[12%] size-px" />
      <div data-car-pose={POSES[1]} aria-hidden="true" className="pointer-events-none absolute left-0 top-[45%] size-px" />
      <div data-car-pose={POSES[2]} aria-hidden="true" className="pointer-events-none absolute left-0 top-[78%] size-px" />
      <div className="sticky top-0 h-svh">
        <div className="relative mx-auto h-full w-[var(--container)] pt-[12vh] lg:pt-[16vh]">
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
          {items.length > 0 && (
            <motion.ol {...rise(0)} className="kit-card mt-[2.125rem] hidden max-w-[23.75rem] gap-[1rem] px-[1.375rem] py-[1.25rem] lg:grid">
              {items.map((item, i) => (
                <li key={i} data-car-step={i} className="border-l border-border pl-[1.125rem] text-[length:var(--text-small)] leading-[1.6] text-muted-foreground transition-colors duration-[400ms] data-[on]:border-foreground data-[on]:text-foreground">
                  <p className="mb-[2px] text-[length:0.8125rem] font-medium text-foreground">{item.title}</p>
                  <p>{item.description}</p>
                </li>
              ))}
            </motion.ol>
          )}
          <motion.div {...rise(0)} className="kit-card absolute inset-x-0 bottom-[6vh] px-[1.125rem] py-[1rem] lg:bottom-[10vh] lg:left-auto lg:right-0 lg:w-[17.5rem] lg:px-[1.375rem] lg:py-[1.25rem]">
            <div className="flex items-center gap-[0.625rem]">
              <div aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-accent transition-colors duration-500" />
              <p className="text-[length:var(--text-label)] font-medium leading-[normal] tracking-[0.01em] text-foreground">{legendLabel}</p>
            </div>
            <div aria-hidden="true" className="mb-[0.5rem] mt-[1rem] h-[4px] rounded-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--foreground)_85%,var(--background)),color-mix(in_srgb,var(--foreground)_10%,var(--background))_50%,var(--pressure))]" />
            <div className="flex justify-between gap-[1rem] text-[length:0.6875rem] text-muted-foreground">
              <p>{lowLabel}</p>
              <p>{highLabel}</p>
            </div>
            <div className="mt-[1.25rem] flex gap-[1.875rem]">
              <div className="text-[length:var(--text-body)]">
                <p data-car-readout="speed" className="text-[length:1.875rem] font-light leading-[normal] tracking-[-0.04em] text-foreground tabular-nums [font-family:var(--font-heading)]">0</p>
                <p className="inline text-[length:0.6875rem] text-muted-foreground">{speedLabel}</p>
              </div>
              <div className="text-[length:var(--text-body)]">
                <p data-car-readout="downforce" className="text-[length:1.875rem] font-light leading-[normal] tracking-[-0.04em] text-foreground tabular-nums [font-family:var(--font-heading)]">0</p>
                <p className="inline text-[length:0.6875rem] text-muted-foreground">{forceLabel}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
