"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface NavbarFullscreenProps {
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

const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, onClose: () => void) => {
  if (href.startsWith("#")) {
    e.preventDefault();
    const element = document.getElementById(href.slice(1));
    onClose();
    // motion measures the closing menu (`height: auto`) and restores the scroll
    // position it saved — a scroll started in the same tick is cancelled.
    window.setTimeout(() => element?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return;
  }
  if (href.startsWith("/#") && window.location.pathname === "/") {
    e.preventDefault();
    const element = document.getElementById(href.slice(2));
    onClose();
    window.setTimeout(() => element?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return;
  }
  onClose();
};

const NavbarFullscreen = ({ logo = "Northwind", navItems = DEFAULT_NAV_ITEMS, ctaButton = DEFAULT_CTA }: NavbarFullscreenProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <nav data-section="navbar" className="fixed inset-0 z-1000 pointer-events-none">
      <div className="absolute z-10 top-5 left-1/2 -translate-x-1/2 flex items-center justify-between w-full max-w-6xl px-6 pointer-events-auto">
        <a
          href="/"
          className={cn(
            "text-xl font-medium transition-colors duration-500",
            menuOpen ? "text-background" : "text-foreground"
          )}
        >
          {logo}
        </a>

        <div className="flex items-center gap-2 xl:gap-3 2xl:gap-4">
          <a href={ctaButton.href} className="flex items-center justify-center h-10 px-6 text-sm rounded-lg cursor-pointer btn-primary bg-primary text-primary-foreground">{ctaButton.text}</a>

          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="relative flex items-center justify-center size-10 !px-0 rounded-lg cursor-pointer btn-primary bg-primary text-primary-foreground"
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
          </button>
        </div>
      </div>

      <div
        className="absolute inset-0 flex flex-col items-center justify-center bg-foreground pointer-events-auto transition-[clip-path] duration-700 ease-[cubic-bezier(0.9,0,0.1,1)]"
        style={{
          clipPath: menuOpen
            ? "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)"
            : "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)"
        }}
      >
        <div className="flex flex-col items-center">
          {navItems.map((item, index) => (
            <div key={item.name} className="overflow-hidden">
              <a
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href, () => setMenuOpen(false))}
                className="group flex items-center gap-4 py-4"
                style={{
                  transform: menuOpen ? "translateY(0%)" : "translateY(100%)",
                  transition: "transform 0.5s cubic-bezier(0.7, 0, 0.3, 1)",
                  transitionDelay: menuOpen
                    ? `${0.3 + index * 0.05}s`
                    : `${(navItems.length - 1 - index) * 0.05}s`
                }}
              >
                <p className="text-5xl md:text-8xl font-medium text-background group-hover:ml-4 transition-[margin] duration-300">
                  {item.name}
                </p>
                <ArrowUpRight
                  className="h-12 md:h-24 w-auto text-background group-hover:rotate-45 group-hover:mr-4 transition-all duration-300"
                  strokeWidth={1.5}
                />
              </a>
              {index < navItems.length - 1 && (
                <div className="h-px bg-background/20" />
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default NavbarFullscreen;
