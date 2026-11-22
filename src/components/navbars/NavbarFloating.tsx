"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, ArrowUpRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface NavbarFloatingProps {
  logo?: string;
  navItems?: { name: string; href: string }[];
  ctaButton?: { text: string; href: string };
}

const DEFAULT_NAV_ITEMS = [
  { name: "Work", href: "#work" },
  { name: "Services", href: "#services" },
  { name: "About", href: "#about" },
  { name: "Contact", href: "#contact" },
];

const DEFAULT_CTA = { text: "Get started", href: "#contact" };

const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, onClose?: () => void) => {
  if (href.startsWith("#")) {
    e.preventDefault();
    const element = document.getElementById(href.slice(1));
    onClose?.();
    // motion measures the closing menu (`height: auto`) and restores the scroll
    // position it saved — a scroll started in the same tick is cancelled.
    window.setTimeout(() => element?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return;
  }
  if (href.startsWith("/#") && window.location.pathname === "/") {
    e.preventDefault();
    const element = document.getElementById(href.slice(2));
    onClose?.();
    window.setTimeout(() => element?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return;
  }
  onClose?.();
};

const NavbarFloating = ({ logo = "Northwind", navItems = DEFAULT_NAV_ITEMS, ctaButton = DEFAULT_CTA }: NavbarFloatingProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return (
    <>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-999 bg-foreground"
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <nav data-section="navbar" className="fixed z-1000 top-5 left-1/2 -translate-x-1/2 w-full max-w-6xl px-6">
        <div className="mx-auto w-full md:w-1/2 overflow-hidden rounded-xl backdrop-blur-sm bg-card text-card-foreground border">
          <div className="relative z-10 flex items-center justify-between gap-3 xl:gap-4 2xl:gap-5 p-3 xl:p-4 2xl:p-5">
            <a href="/" className="text-xl font-medium text-foreground">{logo}</a>

            <div
              className="flex items-center justify-center shrink-0 size-9 rounded-lg cursor-pointer bg-primary text-primary-foreground"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Plus
                className={cn(
                  "w-1/2 h-1/2 text-primary-foreground transition-transform duration-300",
                  menuOpen ? "rotate-45" : "rotate-0"
                )}
                strokeWidth={1.5}
              />
            </div>
          </div>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                transition={{ duration: 0.5, ease: [0.625, 0.05, 0, 1] }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-3 xl:gap-4 2xl:gap-5 p-3 xl:p-4 2xl:p-5 pt-0 xl:pt-0 2xl:pt-0">
                  <div className="px-3 xl:px-4 2xl:px-5 py-0 md:py-1 2xl:py-2 rounded-xl bg-card text-card-foreground border">
                    {navItems.map((item, index) => (
                      <div key={item.name}>
                        <a
                          href={item.href}
                          onClick={(e) => handleNavClick(e, item.href, () => setMenuOpen(false))}
                          className="group flex items-center justify-between py-3 w-full"
                        >
                          <span className="text-xl md:text-2xl font-medium text-foreground group-hover:ml-3 transition-[margin] duration-300">
                            {item.name}
                          </span>
                          <ArrowUpRight
                            className="size-5 md:size-6 text-foreground group-hover:rotate-45 group-hover:mr-3 transition-all duration-300"
                            strokeWidth={2}
                          />
                        </a>
                        {index < navItems.length - 1 && (
                          <div className="h-px bg-accent/50" />
                        )}
                      </div>
                    ))}
                  </div>

                  <a href={ctaButton.href} className="flex items-center justify-center h-10 px-6 text-sm rounded-lg cursor-pointer btn-primary bg-primary text-primary-foreground w-full">{ctaButton.text}</a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </>
  );
};

export default NavbarFloating;
