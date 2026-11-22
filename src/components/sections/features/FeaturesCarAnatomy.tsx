import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { pickFor, useCarDuo } from "@/components/kit/carDuo";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type Part = { title: string; titleEnd?: string; description?: string; label?: string };

type FeaturesCarAnatomyProps = {
  ariaLabel?: string;
  cars?: { items: Part[] }[];
  className?: string;
};

const STOPS = ["top-[12%]", "top-[45%]", "top-[78%]"];

const pad = (n: number) => String(n).padStart(2, "0");

export default function FeaturesCarAnatomy({
  ariaLabel = "Details",
  cars = [
    {
      items: [
        { title: "Ceramic", titleEnd: "stopping power", label: "Front brake", description: "Carbon-ceramic brakes behind 21-inch rear wheels, with ten-piston calipers at the front. They shrug off lap after lap without fading." },
        { title: "Flat-six,", titleEnd: "twin turbo", label: "Engine", description: "3.7 litres, two variable-geometry turbochargers, 650 PS. It sits behind the rear axle, where it has always been." },
        { title: "A cabin", titleEnd: "for every day", label: "Cockpit", description: "Two proper seats, a usable boot and air conditioning that works. The fastest 911 is still the one you can live with." },
      ],
    },
    {
      items: [
        { title: "Wheels", titleEnd: "in acid green", label: "Front brake", description: "Magnesium wheels, carbon-ceramic discs and the acid-green calipers that marked every Porsche hybrid of the era." },
        { title: "V8 plus", titleEnd: "two motors", label: "Engine", description: "A 4.6-litre V8 from the RS Spyder race car, plus an electric motor on each axle. 887 PS and 1,280 Nm combined." },
        { title: "Top-exit", titleEnd: "exhausts", label: "Cockpit", description: "The exhaust pipes leave through the top of the engine cover, straight above the V8, so the hot gas never touches the bodywork." },
      ],
    },
  ],
  className,
}: FeaturesCarAnatomyProps) {
  const { car } = useCarDuo();
  const items = (pickFor(cars, car)?.items ?? []).slice(0, STOPS.length);

  return (
    <section aria-label={ariaLabel} data-car-copy className={cn("relative h-[330vh]", className)}>
      {items.map((item, i) => (
        <div key={i} data-car-pose={`part${i}`} data-car-label={item.label ?? ""} aria-hidden="true" className={cn("pointer-events-none absolute left-0 size-px", STOPS[i])} />
      ))}
      <div className="sticky top-0 h-svh">
        <div className="relative mx-auto h-full w-[var(--container)]">
          {items.map((item, i) => (
            <div key={i} data-car-part={i} className="absolute bottom-[12vh] left-0 max-w-[27.5rem] pointer-events-none translate-y-[20px] opacity-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] data-[on]:pointer-events-auto data-[on]:translate-y-0 data-[on]:opacity-100">
              <div className="flex items-center gap-[0.625rem]">
                <div aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-accent transition-colors duration-500" />
                <p className="text-[length:var(--text-label)] font-medium leading-[normal] tracking-[0.01em] text-foreground tabular-nums">
                  {`${pad(i + 1)} / ${pad(items.length)}`}
                </p>
              </div>
              <h3 className="mb-[1.125rem] mt-[1rem] text-[length:var(--text-h2)] text-foreground">
                <div className="block">{item.title}</div>
                {item.titleEnd && <div className="block">{item.titleEnd}</div>}
              </h3>
              {item.description && <p className="max-w-[23.75rem] text-[length:var(--text-body)] leading-[1.65] text-muted-foreground [text-shadow:var(--text-halo)]">{item.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
