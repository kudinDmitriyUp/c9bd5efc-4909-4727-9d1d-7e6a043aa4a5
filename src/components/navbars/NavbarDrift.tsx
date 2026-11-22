"use client";

import { useRef, useState } from "react";
import useMenuDialog from "@/components/kit/useMenuDialog";

type NavbarDriftProps = {
  brand?: string;
  navItems?: { name: string; href: string }[];
  primaryButton?: { text: string; href: string };
  className?: string;
};

export default function NavbarDrift({
  brand = "Drift",
  navItems = [
    { name: "Home", href: "#home" },
    { name: "Engine", href: "#engine" },
    { name: "Work", href: "#work" },
    { name: "About", href: "#about" },
  ],
  primaryButton = { text: "Contact", href: "#contact" },
  className,
}: NavbarDriftProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useMenuDialog(open, panelRef, () => setOpen(false));

  return (
    <header className={`fixed left-1/2 top-3.5 z-50 w-[min(41.25rem,100%-2*var(--gutter))] -translate-x-1/2 ${className ?? ""}`}>
      <div ref={panelRef} className="relative border border-border bg-[color-mix(in_srgb,var(--background)_72%,transparent)] text-foreground backdrop-blur-[14px]">
        <div className="flex h-[2.875rem] items-center justify-between gap-4 py-[7px] pl-4 pr-[7px]">
          <a href="#home" className="flex items-center gap-2.5 text-[length:var(--text-body)]">
            <svg viewBox="0 0 18 18" aria-hidden="true" className="size-[18px]">
              <g fill="currentColor">
                <circle cx="9" cy="2.2" r="1.3" />
                <circle cx="15.8" cy="9" r="1.3" />
                <circle cx="9" cy="15.8" r="1.3" />
                <circle cx="2.2" cy="9" r="1.3" />
                <circle cx="13.8" cy="4.2" r=".9" />
                <circle cx="13.8" cy="13.8" r=".9" />
                <circle cx="4.2" cy="13.8" r=".9" />
                <circle cx="4.2" cy="4.2" r=".9" />
                <circle cx="9" cy="9" r="1.6" />
              </g>
            </svg>
            <p className="whitespace-nowrap">{brand}</p>
          </a>
          <nav aria-label="Main" className="hidden items-center gap-[1.625rem] min-[94.5rem]:flex">
            {navItems.map((item) => (
              <a key={item.href + item.name} href={item.href} className="whitespace-nowrap text-[length:var(--text-small)] text-muted-foreground transition-colors duration-300 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none">
                {item.name}
              </a>
            ))}
          </nav>
          <div className="flex h-full items-center gap-1.5">
            <a href={primaryButton.href} className="btn-primary hidden h-full min-h-0 gap-2 px-3.5 text-[length:var(--text-small)] lg:flex">
              <p>{primaryButton.text}</p>
              <p aria-hidden="true">·</p>
            </a>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="relative flex aspect-square h-full items-center justify-center shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_40%,transparent)] min-[94.5rem]:hidden"
            >
              <div aria-hidden="true" className={`absolute h-px w-3.5 bg-current transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-[3px]"}`} />
              <div aria-hidden="true" className={`absolute h-px w-3.5 bg-current transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-[3px]"}`} />
            </button>
          </div>
        </div>
        <div className={`grid transition-[grid-template-rows] duration-500 ease-[var(--ease-out)] lg:absolute lg:right-[-1px] lg:top-full lg:mt-[7px] lg:w-[22rem] lg:bg-background min-[94.5rem]:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`} inert={!open}>
          <div className="overflow-hidden">
            <nav aria-label="Mobile" className="flex flex-col border-t border-border px-4 pb-4 pt-2 lg:border">
              {navItems.map((item) => (
                <a key={item.href + item.name} href={item.href} onClick={() => setOpen(false)} className="border-b border-border py-3.5 text-[length:var(--text-h3)] font-light tracking-[-0.03em]">
                  {item.name}
                </a>
              ))}
              <a href={primaryButton.href} onClick={() => setOpen(false)} className="btn-primary mt-4 w-full lg:hidden">
                <p className="btn-label">{primaryButton.text}</p>
              </a>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
