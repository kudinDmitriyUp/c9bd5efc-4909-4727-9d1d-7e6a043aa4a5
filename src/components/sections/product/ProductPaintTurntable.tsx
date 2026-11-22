import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { carDuo, pickFor, useCarDuo, type CarPaint } from "@/components/kit/carDuo";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type Swatch = CarPaint & { name: string };

type ProductPaintTurntableProps = {
  label?: string;
  title?: string;
  titleMuted?: string;
  cars?: { items: Swatch[] }[];
  className?: string;
};

const EASE: [number, number, number, number] = [0.2, 0.7, 0.2, 1];
const CARBON = "radial-gradient(circle at 35% 30%, color-mix(in srgb, white 33%, transparent), transparent 55%), repeating-conic-gradient(color-mix(in srgb, var(--foreground) 82%, white) 0 25%, var(--foreground) 0 50%) 0 0 / 6px 6px";

export default function ProductPaintTurntable({
  label = "Colour",
  title = "Pick its",
  titleMuted = "skin",
  cars = [
    {
      items: [
        { name: "GT Silver", color: "rgb(166, 171, 175)", metalness: 0.8, roughness: 0.28 },
        { name: "Guards Red", color: "rgb(192, 18, 28)", metalness: 0.35, roughness: 0.3 },
        { name: "Gentian Blue", color: "rgb(29, 53, 102)", metalness: 0.55, roughness: 0.3 },
        { name: "Chalk", color: "rgb(208, 204, 195)", metalness: 0.15, roughness: 0.36 },
        { name: "Jet Black", color: "rgb(12, 13, 15)", metalness: 0.6, roughness: 0.26 },
        { name: "Carbon", color: "rgb(20, 21, 23)", metalness: 0.3, roughness: 0.3, carbon: true },
      ],
    },
    {
      items: [
        { name: "Liquid Metal Silver", color: "rgb(179, 184, 188)", metalness: 0.9, roughness: 0.22 },
        { name: "Acid Green", color: "rgb(169, 214, 31)", metalness: 0.3, roughness: 0.3 },
        { name: "Guards Red", color: "rgb(192, 18, 28)", metalness: 0.35, roughness: 0.3 },
        { name: "Arrow Blue", color: "rgb(42, 99, 201)", metalness: 0.5, roughness: 0.3 },
        { name: "Black", color: "rgb(12, 13, 15)", metalness: 0.6, roughness: 0.26 },
        { name: "Carbon", color: "rgb(20, 21, 23)", metalness: 0.3, roughness: 0.3, carbon: true },
      ],
    },
  ],
  className,
}: ProductPaintTurntableProps) {
  const reduce = useReducedMotion();
  const { car, swatch } = useCarDuo();
  const items = pickFor(cars, car)?.items ?? [];
  const active = swatch[car] ?? 0;
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 26 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 1, ease: EASE, delay },
  });

  return (
    <section aria-label={label} data-car-copy className={cn("relative h-[200vh]", className)}>
      <div data-car-pose="colourA" aria-hidden="true" className="pointer-events-none absolute left-0 top-[20%] size-px" />
      <div data-car-pose="colourA" aria-hidden="true" className="pointer-events-none absolute left-0 top-[75%] size-px" />
      <div data-car-pose="colourB" aria-hidden="true" className="pointer-events-none absolute left-0 top-full size-px" />
      <div className="sticky top-0 h-svh">
        <div className="mx-auto w-[var(--container)] pt-[12vh] lg:pt-[16vh]">
          <motion.div {...rise(0)} className="flex items-center gap-[0.625rem]">
            <div aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-accent transition-colors duration-500" />
            <p className="text-[length:var(--text-label)] font-medium leading-[normal] tracking-[0.01em] text-foreground">{label}</p>
          </motion.div>
          <motion.h2 {...rise(0)} className="mb-[1.625rem] mt-[1.375rem] text-[length:var(--text-h1)] text-foreground">
            <div className="block">{title}</div>
            {titleMuted && <div className="block text-[color:var(--muted-heading)]">{titleMuted}</div>}
          </motion.h2>
          <motion.div {...rise(0)} className="mt-[1.875rem] grid gap-[6px]">
            {items.map((item, i) => (
              <button
                key={`${car}-${i}`}
                type="button"
                aria-pressed={active === i}
                onClick={() => carDuo.paint(i, item)}
                className="flex w-fit cursor-pointer items-center gap-[0.875rem] rounded-full border border-transparent py-[6px] pl-[6px] pr-[1.125rem] text-[length:0.8125rem] font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground aria-pressed:border-border aria-pressed:bg-card/62 aria-pressed:text-foreground"
              >
                <div
                  aria-hidden="true"
                  className="size-[28px] shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.14),0_2px_6px_rgb(0_0_0/0.12)]"
                  style={{ background: item.carbon ? CARBON : `radial-gradient(circle at 35% 30%, color-mix(in srgb, white 60%, transparent), ${item.color} 50%)` }}
                />
                <p className="whitespace-nowrap leading-none">{item.name}</p>
              </button>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
