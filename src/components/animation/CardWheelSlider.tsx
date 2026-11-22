"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Media from "@/components/kit/Media";
import { usePreloadImages } from "@/components/kit/kitMotion";

gsap.registerPlugin(Draggable, InertiaPlugin, CustomEase, ScrollTrigger);

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const EASE = CustomEase.create("arc-carousel", "0.25, 0.1, 0, 1");
const DURATION = 1;

type CardWheelSliderItem = { title: string; description: string } & ({ imageSrc: string; videoSrc?: never } | { videoSrc: string; imageSrc?: never });

type CardWheelControls = { prev: () => void; next: () => void; goTo: (index: number) => void; active: number; count: number };

interface CardWheelSliderProps {
  items?: CardWheelSliderItem[];
  className?: string;
  renderItem?: (index: number) => ReactNode;
  renderControls?: (controls: CardWheelControls) => ReactNode;
  introStagger?: number;
  introStart?: string;
  controlsDelay?: number;
  carouselLabel?: string;
  slidesLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
}

const DEFAULT_ITEMS: CardWheelSliderItem[] = [
  { title: "Design that ships", description: "Built for the long run.", imageSrc: "https://images.pexels.com/photos/39219673/pexels-photo-39219673.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Clear systems", description: "Every detail has a reason.", imageSrc: "https://images.pexels.com/photos/8436617/pexels-photo-8436617.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Fast delivery", description: "From brief to launch.", imageSrc: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Honest craft", description: "Made by hand, checked twice.", imageSrc: "https://images.pexels.com/photos/20768597/pexels-photo-20768597.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

const mod = (value: number, total: number) => ((value % total) + total) % total;

const nearestDelta = (index: number, real: number, total: number) => index - (real - Math.round((real - index) / total) * total);

const CardWheelSlider = ({ items = DEFAULT_ITEMS, className = "", renderItem, renderControls, introStagger = 0.08, introStart = "top 80%", controlsDelay = 0.9, carouselLabel = "Carousel", slidesLabel = "Slides", previousLabel = "Previous slide", nextLabel = "Next slide" }: CardWheelSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  usePreloadImages(containerRef, "150%");
  const trackRef = useRef<HTMLDivElement>(null);
  const proxyRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const introPlayed = useRef(false);
  const goRef = useRef<(target: "prev" | "next" | number) => void>(() => {});
  const go = useCallback((target: "prev" | "next" | number) => goRef.current(target), []);
  const [active, setActive] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [layout, setLayout] = useState({ width: 0, step: 18 });

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    let timer: ReturnType<typeof setTimeout>;
    const update = () =>
      setLayout((prev) => (prev.width === window.innerWidth ? prev : { width: window.innerWidth, step: query.matches ? 12 : 18 }));
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(update, 200);
    };
    update();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const count = items.length;
  const total = Math.ceil(Math.floor(360 / layout.step) / count) * count;

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    const proxy = proxyRef.current;
    const controls = controlsRef.current;
    if (!container || !track || !proxy || !controls || !layout.width) return;

    const ctx = gsap.context(() => {
      const step = layout.step;
      const cards = Array.from(track.children) as HTMLElement[];
      const itemWidth = cards[0].offsetWidth;
      const itemHeight = cards[0].offsetHeight;
      const originY = parseFloat(getComputedStyle(cards[0]).transformOrigin.split(" ")[1]) || itemHeight * 3.75;
      const proxyRadius = Math.max(0, originY - itemHeight / 2) + Math.max(itemWidth, itemHeight) * 0.525;
      const containerRect = container.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();

      gsap.set(proxy, {
        width: proxyRadius * 2,
        height: proxyRadius * 2,
        left: trackRect.left + trackRect.width / 2 - containerRect.left,
        top: trackRect.top - containerRect.top + originY - proxyRadius,
        xPercent: -50,
        rotation: 0,
      });

      const setters = cards.map((card) => gsap.quickSetter(card, "rotation", "deg"));
      const getIndex = () => -(gsap.getProperty(proxy, "rotation") as number) / step;
      const spread = { value: introPlayed.current ? 1 : 0 };

      const render = () => {
        const real = getIndex();
        setters.forEach((set, index) => set(nearestDelta(index, real, total) * step * spread.value));
        setActive(mod(Math.round(real), total) % count);
      };

      const tweenTo = (index: number) =>
        gsap.to(proxy, { rotation: -index * step, duration: DURATION, ease: EASE, onUpdate: render, overwrite: true });

      goRef.current = (target) => {
        if (spread.value < 1) return;
        const current = getIndex();
        if (target === "prev" || target === "next") {
          tweenTo(Math.round(current) + (target === "next" ? 1 : -1));
          return;
        }
        let best = 0;
        let bestDistance = Infinity;
        cards.forEach((_, index) => {
          if (index % count !== target) return;
          const delta = nearestDelta(index, current, total);
          if (Math.abs(delta) < bestDistance) {
            bestDistance = Math.abs(delta);
            best = delta;
          }
        });
        tweenTo(current + best);
      };

      const [draggable] = Draggable.create(proxy, {
        type: "rotation",
        trigger: [proxy, ...cards],
        inertia: true,
        throwResistance: 2000,
        dragResistance: 0.05,
        maxDuration: 1,
        minDuration: 0.5,
        edgeResistance: 0.75,
        overshootTolerance: 0,
        snap: (value: number) => Math.round(value / step) * step,
        onDrag: render,
        onThrowUpdate: render,
        onThrowComplete: render,
        onPress: () => setIsDragging(true),
        onRelease: () => setIsDragging(false),
      });

      render();

      if (!introPlayed.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const panels = cards.map((card) => card.firstElementChild);
        draggable.disable();
        gsap.set(cards, { autoAlpha: 0 });
        gsap.set(panels, { scale: 0.85 });
        gsap.set(controls, { autoAlpha: 0, y: 20 });
        gsap
          .timeline({
            scrollTrigger: { trigger: container, start: introStart, toggleActions: "play none none none" },
            defaults: { ease: "expo.out" },
            onComplete: () => {
              introPlayed.current = true;
              draggable.enable();
            },
          })
          .to(spread, { value: 1, duration: 1.6, ease: "expo.inOut", onUpdate: render })
          .to(cards, { autoAlpha: 1, duration: 0.6, stagger: (index) => Math.abs(nearestDelta(index, 0, total)) * introStagger }, 0)
          .to(panels, { scale: 1, duration: 1.2, stagger: (index) => Math.abs(nearestDelta(index, 0, total)) * introStagger }, 0)
          .to(controls, { autoAlpha: 1, y: 0, duration: 0.8 }, controlsDelay);
      } else {
        spread.value = 1;
        introPlayed.current = true;
        render();
      }

      return () => draggable.kill();
    }, container);

    return () => ctx.revert();
  }, [layout, total, count, introStagger, introStart, controlsDelay]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={carouselLabel}
      className={cn("relative flex w-full flex-col items-center gap-8 overflow-hidden pt-8 pb-8 md:pt-36 md:pb-36 antialiased [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] md:[mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent),linear-gradient(to_bottom,black_85%,transparent)] [mask-composite:intersect]", isDragging ? "cursor-grabbing" : "cursor-grab", className)}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div ref={proxyRef} className="pointer-events-auto absolute rounded-full opacity-0" />
      </div>
      <div ref={trackRef} role="group" aria-label={slidesLabel} className="relative flex max-w-full touch-pan-y select-none items-center justify-center">
        {Array.from({ length: total }, (_, index) => {
          const item = items[index % count];
          return (
            <div
              key={index}
              aria-hidden={index >= count}
              className={cn("flex-none origin-[50%_475%] md:origin-[50%_375%] will-change-transform", index === 0 ? "relative" : "absolute")}
            >
              {renderItem ? renderItem(index % count) : (
              <div className="flex w-60 md:w-80 flex-col gap-3 xl:gap-3.5 2xl:gap-4 p-3 xl:p-3.5 2xl:p-4 card rounded">
                <div className="relative aspect-square w-full overflow-hidden rounded">
                  {item.videoSrc ? (
                    <video src={item.videoSrc} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline />
                  ) : (
                    <Media src={item.imageSrc} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex flex-col gap-1 px-3 py-1 xl:px-3.5 xl:py-1.5 2xl:px-4 2xl:py-2">
                  <h3 className="text-xl md:text-2xl 2xl:text-3xl font-semibold leading-tight">{item.title}</h3>
                  <p className="text-sm md:text-base 2xl:text-lg leading-snug text-balance">{item.description}</p>
                </div>
              </div>
              )}
            </div>
          );
        })}
      </div>
      <div ref={controlsRef} className="relative flex items-center justify-center gap-4">
        {/* eslint-disable-next-line react-hooks/refs */}
        {renderControls ? renderControls({ prev: () => go("prev"), next: () => go("next"), goTo: (index) => go(index), active, count }) : (
        <>
        <button
          type="button"
          aria-label={previousLabel}
          onClick={() => goRef.current("prev")}
          className="flex items-center justify-center size-9 cursor-pointer rounded btn-primary bg-primary text-primary-foreground"
        >
          <ArrowLeft className="size-4 text-primary-foreground" strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-2 h-9 px-3 card rounded">
          {items.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === active}
              onClick={() => goRef.current(index)}
              className={cn(
                "size-2 cursor-pointer rounded-full transition-colors duration-100",
                index === active ? "bg-foreground" : "bg-foreground/10"
              )}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label={nextLabel}
          onClick={() => goRef.current("next")}
          className="flex items-center justify-center size-9 cursor-pointer rounded btn-primary bg-primary text-primary-foreground"
        >
          <ArrowRight className="size-4 text-primary-foreground" strokeWidth={1.5} />
        </button>
        </>
        )}
      </div>
    </div>
  );
};

export default CardWheelSlider;
