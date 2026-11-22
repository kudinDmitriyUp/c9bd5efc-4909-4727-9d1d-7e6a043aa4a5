"use client";

import { useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";
import ScrambleLabel from "@/components/kit/ScrambleLabel";

type NavItem = { name: string; href: string };

type NavbarPixelBarProps = {
  brand?: string;
  navItems?: NavItem[];
  menuText?: string;
  closeText?: string;
};

const EASE = [0.19, 1, 0.22, 1] as const;

const NavbarPixelBar = ({
  brand = "Northvane",
  navItems = [
    { name: "About", href: "#about" },
    { name: "Portfolio", href: "#gallery" },
    { name: "Team", href: "#team" },
    { name: "Contact", href: "#contact" },
  ],
  menuText = "Menu",
  closeText = "Close",
}: NavbarPixelBarProps) => {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const offset = useMotionValue(0);
  const hiddenRef = useRef(false);
  useMenuDialog(open, panelRef, () => setOpen(false));

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    const hide = y > prev && y > 120 && !open;
    if (hide === hiddenRef.current) return;
    hiddenRef.current = hide;
    animate(offset, hide ? -120 : 0, { duration: reduce ? 0 : 0.7, ease: EASE });
  });

  return (
    <>
      <motion.nav
        aria-label="Main"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
        style={{ y: offset }}
        className="fixed inset-x-0 top-[0.75rem] z-50 flex justify-center px-[3rem] lg:px-[var(--gutter)]"
      >
        <div ref={panelRef} className="w-full max-w-[24rem] overflow-hidden rounded-[var(--radius)] bg-card text-card-foreground">
          <div className="relative flex h-[2.5rem] items-center justify-between px-[0.75rem]">
            <a href="#" className="min-w-0 truncate text-[length:var(--text-body)] uppercase leading-none tracking-[-0.04em] pb-[0.2em] -mb-[0.2em]">
              {brand}
            </a>
            <div aria-hidden="true" className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-[0.125rem]">
              {Array.from({ length: 5 }, (_, i) => (
                <motion.div
                  key={i}
                  animate={open && !reduce ? { opacity: [1, 0.2, 1] } : { opacity: 1 }}
                  transition={open && !reduce ? { duration: 0.6, repeat: Infinity, delay: i * 0.12, ease: "linear" } : { duration: 0.2 }}
                  className="size-[0.25rem] bg-accent"
                />
              ))}
            </div>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-full items-center text-[length:var(--text-label)] font-medium uppercase leading-none tracking-[var(--label-tracking)] transition-colors duration-300 hover:text-accent"
            >
              <p>{open ? closeText : menuText}</p>
            </button>
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="panel"
                role="dialog"
                aria-label={menuText}
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
              >
                <ul className="flex flex-col px-[0.75rem] pb-[0.75rem] pt-[0.5rem]">
                  {navItems.map((item, i) => (
                    <li key={`${i}-${item.href}`} className="relative">
                      <motion.div
                        aria-hidden="true"
                        initial={reduce ? false : { scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.9, ease: EASE, delay: 0.05 * i }}
                        className="absolute inset-x-0 top-0 h-px origin-left bg-border"
                      />
                      <a href={item.href} onClick={() => setOpen(false)} className="flex items-baseline justify-between gap-[1rem] py-[0.75rem] transition-colors duration-300 hover:text-accent">
                        <div className="overflow-hidden pb-[0.15em] -mb-[0.15em]">
                          <motion.p
                            initial={reduce ? false : { y: "100%" }}
                            animate={{ y: "0%" }}
                            transition={{ duration: 0.7, ease: EASE, delay: 0.1 + 0.05 * i }}
                            className="text-[length:var(--text-h1)] uppercase leading-[0.92] tracking-[-0.04em] [overflow-wrap:anywhere]"
                          >
                            {item.name}
                          </motion.p>
                        </div>
                        <ScrambleLabel
                          text={String(i + 1).padStart(2, "0")}
                          chars=" .:*+<>/oO#"
                          duration={0.5}
                          delay={0.15 + 0.05 * i}
                          className="shrink-0 tabular-nums text-[length:var(--text-label)] uppercase leading-none tracking-[var(--label-tracking)] text-accent"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>
    </>
  );
};

export default NavbarPixelBar;
