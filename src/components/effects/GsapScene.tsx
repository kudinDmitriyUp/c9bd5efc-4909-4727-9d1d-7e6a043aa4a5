"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin);

export type GsapSceneContext = {
  /** The wrapper element — scope every selector to it. */
  root: HTMLElement;
  gsap: typeof gsap;
  ScrollTrigger: typeof ScrollTrigger;
  SplitText: typeof SplitText;
  /** Scoped query: q(".card") only matches inside this scene. */
  q: (selector: string) => HTMLElement[];
  /** True on touch/small screens — tone effects down (no pinning, shorter distances). */
  isMobile: boolean;
};

type GsapSceneProps = {
  /**
   * Build the animation here. Runs once on mount inside useGSAP, so every
   * tween/ScrollTrigger/SplitText created here is reverted automatically on
   * unmount. Animate FROM a hidden state (gsap.from) — content must be
   * visible without JavaScript.
   */
  setup?: (ctx: GsapSceneContext) => void;
  children: ReactNode;
  className?: string;
};

/**
 * Host for hand-written GSAP animations inside stateless sections: owns the
 * ref, plugin registration, cleanup and reduced-motion handling so the
 * section only supplies the timeline.
 */
/**
 * CSS transitions on the properties GSAP animates (Tailwind `transition-all`
 * on a hover card) corrupt the tween: on ScrollTrigger refresh GSAP reads the
 * mid-transition value and records it as the END state — cards froze at
 * opacity 0. Elements GSAP targets keep only the transitions GSAP never
 * touches, so hover color/shadow effects still animate.
 */
const GSAP_CONFLICT = /\ball\b|opacity|transform|translate|scale|rotate/;
const SAFE_TRANSITIONS = "color, background-color, border-color, box-shadow, filter, backdrop-filter";
const releaseFromCssTransitions = (elements: HTMLElement[]) => {
  for (const el of elements) {
    if (GSAP_CONFLICT.test(getComputedStyle(el).transitionProperty)) {
      el.style.transitionProperty = SAFE_TRANSITIONS;
    }
  }
  return elements;
};

const GsapScene = ({ setup, children, className }: GsapSceneProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || !setup) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setup({
        root,
        gsap,
        ScrollTrigger,
        SplitText,
        q: (selector) => releaseFromCssTransitions(Array.from(root.querySelectorAll<HTMLElement>(selector))),
        isMobile: window.matchMedia("(max-width: 767px), (pointer: coarse)").matches,
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

export default GsapScene;
