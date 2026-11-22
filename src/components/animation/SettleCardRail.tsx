"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { animate, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useLenis } from "lenis/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type SettleCardRailItem = {
  src?: string;
  videoSrc?: string;
  alt?: string;
  title: string;
  text?: string;
  number?: string;
  href?: string;
};

type SettleCardRailProps = {
  items: SettleCardRailItem[];
  header?: ReactNode;
  pin?: boolean;
  perView?: number;
  aspect?: string;
  className?: string;
  cardClassName?: string;
};

const query = "(min-width: 768px)";
const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(query);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
};
const useDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);

const spring = { type: "spring", stiffness: 120, damping: 30, restDelta: 0.5 } as const;
const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const indexAt = (offset: number, step: number, travel: number, count: number) => {
  if (travel > 0 && offset >= travel - 1) return count - 1;
  return Math.min(count - 1, Math.max(0, Math.round(offset / (step || 1))));
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const gutter = "max(1.5rem, (100vw - 72rem) / 2 + 1.5rem)";

const useActive = () => {
  const [state, setState] = useState({ active: 0, prev: -1 });
  const set = (i: number) => setState((s) => (s.active === i ? s : { active: i, prev: s.active }));
  return { ...state, set };
};

const cardWidth = (perView: number, gap: string, basis = "100cqw") => `calc((${basis} - ${Math.max(0, Math.ceil(perView) - 1)} * ${gap}) / ${perView})`;

const useRail = (viewRef: RefObject<HTMLDivElement | null>, trackRef: RefObject<HTMLDivElement | null>) => {
  const step = useMotionValue(0);
  const width = useMotionValue(1);
  const [travel, setTravel] = useState(0);

  useEffect(() => {
    const view = viewRef.current;
    const track = trackRef.current;
    if (!view || !track) return;
    const update = () => {
      const cards = track.children;
      const first = cards[0] as HTMLElement | undefined;
      const second = cards[1] as HTMLElement | undefined;
      step.set(first && second ? second.offsetLeft - first.offsetLeft : first?.offsetWidth ?? 0);
      width.set(view.clientWidth || 1);
      setTravel(Math.max(0, track.scrollWidth - view.clientWidth));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(view);
    observer.observe(track);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [viewRef, trackRef, step, width]);

  return { step, width, travel };
};

type OdometerProps = {
  value: string;
  from?: string;
  on: boolean;
};

const Odometer = ({ value, from, on }: OdometerProps) => {
  const [was, setWas] = useState(false);
  const [start, setStart] = useState<string | null>(null);
  if (on !== was) {
    setWas(on);
    if (on) setStart(from ?? "");
  }

  useEffect(() => {
    if (start === null) return;
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setStart(null));
    });
    return () => cancelAnimationFrame(id);
  }, [start]);

  const own = value.replace(/\D/g, "");
  const origin = start?.replace(/\D/g, "") ?? null;
  const digitIndex = value.split("").map((_, i) => value.slice(0, i + 1).replace(/\D/g, "").length - 1);

  return (
    <div className="relative">
      <p className="sr-only">{value}</p>
      <div aria-hidden="true" className="flex text-[12vw] font-medium leading-none tracking-[-0.04em] tabular-nums text-foreground md:text-[clamp(2.25rem,3.6vw,3.75rem)]">
        {value.split("").map((char, i) => {
          if (!/\d/.test(char)) return <div key={i} className="h-[1em]">{char}</div>;
          const back = own.length - 1 - digitIndex[i];
          const digit = origin === null ? Number(char) : Number(origin[origin.length - 1 - back] ?? 0);
          return (
            <div key={i} className="h-[1em] overflow-hidden">
              <div
                style={{ transform: `translateY(-${digit * 10}%)`, transitionDelay: origin === null ? `${i * 70}ms` : "0ms" }}
                className={cn("flex flex-col transition-transform duration-[1200ms] ease-[cubic-bezier(0.2,0.1,0.2,1)] motion-reduce:transition-none", origin !== null && "transition-none")}
              >
                {digits.map((d) => (
                  <div key={d} className="h-[1em]">{d}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

type CardProps = {
  item: SettleCardRailItem;
  index: number;
  x: MotionValue<number>;
  step: MotionValue<number>;
  width: MotionValue<number>;
  active: boolean;
  from?: string;
  settle: boolean;
  aspect: string;
  size: string;
  className?: string;
  onFocus?: () => void;
};

const Card = ({ item, index, x, step, width, active, from, settle, aspect, size, className, onFocus }: CardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const hover = useMotionValue(0);

  const scale = useTransform([x, step, width, hover], ([v, s, w, h]: number[]) => {
    const rest = settle ? 1 + 0.08 * Math.min(1, Math.max(0, (index * s + v) / w)) : 1;
    return rest + (1.03 - rest) * h;
  });

  const ease = (to: number) => {
    if (settle) animate(hover, to, { duration: 0.6, ease: [0.2, 0.1, 0.2, 1] });
  };

  const content = (
    <>
      <div style={{ aspectRatio: aspect }} className="relative w-full overflow-hidden rounded-[3.5vw] bg-foreground/5 md:rounded-[clamp(0.75rem,1vw,0.875rem)]">
        <motion.div style={{ scale }} className="absolute inset-0">
          {item.videoSrc ? (
            <video src={item.videoSrc} aria-label={item.alt || undefined} className="h-full w-full object-cover" autoPlay loop muted playsInline />
          ) : (
            item.src && <img src={item.src} alt={item.alt ?? ""} draggable={false} className="h-full w-full object-cover" />
          )}
        </motion.div>
        {item.href && (
          <div aria-hidden="true" className="absolute bottom-[3vw] right-[3vw] flex h-11 w-11 items-center justify-center rounded-full bg-foreground/35 text-background transition-colors duration-[250ms] group-hover:bg-foreground/80 md:bottom-4 md:right-4 md:h-12 md:w-12">
            <ArrowUpRight className="h-5 w-5" strokeWidth={1.75} />
          </div>
        )}
      </div>
      <div className="mt-[4vw] flex flex-col gap-[2vw] md:mt-5 md:gap-2">
        {item.number && <Odometer value={item.number} from={from} on={settle && active && inView} />}
        <h3 className="text-[5.5vw] font-medium leading-tight text-foreground md:text-[clamp(1.25rem,1.5vw,1.625rem)]">{item.title}</h3>
        {item.text && <p className="max-w-[48ch] text-[3.8vw] leading-relaxed text-foreground/70 md:text-[clamp(0.9375rem,1vw,1.0625rem)]">{item.text}</p>}
      </div>
    </>
  );

  return (
    <div
      ref={ref}
      style={{ width: size }}
      onPointerEnter={() => ease(1)}
      onPointerLeave={() => ease(0)}
      className={cn("group shrink-0 snap-start", className)}
    >
      {item.href ? (
        <a href={item.href} draggable={false} onFocus={onFocus} className="block rounded-[clamp(0.75rem,1vw,0.875rem)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
};

type ControlsProps = {
  count: number;
  active: number;
  disabled: boolean;
  go: (index: number) => void;
  className?: string;
};

const Controls = ({ count, active, disabled, go, className }: ControlsProps) => (
  <div className={cn("flex items-center justify-between gap-6", className)}>
    <div className="flex items-center">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Go to card ${i + 1}`}
          aria-current={i === active ? "true" : undefined}
          disabled={disabled}
          onClick={() => go(i)}
          className="flex h-11 w-7 cursor-pointer items-center justify-center disabled:cursor-default"
        >
          <div className={cn("h-1.5 w-5 rounded-full bg-foreground transition duration-300", i === active ? "opacity-100" : "scale-x-[0.4] opacity-25")} />
        </button>
      ))}
    </div>
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Previous card"
        disabled={disabled || active === 0}
        onClick={() => go(active - 1)}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-foreground/20 text-foreground transition-opacity disabled:cursor-default disabled:opacity-30"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        aria-label="Next card"
        disabled={disabled || active === count - 1}
        onClick={() => go(active + 1)}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-foreground/20 text-foreground transition-opacity disabled:cursor-default disabled:opacity-30"
      >
        <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
      </button>
    </div>
  </div>
);

const MotionRail = ({ items, header, pin = true, perView = 1.3, aspect = "2/1", className, cardClassName }: SettleCardRailProps) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const follow = useRef(pin);
  const aim = useRef(NaN);
  const idle = useRef(0);
  const lenis = useLenis();
  const scrollBy = (d: number) => (lenis ? lenis.scrollTo(window.scrollY + d) : window.scrollTo({ top: window.scrollY + d, behavior: "smooth" }));
  const x = useMotionValue(0);
  const { step, width, travel } = useRail(viewRef, trackRef);
  const [view, setView] = useState(0);
  const [free, setFree] = useState(!pin);
  const { active, prev, set } = useActive();
  const { scrollYProgress } = useScroll({ target: outerRef, offset: ["start end", "end start"] });
  const lead = Math.min(travel * 0.12, view * 0.5);
  const pinned = travel - lead * 2;

  const rel = () => -(outerRef.current?.getBoundingClientRect().top ?? 0);

  const sync = (jump: boolean) => {
    if (!pin) return;
    const at = rel();
    setFree(at > pinned);
    if (at <= pinned) follow.current = true;
    if (!follow.current) return;
    const to = -clamp(at + lead, 0, travel);
    if (to === aim.current && !jump) return;
    aim.current = to;
    if (jump) x.set(to);
    else animate(x, to, { type: "spring", stiffness: 200, damping: 40, restDelta: 0.5 });
  };

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = () => setView(box.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    return () => {
      observer.disconnect();
      window.clearTimeout(idle.current);
    };
  }, []);

  useEffect(() => sync(true), [pin, travel, lead]);

  useMotionValueEvent(scrollYProgress, "change", () => {
    if (!pin) return;
    sync(false);
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => {
      const at = rel();
      if (!follow.current || at < 0 || at > pinned) return;
      const s = step.get();
      const near = items.map((_, i) => Math.min(i * s, travel) - lead).reduce((a, b) => (Math.abs(b - at) < Math.abs(a - at) ? b : a), Infinity);
      if (near < 0 || near > pinned || Math.abs(near - at) <= 1) return;
      scrollBy(near - at);
    }, 150);
  });

  useMotionValueEvent(x, "change", (v) => set(indexAt(-v, step.get(), travel, items.length)));

  const go = (i: number) => {
    const to = Math.min(Math.max(0, i) * step.get(), travel);
    if (pin && !free) {
      scrollBy(clamp(to - lead, -lead, pinned + lead) - rel());
      return;
    }
    follow.current = false;
    aim.current = NaN;
    animate(x, -to, spring);
  };

  const snap = (target: number) => {
    const s = step.get() || 1;
    const near = Math.max(-travel, Math.min(0, Math.round(target / s) * s));
    return Math.abs(target + travel) < Math.abs(target - near) ? -travel : near;
  };

  const base = cardWidth(perView, "2rem", `(100vw - 2 * ${gutter})`);
  const size = pin ? `min(${base}, calc((100svh - 25rem) * (${aspect})))` : base;

  return (
    <div ref={outerRef} style={{ height: pin ? `calc(${pinned}px + 100svh)` : undefined }} className={cn("relative w-full", className)}>
      <div ref={boxRef} className={cn("ml-[calc(50%-50vw)] flex w-screen flex-col justify-center gap-8 overflow-clip", pin ? "sticky top-0 h-[100svh]" : "py-16")}>
        {header && <div className="relative mx-auto w-full max-w-6xl px-6">{header}</div>}
        <div ref={viewRef} className="w-full">
          <motion.div
            ref={trackRef}
            style={{ x }}
            drag={free && travel > 0 ? "x" : false}
            dragConstraints={{ left: -travel, right: 0 }}
            dragElastic={0.08}
            dragTransition={{ power: 0.2, timeConstant: 350, modifyTarget: snap }}
            onPointerDownCapture={() => {
              dragged.current = false;
            }}
            onDragStart={() => {
              dragged.current = true;
              follow.current = false;
              aim.current = NaN;
            }}
            onClickCapture={(e) => {
              if (!dragged.current) return;
              e.preventDefault();
              e.stopPropagation();
            }}
            className={cn("relative flex w-max gap-8 px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]", free && travel > 0 && "cursor-grab active:cursor-grabbing")}
          >
            {items.map((item, i) => (
              <Card
                key={i}
                item={item}
                index={i}
                x={x}
                step={step}
                width={width}
                active={i === active}
                from={items[prev]?.number}
                settle
                aspect={aspect}
                size={size}
                className={cardClassName}
                onFocus={() => go(i)}
              />
            ))}
          </motion.div>
        </div>
        <Controls count={items.length} active={active} disabled={false} go={go} className="mx-auto w-full max-w-6xl px-6" />
      </div>
    </div>
  );
};

type NativeRailProps = SettleCardRailProps & {
  desktop: boolean;
  reduce: boolean;
};

const NativeRail = ({ items, header, perView = 1.3, aspect = "2/1", className, cardClassName, desktop, reduce }: NativeRailProps) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const { step, width, travel } = useRail(rowRef, rowRef);
  const { scrollX } = useScroll({ container: rowRef });
  const x = useTransform(scrollX, (v) => -v);
  const { active, prev, set } = useActive();

  useMotionValueEvent(scrollX, "change", (v) => set(indexAt(v, step.get(), travel, items.length)));

  const go = (i: number) => rowRef.current?.scrollTo({ left: Math.min(Math.max(0, i) * step.get(), travel), behavior: reduce ? "auto" : "smooth" });

  const size = desktop ? cardWidth(perView, "2rem") : cardWidth(1.1, "1rem");

  return (
    <div className={cn("relative w-full py-[12vw] md:py-16", className)}>
      {header && <div className="px-[6vw] pb-[6vw] md:px-[clamp(1.5rem,4vw,4rem)] md:pb-8">{header}</div>}
      <div
        ref={rowRef}
        className="@container relative flex snap-x snap-mandatory scroll-px-[6vw] gap-4 overflow-x-auto px-[6vw] [scrollbar-width:none] md:scroll-px-[clamp(1.5rem,4vw,4rem)] md:gap-8 md:px-[clamp(1.5rem,4vw,4rem)] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <Card
            key={i}
            item={item}
            index={i}
            x={x}
            step={step}
            width={width}
            active={i === active}
            from={items[prev]?.number}
            settle={!reduce}
            aspect={aspect}
            size={size}
            className={cardClassName}
          />
        ))}
      </div>
      <Controls count={items.length} active={active} disabled={false} go={go} className="mt-[4vw] px-[6vw] md:mt-8 md:px-[clamp(1.5rem,4vw,4rem)]" />
    </div>
  );
};

const DEFAULT_ITEMS: SettleCardRailItem[] = [
  { src: "https://images.pexels.com/photos/1179863/pexels-photo-1179863.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", title: "Design that ships", text: "Built for the long run", number: "01" },
  { src: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", title: "Clear structure", text: "Built for the long run", number: "02" },
  { src: "https://images.pexels.com/photos/10923534/pexels-photo-10923534.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", title: "Quiet details", text: "Built for the long run", number: "03" },
  { src: "https://images.pexels.com/photos/11979193/pexels-photo-11979193.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", title: "Honest craft", text: "Built for the long run", number: "04" },
  { src: "https://images.pexels.com/photos/12010421/pexels-photo-12010421.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", title: "Lasting finish", text: "Built for the long run", number: "05" },
];

const SettleCardRail = (rawProps: Partial<SettleCardRailProps>) => {
  const props: SettleCardRailProps = { ...rawProps, items: rawProps.items ?? DEFAULT_ITEMS };
  const desktop = useDesktop();
  const reduce = useReducedMotion() ?? false;

  if (desktop && !reduce) return <MotionRail {...props} />;

  return <NativeRail {...props} desktop={desktop} reduce={reduce} />;
};

export default SettleCardRail;
