import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { pickFor, useCarDuo } from "@/components/kit/carDuo";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type HeroCopy = { title: string; titleMuted?: string; description?: string };

type HeroTwinCarStageProps = {
  cars?: HeroCopy[];
  primaryButton?: { text: string; href: string };
  scrollLabel?: string;
  className?: string;
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SOFT: [number, number, number, number] = [0.2, 0.7, 0.2, 1];

export default function HeroTwinCarStage({
  cars = [
    { title: "Born at", titleMuted: "330 km/h", description: "The 911 Turbo S. Six cylinders behind you, two turbochargers, and a car you could drive to work on Monday." },
    { title: "Born at", titleMuted: "345 km/h", description: "The 918 Spyder. A V8 and two electric motors, 887 PS between them, and only 918 ever built." },
  ],
  primaryButton = { text: "Compare both", href: "#features" },
  scrollLabel = "Scroll",
  className,
}: HeroTwinCarStageProps) {
  const reduce = useReducedMotion();
  const { car, lit } = useCarDuo();
  const copy = pickFor(cars, car);
  const shown = lit || !!reduce;

  return (
    <section aria-label={copy ? `${copy.title} ${copy.titleMuted ?? ""}`.trim() : "Hero"} data-car-copy className={cn("relative h-[190vh]", className)}>
      <div data-car-pose="hero" aria-hidden="true" className="pointer-events-none absolute left-0 top-[50vh] size-px" />
      <div data-car-pose="heroOut" aria-hidden="true" className="pointer-events-none absolute left-0 top-[90%] size-px" />
      <div className="sticky top-0 flex h-svh items-end pb-[9vh]">
        <div className="mx-auto flex w-[var(--container)] flex-col items-start gap-[1.375rem] lg:flex-row lg:items-end lg:justify-between lg:gap-[1.875rem]">
          <h1 className="text-[length:var(--text-display)] text-foreground">
            <div className="block overflow-hidden pb-[0.04em]">
              <motion.div initial={reduce ? false : { y: "105%" }} animate={{ y: shown ? "0%" : "105%" }} transition={{ duration: 1.3, ease: EASE }} className="block">
                {copy?.title}
              </motion.div>
            </div>
            {copy?.titleMuted && (
              <div className="block overflow-hidden pb-[0.04em]">
                <motion.div initial={reduce ? false : { y: "105%" }} animate={{ y: shown ? "0%" : "105%" }} transition={{ duration: 1.3, ease: EASE, delay: 0.12 }} className="block text-[color:var(--muted-heading)]">
                  {copy.titleMuted}
                </motion.div>
              </div>
            )}
          </h1>
          <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: shown ? 1 : 0 }} transition={{ duration: 1.2, ease: SOFT }} className="grid justify-items-start gap-[1.375rem] lg:justify-items-end lg:text-right">
            {copy?.description && <p className="max-w-[18.125rem] text-[length:var(--text-small)] leading-[1.6] text-muted-foreground">{copy.description}</p>}
            {primaryButton && (
              <a
                href={primaryButton.href}
                onClick={(e) => {
                  const target = primaryButton.href.startsWith("#") ? document.querySelector(primaryButton.href) : null;
                  if (!target || document.documentElement.classList.contains("lenis")) return;
                  e.preventDefault();
                  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
                }}
                className="btn-primary"
              >
                <p className="btn-label">{primaryButton.text}</p>
                <div className="btn-arrow" aria-hidden="true" />
              </a>
            )}
          </motion.div>
        </div>
        <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: shown ? 1 : 0 }} transition={{ duration: 1.2, ease: SOFT }} className="absolute bottom-[calc(3vh+4.875rem)] left-1/2 hidden -translate-x-1/2 justify-items-center gap-[0.625rem] lg:grid">
          <div aria-hidden="true" className="h-[2.5rem] w-px origin-top bg-gradient-to-b from-foreground to-transparent motion-safe:animate-[car-cue_2s_infinite]" />
          <p className="text-[length:0.6875rem] leading-none text-muted-foreground">{scrollLabel}</p>
        </motion.div>
      </div>
    </section>
  );
}
