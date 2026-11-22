"use client";

import { motion, useReducedMotion } from "motion/react";

type Button = { text: string; href: string };

type NavbarHairlineRingProps = {
  brand?: string;
  logoSrc?: string;
  button?: Button;
};

const EASE = [0.19, 1, 0.22, 1] as const;

const NavbarHairlineRing = ({ brand = "FS 60P", logoSrc, button = { text: "Reserve", href: "#contact" } }: NavbarHairlineRingProps) => {
  const reduce = useReducedMotion();

  return (
    <motion.nav
      aria-label="Main"
      initial={reduce ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
      className="fixed inset-x-0 top-0 z-50 text-white mix-blend-difference"
    >
      <div className="mx-auto flex h-[4.5rem] w-[var(--container)] items-center justify-between gap-[clamp(1rem,2vw,2rem)] lg:h-[5.5rem]">
        <a href="#" className="flex min-w-0 shrink items-center">
          {logoSrc ? (
            <img src={logoSrc} alt={brand} loading="eager" decoding="async" className="h-[1.25rem] w-auto max-w-[8rem] object-contain" />
          ) : (
            <p className="truncate text-[length:var(--text-small)] font-light uppercase leading-none tracking-[0.18em] [font-family:var(--font-heading)] pb-[0.2em] -mb-[0.2em]">{brand}</p>
          )}
        </a>
        {button && (
          <a href={button.href} className="btn-link shrink-0 !text-current">
            <p className="btn-label">{button.text}</p>
          </a>
        )}
      </div>
    </motion.nav>
  );
};

export default NavbarHairlineRing;
