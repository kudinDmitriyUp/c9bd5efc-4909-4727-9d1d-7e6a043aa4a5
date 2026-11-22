import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { pickFor, useCarDuo } from "@/components/kit/carDuo";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type IntroCopy = { title: string; titleEnd?: string; description?: string };

type AboutTwinCarIntroProps = {
  label?: string;
  cars?: IntroCopy[];
  className?: string;
};

const EASE: [number, number, number, number] = [0.2, 0.7, 0.2, 1];

export default function AboutTwinCarIntro({
  label = "The idea",
  cars = [
    { title: "Sixty years", titleEnd: "of one idea", description: "The engine has stayed behind the rear axle since 1963. Everything else has been rethought around that one stubborn decision, until a rear-engined coupé became one of the fastest cars on the road." },
    { title: "The hybrid", titleEnd: "that broke 7", description: "In 2013 the 918 lapped the Nürburgring Nordschleife in 6:57, the first road car under seven minutes. It did it with a battery on board and the engine in the middle." },
  ],
  className,
}: AboutTwinCarIntroProps) {
  const reduce = useReducedMotion();
  const { car } = useCarDuo();
  const copy = pickFor(cars, car);
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 26 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 1, ease: EASE, delay },
  });

  return (
    <section aria-label={label} data-car-copy className={cn("relative flex min-h-svh items-center", className)}>
      <div data-car-pose="intro" aria-hidden="true" className="pointer-events-none absolute left-0 top-1/2 size-px" />
      <div className="mx-auto w-[var(--container)]">
        <div className="max-w-[33.75rem]">
          <motion.div {...rise(0)} className="flex items-center gap-[0.625rem]">
            <div aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-accent transition-colors duration-500" />
            <p className="text-[length:var(--text-label)] font-medium leading-[normal] tracking-[0.01em] text-foreground">{label}</p>
          </motion.div>
          <motion.h2 {...rise(0)} className="mb-[1.625rem] mt-[1.375rem] text-[length:var(--text-h1)] text-foreground">
            <div className="block">{copy?.title}</div>
            {copy?.titleEnd && <div className="block">{copy.titleEnd}</div>}
          </motion.h2>
          {copy?.description && (
            <motion.p {...rise(0)} className="max-w-[23.75rem] text-[length:var(--text-body)] leading-[1.65] text-muted-foreground [text-shadow:var(--text-halo)]">
              {copy.description}
            </motion.p>
          )}
        </div>
      </div>
    </section>
  );
}
