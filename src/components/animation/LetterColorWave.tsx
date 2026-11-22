"use client";

import { Fragment, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

gsap.registerPlugin(ScrollTrigger);

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface LetterColorWaveProps {
  title?: string;
  className?: string;
}

const DIM = 0.2;
const WAVE_DURATION = 0.4;

const LetterColorWave = ({ title = "Design that ships",className = "" }: LetterColorWaveProps) => {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const chars = Array.from(el.querySelectorAll<HTMLElement>("[data-char]"));
    const probe = document.createElement("span");
    probe.className = "text-primary";
    el.appendChild(probe);
    const waveColor = getComputedStyle(probe).color;
    probe.remove();
    const endColor = getComputedStyle(el).color;

    let shown = 0;
    let isReady = false;
    const frame = requestAnimationFrame(() => (isReady = true));

    const words = Array.from(el.querySelectorAll<HTMLElement>("[data-word]"));

    const ctx = gsap.context(() => {
      gsap.set(chars, { opacity: DIM });
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.fromTo(
          words,
          { y: "0.4em", autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 1.2, ease: "expo.out", stagger: 0.04, scrollTrigger: { trigger: el, start: "top 90%", once: true } }
        );
      }
      const progress = { value: 0 };

      gsap.to(progress, {
        value: 1,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top 90%", end: "center 40%", scrub: 0.1 },
        onUpdate: () => {
          const count = Math.round(progress.value * chars.length);
          for (let i = shown; i < count; i++) {
            gsap.killTweensOf(chars[i]);
            if (!isReady) {
              gsap.set(chars[i], { opacity: 1 });
              continue;
            }
            gsap
              .timeline()
              .to(chars[i], { opacity: 1, color: waveColor, duration: WAVE_DURATION * 0.3, ease: "power2.out" })
              .to(chars[i], { color: endColor, duration: WAVE_DURATION * 0.7, ease: "power2.in" });
          }
          for (let i = count; i < shown; i++) {
            gsap.killTweensOf(chars[i]);
            gsap.to(chars[i], { opacity: DIM, color: endColor, duration: WAVE_DURATION * 0.5, ease: "none" });
          }
          shown = count;
        },
      });
    }, el);

    return () => {
      cancelAnimationFrame(frame);
      gsap.killTweensOf(chars);
      ctx.revert();
      chars.forEach((char) => (char.style.color = ""));
    };
  }, [title]);

  const words = title.split(" ");

  return (
    <h2 ref={ref} aria-label={title} className={cn("text-4xl md:text-6xl font-medium leading-tight tracking-tight text-balance", className)}>
      {words.map((word, wordIndex) => (
        <Fragment key={wordIndex}>
          <span aria-hidden="true" data-word className="inline-block indent-0 whitespace-nowrap">
            {Array.from(word, (letter, index) => (
              <span key={index} data-char>
                {letter}
              </span>
            ))}
          </span>
          {wordIndex < words.length - 1 && " "}
        </Fragment>
      ))}
    </h2>
  );
};

export default LetterColorWave;
