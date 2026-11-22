"use client";

import { useState, type ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Media from "@/components/kit/Media";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface FlipCardGridItem {
  src?: string;
  alt?: string;
  title: string;
  text?: string;
}

interface FlipCardGridProps {
  items?: FlipCardGridItem[];
  axis?: "x" | "y";
  className?: string;
  cardClassName?: string;
  itemClassName?: string;
  backClassName?: string;
  hoverFlip?: boolean;
  renderFront?: (item: FlipCardGridItem, index: number, open: boolean) => ReactNode;
  renderBack?: (item: FlipCardGridItem, index: number, open: boolean) => ReactNode;
}

const DEFAULT_ITEMS: FlipCardGridItem[] = [
  { id: 1179863, title: "Plan", text: "We listen first and map out the work together." },
  { id: 10499488, title: "Build", text: "Careful craft, checked at every step." },
  { id: 3184465, title: "Launch", text: "Delivered on time and ready to use." },
  { id: 1640777, title: "Support", text: "We stay with you after the job is done." },
  { id: 2079249, title: "Grow", text: "Small improvements that add up over time." },
  { id: 323780, title: "Review", text: "Honest feedback, every single month." },
].map(({ id, ...rest }) => ({ ...rest, src: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200` }));

const FlipCardGrid = ({ items = DEFAULT_ITEMS, axis = "y", className, cardClassName, itemClassName, backClassName, hoverFlip: hover = true, renderFront, renderBack }: FlipCardGridProps) => {
  const [open, setOpen] = useState<number | null>(null);
  const flip = axis === "y" ? "[transform:rotateY(180deg)]" : "[transform:rotateX(180deg)]";
  const hoverFlip = axis === "y" ? "group-hover:[transform:rotateY(180deg)]" : "group-hover:[transform:rotateX(180deg)]";

  return (
    <div className={cn("grid w-full grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4", className)}>
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          aria-pressed={open === i}
          onClick={() => setOpen((current) => (current === i ? null : i))}
          className={cn("group relative aspect-[3/4] w-full text-left [perspective:1200px]", itemClassName)}
        >
          <div
            className={cn(
              "relative size-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] motion-reduce:duration-0",
              hover && hoverFlip,
              open === i && flip,
            )}
            style={{ transitionDelay: `${(i % 4) * 30}ms` }}
          >
            <div className={cn("absolute inset-0 overflow-hidden rounded-[var(--radius,1rem)] bg-muted [backface-visibility:hidden]", cardClassName)}>
              {renderFront ? renderFront(item, i, open === i) : (
                <>
                  {item.src && <Media src={item.src} alt={item.alt ?? ""} loading="lazy" decoding="async" draggable={false} className="size-full object-cover" />}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent p-4">
                    <p className="text-base font-medium text-foreground md:text-lg">{item.title}</p>
                  </div>
                </>
              )}
            </div>
            <div
              className={cn(
                "absolute inset-0 flex flex-col justify-end gap-2 rounded-[var(--radius,1rem)] bg-primary p-4 text-primary-foreground [backface-visibility:hidden] md:p-6",
                flip,
                cardClassName,
                backClassName,
              )}
            >
              {renderBack ? renderBack(item, i, open === i) : (
                <>
                  <p className="text-lg font-semibold leading-tight md:text-2xl">{item.title}</p>
                  {item.text && <p className="text-sm leading-snug opacity-80 md:text-base">{item.text}</p>}
                </>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default FlipCardGrid;
