"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface AccordionProps {
  items: { title: string; content: string; meta?: string }[];
  variant?: "card" | "hairline";
  className?: string;
}

const Accordion = ({ items, variant = "card", className = "" }: AccordionProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (variant === "hairline") {
    return (
      <div className={cn("flex flex-col border-b border-foreground/15", className)}>
        {items.map((item, index) => {
          const open = activeIndex === index;
          return (
            <div
              key={index}
              className="group cursor-pointer select-none border-t border-foreground/15 px-0 py-5 transition-[background-color,padding] duration-300 hover:bg-card hover:px-4"
            >
              <h3 className="font-sans text-base md:text-lg font-normal leading-snug">
                <button type="button" aria-expanded={open} onClick={() => setActiveIndex(open ? null : index)} className="flex w-full cursor-pointer items-center justify-between gap-4 text-left">
                  <div>{item.title}</div>
                  <div className="flex shrink-0 items-center gap-4">
                    {item.meta && <div className="text-sm uppercase tracking-[0.04em]">{item.meta}</div>}
                    <Plus
                      className={cn("size-4 md:size-5 text-current transition-transform duration-300", open && "rotate-45")}
                      strokeWidth={1.5}
                    />
                  </div>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <p className="pt-3 max-w-2xl text-base leading-snug">{item.content}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3 xl:gap-3.5 2xl:gap-4", className)}>
      {items.map((item, index) => (
        <div
          key={index}
          onClick={() => setActiveIndex(activeIndex === index ? null : index)}
          className="p-3 xl:p-3.5 2xl:p-4 rounded card cursor-pointer select-none"
        >
          <div className="flex items-center justify-between gap-3 xl:gap-3.5 2xl:gap-4">
            <h3 className="text-lg md:text-xl font-medium leading-snug">{item.title}</h3>
            <div className="flex shrink-0 items-center justify-center size-8 md:size-9 rounded bg-primary text-primary-foreground">
              <Plus
                className={cn(
                  "size-3.5 md:size-4 text-primary-foreground transition-transform duration-300",
                  activeIndex === index && "rotate-45"
                )}
                strokeWidth={2}
              />
            </div>
          </div>
          <AnimatePresence initial={false}>
            {activeIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <p className="pt-1 text-base leading-snug">{item.content}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

export default Accordion;
