"use client";

import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { primeVideo } from "@/components/kit/videoPlayback";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

gsap.registerPlugin(ScrollTrigger);

interface ScrollPacedVideoProps {
  videoSrc?: string;
  children?: React.ReactNode;
  scrollLength?: string;
  className?: string;
}

const ScrollPacedVideo = ({
  videoSrc,
  children,
  scrollLength = "300vh",
  className = "",
}: ScrollPacedVideoProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      setIsLoaded(true);
      return;
    }
    primeVideo(video);

    const onReady = () => setIsLoaded(true);
    if (video.readyState >= 2) setIsLoaded(true);
    else video.addEventListener("loadeddata", onReady, { once: true });

    const timeout = setTimeout(() => setIsLoaded(true), 8000);
    return () => {
      video.removeEventListener("loadeddata", onReady);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => setShowLoader(false), 300);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  useGSAP(
    () => {
      if (!isLoaded) return;
      const video = videoRef.current;
      if (!video) return;

      const setup = () =>
        ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
          onUpdate: (self) => {
            if (video.duration) video.currentTime = video.duration * self.progress;
          },
        });

      if (video.readyState >= 1) setup();
      else video.addEventListener("loadedmetadata", setup, { once: true });
    },
    { scope: sectionRef, dependencies: [isLoaded] }
  );

  return (
    <>
      <AnimatePresence>
        {showLoader && (
          <motion.div
            className="fixed inset-0 z-1001 flex items-center justify-center bg-background"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={sectionRef} className="relative" style={{ height: scrollLength }}>
        <div className={cn("sticky top-0 overflow-hidden w-full h-svh", className)}>
          {videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <img
              src="https://images.pexels.com/photos/39219673/pexels-photo-39219673.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <motion.div
            className="relative z-10 h-full"
            initial={{ opacity: 0, y: 30 }}
            animate={!showLoader ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default ScrollPacedVideo;
