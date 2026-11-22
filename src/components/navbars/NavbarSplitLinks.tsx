"use client";

import { useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";
import { useKitMotion } from "@/components/kit/kitMotion";

type NavItem = { name: string; href: string; count?: string };
type Button = { text: string; href: string };

type NavbarSplitLinksProps = {
  brand?: string;
  logoSrc?: string;
  navItems?: NavItem[];
  primaryButton?: Button;
  secondaryButton?: Button;
  menuText?: string;
  closeText?: string;
};

const NavbarSplitLinks = ({
  brand = "Northlane",
  logoSrc,
  navItems = [
    { name: "Services", href: "#services" },
    { name: "Process", href: "#process" },
    { name: "Pricing", href: "#pricing" },
    { name: "About", href: "#about" },
    { name: "Careers", href: "#team", count: "4" },
  ],
  primaryButton = { text: "Start free trial", href: "#pricing" },
  secondaryButton = { text: "Contact", href: "#contact" },
  menuText = "Menu",
  closeText = "Close",
}: NavbarSplitLinksProps) => {
  const reduce = useReducedMotion();
  const { ease } = useKitMotion();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const hidden = useRef(false);
  const last = useRef(0);
  const y = useMotionValue("0%");
  const { scrollY } = useScroll();
  useMenuDialog(open, panelRef, () => setOpen(false));

  useMotionValueEvent(scrollY, "change", (v) => {
    const hide = v > last.current && v > 80;
    last.current = v;
    if (hide === hidden.current) return;
    hidden.current = hide;
    animate(y, hide ? "-100%" : "0%", { duration: reduce ? 0 : 0.5, ease });
  });

  const label = (text: string, delay: number) => (
    <div className="overflow-hidden pb-[0.15em] -mb-[0.15em]">
      <motion.p initial={reduce ? false : { y: "110%" }} animate={{ y: "0%" }} transition={{ duration: 0.7, ease, delay }} className="whitespace-nowrap leading-none">
        {text}
      </motion.p>
    </div>
  );

  return (
    <>
      <motion.nav aria-label="Main" style={{ y: open ? "0%" : y }} className="fixed inset-x-0 top-0 z-50 h-[4rem] bg-background/90 text-foreground">
        <div className="relative mx-auto flex h-full w-[var(--container)] items-center justify-between gap-[1rem]">
          <a href="#" className="flex min-w-0 shrink-0 items-center gap-[0.5rem]">
            {logoSrc ? (
              <img src={logoSrc} alt={brand} loading="eager" decoding="async" className="h-[1.5rem] w-auto max-w-[9rem] object-contain" />
            ) : (
              <>
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.5rem] shrink-0">
                  <rect width="24" height="24" className="fill-foreground" />
                  <path d="M5 18 12 5l7 13Z" className="fill-background" />
                </svg>
                <p className="truncate text-[length:var(--text-body-lg)] font-medium leading-none tracking-[-0.03em] pb-[0.2em] -mb-[0.2em]">{brand}</p>
              </>
            )}
          </a>

          {navItems.length > 0 && (
            <ul className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-[clamp(1rem,1.8vw,1.5rem)] min-[94.5rem]:flex">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`}>
                  <a href={item.href} className="flex items-center gap-[0.375rem] text-[length:var(--text-small)] font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground">
                    {label(item.name, 0.2 + i * 0.06)}
                    {item.count && (
                      <p className="rounded-[calc(var(--radius)*0.66)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-[0.3rem] py-[0.15rem] font-mono text-[length:0.625rem] leading-none text-accent">{item.count}</p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <div className="flex shrink-0 items-center gap-[0.5rem]">
            {secondaryButton && (
              <a href={secondaryButton.href} className="btn-secondary hidden h-[2rem] px-[0.875rem] text-[length:var(--text-small)] min-[94.5rem]:inline-flex">
                <p className="btn-label">{secondaryButton.text}</p>
              </a>
            )}
            {primaryButton && (
              <a href={primaryButton.href} className="btn-primary hidden h-[2rem] px-[0.875rem] text-[length:var(--text-small)] sm:inline-flex">
                <p className="btn-label">{primaryButton.text}</p>
              </a>
            )}
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? closeText : menuText}
              onClick={() => setOpen((value) => !value)}
              className="relative grid size-[2.5rem] place-items-center sm:size-[2rem] sm:rounded-[var(--radius-button)] sm:border sm:border-border min-[94.5rem]:hidden"
            >
              <motion.div aria-hidden="true" animate={open ? { y: 0, rotate: 45 } : { y: -3.5, rotate: 0 }} transition={{ duration: 0.4, ease }} className="absolute h-px w-[0.75rem] bg-current" />
              <motion.div aria-hidden="true" animate={open ? { y: 0, rotate: -45 } : { y: 3.5, rotate: 0 }} transition={{ duration: 0.4, ease }} className="absolute h-px w-[0.75rem] bg-current" />
            </button>
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
            initial={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            animate={reduce ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
            exit={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease }}
            className="fixed inset-x-0 top-[4rem] bottom-0 z-[49] overflow-y-auto bg-background pb-[var(--gutter)] text-foreground min-[94.5rem]:hidden"
          >
            <ul className="mx-auto flex w-[var(--container)] flex-col border-l border-t border-dashed border-border">
              {navItems.map((item, i) => (
                <li key={`${i}-${item.href}`} className="kit-card border-b border-r border-dashed border-border">
                  <a href={item.href} onClick={() => setOpen(false)} className="flex min-h-[4rem] items-center justify-between gap-[1rem] px-[1.25rem] text-[length:var(--text-h2)] tracking-[-0.03em]">
                    <div className="min-w-0 overflow-hidden pb-[0.15em] -mb-[0.15em]">
                      <motion.p initial={reduce ? false : { y: "110%" }} animate={{ y: "0%" }} transition={{ duration: 0.7, ease, delay: 0.15 + i * 0.06 }} className="leading-[1.1] [overflow-wrap:anywhere]">
                        {item.name}
                      </motion.p>
                    </div>
                    {item.count && (
                      <p className="shrink-0 rounded-[calc(var(--radius)*0.66)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-[0.4rem] py-[0.2rem] font-mono text-[length:var(--text-label)] leading-none text-accent">{item.count}</p>
                    )}
                  </a>
                </li>
              ))}
              {(primaryButton || secondaryButton) && (
                <li className="kit-card flex flex-col gap-[0.5rem] border-b border-r border-dashed border-border p-[1.25rem]">
                  {primaryButton && (
                    <a href={primaryButton.href} onClick={() => setOpen(false)} className="btn-primary w-full">
                      <p className="btn-label">{primaryButton.text}</p>
                    </a>
                  )}
                  {secondaryButton && (
                    <a href={secondaryButton.href} onClick={() => setOpen(false)} className="btn-secondary w-full">
                      <p className="btn-label">{secondaryButton.text}</p>
                    </a>
                  )}
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarSplitLinks;
