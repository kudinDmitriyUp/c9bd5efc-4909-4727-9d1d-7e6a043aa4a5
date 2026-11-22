"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import useMenuDialog from "@/components/kit/useMenuDialog";

type NavbarCrossMarkProps = {
  brand?: string;
  navItems?: { name: string; href: string }[];
  primaryButton?: { text: string; href: string };
  className?: string;
};

export default function NavbarCrossMark({
  brand = "Facet",
  navItems = [
    { name: "Glass", href: "#home" },
    { name: "Journal", href: "#journal" },
    { name: "Studio", href: "#about" },
    { name: "Shop", href: "#shop" },
    { name: "Contact", href: "#contact" },
  ],
  primaryButton,
  className,
}: NavbarCrossMarkProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  useMenuDialog(open, panelRef, () => setOpen(false), false);
  const { scrollY } = useScroll();
  const shade = useTransform(scrollY, [0, 120], [0, 1]);

  return (
    <header ref={panelRef} className={`fixed inset-x-0 top-0 z-50 text-foreground ${className ?? ""}`}>
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-[color-mix(in_srgb,var(--background)_55%,transparent)] transition-opacity duration-500 ease-[var(--ease-out)] lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <motion.div aria-hidden="true" style={{ opacity: open ? 1 : shade }} className="absolute inset-0 border-b border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-[color-mix(in_srgb,var(--background)_82%,transparent)] backdrop-blur-[14px]" />
      <div className="relative mx-auto flex h-[3.75rem] w-[var(--container)] items-center justify-between gap-6">
        <a href="#home" className="flex items-center gap-2.5 text-[length:var(--text-small)] font-medium uppercase tracking-[0.14em]">
          <svg viewBox="0 0 12 12" aria-hidden="true" className="size-[13px]">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <p className="whitespace-nowrap">{brand}</p>
        </a>
        <div className="hidden items-center gap-7 lg:flex">
          <nav aria-label="Main" className="flex items-center gap-6">
            {navItems.map((item) => (
              <a key={item.href + item.name} href={item.href} className="whitespace-nowrap text-[length:var(--text-small)] transition-opacity duration-300 hover:opacity-60">
                {item.name}
              </a>
            ))}
          </nav>
          {primaryButton && (
            <a href={primaryButton.href} className="btn-primary min-h-[2.375rem] px-5">
              {primaryButton.text}
            </a>
          )}
        </div>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="relative -mr-2 flex h-11 w-[2.875rem] cursor-pointer items-center justify-center lg:hidden"
        >
          <div aria-hidden="true" className={`absolute h-[1.5px] w-[1.875rem] bg-current transition-transform duration-500 ease-[var(--ease-out)] ${open ? "rotate-45" : "-translate-y-[6px]"}`} />
          <div aria-hidden="true" className={`absolute h-[1.5px] w-[1.875rem] bg-current transition-transform duration-500 ease-[var(--ease-out)] ${open ? "-rotate-45" : "translate-y-[6px]"}`} />
        </button>
      </div>
      <div
        inert={!open}
        className={`absolute inset-x-0 top-full max-h-[calc(100svh-4.5rem)] overflow-y-auto pt-2 transition-[opacity,translate] duration-500 ease-[var(--ease-out)] lg:hidden ${open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"}`}
      >
        <nav aria-label="Mobile" className="mx-auto flex w-[var(--container)] flex-col rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--foreground)_12%,transparent)] bg-card p-2 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
          {navItems.map((item, i) => (
            <a key={item.href + item.name} href={item.href} onClick={() => setOpen(false)} className={`flex items-center justify-between rounded-[var(--radius)] px-3 py-3.5 text-[length:var(--text-h3)] leading-[1.2] tracking-[var(--heading-tracking)] transition-colors duration-300 ${i < navItems.length - 1 ? "border-b border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]" : ""} hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]`}>
              {item.name}
              <svg viewBox="0 0 12 12" aria-hidden="true" className="size-[10px] opacity-50">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </a>
          ))}
          {primaryButton && (
            <a href={primaryButton.href} onClick={() => setOpen(false)} className="btn-primary mt-2 w-full">
              {primaryButton.text}
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
