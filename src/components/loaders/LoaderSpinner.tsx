"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface LoaderSpinnerProps {
  imageSrc?: string;
  duration?: number;
  onComplete?: () => void;
}

const LoaderSpinner = ({ imageSrc = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M50 0l12 38 38 12-38 12-12 38-12-38L0 50l38-12z'/%3E%3C/svg%3E", duration = 1.3, onComplete }: LoaderSpinnerProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [shrinking, setShrinking] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = image.onerror = () => setReady(true);
    image.src = imageSrc;
    return () => {
      image.onload = image.onerror = null;
    };
  }, [imageSrc]);

  useEffect(() => {
    if (!ready) return;
    const shrink = setTimeout(() => setShrinking(true), duration * 1000);
    const hide = setTimeout(() => setIsVisible(false), duration * 1000 + 500);
    return () => {
      clearTimeout(shrink);
      clearTimeout(hide);
    };
  }, [ready, duration]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-100 flex items-center justify-center bg-foreground"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={shrinking ? { scale: 0, opacity: 0 } : ready ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
            className="w-1/2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, ease: [0.68, 0.1, 0.27, 0.9], repeat: Infinity }}
              style={{ maskImage: `url(${imageSrc})`, WebkitMaskImage: `url(${imageSrc})`, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center" }}
              className="w-full aspect-video bg-background"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoaderSpinner;
