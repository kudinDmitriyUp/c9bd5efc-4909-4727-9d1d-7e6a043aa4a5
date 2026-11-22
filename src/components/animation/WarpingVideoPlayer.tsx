"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

gsap.registerPlugin(ScrollTrigger);

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface WarpingVideoPlayerProps {
  videoSrc?: string;
  posterSrc?: string;
  className?: string;
}

type Point = [number, number];

const START_SCALE = 0.3;
const CORNER_DELAYS = [0, 0.1, 0.24, 0.14];
const BULGE = [0.6, -1, 0.6, -0.8];
const ease = gsap.parseEase("power3.inOut");
const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.3 } };

const toward = (from: Point, to: Point, distance: number): Point => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const d = Math.min(distance, length / 3);
  return [from[0] + (dx / length) * d, from[1] + (dy / length) * d];
};

const unit = (from: Point, to: Point): Point => {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
  return [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
};

const WarpingVideoPlayer = ({ videoSrc, posterSrc = "https://images.pexels.com/photos/39219673/pexels-photo-39219673.jpeg?auto=compress&cs=tinysrgb&w=1200", className = "" }: WarpingVideoPlayerProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const wasPlayingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const frame = frameRef.current;
    if (!wrap || !frame) return;

    const state = { progress: 0 };

    const render = () => {
      const width = wrap.clientWidth;
      const height = wrap.clientHeight;
      if (!width || !height) return;
      const p = state.progress;
      const cx = width / 2;
      const cy = height / 2;
      const ends: Point[] = [
        [0, 0],
        [width, 0],
        [width, height],
        [0, height],
      ];
      const corners = ends.map(([ex, ey], index): Point => {
        const t = ease(gsap.utils.clamp(0, 1, (p - CORNER_DELAYS[index]) / (1 - 0.24)));
        const sx = cx + (ex - cx) * START_SCALE;
        const sy = cy + (ey - cy) * START_SCALE;
        return [sx + (ex - sx) * t, sy + (ey - sy) * t];
      });
      const wave = Math.sin(Math.PI * p);
      const size = Math.min(width, height);
      const radius = size * (0.03 + 0.05 * wave);

      const edges = corners.map((corner, index) => {
        const next = corners[(index + 1) % 4];
        const start = toward(corner, next, radius);
        const end = toward(next, corner, radius);
        const [ux, uy] = unit(start, end);
        const third = Math.hypot(end[0] - start[0], end[1] - start[1]) / 3;
        const offset = (wave * BULGE[index] * size * 0.1) / 0.75;
        const c1: Point = [start[0] + ux * third - uy * offset, start[1] + uy * third + ux * offset];
        const c2: Point = [end[0] - ux * third - uy * offset, end[1] - uy * third + ux * offset];
        return { start, end, c1, c2, out: unit(start, c1), in: unit(c2, end) };
      });

      const handle = radius * 0.55;
      let path = `M${edges[0].start[0]},${edges[0].start[1]}`;
      edges.forEach((edge, index) => {
        const next = edges[(index + 1) % 4];
        path += ` C${edge.c1[0]},${edge.c1[1]} ${edge.c2[0]},${edge.c2[1]} ${edge.end[0]},${edge.end[1]}`;
        path += ` C${edge.end[0] + edge.in[0] * handle},${edge.end[1] + edge.in[1] * handle} ${next.start[0] - next.out[0] * handle},${next.start[1] - next.out[1] * handle} ${next.start[0]},${next.start[1]}`;
      });
      frame.style.clipPath = `path("${path} Z")`;
    };

    const ctx = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        state.progress = 1;
        render();
        return;
      }
      render();
      gsap.to(state, {
        progress: 1,
        ease: "none",
        onUpdate: render,
        scrollTrigger: { trigger: wrap, start: "top 90%", end: "center center", scrub: 1 },
      });
    }, wrap);

    const resize = new ResizeObserver(render);
    resize.observe(wrap);

    return () => {
      resize.disconnect();
      ctx.revert();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || isDragging) return;
    let frame = 0;
    const update = () => {
      const video = videoRef.current;
      if (video && video.duration > 0) setProgress((video.currentTime / video.duration) * 100);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, isDragging]);

  const seek = (clientX: number) => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar || !video.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(clientX - rect.left, rect.width)) / rect.width;
    video.currentTime = ratio * video.duration;
    setProgress(ratio * 100);
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (event: PointerEvent) => seek(event.clientX);
    const onUp = () => {
      setIsDragging(false);
      if (wasPlayingRef.current) {
        videoRef.current?.play();
        setIsPlaying(true);
      }
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging]);

  const start = () => {
    setHasStarted(true);
    setIsPlaying(true);
    videoRef.current?.play()?.catch(() => undefined);
  };

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.pause();
    else video.play()?.catch(() => undefined);
    setIsPlaying(!isPlaying);
  };

  const onPressBar = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    wasPlayingRef.current = isPlaying;
    if (isPlaying) {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
    setIsDragging(true);
    seek(event.clientX);
  };

  return (
    <div ref={wrapRef} className={cn("relative w-full aspect-square md:aspect-video", className)}>
      <div ref={frameRef} className="absolute inset-0 will-change-[clip-path]">
        <div className="relative w-full h-full overflow-hidden">
          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterSrc}
            preload="metadata"
            playsInline
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-cover"
          />
          <AnimatePresence>
            {!hasStarted && (
              <motion.button
                key="start"
                type="button"
                aria-label="Play video"
                onClick={start}
                {...fade}
                className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
              >
                {posterSrc && <img src={posterSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                <div className="relative flex items-center justify-center h-14 md:h-20 aspect-square rounded-full btn-primary bg-primary text-primary-foreground">
                  <Play className="h-4/10 w-4/10 fill-current" />
                </div>
              </motion.button>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {hasStarted && (
              <motion.button
                key="toggle"
                type="button"
                aria-label={isPlaying ? "Pause video" : "Play video"}
                onClick={toggle}
                {...fade}
                className="absolute top-5 right-5 z-10 flex items-center justify-center h-8 md:h-10 aspect-square rounded-full bg-white/20 backdrop-blur cursor-pointer"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={isPlaying ? "pause" : "play"} {...fade} className="flex items-center justify-center w-full h-full">
                    {isPlaying ? (
                      <Pause className="h-4/10 w-4/10 text-white fill-white" strokeWidth={2.5} />
                    ) : (
                      <Play className="h-4/10 w-4/10 text-white fill-white" />
                    )}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {hasStarted && (
              <motion.div key="progress" {...fade} className="absolute bottom-0 left-5 right-5 z-10">
                <div
                  ref={progressRef}
                  role="slider"
                  aria-label="Video progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  onPointerDown={onPressBar}
                  className="relative flex items-center w-full py-5 cursor-pointer select-none touch-none"
                >
                  <div className="relative w-full h-1 rounded-full overflow-hidden bg-white/20 backdrop-blur">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-white pointer-events-none" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default WarpingVideoPlayer;
