"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Media from "@/components/kit/Media";

gsap.registerPlugin(ScrollTrigger);

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface SpreadingCardStackProps {
  items?: ({ title: string; description: string } & ({ imageSrc: string; videoSrc?: never } | { videoSrc: string; imageSrc?: never }))[];
  className?: string;
  gridClassName?: string;
  renderItem?: (index: number) => ReactNode;
}

const DEFAULT_ITEMS: NonNullable<SpreadingCardStackProps["items"]> = [
  { title: "Design that ships", description: "Built for the long run.", imageSrc: "https://images.pexels.com/photos/39219673/pexels-photo-39219673.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Clear systems", description: "Every detail has a reason.", imageSrc: "https://images.pexels.com/photos/8436617/pexels-photo-8436617.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Fast delivery", description: "From brief to launch.", imageSrc: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Honest craft", description: "Made by hand, checked twice.", imageSrc: "https://images.pexels.com/photos/20768597/pexels-photo-20768597.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Real support", description: "People who pick up the phone.", imageSrc: "https://images.pexels.com/photos/38975946/pexels-photo-38975946.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Fair pricing", description: "No surprises on the invoice.", imageSrc: "https://images.pexels.com/photos/4129384/pexels-photo-4129384.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

const STAGGER = 0.1;
const ease = gsap.parseEase("power2.out");

const jitter = (index: number, salt: number) => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
};

const SpreadingCardStack = ({ items = DEFAULT_ITEMS, className = "", gridClassName, renderItem }: SpreadingCardStackProps) => {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const cards = Array.from(grid.children) as HTMLElement[];
      const total = 1 + STAGGER * (cards.length - 1);
      const state = { progress: 0 };
      let offsets = cards.map(() => ({ x: 0, y: 0 }));

      const measure = () => {
        const stackY = cards[0].offsetTop + cards[0].offsetHeight / 2;
        offsets = cards.map((card) => ({
          x: grid.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2),
          y: stackY - (card.offsetTop + card.offsetHeight / 2),
        }));
      };

      const render = () => {
        const time = state.progress * total;
        cards.forEach((card, index) => {
          const done = ease(gsap.utils.clamp(0, 1, time - index * STAGGER));
          const left = 1 - done;
          gsap.set(card, {
            x: (offsets[index].x + jitter(index, 1) * 18) * left,
            y: (offsets[index].y + jitter(index, 2) * 14) * left,
            rotation: jitter(index, 3) * 9 * left,
            scale: 0.9 + 0.1 * done,
          });
        });
      };

      measure();
      render();

      gsap.to(state, {
        progress: 1,
        ease: "none",
        onUpdate: render,
        scrollTrigger: {
          trigger: grid,
          start: "top 60%",
          end: "bottom 75%",
          scrub: 0.6,
          onRefresh: () => {
            measure();
            render();
          },
        },
      });
    }, grid);

    return () => ctx.revert();
  }, [items.length]);

  return (
    <div className={cn("w-full py-16", className)}>
      <div ref={gridRef} className={cn("relative mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 px-6 md:grid-cols-3 md:gap-5", gridClassName)}>
        {items.map((item, index) => renderItem ? (
          <div key={index} style={{ zIndex: items.length - index }} className="relative flex min-w-0 will-change-transform">
            {renderItem(index)}
          </div>
        ) : (
          <div
            key={index}
            style={{ zIndex: items.length - index }}
            className="relative flex flex-col gap-3 xl:gap-3.5 2xl:gap-4 p-3 xl:p-3.5 2xl:p-4 card rounded will-change-transform"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded">
              {item.videoSrc ? (
                <video src={item.videoSrc} className="h-full w-full object-cover" autoPlay loop muted playsInline />
              ) : (
                <Media src={item.imageSrc} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex flex-col gap-1 p-1 md:p-3 xl:p-3.5 2xl:p-4">
              <h3 className="text-xl md:text-2xl 2xl:text-3xl font-semibold leading-tight">{item.title}</h3>
              <p className="text-sm md:text-base 2xl:text-lg leading-snug text-balance">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpreadingCardStack;
