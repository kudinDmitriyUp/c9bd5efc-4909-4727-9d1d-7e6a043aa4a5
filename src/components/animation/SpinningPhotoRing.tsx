"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { Observer } from "gsap/Observer";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

gsap.registerPlugin(Draggable, InertiaPlugin, Observer);

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const PANEL_COUNT = 12;

interface SpinningPhotoRingProps {
  items?: ({ imageSrc: string; videoSrc?: never } | { videoSrc: string; imageSrc?: never })[];
}

const DEFAULT_ITEMS: NonNullable<SpinningPhotoRingProps["items"]> = [
  { imageSrc: "https://images.pexels.com/photos/39219673/pexels-photo-39219673.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/8436617/pexels-photo-8436617.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/20768597/pexels-photo-20768597.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/38975946/pexels-photo-38975946.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { imageSrc: "https://images.pexels.com/photos/4129384/pexels-photo-4129384.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

const SpinningPhotoRing = ({ items = DEFAULT_ITEMS }: SpinningPhotoRingProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);

  const panels = Array.from({ length: PANEL_COUNT }, (_, index) => {
    const offset = Math.floor(index / 2) * 3 + (index % 2 === 0 ? 0 : 2);
    return Array.from({ length: index % 2 === 0 ? 2 : 1 }, (_, itemIndex) => items[(offset + itemIndex) % items.length]);
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let ctx: gsap.Context | undefined;
    let lastWidth = window.innerWidth;
    let timer: ReturnType<typeof setTimeout>;

    const create = () =>
      gsap.context(() => {
        const radius = window.innerWidth * 0.5;
        const panelEls = Array.from(wrap.children) as HTMLElement[];
        const content = wrap.querySelectorAll("[data-content]");
        const proxy = document.createElement("div");
        const wrapProgress = gsap.utils.wrap(0, 1);
        const dragDistance = window.innerWidth * 3;
        let startProgress = 0;

        panelEls.forEach((panel) => (panel.style.transformOrigin = `50% 50% ${-radius}px`));

        const spin = gsap.fromTo(
          panelEls,
          { rotationY: (index) => (index * 360) / panelEls.length },
          { rotationY: "-=360", duration: 30, ease: "none", repeat: -1 }
        );
        spin.progress(1000);

        const [draggable] = Draggable.create(proxy, {
          trigger: wrap,
          type: "x",
          inertia: true,
          allowNativeTouchScrolling: true,
          onPress() {
            gsap.to(content, { clipPath: "inset(5%)", duration: 0.3, ease: "power4.out", overwrite: "auto" });
            gsap.killTweensOf(spin);
            spin.timeScale(0);
            startProgress = spin.progress();
          },
          onDrag() {
            spin.progress(wrapProgress(startProgress + (this.startX - this.x) / dragDistance));
          },
          onThrowUpdate() {
            spin.progress(wrapProgress(startProgress + (this.startX - this.x) / dragDistance));
          },
          onRelease() {
            if (!this.tween || !this.tween.isActive()) gsap.to(spin, { timeScale: 1, duration: 0.1 });
            gsap.to(content, { clipPath: "inset(0%)", duration: 0.5, ease: "power4.out", overwrite: "auto" });
          },
          onThrowComplete() {
            gsap.to(spin, { timeScale: 1, duration: 0.1 });
          },
        });

        gsap.set(wrap, { rotation: 5 });

        const observer = Observer.create({
          target: window,
          type: "wheel,scroll,touch",
          onChangeY: (self) => {
            const velocity = gsap.utils.clamp(-60, 60, self.velocityY * 0.005);
            spin.timeScale(velocity);
            const settle = { value: velocity };
            gsap.to(settle, {
              value: velocity < 0 ? -1 : 1,
              duration: 1.2,
              onUpdate: () => {
                spin.timeScale(settle.value);
              },
            });
          },
        });

        return () => {
          draggable.kill();
          observer.kill();
        };
      }, wrap);

    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (window.innerWidth === lastWidth) return;
        lastWidth = window.innerWidth;
        ctx?.revert();
        ctx = create();
      }, 200);
    };

    ctx = create();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      ctx?.revert();
    };
  }, [items.length]);

  return (
    <div className="flex min-h-svh w-full items-center justify-center overflow-hidden">
      <div
        ref={wrapRef}
        className="relative z-1 mx-auto flex h-[50vw] w-[80vw] items-center justify-center text-[1vw] perspective-[90vw] transform-3d"
      >
        {panels.map((panel, index) => (
          <div
            key={index}
            className={cn("absolute z-0 flex h-[39em] w-[13em] flex-none flex-col items-stretch", index % 2 === 0 ? "justify-between" : "justify-center")}
          >
            {panel.map((item, itemIndex) => (
              <div key={itemIndex} data-content className="relative aspect-square w-full overflow-hidden">
                {item.videoSrc ? (
                  <video src={item.videoSrc} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline />
                ) : (
                  <img src={item.imageSrc} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpinningPhotoRing;
