"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";

type NavItem = { name: string; href: string };
type Button = { text: string; href: string };

type NavbarFloatingBarProps = {
  brand?: string;
  navItems?: NavItem[];
  button?: Button;
  menuText?: string;
  closeText?: string;
};

const SINE_OUT = [0.39, 0.575, 0.565, 1] as const;

const NavbarFloatingBar = ({
  brand = "Studio",
  navItems = [
    { name: "Home", href: "#hero" },
    { name: "About", href: "#about" },
    { name: "Reviews", href: "#testimonial" },
    { name: "FAQ", href: "#faq" },
  ],
  button = { text: "Shop now", href: "#contact" },
  menuText = "Menu",
  closeText = "Close",
}: NavbarFloatingBarProps) => {
  const reduce = useReducedMotion();
  const [intro, setIntro] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(navItems[0]?.href);
  const panelRef = useRef<HTMLDivElement>(null);
  useMenuDialog(open, panelRef, () => setOpen(false));

  useEffect(() => {
    const onIntro = () => setIntro(true);
    window.addEventListener("kit:intro", onIntro);
    const fallback = window.setTimeout(onIntro, 4500);
    return () => {
      window.removeEventListener("kit:intro", onIntro);
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <motion.nav
      aria-label="Main"
      initial={reduce ? false : { opacity: 0, y: "-100%" }}
      animate={intro || reduce ? { opacity: 1, y: "0%" } : undefined}
      transition={{ duration: 0.75, ease: SINE_OUT, delay: 0.5 }}
      className="fixed inset-x-0 top-[1.25rem] z-50 mx-auto w-[var(--container)] lg:top-[2.5svh]"
    >
      <div className="relative grid h-[3rem] grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line text-secondary-foreground lg:h-[3.5rem] min-[94.5rem]:grid-cols-4">
        <a href="#" className="relative flex min-w-0 items-center gap-[0.625rem] bg-secondary px-[clamp(0.75rem,1.5vw,1.5rem)]">
          <div aria-hidden="true" className="absolute left-1.5 top-1.5 size-1.5 border-l border-t border-foreground/40" />
          <div aria-hidden="true" className="absolute bottom-1.5 left-1.5 size-1.5 border-b border-l border-foreground/40" />
          <div aria-hidden="true" className="grid shrink-0 grid-cols-2 gap-[2px]">
            <div className="size-[3px] bg-accent" />
            <div className="size-[3px] bg-accent" />
            <div className="size-[3px] bg-accent" />
            <div className="size-[3px] bg-accent" />
          </div>
          <p className="truncate text-[length:var(--text-body)] uppercase leading-none [font-family:var(--font-heading)] [font-weight:var(--heading-weight)] pb-[0.2em] -mb-[0.2em]">{brand}</p>
        </a>

        {navItems.length > 0 && (
          <>
            <ul className="hidden min-w-0 items-center justify-center gap-[clamp(0.125rem,0.5vw,0.5rem)] bg-secondary px-[clamp(0.5rem,1vw,1rem)] min-[94.5rem]:col-span-2 min-[94.5rem]:flex">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`}>
                  <a
                    href={item.href}
                    aria-current={current === item.href ? "location" : undefined}
                    onClick={() => setCurrent(item.href)}
                    className="group relative flex h-[2rem] items-center whitespace-nowrap px-[clamp(0.375rem,0.6vw,0.625rem)] text-[length:var(--text-body)] leading-none"
                  >
                    <div aria-hidden="true" className={`absolute left-0 top-0 size-2 border-l border-t border-accent transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100 group-focus-visible:opacity-100 ${current === item.href ? "opacity-100" : "opacity-0"}`} />
                    <div aria-hidden="true" className={`absolute bottom-0 right-0 size-2 border-b border-r border-accent transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100 group-focus-visible:opacity-100 ${current === item.href ? "opacity-100" : "opacity-0"}`} />
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="flex min-w-0 items-stretch justify-end gap-[0.375rem] bg-secondary p-[0.375rem] min-[94.5rem]:col-start-4">
          {button && (
            <a href={button.href} className="btn-primary h-full min-h-0 flex-1 justify-center px-[clamp(0.75rem,1vw,1.125rem)] py-0 lg:flex-none min-[94.5rem]:w-full">
              <p className="btn-label">{button.text}</p>
            </a>
          )}
          {navItems.length > 0 && (
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? closeText : menuText}
              onClick={() => setOpen((value) => !value)}
              className="relative flex aspect-square h-full items-center justify-center rounded-[var(--radius)] bg-foreground text-background min-[94.5rem]:hidden"
            >
              <div aria-hidden="true" className={`absolute h-px w-[1rem] bg-current transition-transform duration-[var(--dur-fast)] ${open ? "rotate-45" : "-translate-y-[0.2rem]"}`} />
              <div aria-hidden="true" className={`absolute h-px w-[1rem] bg-current transition-transform duration-[var(--dur-fast)] ${open ? "-rotate-45" : "translate-y-[0.2rem]"}`} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 -z-10 min-[94.5rem]:hidden"
          />
        )}
        {open && (
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={menuText}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: "-1rem" }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: "-1rem" }}
            transition={{ duration: 0.4, ease: SINE_OUT }}
            className="kit-card absolute inset-x-0 top-full mt-[0.5rem] flex max-h-[calc(100svh-6rem)] flex-col gap-[1.5rem] overflow-y-auto p-[clamp(1.25rem,2.5vw,2.25rem)] backdrop-blur-md lg:left-auto lg:w-[22rem] lg:p-[1.25rem] min-[94.5rem]:hidden"
          >
            <ul className="flex flex-col">
              {navItems.map((item, i) => (
                <motion.li
                  key={`${i}-${item.href}`}
                  initial={reduce ? false : { opacity: 0, y: "2.5vh" }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.75, ease: SINE_OUT, delay: 0.05 + i * 0.05 }}
                  className="border-b border-line first:border-t"
                >
                  <a
                    href={item.href}
                    onClick={() => {
                      setCurrent(item.href);
                      setOpen(false);
                    }}
                    className="flex items-baseline justify-between gap-[1rem] py-[0.625rem]"
                  >
                    <p className="min-w-0 text-[length:var(--text-h2)] uppercase leading-[1] lg:text-[length:var(--text-h3)] [font-family:var(--font-heading)] [font-weight:var(--heading-weight)] [overflow-wrap:anywhere]">{item.name}</p>
                    <p className="shrink-0 font-mono text-[length:var(--text-small)] leading-none text-muted-foreground">{String(i + 1).padStart(2, "0")}</p>
                  </a>
                </motion.li>
              ))}
            </ul>
            {button && (
              <a href={button.href} onClick={() => setOpen(false)} className="btn-primary w-full lg:hidden">
                <p className="btn-label">{button.text}</p>
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default NavbarFloatingBar;
