"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import useMenuDialog from "@/components/kit/useMenuDialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type NavItem = { name: string; href: string };

type Social = { text: string; href: string };

interface NavbarNotchMenuProps {
  brand: string;
  logoSrc?: string;
  navItems: NavItem[];
  cta?: { text: string; href: string };
  socials?: Social[];
  menuText?: string;
  closeText?: string;
}

const power1Out = [0.25, 0.46, 0.45, 0.94] as const;
const power2Out = [0.33, 1, 0.68, 1] as const;
const burgerEase = [0, 0, 0, 1] as const;


const NavbarNotchMenu = ({ brand, logoSrc, navItems, cta, socials = [], menuText = "Menu", closeText = "Close" }: NavbarNotchMenuProps) => {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const reduce = useReducedMotion();
  const lenis = useLenis();
  const panelRef = useRef<HTMLDivElement>(null);
  const outDelay = reduce ? 0 : 0.15 + navItems.length * 0.03;

  useEffect(() => {
    if (open) setLocked(true);
  }, [open]);

  useMenuDialog(open, panelRef, () => setOpen(false), false);

  useEffect(() => {
    if (!locked) return;
    const body = document.body;
    const previous = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const bar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (bar > 0) body.style.paddingRight = `${bar}px`;
    lenis?.stop();
    return () => {
      body.style.overflow = previous.overflow;
      body.style.paddingRight = previous.paddingRight;
      lenis?.start();
    };
  }, [locked, lenis]);

  return (
    <>
      <nav aria-label="Main" className="pointer-events-none fixed inset-x-0 top-0 z-[60]">
        <div className="mx-auto flex w-[var(--container)] items-start justify-between gap-[var(--gap)] pt-[clamp(1.25rem,2.8vw,2.5rem)]">
          <motion.a
            href="#"
            aria-label={brand}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: power1Out }}
            className="pointer-events-auto flex min-h-[44px] min-w-0 items-center text-foreground"
          >
            {logoSrc ? (
              <img src={logoSrc} alt={brand} decoding="async" className="h-[clamp(2.5rem,4vw,3.75rem)] w-auto max-w-[40vw] object-contain" />
            ) : (
              <p className="truncate font-[family-name:var(--font-heading)] text-[length:var(--text-body-lg)] font-medium uppercase leading-none tracking-[var(--heading-tracking)] pb-[0.2em] -mb-[0.2em]">{brand}</p>
            )}
          </motion.a>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? closeText : menuText}
            className="pointer-events-auto relative flex size-[44px] rounded-[var(--radius)] shrink-0 items-center justify-center bg-deep text-deep-foreground transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--deep)_88%,var(--deep-foreground))]"
          >
            <div aria-hidden="true" className="relative h-[8px] w-[16px]">
              <motion.div
                initial={false}
                animate={open ? { top: "50%", y: "-50%", rotate: 45 } : { top: "0%", y: "0%", rotate: 0 }}
                transition={{ duration: 0.4, ease: burgerEase }}
                className="absolute left-0 h-px w-full bg-current"
              />
              <motion.div
                initial={false}
                animate={open ? { top: "50%", y: "-50%", rotate: -45 } : { top: "100%", y: "-100%", rotate: 0 }}
                transition={{ duration: 0.4, ease: burgerEase }}
                className="absolute left-0 h-px w-full bg-current"
              />
            </div>
          </button>
        </div>
      </nav>

      <AnimatePresence onExitComplete={() => setLocked(false)}>
        {open && (
          <motion.div
            key="overlay"
            aria-hidden="true"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5, ease: power1Out } }}
            exit={{ opacity: 0, transition: { duration: 0.5, ease: power1Out, delay: outDelay } }}
            className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--deep)_70%,transparent)]"
          />
        )}
        {open && (
          <motion.div
            key="panel"
            ref={panelRef}
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-label={menuText}
            initial={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 calc(100% - 44px) calc(100% - 44px))" }}
            animate={reduce ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0%)" }}
            exit={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 calc(100% - 44px) calc(100% - 44px))", transition: { duration: 0.5, ease: power1Out, delay: outDelay } }}
            transition={{ duration: 0.5, ease: power1Out }}
            className="@container fixed bottom-[clamp(1.25rem,2.8vw,2.5rem)] right-[max(var(--gutter),calc((100%-var(--max-w))/2))] top-[clamp(1.25rem,2.8vw,2.5rem)] z-50 flex w-[calc(100%-2*var(--gutter))] flex-col justify-between overflow-y-auto rounded-[var(--radius)] bg-deep px-[clamp(1.25rem,2vw,2rem)] pb-[clamp(1.25rem,2vw,2rem)] pt-[5.5rem] text-deep-foreground md:w-[40vw] xl:w-[28vw]"
          >
            <div className="flex flex-col">
              {navItems.map((item, index) => (
                <div key={`${index}-${item.name}`} className="relative overflow-hidden">
                  <motion.a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    initial={reduce ? false : { y: "-2rem", opacity: 0 }}
                    animate={{ y: "0rem", opacity: 1, transition: { duration: 0.5, ease: power1Out, delay: 0.1 + index * 0.05 } }}
                    exit={reduce ? undefined : { y: "-2rem", opacity: 0, transition: { duration: 0.25, ease: power1Out, delay: (navItems.length - 1 - index) * 0.03 } }}
                    className="block py-[0.15em] font-[family-name:var(--font-heading)] text-[length:min(var(--text-h1),12cqw)] leading-[1.1] tracking-[var(--heading-tracking)] text-[color-mix(in_srgb,var(--deep-foreground)_45%,transparent)] [overflow-wrap:anywhere] transition-colors duration-300 hover:text-deep-foreground"
                  >
                    {item.name}
                  </motion.a>
                  <motion.div
                    aria-hidden="true"
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1, transition: { duration: 0.5, ease: power2Out, delay: 0.15 + index * 0.05 } }}
                    exit={reduce ? undefined : { scaleX: 0, transition: { duration: 0.25, ease: power1Out, delay: (navItems.length - 1 - index) * 0.03 } }}
                    className="h-px w-full origin-left bg-[color-mix(in_srgb,var(--deep-foreground)_15%,transparent)]"
                  />
                </div>
              ))}
            </div>

            {(cta || socials.length > 0) && (
              <motion.div
                initial={reduce ? false : { y: "1rem", opacity: 0 }}
                animate={{ y: "0rem", opacity: 1, transition: { duration: 0.5, ease: power1Out, delay: 0.2 + navItems.length * 0.05 } }}
                exit={reduce ? undefined : { y: "1rem", opacity: 0, transition: { duration: 0.2, ease: power1Out } }}
                className="mt-[2.5rem] flex flex-col items-start gap-[1.5rem]"
              >
                {cta && (
                  <a href={cta.href} onClick={() => setOpen(false)} className="btn-secondary">
                    {cta.text}
                  </a>
                )}
                {socials.length > 0 && (
                  <div className="flex flex-wrap gap-x-[1.25rem] gap-y-[0.5rem]">
                    {socials.map((social, i) => (
                      <a
                        key={`${i}-${social.text}`}
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        className="whitespace-nowrap text-[length:var(--text-small)] leading-[1.5] text-[color-mix(in_srgb,var(--deep-foreground)_60%,transparent)] transition-colors duration-300 hover:text-deep-foreground"
                      >
                        {social.text}
                      </a>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarNotchMenu;
