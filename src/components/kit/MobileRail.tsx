"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

// eslint-disable-next-line react-refresh/only-export-components
export const useMobileRail = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps", duration: 30, breakpoints: { "(min-width: 880px)": { active: false } } });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    sync();
    emblaApi.on("select", sync).on("reInit", sync);
    return () => {
      emblaApi.off("select", sync).off("reInit", sync);
    };
  }, [emblaApi, sync]);

  return { emblaRef, prev: () => emblaApi?.scrollPrev(), next: () => emblaApi?.scrollNext(), canPrev, canNext };
};

type RailArrowsProps = { rail: ReturnType<typeof useMobileRail>; label?: string };

const RailArrows = ({ rail, label = "item" }: RailArrowsProps) => (
  <div className="flex items-center justify-end gap-4 pb-4 lg:hidden">
    <button type="button" aria-label={`Previous ${label}`} disabled={!rail.canPrev} onClick={rail.prev} className="cursor-pointer transition-opacity duration-300 disabled:cursor-default disabled:opacity-24">
      <ArrowLeft className="size-6" strokeWidth={1.25} />
    </button>
    <button type="button" aria-label={`Next ${label}`} disabled={!rail.canNext} onClick={rail.next} className="cursor-pointer transition-opacity duration-300 disabled:cursor-default disabled:opacity-24">
      <ArrowRight className="size-6" strokeWidth={1.25} />
    </button>
  </div>
);

export default RailArrows;
