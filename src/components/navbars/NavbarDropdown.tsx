"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface NavbarDropdownProps {
  logo?: string;
  navItems?: { name: string; href: string }[];
  ctaButton?: { text: string; href: string };
}

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

const DEFAULT_NAV_ITEMS = [
  { name: "Work", href: "#work" },
  { name: "Services", href: "#services" },
  { name: "About", href: "#about" },
  { name: "Contact", href: "#contact" },
];
const DEFAULT_CTA = { text: "Get started", href: "#contact" };

const NavbarDropdown = ({ logo = "Studio", navItems = DEFAULT_NAV_ITEMS, ctaButton = DEFAULT_CTA }: NavbarDropdownProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) setMenuOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuOpen && navRef.current && !navRef.current.contains(e.target as Node)) {
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
    <nav data-section="navbar" ref={navRef} className="fixed z-1000 top-5 left-1/2 -translate-x-1/2 w-full max-w-6xl px-6">
      <div className="flex items-center justify-between p-2 xl:p-3 2xl:p-4 rounded-xl backdrop-blur-sm bg-card text-card-foreground border">
        <a href="/" className="pl-2 text-xl font-medium text-foreground">{logo}</a>

        <div className="flex items-center gap-2 xl:gap-3 2xl:gap-4">
          <a href={ctaButton.href} className="flex items-center justify-center h-10 px-6 text-sm rounded-lg cursor-pointer btn-primary bg-primary text-primary-foreground">{ctaButton.text}</a>

          <div
            className="relative flex items-center justify-center size-10 rounded-lg cursor-pointer bg-primary text-primary-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span
              className={cn(
                "absolute w-3 h-px bg-primary-foreground transition-all duration-300",
                menuOpen ? "rotate-45" : "-translate-y-1"
              )}
            />
            <span
              className={cn(
                "absolute w-3 h-px bg-primary-foreground transition-all duration-300",
                menuOpen ? "-rotate-45" : "translate-y-1"
              )}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-full right-2 xl:right-3 2xl:right-4 -mt-1 px-4 py-1 w-3/4 md:w-3/10 2xl:w-25/100 rounded-xl bg-primary text-primary-foreground"
          >
            {navItems.map((item, index) => (
              <div key={item.name}>
                <a
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href, () => setMenuOpen(false))}
                  className="group flex items-center justify-between py-3 w-full"
                >
                  <span className="text-base text-primary-foreground group-hover:ml-2 transition-[margin] duration-300">
                    {item.name}
                  </span>
                  <ArrowUpRight
                    className="size-4 text-primary-foreground group-hover:rotate-45 group-hover:mr-2 transition-all duration-300"
                    strokeWidth={1.75}
                  />
                </a>
                {index < navItems.length - 1 && (
                  <div className="h-px bg-primary-foreground/20" />
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default NavbarDropdown;
