"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";
import NickhoRollLabel from "@/components/kit/NickhoRollLabel";

type Link = { name: string; href: string };

type Social = { text: string; href: string };

type NavbarYellowTileProps = {
  brand: string;
  logoSrc?: string;
  navItems: Link[];
  cta?: { text: string; href: string };
  socials?: Social[];
  menuText?: string;
  closeText?: string;
};

const tileEase = [0.9, 0, 0.1, 1] as const;
const linkEase = [0.7, 0, 0.3, 1] as const;

const NavbarYellowTile = ({ brand, logoSrc, navItems, cta, socials = [], menuText = "Menu", closeText = "Close" }: NavbarYellowTileProps) => {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useMenuDialog(open, panelRef, () => setOpen(false));

  return (
    <>
      <a
        href="#"
        aria-label={brand}
        className={`fixed left-[var(--gutter)] top-[clamp(1.25rem,2.1vw,1.875rem)] z-[62] flex min-h-[44px] max-w-[45vw] items-center transition-colors duration-300 ${open ? "text-primary-foreground" : "text-deep-foreground mix-blend-difference"}`}
      >
        {logoSrc ? (
          <img src={logoSrc} alt={brand} decoding="async" className={`h-[clamp(1.25rem,1.7vw,1.5rem)] w-auto object-contain ${open ? "" : "invert"}`} />
        ) : (
          <p className="truncate font-[family-name:var(--font-heading)] text-[length:var(--text-h3)] uppercase leading-none pb-[0.2em] -mb-[0.2em]">{brand}</p>
        )}
      </a>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? closeText : menuText}
        className="group fixed right-[var(--gutter)] top-[clamp(1.25rem,2.1vw,1.875rem)] z-[62] flex size-[44px] cursor-pointer items-center justify-end"
      >
        <div
          aria-hidden="true"
          className={`relative flex size-[1.875rem] items-center justify-center rounded-[calc(var(--radius)/2)] transition-[background-color,scale] duration-300 group-active:scale-90 ${open ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"}`}
        >
          <motion.div
            initial={false}
            animate={open ? { y: 0, rotate: 45 } : { y: -2.5, rotate: 0 }}
            transition={{ duration: reduce ? 0 : 0.35, ease: linkEase }}
            className="absolute h-[2px] w-[0.75rem] bg-current"
          />
          <motion.div
            initial={false}
            animate={open ? { y: 0, rotate: -45 } : { y: 2.5, rotate: 0 }}
            transition={{ duration: reduce ? 0 : 0.35, ease: linkEase }}
            className="absolute h-[2px] w-[0.75rem] bg-current"
          />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="tile"
            ref={panelRef}
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            aria-label={menuText}
            initial={reduce ? { opacity: 0 } : { clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)" }}
            animate={reduce ? { opacity: 1 } : { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }}
            exit={reduce ? { opacity: 0 } : { clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)" }}
            transition={{ duration: reduce ? 0.2 : 1, ease: tileEase }}
            className="@container fixed inset-0 z-[61] flex flex-col overflow-y-auto bg-primary text-primary-foreground"
          >
            <nav aria-label="Main" className="mx-auto flex w-[var(--container)] flex-1 flex-col items-center justify-center py-[clamp(6rem,12vh,8rem)]">
              <ul className="flex flex-col items-center">
                {navItems.map((item, index) => (
                  <li key={`${index}-${item.name}`} className="overflow-hidden">
                    <motion.a
                      href={item.href}
                      onClick={() => setOpen(false)}
                      initial={reduce ? false : { y: "100%", rotate: 5 }}
                      animate={{ y: "0%", rotate: 0, transition: { duration: 0.75, ease: linkEase, delay: 0.35 + index * 0.05 } }}
                      exit={reduce ? undefined : { y: "-100%", rotate: -5, transition: { duration: 0.5, ease: linkEase, delay: index * 0.03 } }}
                      className="block origin-left text-center text-[length:min(calc(var(--text-h1)*1.87),12cqw)] leading-[0.92] pb-[0.13em] tracking-[-0.04em] [overflow-wrap:anywhere] transition-opacity duration-300 hover:opacity-60"
                    >
                      {item.name}
                    </motion.a>
                  </li>
                ))}
              </ul>
            </nav>

            {(cta || socials.length > 0) && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: "1rem" }}
                animate={{ opacity: 1, y: "0rem", transition: { duration: 0.6, ease: linkEase, delay: 0.6 + navItems.length * 0.05 } }}
                exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.2 } }}
                className="mx-auto flex w-[var(--container)] flex-col items-center gap-[1.25rem] pb-[clamp(1.5rem,4vh,2.5rem)] lg:flex-row lg:justify-between"
              >
                <div className="flex flex-wrap justify-center gap-x-[1.5rem] gap-y-[0.5rem]">
                  {socials.map((social, i) => (
                    <a key={`${i}-${social.text}`} href={social.href} target="_blank" rel="noreferrer" className="group text-[length:var(--text-small)] leading-[1.4]">
                      <NickhoRollLabel text={social.text} />
                    </a>
                  ))}
                </div>
                {cta && (
                  <a href={cta.href} onClick={() => setOpen(false)} className="btn-primary group text-primary before:bg-primary-foreground">
                    <NickhoRollLabel text={cta.text} />
                  </a>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarYellowTile;
