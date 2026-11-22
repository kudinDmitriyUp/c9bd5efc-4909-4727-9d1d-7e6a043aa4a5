"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Media from "@/components/kit/Media";

gsap.registerPlugin(Observer, ScrollTrigger);

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const ROTATION_ANGLE = 30;
const CARD_Y_SPACING = 0.3;
const EDGE_OFFSET = 2;
const ORBIT_DEPTH = 35;
const AUTO_SPEED = 0.00325;
const SCROLL_SPEED = 0.015;
const DRAG_MULTIPLIER = 5;
const SCROLL_EASE = 0.1;
const MAX_SPEED = 0.2;
const EDGE_SCALE = 0.5;
const BACK_DARKNESS = 0.75;
const BACK_BLUR = 0.5;

interface SpiralCardColumnProps {
  items?: ({ imageSrc: string; videoSrc?: never } | { videoSrc: string; imageSrc?: never })[];
  className?: string;
  cardClassName?: string;
  edgeBlur?: boolean;
  ready?: boolean;
  backDarkness?: number;
  flat?: boolean;
  scrollReactive?: boolean;
}

const DEFAULT_ITEMS: NonNullable<SpiralCardColumnProps["items"]> = [
  { imageSrc: "https://images.pexels.com/photos/1179863/pexels-photo-1179863.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/10923534/pexels-photo-10923534.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/11979193/pexels-photo-11979193.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/12010421/pexels-photo-12010421.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/12037266/pexels-photo-12037266.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

const SpiralCardColumn = ({ items = DEFAULT_ITEMS,className = "", cardClassName, edgeBlur = true, ready = true, backDarkness = BACK_DARKNESS, flat = false, scrollReactive = true }: SpiralCardColumnProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [amount, setAmount] = useState(items.length);
  const [isDragging, setIsDragging] = useState(false);
  const introPlayed = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const card = listRef.current?.firstElementChild as HTMLElement | null;
    if (!container || !card) return;

    let timer: ReturnType<typeof setTimeout>;
    const measure = () => {
      const cardHeight = card.offsetHeight;
      const neededDistance = container.offsetHeight * 0.5 + cardHeight * EDGE_OFFSET + cardHeight * EDGE_SCALE;
      const cardsPerSide = Math.ceil(neededDistance / (cardHeight * CARD_Y_SPACING)) + 1;
      setAmount(Math.ceil((cardsPerSide * 2 + 1) / items.length) * items.length);
    };
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(measure, 150);
    };
    measure();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [items.length]);

  useEffect(() => {
    const container = containerRef.current;
    const list = listRef.current;
    if (!container || !list || !ready) return;

    const ctx = gsap.context(() => {
      const cards = Array.from(list.children) as HTMLElement[];
      const cardHeight = cards[0].offsetHeight;
      const cardGap = cardHeight * CARD_Y_SPACING;
      const em = parseFloat(getComputedStyle(cards[0]).fontSize);
      const edgeEase = gsap.parseEase("power2.inOut");
      const state = { progress: 0, velocity: AUTO_SPEED, direction: 1, isActive: false };
      const boost = { value: 0 };
      const reveal = cards.map(() => ({ value: introPlayed.current ? 1 : 0 }));
      const shades = cards.map((card) => card.querySelector<HTMLElement>("[data-shade]"));

      const getEdgeScale = (y: number) => {
        const fadeStart = container.offsetHeight * 0.5 + cardHeight * EDGE_OFFSET;
        return edgeEase(gsap.utils.clamp(0, 1, (fadeStart - Math.abs(y)) / (cardHeight * EDGE_SCALE)));
      };

      const render = () => {
        const radius = ORBIT_DEPTH * em;
        cards.forEach((card, startIndex) => {
          const loopIndex = (((startIndex + state.progress) % amount) + amount) % amount;
          const index = loopIndex > amount * 0.5 ? loopIndex - amount : loopIndex;
          const angle = (index * ROTATION_ANGLE * Math.PI) / 180;
          const center = 1 - Math.min(Math.abs(index) / (amount * 0.5), 1);
          const y = index * cardGap;
          const backAmount = gsap.utils.clamp(0, 1, (1 - Math.cos(angle)) * 0.5);
          const shade = shades[startIndex];
          if (flat && shade) gsap.set(shade, { opacity: backAmount * backDarkness });
          gsap.set(card, {
            xPercent: -50,
            yPercent: -50,
            x: Math.sin(angle) * radius,
            y,
            z: (Math.cos(angle) - 1) * radius,
            rotateY: index * ROTATION_ANGLE,
            scale: getEdgeScale(y),
            ...(flat ? {} : { filter: `brightness(${1 - backAmount * backDarkness}) blur(${backAmount * BACK_BLUR}em)` }),
            autoAlpha: reveal[startIndex].value,
            zIndex: Math.round(center * 1000),
          });
        });
      };

      const tick = () => {
        if (!state.isActive) return;
        state.velocity = gsap.utils.interpolate(state.velocity, AUTO_SPEED * state.direction, SCROLL_EASE);
        state.progress += state.velocity + boost.value;
        render();
      };

      const observer = !scrollReactive ? null : Observer.create({
        target: window,
        type: "wheel,touch,pointer",
        preventDefault: false,
        lockAxis: true,
        onChange: (self) => {
          if (!state.isActive) return;
          const delta =
            self.event.type === "wheel"
              ? self.deltaY
              : Math.abs(self.deltaX) > Math.abs(self.deltaY)
                ? self.deltaX * DRAG_MULTIPLIER
                : self.deltaY * DRAG_MULTIPLIER;
          if (!delta) return;
          state.direction = delta > 0 ? 1 : -1;
          state.velocity = gsap.utils.clamp(-MAX_SPEED, MAX_SPEED, state.velocity + (delta * SCROLL_SPEED) / 100);
        },
        onPress: () => setIsDragging(true),
        onRelease: () => setIsDragging(false),
      });

      const setActive = (isActive: boolean) => {
        state.isActive = isActive;
        if (isActive) observer?.enable();
        else observer?.disable();
      };

      ScrollTrigger.create({
        trigger: container,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => setActive(self.isActive),
      });

      render();
      setActive(ScrollTrigger.isInViewport(container));

      if (!introPlayed.current) {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          reveal.forEach((item) => (item.value = 1));
          introPlayed.current = true;
          render();
        } else {
          gsap.set(list, { scale: 0.6 });
          gsap
            .timeline({
              scrollTrigger: { trigger: container, start: "top 80%", toggleActions: "play none none none" },
              onComplete: () => {
                introPlayed.current = true;
              },
            })
            .fromTo(boost, { value: 0.3 }, { value: 0, duration: 2.2, ease: "expo.out" })
            .to(list, { scale: 1, duration: 1.6, ease: "expo.out" }, 0)
            .to(reveal, { value: 1, duration: 0.5, ease: "power2.out", stagger: { amount: 0.8, from: "random" }, onUpdate: render }, 0);
        }
      }
      gsap.ticker.add(tick);

      return () => {
        gsap.ticker.remove(tick);
        observer?.kill();
      };
    }, container);

    return () => ctx.revert();
  }, [amount, ready, backDarkness, flat, scrollReactive]);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-svh w-full touch-pan-y overflow-clip mask-[linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]", isDragging ? "cursor-grabbing" : "cursor-grab", className)}
    >
      <div ref={listRef} className="relative h-full w-full text-[clamp(0.5em,0.75vw,1.5em)] perspective-[75em] transform-3d">
        {Array.from({ length: amount }, (_, index) => {
          const item = items[index % items.length];
          return (
            <div key={index} className={cn("invisible absolute left-1/2 top-1/2 transform-3d backface-visible", flat ? "will-change-transform" : "will-change-[transform,filter]")}>
              <div className={cn("pointer-events-none relative aspect-[4/5] w-[18em] select-none overflow-hidden rounded-[1em] bg-card", cardClassName)}>
                {item.videoSrc ? (
                  <video src={item.videoSrc} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline />
                ) : (
                  <Media src={item.imageSrc} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                )}
                {flat && <div data-shade className="absolute inset-0 bg-black opacity-0" />}
              </div>
            </div>
          );
        })}
      </div>
      {edgeBlur && <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1/5 backdrop-blur-md pointer-events-none mask-[linear-gradient(to_bottom,black,transparent)]" />}
      {edgeBlur && <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/5 backdrop-blur-md pointer-events-none mask-[linear-gradient(to_top,black,transparent)]" />}
    </div>
  );
};

export default SpiralCardColumn;
