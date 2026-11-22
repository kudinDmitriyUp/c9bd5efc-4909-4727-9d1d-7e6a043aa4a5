"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { Ellipsis, X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type NavItem = { name: string; href: string };
type Button = { text: string; href: string };

type NavbarPillCollapseProps = {
  brand: string;
  avatarSrc?: string;
  navItems: NavItem[];
  cta?: Button;
  menuText?: string;
  closeText?: string;
};

const NAV_SPRING = { type: "spring", duration: 0.6, bounce: 0 } as const;
const LINK_SPRING = { type: "spring", duration: 0.6, bounce: 0.2 } as const;

const NavbarPillCollapse = ({ brand, avatarSrc, navItems, cta, menuText = "Open menu", closeText = "Close menu" }: NavbarPillCollapseProps) => {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 880px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useMotionValueEvent(scrollY, "change", (value) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (value > previous && value > 80) {
      setCollapsed(true);
      setOpen(false);
    } else if (value < previous - 2) {
      setCollapsed(false);
    }
  });

  const expanded = desktop && (!collapsed || open);
  const glass = collapsed && !expanded;

  return (
    <>
      <nav aria-label="Main" className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center pt-[clamp(0.75rem,1.6vw,1.5rem)]">
        <div className="relative flex w-[var(--container)] flex-col items-center">
          <motion.div
            layout={!reduce}
            transition={NAV_SPRING}
            style={{ borderRadius: 32 }}
            className={cn(
              "pointer-events-auto flex h-14 max-w-full items-center gap-[clamp(1rem,3vw,3rem)] border border-border py-2 pl-2 pr-2 transition-colors duration-300",
              glass ? "bg-[color-mix(in_srgb,var(--background)_55%,transparent)] backdrop-blur-md" : "bg-background",
            )}
          >
            <motion.a layout={!reduce ? "position" : false} transition={NAV_SPRING} href="#" aria-label={brand} className="flex min-w-0 items-center gap-2.5 pl-0.5 pr-1 text-foreground">
              {avatarSrc && <img src={avatarSrc} alt="" decoding="async" className="size-8 shrink-0 rounded-full object-cover" />}
              <p className="truncate text-[length:var(--text-small)] font-semibold leading-[1.12] tracking-[-0.02em]">{brand}</p>
            </motion.a>

            {expanded ? (
              <motion.div layout={!reduce ? "position" : false} transition={NAV_SPRING} className="flex items-center gap-[clamp(0.75rem,1.4vw,1.25rem)]">
                {navItems.map((item, index) => (
                  <motion.a
                    key={`${index}-${item.href}`}
                    href={item.href}
                    initial={reduce ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...LINK_SPRING, delay: index * 0.1 }}
                    className="whitespace-nowrap text-[length:var(--text-small)] font-semibold leading-[1.12] text-foreground transition-colors duration-300 hover:text-muted-foreground"
                  >
                    {item.name}
                  </motion.a>
                ))}
                {cta && (
                  <motion.a
                    href={cta.href}
                    initial={reduce ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...LINK_SPRING, delay: navItems.length * 0.1 }}
                    className="btn-secondary min-h-10 px-4"
                  >
                    {cta.text}
                  </motion.a>
                )}
              </motion.div>
            ) : (
              <motion.button
                layout={!reduce ? "position" : false}
                transition={NAV_SPRING}
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-label={open ? closeText : menuText}
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors duration-300 hover:bg-secondary"
              >
                {open ? <X aria-hidden="true" className="size-5" strokeWidth={1.75} /> : <Ellipsis aria-hidden="true" className="size-6" strokeWidth={2.25} />}
              </motion.button>
            )}
          </motion.div>

          <AnimatePresence>
            {open && !desktop && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
                transition={NAV_SPRING}
                className="pointer-events-auto mt-2 flex w-full max-w-[24rem] origin-top flex-col gap-1 rounded-[var(--radius-card)] border border-border bg-background p-3"
              >
                {navItems.map((item, index) => (
                  <motion.a
                    key={`${index}-${item.href}`}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    initial={reduce ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...LINK_SPRING, delay: index * 0.05 }}
                    className="rounded-[calc(var(--radius-card)-0.25rem)] px-3 py-2.5 text-[length:var(--text-h3)] font-medium leading-[1.15] tracking-[var(--heading-tracking)] text-foreground transition-colors duration-300 hover:bg-secondary"
                  >
                    {item.name}
                  </motion.a>
                ))}
                {cta && (
                  <a href={cta.href} onClick={() => setOpen(false)} className="btn-primary mt-2 w-full">
                    {cta.text}
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </>
  );
};

export default NavbarPillCollapse;
