"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, ArrowRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface NavbarCenteredOverlayProps {
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

const NavbarCenteredOverlay = ({ logo = "Northwind", navItems = DEFAULT_NAV_ITEMS, ctaButton = DEFAULT_CTA }: NavbarCenteredOverlayProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) setMenuOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <>
      <nav
        data-section="navbar"
        className="absolute z-1000 top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl px-6"
      >
        <div className="relative flex items-center justify-between py-5">
          <a href="/" className="text-xl font-medium text-background">
            {logo}
          </a>

          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="text-base text-background hover:opacity-70 transition-opacity"
              >
                {item.name}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 xl:gap-3 2xl:gap-4">
            <a href={ctaButton.href} className="hidden md:flex items-center justify-center h-10 px-6 text-sm rounded-lg cursor-pointer btn-primary bg-primary text-primary-foreground">{ctaButton.text}</a>

            <div
              className="flex md:hidden items-center justify-center shrink-0 size-9 rounded-lg cursor-pointer bg-primary text-primary-foreground"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Plus
                className={cn("w-1/2 h-1/2 text-primary-foreground transition-transform duration-300", menuOpen ? "rotate-45" : "rotate-0")}
                strokeWidth={1.5}
              />
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ y: "-135%" }}
            animate={{ y: 0 }}
            exit={{ y: "-135%" }}
            transition={{ type: "spring", damping: 26, stiffness: 170 }}
            className="md:hidden fixed z-1000 top-3 left-3 right-3 p-6 rounded-xl bg-card text-card-foreground border"
          >
            <div className="flex items-center justify-between mb-6">
              <p className="text-xl text-foreground">Menu</p>
              <div
                className="flex items-center justify-center shrink-0 size-9 rounded-lg cursor-pointer bg-primary text-primary-foreground"
                onClick={() => setMenuOpen(false)}
              >
                <Plus className="w-1/2 h-1/2 text-primary-foreground rotate-45" strokeWidth={1.5} />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {navItems.map((item, index) => (
                <div key={item.name}>
                  <a
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href, () => setMenuOpen(false))}
                    className="flex items-center justify-between py-2 text-base font-medium text-foreground"
                  >
                    {item.name}
                    <ArrowRight className="size-4 text-foreground" strokeWidth={1.5} />
                  </a>
                  {index < navItems.length - 1 && (
                    <div className="h-px bg-linear-to-r from-transparent via-foreground/20 to-transparent" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <a href={ctaButton.href} className="flex items-center justify-center h-10 px-6 text-sm rounded-lg cursor-pointer btn-primary bg-primary text-primary-foreground w-full">{ctaButton.text}</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavbarCenteredOverlay;
