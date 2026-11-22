"use client";

import { useReducedMotion } from "motion/react";
import { useCarDuo } from "@/components/kit/carDuo";

type NavbarStudioWordmarkProps = {
  brand?: string;
  brandMark?: string;
  brandEnd?: string;
  href?: string;
};

const NavbarStudioWordmark = ({ brand = "TWO", brandMark = "/", brandEnd = "300", href = "#" }: NavbarStudioWordmarkProps) => {
  const reduce = useReducedMotion();
  const { lit } = useCarDuo();

  return (
    <nav aria-label="Main" className={`fixed inset-x-0 top-0 z-50 transition-opacity duration-[1200ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] ${lit || reduce ? "opacity-100" : "opacity-0"}`}>
      <div className="flex items-center justify-between px-[var(--gutter)] py-[1.5rem]">
        <a href={href} className="block text-[length:var(--text-wordmark)] font-normal leading-[normal] tracking-[-0.01em] text-foreground [font-family:var(--font-heading)] [font-stretch:125%]">
          <p className="inline">{brand}</p>
          <p className="inline text-[color:var(--muted-heading)]">{brandMark}</p>
          <p className="inline">{brandEnd}</p>
        </a>
      </div>
    </nav>
  );
};

export default NavbarStudioWordmark;
