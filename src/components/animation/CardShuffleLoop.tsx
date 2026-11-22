"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

gsap.registerPlugin(CustomEase, ScrollTrigger);

const EASE = CustomEase.create("depth-carousel", "M0,0 C0.6,0 0,1 1,1");
const X_MULTIPLIER = 0.65;
const BACK_SCALE = 0.5;
const SIDE_ROTATE_Y = 5;
const PERSPECTIVE = 75;
const MOVE_DURATION = 1.5;
const START_DELAY = 0.5;
const PAUSE_DURATION = 2.5;
const MANUAL_DURATION = 1;
const SWIPE_THRESHOLD = 40;

interface CardShuffleLoopProps {
  items?: ({ title: string; description: string } & ({ imageSrc: string; videoSrc?: never } | { videoSrc: string; imageSrc?: never }))[];
  className?: string;
  cardClassName?: string;
  titleClassName?: string;
  overlay?: boolean;
  navDelay?: number;
}

const DEFAULT_ITEMS: NonNullable<CardShuffleLoopProps["items"]> = [
  { title: "Design that ships", description: "Built for the long run", imageSrc: "https://images.pexels.com/photos/1179863/pexels-photo-1179863.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Clear structure", description: "Built for the long run", imageSrc: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Quiet details", description: "Built for the long run", imageSrc: "https://images.pexels.com/photos/10923534/pexels-photo-10923534.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Honest craft", description: "Built for the long run", imageSrc: "https://images.pexels.com/photos/11979193/pexels-photo-11979193.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

const CardShuffleLoop = ({ items = DEFAULT_ITEMS, className, cardClassName, titleClassName, overlay = false, navDelay = 0.9 }: CardShuffleLoopProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const goRef = useRef<(direction: number) => void>(() => {});
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const list = listRef.current;
    const nav = navRef.current;
    if (!container || !list || !nav || items.length < 2) return;

    const ctx = gsap.context(() => {
      const tiles = Array.from(list.children) as HTMLElement[];
      const count = tiles.length;
      const state = { progress: 0 };
      const spread = { value: 0 };
      let introDone = false;
      let target = 0;
      let isManual = false;
      let pressX: number | null = null;
      let isActive = false;
      let isHovering = false;
      let hasStarted = false;
      let step: gsap.core.Tween | undefined;
      let pause: gsap.core.Tween | undefined;

      gsap.set(list, { perspective: `${PERSPECTIVE}em` });
      gsap.set(tiles, { transformStyle: "preserve-3d", transformPerspective: PERSPECTIVE * 16 });

      const render = () => {
        const radiusX = tiles[0].offsetWidth * X_MULTIPLIER;
        tiles.forEach((tile, index) => {
          const relative = gsap.utils.clamp(-2, 2, ((((index - state.progress + count / 2) % count) + count) % count) - count / 2);
          const angle = (relative / 2) * Math.PI;
          const depth = (Math.cos(angle) + 1) / 2;
          gsap.set(tile, {
            x: relative <= -2 || relative >= 2 ? 0 : Math.sin(angle) * radiusX * spread.value,
            scale: gsap.utils.interpolate(BACK_SCALE, 1, depth) * gsap.utils.interpolate(0.8, 1, spread.value),
            rotateY: Math.sin(angle) * -SIDE_ROTATE_Y * spread.value,
            zIndex: Math.round(gsap.utils.interpolate(1, 1000, depth)),
          });
        });
      };

      const next = () => {
        if (!isActive || isHovering) return;
        moveTo(target + 1, MOVE_DURATION, false);
      };

      function moveTo(index: number, duration: number, manual: boolean) {
        target = index;
        isManual = manual;
        step?.kill();
        pause?.kill();
        step = gsap.to(state, {
          progress: target,
          duration,
          ease: EASE,
          onUpdate: render,
          onComplete: () => {
            if (isActive && !isHovering) pause = gsap.delayedCall(PAUSE_DURATION, next);
          },
        });
      }

      goRef.current = (direction) => {
        if (!introDone) return;
        hasStarted = true;
        moveTo((isManual ? target : Math.round(state.progress)) + direction, MANUAL_DURATION, true);
      };

      const resume = () => {
        if (!introDone) return;
        if (!hasStarted) {
          hasStarted = true;
          pause = gsap.delayedCall(START_DELAY, next);
          return;
        }
        if (step && step.progress() < 1) step.play();
        else next();
      };

      const play = () => {
        isActive = true;
        if (!isHovering) resume();
      };

      const stop = () => {
        isActive = false;
        step?.pause();
        pause?.pause();
      };

      const onOver = (event: PointerEvent) => {
        if (!(event.target as HTMLElement).closest("[data-tile]")) return;
        isHovering = true;
        pause?.pause();
      };

      const onLeave = () => {
        isHovering = false;
        if (isActive) resume();
      };

      const onDown = (event: PointerEvent) => {
        pressX = event.clientX;
      };

      const onUp = (event: PointerEvent) => {
        if (pressX === null) return;
        const deltaX = event.clientX - pressX;
        pressX = null;
        if (Math.abs(deltaX) >= SWIPE_THRESHOLD) goRef.current(deltaX < 0 ? 1 : -1);
      };

      list.addEventListener("pointerover", onOver);
      list.addEventListener("pointerleave", onLeave);
      list.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);

      const finishIntro = () => {
        introDone = true;
        spread.value = 1;
        render();
        if (isActive && !isHovering) resume();
      };

      render();

      ScrollTrigger.create({
        trigger: container,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? play() : stop()),
      });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finishIntro();
      } else {
        gsap.set(tiles, { autoAlpha: 0 });
        gsap.set(nav, { autoAlpha: 0, y: 20 });
        gsap
          .timeline({
            scrollTrigger: { trigger: container, start: "top 80%", toggleActions: "play none none none" },
            defaults: { ease: "expo.out" },
            onComplete: finishIntro,
          })
          .to(tiles, { autoAlpha: 1, duration: 0.6, stagger: 0.08 })
          .to(spread, { value: 1, duration: 1.4, ease: "expo.inOut", onUpdate: render }, 0.2)
          .to(nav, { autoAlpha: 1, y: 0, duration: 0.8 }, navDelay);
      }

      return () => {
        list.removeEventListener("pointerover", onOver);
        list.removeEventListener("pointerleave", onLeave);
        list.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
      };
    }, container);

    return () => ctx.revert();
  }, [items.length, navDelay]);

  return (
    <div ref={containerRef} className={cn("relative flex h-svh w-full flex-col items-center justify-center gap-8 overflow-clip", className)}>
      <div ref={listRef} className="grid place-items-center cursor-grab touch-pan-y select-none active:cursor-grabbing">
        {items.map((item, index) => (
          <div key={index} data-tile className="group col-start-1 row-start-1 flex items-center justify-center will-change-[transform,opacity]">
            <div className={cn("relative aspect-square w-[clamp(16em,25vw,32em)] overflow-hidden rounded transition-transform duration-400 ease-[cubic-bezier(0.35,1.5,0.6,1)] group-hover:scale-95", cardClassName)}>
              {[false, true].map((isBlur) => (
                <div
                  key={String(isBlur)}
                  aria-hidden={isBlur}
                  className={isBlur ? "absolute inset-0 blur-xl mask-[linear-gradient(to_bottom,transparent_60%,black_84%)]" : "absolute inset-0"}
                >
                  {item.videoSrc ? (
                    <video src={item.videoSrc} className="h-full w-full object-cover" autoPlay loop muted playsInline />
                  ) : (
                    <img src={item.imageSrc} alt="" draggable={false} className="h-full w-full object-cover" />
                  )}
                </div>
              ))}
              {overlay && <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/60 to-transparent" />}
              <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 p-6 xl:p-7 2xl:p-8 text-white">
                <h3 className={cn("text-xl md:text-2xl 2xl:text-3xl font-semibold leading-tight", titleClassName)}>{item.title}</h3>
                <p className="max-w-md text-sm md:text-base 2xl:text-lg leading-snug text-balance">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <nav ref={navRef} aria-label="Carousel navigation" className="relative z-1000 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => goRef.current(-1)}
          className="flex items-center justify-center size-9 cursor-pointer rounded btn-primary bg-primary text-primary-foreground"
        >
          <ArrowLeft className="size-4 text-primary-foreground" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => goRef.current(1)}
          className="flex items-center justify-center size-9 cursor-pointer rounded btn-primary bg-primary text-primary-foreground"
        >
          <ArrowRight className="size-4 text-primary-foreground" strokeWidth={1.5} />
        </button>
      </nav>
    </div>
  );
};

export default CardShuffleLoop;
