"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "motion/react";

type TiltedCardSlideshowProps = {
  items?: ({ imageSrc: string; videoSrc?: never } | { videoSrc: string; imageSrc?: never })[];
  autoPlayInterval?: number;
};

const DEFAULT_ITEMS: NonNullable<TiltedCardSlideshowProps["items"]> = [
  { imageSrc: "https://images.pexels.com/photos/39219673/pexels-photo-39219673.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/8436617/pexels-photo-8436617.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/20768597/pexels-photo-20768597.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/38975946/pexels-photo-38975946.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

const TiltedCardSlideshow = ({ items = DEFAULT_ITEMS, autoPlayInterval = 4000 }: TiltedCardSlideshowProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const itemCount = items.length;

  useEffect(() => {
    if (isFirstRender && isInView) {
      const timeout = setTimeout(() => setIsFirstRender(false), 800);
      return () => clearTimeout(timeout);
    }
  }, [isFirstRender, isInView]);

  useEffect(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    if (!isInView) return;
    autoPlayRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % itemCount);
    }, autoPlayInterval);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [autoPlayInterval, itemCount, isInView]);

  const positions =
    itemCount >= 5 ? [-2, -1, 0, 1, 2]
    : itemCount === 4 ? [-1, 0, 1, 2]
    : itemCount === 3 ? [-1, 0, 1]
    : itemCount === 2 ? [0, 1]
    : [0];

  return (
    <div ref={ref} className="relative flex items-center justify-center w-full overflow-hidden mask-fade-x">
      <div className="w-[70%] md:w-[40%] aspect-square md:aspect-video opacity-0" />
      {positions.map((position) => {
        const itemIndex = (activeIndex + position + itemCount) % itemCount;
        const item = items[itemIndex];
        const isCenter = position === 0;
        const distance = Math.abs(position);

        const scale = distance === 0 ? 1 : distance === 1 ? 0.88 : 0.8;
        const opacity = distance <= 1 ? 1 : 0;
        const xPercent = position * 100;
        const yPercent = distance === 0 ? 0 : distance === 1 ? 5 : 10;
        const rotate = position * 2;

        const initialState = distance <= 1 && isFirstRender
          ? isCenter
            ? { opacity: 0, y: "25px", scale: 1, x: "0%", rotate: 0 }
            : { opacity: 0, scale: 0.88, x: `calc(${xPercent}% + ${position > 0 ? 20 : -20}px)`, y: "5%", rotate }
          : { scale, opacity, x: `${xPercent}%`, y: `${yPercent}%`, rotate };

        return (
          <motion.div
            key={itemIndex}
            className="absolute w-[70%] md:w-[40%] aspect-square md:aspect-video p-2 xl:p-3 2xl:p-4 bg-card text-card-foreground border rounded-xl overflow-hidden"
            style={{ zIndex: isCenter ? 10 : 5 - distance }}
            initial={initialState}
            animate={isInView ? { scale, opacity, x: `${xPercent}%`, y: `${yPercent}%`, rotate } : undefined}
            transition={{
              duration: 0.8,
              ease: [0.65, 0, 0.35, 1],
              delay: distance <= 1 && isFirstRender && !isCenter ? 0.15 : 0,
            }}
          >
            {item.videoSrc ? (
              <video
                src={item.videoSrc}
                className="w-full h-full rounded-lg object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img src={item.imageSrc} alt="" className="w-full h-full rounded-lg object-cover" />
            )}
            <motion.div
              className="absolute inset-0 bg-background/50 backdrop-blur-[1px] pointer-events-none"
              initial={{ opacity: isCenter ? 0 : 1 }}
              animate={{ opacity: isCenter ? 0 : 1 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </motion.div>
        );
      })}
    </div>
  );
};

export default TiltedCardSlideshow;
