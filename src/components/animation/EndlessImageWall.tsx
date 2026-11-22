"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

gsap.registerPlugin(Observer, ScrollTrigger);

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const WHEEL_SPEED = 0.75;
const DRAG_SPEED = 1.25;

interface EndlessImageWallProps {
  items?: ({ imageSrc: string; videoSrc?: never } | { videoSrc: string; imageSrc?: never })[];
  captureScroll?: boolean;
  className?: string;
}

const DEFAULT_ITEMS: NonNullable<EndlessImageWallProps["items"]> = [
  { imageSrc: "https://images.pexels.com/photos/39219673/pexels-photo-39219673.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/8436617/pexels-photo-8436617.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/20768597/pexels-photo-20768597.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/38975946/pexels-photo-38975946.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/4129384/pexels-photo-4129384.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

const EndlessImageWall = ({ items = DEFAULT_ITEMS, captureScroll = false, className = "" }: EndlessImageWallProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const collectionRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ columns: number; count: number } | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const measure = measureRef.current;
    if (!wrapper || !measure) return;

    const update = () => {
      const itemWidth = measure.offsetWidth;
      const itemHeight = measure.offsetHeight;
      if (!itemWidth || !itemHeight) return;
      const columns = Math.max(1, Math.ceil(wrapper.clientWidth / itemWidth) + 1);
      const rows = Math.max(1, Math.ceil(wrapper.clientHeight / itemHeight) + 1);
      const count = Math.ceil(Math.max(columns * rows, items.length) / columns) * columns;
      setLayout((prev) => (prev && prev.columns === columns && prev.count === count ? prev : { columns, count }));
    };

    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [items.length]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const collection = collectionRef.current;
    if (!layout || !wrapper || !collection) return;

    const lists = Array.from(collection.children) as HTMLElement[];
    const firstItem = lists[0]?.firstElementChild as HTMLElement | null;
    if (lists.length < 4 || !firstItem) return;

    const setStatus = (status: string) => wrapper.setAttribute("data-status", status);
    let observer: Observer | undefined;
    let scrollTimeout: ReturnType<typeof setTimeout>;
    let frame = 0;

    const ctx = gsap.context(() => {
      const tileWidth = lists[0].offsetWidth;
      const tileHeight = lists[0].offsetHeight;

      gsap.set(lists[1], { xPercent: 100 });
      gsap.set(lists[2], { yPercent: 100 });
      gsap.set(lists[3], { xPercent: 100, yPercent: 100 });

      const wrapX = gsap.utils.wrap(-tileWidth, 0);
      const wrapY = gsap.utils.wrap(-tileHeight, 0);
      let currentX = wrapX((wrapper.clientWidth - tileWidth) * 0.5);
      let currentY = wrapY((wrapper.clientHeight - firstItem.offsetHeight) * 0.5);

      const xTo = gsap.quickTo(collection, "x", { duration: 1.2, ease: "expo.out", modifiers: { x: gsap.utils.unitize(wrapX) } });
      const yTo = gsap.quickTo(collection, "y", { duration: 1.2, ease: "expo.out", modifiers: { y: gsap.utils.unitize(wrapY) } });
      gsap.set(collection, { x: currentX, y: currentY });

      const handleMovement = (self: Observer, axis: "x" | "y") => {
        const isWheel = self.event.type === "wheel";
        const isTouch = self.event.type.startsWith("touch") || (self.event as PointerEvent).pointerType === "touch";
        if (axis === "y" && (isWheel || isTouch) && !captureScroll) return;
        if (isWheel) {
          setStatus("scrolling");
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => setStatus("idle"), 200);
        }
        const delta = gsap.utils.clamp(-80, 80, (axis === "x" ? self.deltaX : self.deltaY) * (isWheel ? WHEEL_SPEED : DRAG_SPEED));
        if (axis === "x") {
          currentX += isWheel ? -delta : delta;
          xTo(currentX);
        } else {
          currentY += isWheel ? -delta : delta;
          yTo(currentY);
        }
      };

      observer = Observer.create({
        target: wrapper,
        type: "wheel,touch,pointer",
        preventDefault: captureScroll,
        dragMinimum: 3,
        onPress: () => setStatus("dragging"),
        onRelease: () => setStatus("idle"),
        onStop: () => setStatus("idle"),
        onChangeX: (self) => handleMovement(self, "x"),
        onChangeY: (self) => handleMovement(self, "y"),
      });
      const tiles = wrapper.querySelectorAll<HTMLElement>("[data-tile]");
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !tiles.length) return;
      const centerX = wrapper.clientWidth / 2;
      const centerY = wrapper.clientHeight / 2;
      const wrapperRect = wrapper.getBoundingClientRect();
      const distances = Array.from(tiles, (tile) => {
        const rect = tile.getBoundingClientRect();
        return Math.hypot(rect.left - wrapperRect.left + rect.width / 2 - centerX, rect.top - wrapperRect.top + rect.height / 2 - centerY);
      });
      const maxDistance = Math.max(...distances, 1);

      gsap
        .timeline({ scrollTrigger: { trigger: wrapper, start: "top 80%", once: true } })
        .fromTo(
          tiles,
          { autoAlpha: 0, scale: 0.6 },
          { autoAlpha: 1, scale: 1, duration: 1.2, ease: "expo.out", stagger: (index) => (distances[index] / maxDistance) * 0.8 }
        )
        .fromTo(collection, { scale: 1.15 }, { scale: 1, duration: 2, ease: "expo.out" }, 0);
    }, wrapper);

    const onMouseLeave = () => {
      setStatus("idle");
      observer?.disable();
      observer?.enable();
    };

    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    frame = requestAnimationFrame(() => setStatus("idle"));

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(scrollTimeout);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      observer?.kill();
      ctx.revert();
      setStatus("loading");
    };
  }, [layout, captureScroll]);

  const renderItem = (item: (typeof DEFAULT_ITEMS)[number], index: number) => (
    <div data-tile className={cn("relative select-none rounded-[0.125em] overflow-hidden", index % 3 === 1 ? "w-full h-3/4" : "w-4/5 h-full")}>
      {item.videoSrc ? (
        <video src={item.videoSrc} className="absolute inset-0 w-full h-full object-cover pointer-events-none" autoPlay loop muted playsInline />
      ) : (
        <img src={item.imageSrc} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      )}
    </div>
  );

  const itemClassName = "flex items-center justify-center aspect-square w-[13em] p-[1.75em]";

  return (
    <div
      ref={wrapperRef}
      data-status="loading"
      className={cn(
        "relative w-full h-svh overflow-clip mask-[linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)] cursor-grab text-[clamp(1.5rem,2vw,3rem)] opacity-100 transition-opacity duration-500 data-[status=loading]:opacity-0 data-[status=dragging]:cursor-grabbing",
        captureScroll ? "touch-none" : "touch-pan-y",
        className
      )}
    >
      <div ref={measureRef} aria-hidden="true" className={cn(itemClassName, "absolute invisible pointer-events-none")} />
      <div ref={collectionRef} className="absolute inset-0 will-change-transform">
        {layout &&
          Array.from({ length: 4 }, (_, listIndex) => (
            <div
              key={listIndex}
              aria-hidden={listIndex > 0 || undefined}
              className="absolute top-0 left-0 grid"
              style={{ gridTemplateColumns: `repeat(${layout.columns}, auto)` }}
            >
              {Array.from({ length: layout.count }, (_, index) => (
                <div key={index} className={itemClassName}>
                  {renderItem(items[index % items.length], index % items.length)}
                </div>
              ))}
            </div>
          ))}
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1/5 backdrop-blur-md pointer-events-none mask-[linear-gradient(to_bottom,black,transparent)]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/5 backdrop-blur-md pointer-events-none mask-[linear-gradient(to_top,black,transparent)]" />
    </div>
  );
};

export default EndlessImageWall;
