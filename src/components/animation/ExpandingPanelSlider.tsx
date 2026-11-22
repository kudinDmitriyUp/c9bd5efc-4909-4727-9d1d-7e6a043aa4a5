"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";

const EASE = [0.65, 0, 0.35, 1] as const;
const DURATION = 0.65;
const GAP = 8;
const RADIUS = 12;
const ACTIVE_SIZE = 0.6;
const INTRO_EASE = [0.16, 1, 0.3, 1] as const;

interface ExpandingPanelSliderProps {
  items?: ({ title: string; description: string } & ({ imageSrc: string; videoSrc?: never } | { videoSrc: string; imageSrc?: never }))[];
}

const DEFAULT_ITEMS: NonNullable<ExpandingPanelSliderProps["items"]> = [
  { title: "Design that ships", description: "Built for the long run", imageSrc: "https://images.pexels.com/photos/1179863/pexels-photo-1179863.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Clear structure", description: "Built for the long run", imageSrc: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Quiet details", description: "Built for the long run", imageSrc: "https://images.pexels.com/photos/10923534/pexels-photo-10923534.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { title: "Honest craft", description: "Built for the long run", imageSrc: "https://images.pexels.com/photos/11979193/pexels-photo-11979193.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

const ExpandingPanelSlider = ({ items = DEFAULT_ITEMS }: ExpandingPanelSliderProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const isInView = useInView(viewportRef, { once: true, margin: "0px 0px -20% 0px" });
  const reduceMotion = useReducedMotion();
  const isShown = isInView || !!reduceMotion;
  const count = items.length;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => setSize({ width: viewport.offsetWidth, height: viewport.offsetHeight }));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setActiveIndex((index) => (index - 1 + count) % count);
      if (event.key === "ArrowRight") setActiveIndex((index) => (index + 1) % count);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [count]);

  const isVertical = window.innerWidth < 768;
  const length = isVertical ? size.height : size.width;
  const slideSize = length * ACTIVE_SIZE;
  const narrowSize = Math.max(0, (length - slideSize - (count - 1) * GAP) / Math.max(1, count - 1));

  let start = 0;
  const slots = items.map((_, index) => {
    const slotSize = index === activeIndex ? slideSize : narrowSize;
    const slot = { offset: start + slotSize / 2 - slideSize / 2, clip: (slideSize - slotSize) / 2 };
    start += slotSize + GAP;
    return slot;
  });

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Featured content" className="relative w-full">
      <div ref={viewportRef} className="relative w-full h-[36em] md:h-[35em] overflow-hidden">
        {size.width > 0 &&
          items.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <motion.div
                key={index}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}`}
                onClick={() => setActiveIndex(index)}
                initial={false}
                animate={
                  isVertical
                    ? { x: 0, y: slots[index].offset, clipPath: `inset(${slots[index].clip}px 0px round ${RADIUS}px)` }
                    : { x: slots[index].offset, y: 0, clipPath: `inset(0px ${slots[index].clip}px round ${RADIUS}px)` }
                }
                transition={{ duration: DURATION, ease: EASE }}
                style={{ width: isVertical ? "100%" : slideSize, height: isVertical ? slideSize : "100%", zIndex: isActive ? 10 : 5 }}
                className="absolute top-0 left-0 overflow-hidden select-none cursor-pointer will-change-transform"
              >
                <motion.div
                  initial={reduceMotion ? false : { y: "100%" }}
                  animate={isShown ? { y: "0%" } : undefined}
                  transition={{ duration: 1.2, ease: INTRO_EASE, delay: index * 0.1 }}
                  className="absolute inset-0 overflow-hidden"
                >
                  <motion.div
                    initial={reduceMotion ? false : { scale: 1.3 }}
                    animate={isShown ? { scale: 1 } : undefined}
                    transition={{ duration: 1.6, ease: INTRO_EASE, delay: index * 0.1 }}
                    className="absolute inset-0"
                  >
                    {item.videoSrc ? (
                      <video src={item.videoSrc} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline />
                    ) : (
                      <img src={item.imageSrc} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                  </motion.div>
                  <div className="absolute -inset-x-px -bottom-px h-2/5 backdrop-blur-xl mask-[linear-gradient(to_bottom,transparent,black_60%)]" aria-hidden="true" />
                  <div className="absolute inset-x-0 bottom-0 z-10 p-6 xl:p-7 2xl:p-8">
                    <motion.div
                      initial={false}
                      animate={{ opacity: isActive && isShown ? 1 : 0, y: isActive && isShown ? "0em" : "0.25em" }}
                      transition={{ duration: 0.3, ease: [0.645, 0.045, 0.355, 1], delay: isActive ? 0.4 : 0 }}
                      className="flex flex-col gap-1 text-white"
                    >
                      <h3 className="text-xl md:text-2xl 2xl:text-3xl font-semibold leading-tight">{item.title}</h3>
                      <p className="max-w-md text-sm md:text-base 2xl:text-lg leading-snug text-balance">{item.description}</p>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
      </div>
      <motion.nav
        aria-label="Slider navigation"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={isShown ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.9, ease: INTRO_EASE, delay: count * 0.1 + 0.2 }}
        className="flex items-center justify-center gap-3 mt-8"
      >
        <button
          type="button"
          aria-label="Previous slide"
          onClick={() => setActiveIndex((index) => (index - 1 + count) % count)}
          className="flex items-center justify-center size-9 cursor-pointer rounded btn-primary bg-primary text-primary-foreground"
        >
          <ArrowLeft className="size-4 text-primary-foreground" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => setActiveIndex((index) => (index + 1) % count)}
          className="flex items-center justify-center size-9 cursor-pointer rounded btn-primary bg-primary text-primary-foreground"
        >
          <ArrowRight className="size-4 text-primary-foreground" strokeWidth={1.5} />
        </button>
      </motion.nav>
    </div>
  );
};

export default ExpandingPanelSlider;
