"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Media from "@/components/kit/Media";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface InfiniteDomeGridImage {
  src: string;
  alt?: string;
  caption?: string;
}

interface InfiniteDomeGridProps {
  images?: (string | InfiniteDomeGridImage)[];
  columns?: number;
  curve?: number;
  ariaLabel?: string;
  className?: string;
  tileClassName?: string;
  captionClassName?: string;
  captionShadeClassName?: string;
  captionBadge?: ReactNode;
  nativeTiltBelow?: number;
}

type ViewTimelineCtor = new (options: { subject: Element }) => AnimationTimeline;

const pexels = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;

const defaultImages: InfiniteDomeGridImage[] = [1179863, 10499488, 3184465, 1640777, 2079249, 323780, 1571460, 3769138, 2253275, 1350789].map((id) => ({
  src: pexels(id),
  alt: "",
}));

const InfiniteDomeGrid = ({
  images: input = defaultImages,
  columns = 4,
  curve = 1,
  ariaLabel = "Image grid",
  className,
  tileClassName,
  captionClassName,
  captionShadeClassName,
  captionBadge,
  nativeTiltBelow,
}: InfiniteDomeGridProps) => {
  const images = input.map((image) => (typeof image === "string" ? { src: image } : image)).filter((image) => !!image.src);
  const stageRef = useRef<HTMLElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reduced = useReducedMotion();
  const [cols, setCols] = useState(columns);

  useEffect(() => {
    const mq = matchMedia("(min-width: 768px)");
    const update = () => setCols(mq.matches ? columns : Math.min(2, columns));
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [columns]);

  const safeCols = Math.max(1, cols);
  const rowCount = Math.max(6, Math.ceil(images.length / safeCols));
  const rows = Array.from({ length: rowCount }, (_, r) =>
    Array.from({ length: safeCols }, (_, c) => images.length ? images[(r * safeCols + c + r) % images.length] : null),
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || reduced) return;
    const rowEls = rowRefs.current.slice(0, rowCount).filter((el): el is HTMLDivElement => !!el);
    const ViewTimeline = (window as unknown as { ViewTimeline?: ViewTimelineCtor }).ViewTimeline;
    if (nativeTiltBelow !== undefined && ViewTimeline && window.innerWidth < nativeTiltBelow) {
      const tilt = 30 * Math.max(0.01, curve);
      stage.style.perspective = "none";
      stage.style.overflow = "clip";
      const anims = rowEls.map((el) =>
        el.animate(
          [
            { transform: `perspective(1100px) translateZ(0px) rotateX(${tilt}deg)` },
            { transform: "perspective(1100px) translateZ(-80px) rotateX(0deg)" },
            { transform: `perspective(1100px) translateZ(0px) rotateX(${-tilt}deg)` },
          ],
          { timeline: new ViewTimeline({ subject: el }), fill: "both", easing: "linear" },
        ),
      );
      return () => {
        anims.forEach((anim) => anim.cancel());
        stage.style.perspective = "";
        stage.style.overflow = "";
      };
    }
    let centers: number[] = [];
    let stageTop = 0;
    let stageHeight = 0;
    let vh = window.innerHeight;
    let frame = 0;

    const update = () => {
      frame = 0;
      const top = stageTop - window.scrollY;
      if (top > vh || top + stageHeight < 0) return;
      const half = vh / 2;
      const bend = (30 * Math.max(0.01, curve) * Math.PI) / 180;
      const edge = Math.cos(bend);
      const radius = half / bend;
      const limit = bend * 1.6;
      stage.style.perspectiveOrigin = `50% ${(half - top).toFixed(1)}px`;
      for (let i = 0; i < rowEls.length; i++) {
        const offset = top + centers[i] - half;
        const angle = Math.max(-limit, Math.min(limit, offset / radius));
        const y = radius * Math.sin(angle) - offset;
        const z = radius * (edge - Math.cos(angle));
        rowEls[i].style.transform = `translate3d(0, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${((angle * 180) / Math.PI).toFixed(2)}deg)`;
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const measure = () => {
      vh = window.innerHeight;
      stageTop = stage.getBoundingClientRect().top + window.scrollY;
      stageHeight = stage.offsetHeight;
      centers = rowEls.map((el) => el.offsetTop + el.offsetHeight / 2);
      update();
    };

    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(frame);
      stage.style.perspectiveOrigin = "";
      rowEls.forEach((el) => {
        el.style.transform = "";
      });
    };
  }, [reduced, rowCount, safeCols, curve, nativeTiltBelow]);

  return (
    <section
      ref={stageRef}
      aria-label={ariaLabel}
      className={cn("relative w-full overflow-hidden bg-background py-8 [perspective:1100px]", className)}
    >
      {rows.map((row, r) => (
        <div
          key={r}
          ref={(el) => {
            rowRefs.current[r] = el;
          }}
          className="mx-auto mb-3 grid w-[var(--container,min(100%_-_2rem,80rem))] gap-3 will-change-transform [backface-visibility:hidden]"
          style={{ gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))` }}
        >
          {row.map((image, c) =>
            image ? (
              <div key={c} className={cn("relative aspect-[4/5] overflow-hidden rounded-theme bg-card", tileClassName)}>
                <Media
                  src={image.src}
                  alt={image.alt ?? ""}
                  aria-hidden={!image.alt}
                  loading="eager"
                  decoding="async"
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {image.caption && (
                  <>
                    <div aria-hidden="true" className={cn("absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent", captionShadeClassName)} />
                    {captionBadge ? (
                      <div className={cn("absolute inset-x-3 bottom-3 flex items-center gap-2 text-sm text-white", captionClassName)}>
                        <p className="min-w-0 truncate">{image.caption}</p>
                        {captionBadge}
                      </div>
                    ) : (
                      <p className={cn("absolute inset-x-3 bottom-3 truncate text-sm text-white", captionClassName)}>{image.caption}</p>
                    )}
                  </>
                )}
              </div>
            ) : null,
          )}
        </div>
      ))}
    </section>
  );
};

export default InfiniteDomeGrid;
