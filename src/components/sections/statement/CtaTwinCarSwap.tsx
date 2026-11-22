import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { carDuo, pickFor, useCarDuo } from "@/components/kit/carDuo";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type CtaCopy = { label?: string; title: string; titleMuted?: string; buttonText?: string };

type CtaTwinCarSwapProps = {
  cars?: CtaCopy[];
  secondaryButton?: { text: string; href: string };
  hold?: boolean;
  className?: string;
};

const EASE: [number, number, number, number] = [0.2, 0.7, 0.2, 1];

export default function CtaTwinCarSwap({
  cars = [
    { label: "The everyday weapon", title: "Drive it", titleMuted: "daily", buttonText: "Drive the 918" },
    { label: "The hypercar", title: "Only", titleMuted: "918", buttonText: "Drive the 911" },
  ],
  secondaryButton,
  hold = true,
  className,
}: CtaTwinCarSwapProps) {
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
    <section aria-label={copy?.title ?? "Call to action"} data-car-copy className={cn("relative", hold ? "h-[160vh]" : "h-svh", className)}>
      <div data-car-pose="closing" aria-hidden="true" className="pointer-events-none absolute left-0 top-[40%] size-px" />
      <div className={cn("flex h-svh items-start pt-[18vh]", hold && "sticky top-0")}>
        <div className="mx-auto w-[var(--container)]">
          {copy?.label && (
            <motion.div {...rise(0)} className="flex items-center gap-[0.625rem]">
              <div aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-accent transition-colors duration-500" />
              <p className="text-[length:var(--text-label)] font-medium leading-[normal] tracking-[0.01em] text-foreground">{copy.label}</p>
            </motion.div>
          )}
          <motion.h2 {...rise(0)} className="mb-[1.625rem] mt-[1.375rem] text-[length:var(--text-closing)] text-foreground">
            <div className="block">{copy?.title}</div>
            {copy?.titleMuted && <div className="block text-[color:var(--muted-heading)]">{copy.titleMuted}</div>}
          </motion.h2>
          <motion.div {...rise(0)} className="flex flex-col items-start gap-[0.75rem] lg:flex-row lg:items-center">
            <button type="button" onClick={() => carDuo.pick((car + 1) % Math.max(1, cars.length))} className="btn-primary">
              <p className="btn-label">{copy?.buttonText ?? "Switch"}</p>
              <div className="btn-arrow" aria-hidden="true" />
            </button>
            {secondaryButton && (
              <a href={secondaryButton.href} className="btn-secondary">
                <p className="btn-label">{secondaryButton.text}</p>
                <div className="btn-arrow" aria-hidden="true" />
              </a>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
