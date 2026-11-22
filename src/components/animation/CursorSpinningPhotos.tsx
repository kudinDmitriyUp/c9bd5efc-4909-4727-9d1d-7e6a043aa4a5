"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

gsap.registerPlugin(ScrollTrigger);

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface CursorSpinningPhotosProps {
  items?: ({ imageSrc: string; videoSrc?: never } | { videoSrc: string; imageSrc?: never })[];
  className?: string;
}

const DEFAULT_ITEMS: NonNullable<CursorSpinningPhotosProps["items"]> = [
  { imageSrc: "https://images.pexels.com/photos/39219673/pexels-photo-39219673.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/8436617/pexels-photo-8436617.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/20768597/pexels-photo-20768597.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/38975946/pexels-photo-38975946.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

const CursorSpinningPhotos = ({ items = DEFAULT_ITEMS, className = "" }: CursorSpinningPhotosProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const images = Array.from(wrapper.querySelectorAll<HTMLElement>('[data-trail="item"]'));
    if (!images.length) return;

    let index = 0;
    let fadeTimeout: ReturnType<typeof setTimeout>;
    let introTween: gsap.core.Tween | undefined;

    const hide = (img: HTMLElement, duration = 0.8) => gsap.to(img, { scale: 0, rotation: 180, duration, ease: "power3.in", onComplete: () => { gsap.set(img, { autoAlpha: 0 }); } });

    const show = (x: number, y: number, fadeDelay: number) => {
      if (index >= images.length) hide(images[(index - images.length) % images.length]);
      const img = images[index % images.length];
      gsap.set(img, { x: x - img.offsetWidth / 2, y: y - img.offsetHeight / 2, zIndex: index, force3D: true });
      gsap.fromTo(img, { autoAlpha: 1, scale: 0, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.4, ease: "power4.out", overwrite: true });
      index++;
      clearTimeout(fadeTimeout);
      fadeTimeout = setTimeout(() => images.forEach((image) => hide(image)), fadeDelay);
    };

    const reset = () => {
      clearTimeout(fadeTimeout);
      images.forEach((img) => {
        gsap.killTweensOf(img);
        gsap.set(img, { autoAlpha: 0, scale: 1, rotation: 0 });
      });
    };

    const intro = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? undefined
      : ScrollTrigger.create({
          trigger: wrapper,
          start: "top 25%",
          once: true,
          onEnter: () => {
            const { width, height } = wrapper.getBoundingClientRect();
            const step = Math.max(width / 12, 60);
            const path = { t: 0 };
            let lastX = -Infinity;
            introTween = gsap.to(path, {
              t: 1,
              duration: 1.6,
              ease: "power3.inOut",
              onUpdate: () => {
                const x = width * (0.1 + path.t * 0.8);
                const y = height * (0.5 + Math.sin(path.t * Math.PI * 2) * 0.18);
                if (x - lastX < step) return;
                lastX = x;
                show(x, y, 350);
              },
            });
          },
        });

    const mm = gsap.matchMedia();

    mm.add("(min-width: 769px)", () => {
      let lastX = 0;
      let lastY = 0;
      let isActive = false;
      const threshold = window.innerWidth / 15;

      function onMove(e: MouseEvent) {
        if (!isActive) return;
        const rect = wrapper!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

        if (Math.hypot(x - lastX, y - lastY) > threshold) {
          show(x, y, 350);
          lastX = x;
          lastY = y;
        }
      }

      function onMouseLeave() {
        clearTimeout(fadeTimeout);
        images.forEach((img) => hide(img, 0.5));
        lastX = 0;
        lastY = 0;
      }

      function startTrail() {
        if (isActive || !wrapper) return;
        isActive = true;
        wrapper.addEventListener("mousemove", onMove);
        wrapper.addEventListener("mouseleave", onMouseLeave);
      }

      function stopTrail() {
        if (!isActive || !wrapper) return;
        isActive = false;
        wrapper.removeEventListener("mousemove", onMove);
        wrapper.removeEventListener("mouseleave", onMouseLeave);
        reset();
      }

      const trigger = ScrollTrigger.create({
        trigger: wrapper,
        start: "top bottom",
        end: "bottom top",
        onEnter: startTrail,
        onEnterBack: startTrail,
        onLeave: stopTrail,
        onLeaveBack: stopTrail,
      });

      return () => {
        stopTrail();
        trigger.kill();
      };
    });

    mm.add("(max-width: 768px)", () => {
      let lastScrollY = window.scrollY;
      const threshold = 100;

      function onScroll() {
        const rect = wrapper!.getBoundingClientRect();
        if (rect.top > window.innerHeight || rect.bottom < 0) return;

        if (Math.abs(window.scrollY - lastScrollY) > threshold) {
          const img = images[index % images.length];
          const x = Math.random() * (rect.width - img.offsetWidth) + img.offsetWidth / 2;
          const y = Math.random() * (rect.height - img.offsetHeight) + img.offsetHeight / 2;
          show(x, y, 500);
          lastScrollY = window.scrollY;
        }
      }

      window.addEventListener("scroll", onScroll);

      return () => {
        window.removeEventListener("scroll", onScroll);
        reset();
      };
    });

    return () => {
      mm.revert();
      intro?.kill();
      introTween?.kill();
      reset();
    };
  }, []);

  return (
    <div ref={wrapperRef} className={cn("relative w-full h-full overflow-x-clip", className)}>
      {items.map((item, i) => (
        <div key={i} data-trail="item" className="invisible rounded w-[15em] h-[20em] absolute top-0 left-0 overflow-hidden pointer-events-none">
          {item.videoSrc ? (
            <video src={item.videoSrc} className="object-cover w-full h-full" autoPlay loop muted playsInline />
          ) : (
            <img src={item.imageSrc} alt="" className="object-cover w-full h-full" />
          )}
        </div>
      ))}
    </div>
  );
};

export default CursorSpinningPhotos;
