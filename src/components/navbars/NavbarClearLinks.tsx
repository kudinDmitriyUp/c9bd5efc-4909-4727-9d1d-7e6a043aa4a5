"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import useMenuDialog from "@/components/kit/useMenuDialog";
import { useKitMotion } from "@/components/kit/kitMotion";
import StaggerLabel from "@/components/kit/StaggerLabel";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type NavItem = { name: string; href: string };
type Button = { text: string; href: string };

type NavbarClearLinksProps = {
  brand?: string;
  navItems?: NavItem[];
  primaryButton?: Button;
  menuText?: string;
  closeText?: string;
  introDelay?: number;
  overLimit?: number;
  overTone?: "page" | "light";
  glass?: boolean;
  steady?: boolean;
  className?: string;
};

const NavbarClearLinks = ({
  brand = "Meridian 220",
  navItems = [
    { name: "Residences", href: "#services" },
    { name: "Architecture", href: "#about" },
    { name: "Gallery", href: "#gallery" },
    { name: "Availability", href: "#pricing" },
  ],
  primaryButton = { text: "Inquire", href: "#contact" },
  menuText = "Menu",
  closeText = "Close",
  introDelay = 0,
  overLimit = 0.8,
  overTone = "page",
  glass = false,
  steady = false,
  className,
}: NavbarClearLinksProps) => {
  const reduce = useReducedMotion();
  const { ease, base, slow } = useKitMotion();
  const [open, setOpen] = useState(false);
  const links = navItems.length > 0;
  const barRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  useMenuDialog(open, panelRef, () => setOpen(false));

  useMotionValueEvent(scrollY, "change", (value) => {
    const bar = barRef.current;
    if (!bar) return;
    const limit = window.innerHeight * overLimit;
    const over = value < limit ? "true" : "false";
    if (bar.dataset.over !== over) bar.dataset.over = over;
    const previous = scrollY.getPrevious() ?? value;
    if (Math.abs(value - previous) < 4) return;
    const hide = value > previous && value > limit + window.innerHeight * 0.4 ? "true" : "false";
    if (bar.dataset.hide !== hide) bar.dataset.hide = hide;
  });

  return (
    <>
      <motion.header
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: slow, ease, delay: reduce ? 0 : introDelay + 2.2 }}
        className={cn("fixed inset-x-0 top-0 z-50", className)}
      >
        <div
          ref={barRef}
          data-over="true"
          data-hide="false"
          className={cn(
            "group border-b border-border bg-background text-foreground transition-[translate,background-color,border-color,color,backdrop-filter] duration-500 ease-[var(--ease-out)] data-[hide=true]:-translate-y-full data-[over=true]:border-transparent data-[over=true]:bg-transparent",
            glass && "border-foreground/[0.08] bg-background/65 backdrop-blur-xl backdrop-saturate-150 data-[over=true]:backdrop-blur-none data-[over=true]:backdrop-saturate-100",
            overTone === "light" ? "data-[over=true]:[--foreground:white]" : "data-[over=true]:[--foreground:var(--background)]",
          )}
        >
          <nav aria-label="Main" className={cn("mx-auto flex h-[4.5rem] w-[var(--container)] items-center justify-between gap-4 transition-[height] duration-500 ease-[var(--ease-out)] lg:h-[5.25rem]", !steady && "group-data-[over=false]:h-[3.5rem] lg:group-data-[over=false]:h-[4rem]")}>
            <a href="#" className={cn("origin-left whitespace-nowrap text-[length:calc(var(--text-body-lg)*1.15)] leading-none tracking-[var(--heading-tracking)] transition-transform duration-500 ease-[var(--ease-out)] [font-family:var(--font-heading)] [font-weight:var(--heading-weight)]", !steady && "group-data-[over=false]:scale-[0.88]")}>
              {brand}
            </a>

            {links && (
              <ul className="hidden items-center gap-8 min-[94.5rem]:flex">
                {navItems.map((item, i) => (
                  <li key={`${i}-${item.href}`}>
                    <a href={item.href} className="text-[length:var(--text-small)] font-medium opacity-80 transition-opacity duration-300 hover:opacity-100">
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-3">
              {primaryButton && (
                <a
                  href={primaryButton.href}
                  aria-label={primaryButton.text}
                  className={cn(
                    "btn-primary min-h-[2.5rem] px-[1.125rem]",
                    !steady && "group-data-[over=false]:min-h-[2.25rem] group-data-[over=false]:px-[1rem] group-data-[over=false]:text-[length:var(--text-small)]",
                    overTone === "light" ? "group-data-[over=true]:[--primary:white] group-data-[over=true]:[--primary-foreground:black]" : "group-data-[over=true]:[--primary:var(--background)] group-data-[over=true]:[--primary-foreground:var(--deep)]",
                    links ? "hidden lg:inline-flex" : "inline-flex",
                  )}
                >
                  <StaggerLabel text={primaryButton.text} />
                </a>
              )}
              {links && (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={open ? closeText : menuText}
                  onClick={() => setOpen((value) => !value)}
                  className={cn(
                    "flex min-h-[2.75rem] items-center gap-3 lg:min-h-[2.5rem] lg:rounded-[var(--radius-button)] lg:border lg:border-[color-mix(in_srgb,currentColor_35%,transparent)] lg:px-[1rem] min-[94.5rem]:hidden",
                    !steady && "lg:group-data-[over=false]:min-h-[2.25rem]",
                  )}
                >
                  <p className="text-[length:var(--text-small)] font-medium leading-none">{open ? closeText : menuText}</p>
                  <div aria-hidden="true" className="relative h-[0.875rem] w-[1.5rem]">
                    <div className={`absolute left-0 h-px w-full bg-current transition-[top,rotate] duration-300 ${open ? "top-1/2 rotate-[24deg]" : "top-[calc(50%-0.25rem)]"}`} />
                    <div className={`absolute left-0 h-px w-full bg-current transition-[top,rotate] duration-300 ${open ? "top-1/2 -rotate-[24deg]" : "top-[calc(50%+0.1875rem)]"}`} />
                  </div>
                </button>
              )}
            </div>
          </nav>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: base, ease }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-black/40 min-[94.5rem]:hidden"
          />
        )}
        {open && (
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={menuText}
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: "0%" }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: base * 1.2, ease }}
            className="fixed inset-y-0 right-0 z-[70] flex w-[min(100%,34rem)] flex-col overflow-y-auto bg-background px-[var(--gutter)] pb-[2rem] text-foreground min-[94.5rem]:hidden"
          >
            <div className="flex h-[4.5rem] shrink-0 items-center justify-between">
              <p className="truncate text-[length:var(--text-body-lg)] [font-family:var(--font-heading)]">{brand}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label={closeText} className="flex min-h-[2.75rem] items-center gap-3">
                <p className="text-[length:var(--text-small)] font-medium leading-none">{closeText}</p>
                <div aria-hidden="true" className="relative h-[0.875rem] w-[1.5rem]">
                  <div className="absolute left-0 top-1/2 h-px w-full rotate-[24deg] bg-current" />
                  <div className="absolute left-0 top-1/2 h-px w-full -rotate-[24deg] bg-current" />
                </div>
              </button>
            </div>

            <ul className="mt-[clamp(2rem,8vh,4.5rem)] flex flex-col gap-[0.75rem]">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`} className="overflow-hidden pb-[0.15em] -mb-[0.15em]">
                  <motion.div initial={reduce ? false : { y: "105%" }} animate={{ y: "0%" }} transition={{ duration: base, ease, delay: 0.2 + i * 0.06 }}>
                    <a
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block text-[length:var(--text-h2)] leading-[1.1] tracking-[var(--heading-tracking)] [font-family:var(--font-heading)] [overflow-wrap:anywhere] transition-colors duration-300 hover:text-muted-foreground"
                    >
                      {item.name}
                    </a>
                  </motion.div>
                </li>
              ))}
            </ul>

            {primaryButton && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: base, ease, delay: 0.3 + navItems.length * 0.06 }}
                className="mt-auto pt-[2.5rem]"
              >
                <a href={primaryButton.href} aria-label={primaryButton.text} onClick={() => setOpen(false)} className="btn-primary w-full">
                  <StaggerLabel text={primaryButton.text} />
                </a>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarClearLinks;
