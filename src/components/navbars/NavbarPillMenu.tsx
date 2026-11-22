"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { backOut } from "@/components/animation/PopWords";
import useMenuDialog from "@/components/kit/useMenuDialog";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type NavbarPillMenuProps = {
  brand: string;
  brandHref?: string;
  navItems: { name: string; href: string }[];
  cta?: { text: string; href: string };
  menuLabel?: string;
  closeLabel?: string;
  note?: string;
  className?: string;
};

const Roll = ({ text }: { text: string }) => (
  <div className="relative overflow-hidden">
    <div className="transition-transform duration-300 group-hover:-translate-y-full">{text}</div>
    <div aria-hidden="true" className="absolute inset-x-0 top-full transition-transform duration-300 group-hover:-translate-y-full">
      {text}
    </div>
  </div>
);

const NavbarPillMenu = ({ brand, brandHref = "#", navItems, cta, menuLabel = "Menu", closeLabel = "Close", note, className }: NavbarPillMenuProps) => {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const last = useRef(0);
  const [shown, setShown] = useState(true);
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  const probe = () => {
    const line = window.innerHeight * 0.05;
    setLight(
      Array.from(document.querySelectorAll('[data-nav-theme="light"]')).some((el) => {
        const box = el.getBoundingClientRect();
        return box.top <= line && box.bottom >= line;
      })
    );
  };

  useEffect(() => {
    probe();
    window.addEventListener("resize", probe);
    return () => window.removeEventListener("resize", probe);
  }, []);

  useMotionValueEvent(scrollY, "change", (v) => {
    const delta = v - last.current;
    last.current = v;
    probe();
    if (v < 10 || delta < -6) setShown(true);
    else if (delta > 6 && !open) setShown(false);
  });

  useMenuDialog(open, panelRef, () => setOpen(false), false);

  const bar = { duration: 0.35, ease: [0.77, 0, 0.175, 1] as [number, number, number, number] };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.215, 0.61, 0.355, 1] }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[998] bg-primary/30 backdrop-blur-md"
          />
        )}
      </AnimatePresence>

      <motion.header
        initial={false}
        animate={{ y: shown || open ? 0 : "calc(-100% - 12px)" }}
        transition={{ duration: 0.35, ease: [0.165, 0.84, 0.44, 1] }}
        className={cn("fixed inset-x-0 top-0 z-[999] py-[clamp(0.75rem,1vw,1.25rem)]", className)}
      >
        <div className="mx-auto flex w-[var(--container)] items-center justify-between gap-[var(--gap)]">
          <a
            href={brandHref}
            className="min-w-0 whitespace-nowrap px-[0.1em] py-[0.05em] font-[family-name:var(--font-display,var(--font-heading))] text-[length:clamp(2.25rem,4vw,3.75rem)] leading-[1] uppercase text-primary transition-transform duration-300 hover:scale-105 [-webkit-text-stroke:calc(var(--title-stroke,0em)*2.4)_var(--title-stroke-color,transparent)] [paint-order:stroke_fill]"
          >
            {brand}
          </a>

          <div className="relative flex shrink-0 items-center gap-[clamp(0.4rem,0.6vw,0.75rem)]">
            {cta && (
              <a href={cta.href} className="btn-primary group min-h-0 px-[1.1em] py-[0.3em] text-[length:1.5rem] max-sm:hidden">
                <Roll text={cta.text} />
              </a>
            )}
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "btn-secondary group min-h-0 px-[0.9em] py-[0.3em] text-[length:1.5rem] transition-colors duration-300",
                open
                  ? "bg-primary text-primary-foreground shadow-none hover:bg-primary hover:text-primary-foreground"
                  : light
                    ? "bg-transparent text-deep-foreground shadow-[inset_0_0_0_clamp(1.5px,0.15vw,2px)_color-mix(in_srgb,var(--deep-foreground)_20%,transparent)]"
                    : "bg-background/70 text-foreground"
              )}
            >
              <Roll text={open ? closeLabel : menuLabel} />
              <div aria-hidden="true" className="relative ml-[0.15em] h-[0.6em] w-[0.75em]">
                <motion.div animate={open ? { top: "50%", rotate: 45 } : { top: "0%", rotate: 0 }} transition={bar} className="absolute left-0 h-[2px] w-full -translate-y-1/2 rounded-full bg-current" />
                <motion.div animate={open ? { scaleX: 0 } : { scaleX: 1 }} transition={bar} className="absolute left-0 top-1/2 h-[2px] w-[70%] origin-left -translate-y-1/2 rounded-full bg-current" />
                <motion.div animate={open ? { top: "50%", rotate: -45 } : { top: "100%", rotate: 0 }} transition={bar} className="absolute left-0 h-[2px] w-full -translate-y-1/2 rounded-full bg-current" />
              </div>
            </button>

            <AnimatePresence>
              {open && (
                <motion.nav
                  key="menu"
                  ref={panelRef}
                  aria-label="Main"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.3 }}
                  transition={{ duration: 0.5, ease: backOut(2.5), opacity: { duration: 0.2 } }}
                  className="absolute right-0 top-[calc(100%+0.75rem)] w-[clamp(15rem,18vw,21rem)] origin-top-right rounded-[var(--radius-card)] bg-primary p-[clamp(1.25rem,2vw,2rem)] text-primary-foreground shadow-[0_1vw_3vw_color-mix(in_srgb,var(--foreground)_25%,transparent)]"
                >
                  <ul className="flex flex-col gap-[0.3em]">
                    {navItems.map((item, i) => (
                      <motion.li
                        key={i}
                        initial={reduce ? false : { opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.38, ease: [0.165, 0.84, 0.44, 1], delay: 0.14 + i * 0.06 }}
                      >
                        <a
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="inline-block origin-left font-[family-name:var(--font-display,var(--font-heading))] text-[length:clamp(1.75rem,2.4vw,2.4rem)] leading-[1] uppercase transition-transform duration-300 hover:scale-105 [overflow-wrap:anywhere]"
                        >
                          {item.name}
                        </a>
                      </motion.li>
                    ))}
                  </ul>
                  {note && (
                    <p className="mt-[1.25em] border-t border-primary-foreground/20 pt-[0.9em] text-[length:1.2rem] font-bold uppercase leading-[1.2] tracking-[var(--label-tracking)] text-primary-foreground">{note}</p>
                  )}
                </motion.nav>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.header>
    </>
  );
};

export default NavbarPillMenu;
