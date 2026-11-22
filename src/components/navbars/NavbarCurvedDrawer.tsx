"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";
import ButtonMagneticFill from "@/components/buttons/ButtonMagneticFill";

const slide = [0.7, 0, 0.2, 1] as const;

type NavItem = { name: string; href: string };

type NavbarCurvedDrawerProps = {
  brand: string;
  brandPrefix?: string;
  brandReveal?: string;
  navItems: NavItem[];
  links?: NavItem[];
  menuText?: string;
  navLabel?: string;
  linksLabel?: string;
};

const NavbarCurvedDrawer = ({ brand, brandPrefix, brandReveal, navItems, links = [], menuText = "Menu", navLabel = "Navigation", linksLabel = "Socials" }: NavbarCurvedDrawerProps) => {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [rolled, setRolled] = useState(false);
  const [ink, setInk] = useState<string | undefined>(undefined);
  const [widths, setWidths] = useState({ prefix: 0, brand: 0, reveal: 0 });
  const barRef = useRef<HTMLElement>(null);
  const prefixRef = useRef<HTMLParagraphElement>(null);
  const brandRef = useRef<HTMLParagraphElement>(null);
  const revealRef = useRef<HTMLParagraphElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (value) => setShown(value > 270));

  useEffect(() => {
    const read = () => {
      const bar = barRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const under = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2).find((el) => !bar.contains(el) && el.closest("section"));
      const section = under?.closest("section");
      setInk(section ? getComputedStyle(section).color : undefined);
    };
    const frame = requestAnimationFrame(read);
    window.addEventListener("resize", read);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", read);
    };
  }, []);

  useLayoutEffect(() => {
    const measure = () =>
      setWidths({
        prefix: prefixRef.current?.offsetWidth ?? 0,
        brand: brandRef.current?.offsetWidth ?? 0,
        reveal: revealRef.current?.offsetWidth ?? 0,
      });
    measure();
    let alive = true;
    document.fonts?.ready.then(() => alive && measure());
    window.addEventListener("resize", measure);
    return () => {
      alive = false;
      window.removeEventListener("resize", measure);
    };
  }, [brand, brandPrefix, brandReveal]);

  useMenuDialog(open, panelRef, () => setOpen(false));

  const shift = rolled && brandPrefix ? widths.prefix : 0;
  const boxWidth = widths.brand ? (rolled && brandReveal ? widths.brand + widths.reveal : widths.prefix + widths.brand) : undefined;

  return (
    <>
      <nav ref={barRef} aria-label="Main" style={{ color: ink }} className="absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-[var(--gap)] px-[calc(var(--text-body)*1.25)] py-[calc(var(--text-body)*1.25)] text-foreground lg:px-[calc(var(--text-body)*2.5)] lg:py-[calc(var(--text-body)*2)]">
        <a href="#" aria-label={[brandPrefix, brand, brandReveal].filter(Boolean).join(" ")} onMouseEnter={() => setRolled(true)} onMouseLeave={() => setRolled(false)} className="flex min-w-0 items-center gap-[0.3em] text-[length:var(--text-body)]">
          <p className={`shrink-0 transition-transform duration-500 ease-[cubic-bezier(.7,0,.3,1)] ${rolled && !reduce ? "rotate-360" : "rotate-0"}`}>©</p>
          <div style={{ width: boxWidth }} className="relative min-w-0 overflow-hidden whitespace-nowrap transition-[width] duration-500 ease-[cubic-bezier(.7,0,.3,1)]">
            <div style={{ transform: `translateX(${-shift}px)` }} className="flex transition-transform duration-500 ease-[cubic-bezier(.7,0,.3,1)]">
              {brandPrefix && (
                <p ref={prefixRef} className="pr-[0.3em]">
                  {brandPrefix}
                </p>
              )}
              <p ref={brandRef}>{brand}</p>
              {brandReveal && (
                <p ref={revealRef} className="pl-[0.3em]">
                  {brandReveal}
                </p>
              )}
            </div>
          </div>
        </a>
        <div className="hidden items-center gap-[calc(var(--text-body)*2.5)] lg:flex">
          {navItems.map((item) => (
            <a key={item.name} href={item.href} className="group relative whitespace-nowrap text-[length:var(--text-body)]">
              {item.name}
              <div className="absolute left-1/2 top-[calc(100%+0.35em)] size-[0.36em] -translate-x-1/2 scale-0 rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(.7,0,.3,1)] group-hover:scale-100" />
            </a>
          ))}
        </div>
        <button type="button" aria-expanded={open} onClick={() => setOpen(true)} className="flex shrink-0 items-center gap-[0.5em] text-[length:var(--text-body)] lg:hidden">
          <div aria-hidden="true" className="size-[0.36em] rounded-full bg-current" />
          {menuText}
        </button>
      </nav>

      <motion.div
        initial={false}
        inert={!(shown || open)}
        animate={{ scale: shown || open ? 1 : 0 }}
        transition={shown || open ? { duration: 0.4, ease: [0.34, 1.5, 0.64, 1] } : { duration: 0.4, ease: [0.36, 0, 0.66, 0] }}
        className="fixed right-[calc(var(--text-body)*1.25)] top-[calc(var(--text-body)*1.25)] z-[60] lg:right-[calc(var(--text-body)*1.65)] lg:top-[calc(var(--text-body)*1.65)]"
      >
        <ButtonMagneticFill
          onClick={() => setOpen((value) => !value)}
          ariaLabel={open ? "Close menu" : "Open menu"}
          ariaExpanded={open}
          strength={50}
          labelStrength={25}
          className={`btn-primary !size-[clamp(calc(var(--text-body)*4),5.5vw,calc(var(--text-body)*5))] !min-h-0 !min-w-0 !rounded-full !p-0 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary-foreground)_20%,transparent)] ${open ? "!bg-accent" : ""}`}
          labelClassName="w-[28%] flex-col gap-[0.45em]"
        >
          <div className={`h-px w-full bg-current transition-transform duration-300 ${open ? "translate-y-[0.25em] rotate-45" : ""}`} />
          <div className={`h-px w-full bg-current transition-transform duration-300 ${open ? "-translate-y-[0.25em] -rotate-45" : ""}`} />
        </ButtonMagneticFill>
      </motion.div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.8, ease: slide }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[50] bg-linear-to-r from-deep/30 from-40% to-deep to-80%"
            />
            <motion.div
              key="panel"
              ref={panelRef}
              data-lenis-prevent
              role="dialog"
              aria-modal="true"
              aria-label={navLabel}
              initial={{ x: "calc(100% + 6vw)" }}
              animate={{ x: 0 }}
              exit={{ x: "calc(100% + 6vw)" }}
              transition={{ duration: reduce ? 0 : 0.8, ease: slide }}
              className="fixed right-0 top-0 z-[55] flex h-svh w-full flex-col justify-between overflow-y-auto bg-deep px-[var(--gutter)] pb-[calc(var(--gap)*1.25)] pt-[calc(var(--text-body)*8)] text-deep-foreground lg:w-[min(calc(var(--text-body)*34),60vw)] lg:px-[calc(var(--text-body)*5)] lg:pt-[calc(var(--text-body)*9)]"
            >
              <motion.div
                aria-hidden="true"
                initial={{ width: "6vw" }}
                animate={{ width: "0vw" }}
                exit={{ width: "6vw" }}
                transition={{ duration: reduce ? 0 : 0.85, ease: slide }}
                className="absolute right-full top-0 h-full overflow-hidden"
              >
                <div className="absolute left-0 top-1/2 h-[150%] w-[775%] -translate-y-1/2 rounded-[50%] bg-deep" />
              </motion.div>
              <div>
                <p className="border-b border-deep-foreground/20 pb-[calc(var(--gap)*0.6)] text-[length:var(--text-label)] uppercase tracking-[var(--label-tracking)] text-deep-foreground/60">{navLabel}</p>
                <div className="mt-[calc(var(--gap)*0.75)] flex flex-col">
                  {navItems.map((item, index) => (
                    <motion.a
                      key={item.name}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      initial={reduce ? false : { x: "15vw" }}
                      animate={{ x: 0 }}
                      transition={{ duration: 0.8, ease: slide, delay: index * 0.03 }}
                      className="group relative flex w-fit max-w-full items-center text-[length:calc(var(--text-h2)*0.8)] leading-[1.4] [overflow-wrap:anywhere]"
                    >
                      <div aria-hidden="true" className="absolute -left-[0.5em] top-1/2 size-[0.17em] -translate-y-1/2 scale-0 rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(.7,0,.3,1)] group-hover:scale-100" />
                      {item.name}
                    </motion.a>
                  ))}
                </div>
              </div>
              {links.length > 0 && (
                <div className="mt-[calc(var(--gap)*1.5)]">
                  <p className="text-[length:var(--text-label)] uppercase tracking-[var(--label-tracking)] text-deep-foreground/60">{linksLabel}</p>
                  <div className="mt-[0.75em] flex flex-wrap gap-x-[calc(var(--gap)*0.75)] gap-y-[0.4em]">
                    {links.map((link) => (
                      <a key={link.name} href={link.href} onClick={() => setOpen(false)} className="btn-link whitespace-nowrap !text-deep-foreground">
                        {link.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarCurvedDrawer;
