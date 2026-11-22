"use client";

import { useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";
import { useKitMotion } from "@/components/kit/kitMotion";

type NavItem = { name: string; href: string };
type Button = { text: string; href: string };

type NavbarSerifPillProps = {
  brand?: string;
  brandNote?: string;
  navItems?: NavItem[];
  button?: Button;
  menuText?: string;
  closeText?: string;
};

const NavbarSerifPill = ({
  brand = "Maison Arden",
  brandNote = "Paris",
  navItems = [
    { name: "Collections", href: "#gallery" },
    { name: "Atelier", href: "#about" },
    { name: "Bespoke", href: "#product" },
    { name: "Journal", href: "#blog" },
  ],
  button = { text: "Book a visit", href: "#contact" },
  menuText = "Menu",
  closeText = "Close",
}: NavbarSerifPillProps) => {
  const reduce = useReducedMotion();
  const { ease } = useKitMotion();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useMenuDialog(open, panelRef, () => setOpen(false));

  const { scrollY } = useScroll();
  const shift = useMotionValue(0);
  const hidden = useRef(false);
  const last = useRef(0);

  useMotionValueEvent(scrollY, "change", (value) => {
    const delta = value - last.current;
    last.current = value;
    if (Math.abs(delta) < 4) return;
    const hide = !reduce && value > 160 && delta > 0;
    if (hide === hidden.current) return;
    hidden.current = hide;
    animate(shift, hide ? -110 : 0, { duration: 0.6, ease });
  });

  const y = useTransform(shift, (value) => `${value}%`);

  return (
    <>
      <motion.nav
        aria-label="Main"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease, delay: 0.2 }}
        style={{ y }}
        className="fixed inset-x-0 top-0 z-50 will-change-transform"
      >
        <div className="relative mx-auto flex h-[4.5rem] w-[var(--container)] items-center justify-between gap-[clamp(0.75rem,1.6vw,1.5rem)] lg:h-[6rem]">
          <a href="#" className="flex min-w-0 items-baseline gap-[0.625rem] text-foreground">
            <p className="truncate text-[length:var(--text-body-lg)] font-light uppercase leading-none tracking-[0.04em] lg:text-[length:calc(var(--text-body-lg)*1.35)] pb-[0.2em] -mb-[0.2em]">{brand}</p>
            {brandNote && <p className="hidden whitespace-nowrap text-[length:var(--text-small)] font-light uppercase leading-none tracking-[0.04em] text-muted-foreground sm:block">{brandNote}</p>}
          </a>

          <div className="flex shrink-0 items-center gap-[clamp(1rem,2.4vw,2.5rem)]">
            {navItems.length > 0 && (
              <ul className="hidden items-center gap-[clamp(1rem,2vw,2rem)] lg:flex">
                {navItems.map((item, i) => (
                  <li key={`${i}-${item.href}`}>
                    <a href={item.href} className="whitespace-nowrap text-[length:var(--text-body)] font-normal leading-none text-foreground transition-colors duration-500 hover:text-accent">
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {button && (
              <a href={button.href} className={`btn-secondary min-h-[2.75rem] py-[0.25rem] pl-[1.125rem] pr-[0.25rem] after:size-[2.125rem] ${navItems.length > 0 ? "hidden lg:inline-flex" : "inline-flex"}`}>
                <p className="btn-label">{button.text}</p>
              </a>
            )}
            {navItems.length > 0 && (
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? closeText : menuText}
              onClick={() => setOpen((value) => !value)}
              className="flex size-[2.75rem] flex-col items-center justify-center gap-[0.3rem] rounded-full text-foreground shadow-[inset_0_0_0_1px_color-mix(in_srgb,currentColor_45%,transparent)] lg:hidden"
            >
              <div aria-hidden="true" className="h-px w-[1rem] bg-current" />
              <div aria-hidden="true" className="h-px w-[1rem] bg-current" />
            </button>
            )}
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={menuText}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: "-3vh" }}
            animate={{ opacity: 1, y: "0vh" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: "-3vh" }}
            transition={{ duration: 0.7, ease }}
            className="fixed inset-0 z-[70] flex flex-col bg-background [background-image:var(--backdrop-light)] text-foreground lg:hidden"
          >
            <div className="mx-auto flex h-[4.5rem] w-[var(--container)] shrink-0 items-center justify-between">
              <p className="truncate text-[length:var(--text-body-lg)] font-light uppercase leading-none tracking-[0.04em] pb-[0.2em] -mb-[0.2em]">{brand}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={closeText}
                className="flex size-[2.75rem] items-center justify-center rounded-full shadow-[inset_0_0_0_1px_color-mix(in_srgb,currentColor_45%,transparent)]"
              >
                <div aria-hidden="true" className="relative size-[1rem]">
                  <div className="absolute left-0 top-1/2 h-px w-full rotate-45 bg-current" />
                  <div className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-current" />
                </div>
              </button>
            </div>
            <motion.div
              aria-hidden="true"
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.4, ease }}
              className="mx-auto h-px w-[var(--container)] origin-center bg-foreground/20"
            />
            <ul className="mx-auto mt-[clamp(2rem,8svh,4rem)] flex w-[var(--container)] flex-col gap-[0.75rem] overflow-y-auto">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`} className="-mb-[0.12em] overflow-hidden pb-[0.12em]">
                  <motion.a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    initial={reduce ? false : { y: "105%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 1.1, ease, delay: 0.15 + i * 0.07 }}
                    className="block font-serif text-[length:var(--text-h1)] leading-[1] [overflow-wrap:anywhere]"
                  >
                    {item.name}
                  </motion.a>
                </li>
              ))}
            </ul>
            {button && (
              <div className="mx-auto mt-auto w-[var(--container)] pb-[max(var(--gutter),env(safe-area-inset-bottom))] pt-[2rem]">
                <a href={button.href} onClick={() => setOpen(false)} className="btn-primary w-full justify-between">
                  <p className="btn-label">{button.text}</p>
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarSerifPill;
