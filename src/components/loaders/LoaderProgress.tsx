"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface LoaderProgressProps {
  imageSrc?: string;
  title?: string;
  onComplete?: () => void;
}

const LoaderProgress = ({ imageSrc = "https://images.pexels.com/photos/1179863/pexels-photo-1179863.jpeg?auto=compress&cs=tinysrgb&w=1200", title = "Design that ships",onComplete }: LoaderProgressProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div className="fixed inset-0 z-100 text-background">
          <motion.div
            className="absolute inset-0 w-full h-full bg-foreground"
            exit={{ y: "-101%" }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-2 bg-background"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: introComplete ? 0 : 1 }}
              style={{ originX: introComplete ? 1 : 0 }}
              transition={{ duration: introComplete ? 0.4 : 1.4, ease: introComplete ? [0.76, 0, 0.24, 1] : [0.33, 0, 0.2, 1] }}
              onAnimationComplete={() => {
                if (!introComplete) {
                  setIntroComplete(true);
                } else {
                  setIsVisible(false);
                }
              }}
            />
          </motion.div>

          <motion.div
            className="relative z-2 flex flex-col justify-center items-center w-full h-full gap-4 md:gap-5"
            animate={introComplete ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="card p-px rounded-full">
              <img
                src={imageSrc}
                alt=""
                className="size-12 md:size-16 rounded-full object-cover"
              />
            </div>
            <div className="relative flex justify-center items-center">
              <p className="absolute text-center text-2xl md:text-4xl font-medium tracking-tight opacity-20">
                {title}
              </p>
              <motion.p
                className="text-2xl md:text-4xl font-medium tracking-tight"
                initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
                animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
                transition={{ duration: 1.4, ease: [0.33, 0, 0.2, 1] }}
              >
                {title}
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoaderProgress;
