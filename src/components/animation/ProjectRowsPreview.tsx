"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

gsap.registerPlugin(ScrollTrigger);

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type PreviewItem = {
  title: string;
  location: string;
  year: string;
  services: string;
  href?: string;
} & ({ imageSrc: string; videoSrc?: never } | { videoSrc: string; imageSrc?: never });

interface ProjectRowsPreviewProps {
  items?: PreviewItem[];
  headers?: [string, string, string, string];
  className?: string;
}

const OFFSET = 100;
const DURATION = 0.5;
const EASE = "power2.inOut";

const DEFAULT_ITEMS: PreviewItem[] = [
  { title: "Harbor House", location: "Lisbon", year: "2025", services: "Branding", imageSrc: "https://images.pexels.com/photos/1179863/pexels-photo-1179863.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Northwind", location: "Oslo", year: "2025", services: "Web design", imageSrc: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Atlas Studio", location: "Berlin", year: "2024", services: "Identity", imageSrc: "https://images.pexels.com/photos/10923534/pexels-photo-10923534.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Verde Cafe", location: "Porto", year: "2024", services: "Packaging", imageSrc: "https://images.pexels.com/photos/11979193/pexels-photo-11979193.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Summit Labs", location: "Zurich", year: "2023", services: "Product", imageSrc: "https://images.pexels.com/photos/12010421/pexels-photo-12010421.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

const ProjectRowsPreview = ({ items = DEFAULT_ITEMS,headers = ["Name", "Location", "Year", "Services"], className = "" }: ProjectRowsPreviewProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const prevIndex = useRef<number | null>(null);
  const firstEntry = useRef(true);
  const isPointer = useRef(false);
  const shownIndex = useRef<number | null>(null);
  const [isOver, setIsOver] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const visuals = () => Array.from(innerRef.current?.querySelectorAll<HTMLElement>("[data-visual]") ?? []);

  const showItem = (index: number) => {
    const inner = innerRef.current;
    const row = listRef.current?.children[index];
    if (!inner || !row) return;
    const forward = prevIndex.current === null || index > prevIndex.current;
    prevIndex.current = index;
    shownIndex.current = index;
    setIsOver(true);
    setActiveIndex(index);

    visuals().forEach((el) => {
      gsap.killTweensOf(el);
      gsap.to(el, { yPercent: forward ? -OFFSET : OFFSET, duration: DURATION, ease: EASE, overwrite: "auto", onComplete: () => el.remove() });
    });

    const source = row.querySelector("[data-source]");
    if (!source) return;
    const clone = source.cloneNode(true) as HTMLElement;
    clone.removeAttribute("data-source");
    clone.setAttribute("data-visual", "");
    clone.className = "absolute inset-0 w-full h-full overflow-hidden";
    inner.appendChild(clone);

    if (!firstEntry.current) {
      gsap.fromTo(clone, { yPercent: forward ? OFFSET : -OFFSET }, { yPercent: 0, duration: DURATION, ease: EASE, overwrite: "auto" });
    } else {
      firstEntry.current = false;
    }
  };

  const onPointerOver = (index: number, event: React.MouseEvent) => {
    if (!isPointer.current || shownIndex.current === index) return;
    if (firstEntry.current && followerRef.current) gsap.set(followerRef.current, { x: event.clientX, y: event.clientY });
    showItem(index);
  };

  const hideItem = () => {
    shownIndex.current = null;
    setActiveIndex(null);
    const el = visuals()[0];
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.to(el, { yPercent: -OFFSET, duration: DURATION, ease: EASE, overwrite: "auto", onComplete: () => el.remove() });
  };

  const hideAll = () => {
    shownIndex.current = null;
    setIsOver(false);
    setActiveIndex(null);
    visuals().forEach((el) => {
      gsap.killTweensOf(el);
      gsap.delayedCall(DURATION, () => el.remove());
    });
    firstEntry.current = true;
    prevIndex.current = null;
  };

  const showItemRef = useRef(showItem);
  const hideAllRef = useRef(hideAll);
  useEffect(() => {
    showItemRef.current = showItem;
    hideAllRef.current = hideAll;
  });

  useEffect(() => {
    const list = listRef.current;
    const follower = followerRef.current;
    const inner = innerRef.current;
    if (!list || !follower || !inner) return;

    gsap.set(follower, { xPercent: -50, yPercent: -50 });
    const xTo = gsap.quickTo(follower, "x", { duration: 0.6, ease: "power3" });
    const yTo = gsap.quickTo(follower, "y", { duration: 0.6, ease: "power3" });
    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      isPointer.current = true;
      const onMove = (event: MouseEvent) => {
        xTo(event.clientX);
        yTo(event.clientY);
      };
      window.addEventListener("mousemove", onMove);
      return () => {
        isPointer.current = false;
        window.removeEventListener("mousemove", onMove);
      };
    });

    mm.add("(max-width: 1023px)", () => {
      const rows = Array.from(list.children) as HTMLElement[];
      let current = -1;
      let frame = 0;

      const update = () => {
        frame = 0;
        const middle = window.innerHeight / 2;
        const index = rows.findIndex((row) => {
          const rect = row.getBoundingClientRect();
          return rect.top <= middle && rect.bottom > middle;
        });
        if (index !== current) {
          current = index;
          if (index === -1) hideAllRef.current();
          else showItemRef.current(index);
        }
        if (index !== -1) {
          const rect = rows[index].getBoundingClientRect();
          xTo(window.innerWidth * 0.72);
          yTo(rect.top + rect.height / 2);
        }
      };

      const onScroll = () => {
        if (!frame) frame = requestAnimationFrame(update);
      };

      gsap.set(follower, { x: window.innerWidth * 0.72, y: window.innerHeight / 2 });
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      update();

      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        hideAllRef.current();
      };
    });

    return () => {
      mm.revert();
      gsap.killTweensOf(follower);
      Array.from(inner.children).forEach((el) => {
        gsap.killTweensOf(el);
        el.remove();
      });
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline({ scrollTrigger: { trigger: root, start: "top 80%", once: true } })
        .from("[data-intro-line]", { scaleX: 0, transformOrigin: "left center", duration: 1.2, ease: "expo.out", stagger: 0.08 })
        .from("[data-intro-text]", { autoAlpha: 0, y: 24, duration: 1, ease: "power3.out", stagger: 0.04 }, "<0.1")
        .from("[data-intro-header]", { autoAlpha: 0, duration: 0.6, ease: "power3.out", stagger: 0.05 }, "<");
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className={cn("w-full max-w-6xl mx-auto px-4 md:px-8 text-foreground", className)}>
      <div className="hidden lg:flex items-center w-full">
        <div className="flex-1 max-w-[45%]"><span data-intro-header className="text-xs uppercase text-foreground/50">{headers[0]}</span></div>
        <div className="flex-1 max-w-[15%]"><span data-intro-header className="text-xs uppercase text-foreground/50">{headers[1]}</span></div>
        <div className="flex-1 max-w-[15%]"><span data-intro-header className="text-xs uppercase text-foreground/50">{headers[2]}</span></div>
        <div className="flex-1 max-w-[25%]"><span data-intro-header className="text-xs uppercase text-foreground/50">{headers[3]}</span></div>
      </div>
      <div
        ref={listRef}
        onMouseLeave={() => isPointer.current && hideAll()}
        className="flex flex-col w-full mt-2"
      >
        {items.map((item, index) => (
          <div
            key={item.title}
            className={cn(
              "relative w-full transition-opacity duration-200",
              activeIndex !== null && activeIndex !== index && "opacity-50"
            )}
          >
            <a
              href={item.href ?? "#"}
              onMouseEnter={(event) => onPointerOver(index, event)}
              onMouseMove={(event) => onPointerOver(index, event)}
              onMouseLeave={() => isPointer.current && hideItem()}
              className="relative flex flex-col w-full py-6 lg:py-10"
            >
              <div data-intro-line className="absolute top-0 left-0 w-full h-px bg-foreground/25" />
              <div className="flex flex-wrap items-center w-full gap-y-2 lg:gap-y-0">
                <div className="w-full lg:w-auto lg:flex-1 lg:max-w-[45%]">
                  <h3 data-intro-text className="text-3xl lg:text-5xl font-normal leading-none">{item.title}</h3>
                </div>
                <div className="hidden lg:block flex-1 max-w-[15%]">
                  <p data-intro-text className="text-lg leading-tight">{item.location}</p>
                </div>
                <div className="order-last flex-1 max-w-[20%] text-right lg:order-none lg:text-left lg:max-w-[15%]">
                  <p data-intro-text className="text-lg leading-tight">{item.year}</p>
                </div>
                <div className="flex-1 max-w-[80%] lg:max-w-[25%]">
                  <p data-intro-text className="text-lg leading-tight">{item.services}</p>
                </div>
              </div>
              <div data-source className="hidden">
                {item.videoSrc ? (
                  <video src={item.videoSrc} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                ) : (
                  <img src={item.imageSrc} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            </a>
            {index === items.length - 1 && <div data-intro-line className="absolute bottom-0 left-0 w-full h-px bg-foreground/25" />}
          </div>
        ))}
      </div>
      <div
        ref={followerRef}
        aria-hidden="true"
        className="fixed top-0 left-0 z-100 flex items-center justify-center w-[35vw] lg:w-[20em] aspect-4/5 overflow-hidden rounded-xl pointer-events-none"
      >
        <div
          ref={innerRef}
          className={cn(
            "relative flex items-center justify-center w-full h-full [transition:opacity_0.1s_ease,scale_0.6s_cubic-bezier(0.65,0.1,0,1)]",
            isOver ? "opacity-100 scale-100" : "opacity-0 scale-0"
          )}
        />
      </div>
    </div>
  );
};

export default ProjectRowsPreview;
