import { useState } from "react";
import type { PointerEvent } from "react";

const hoverEase = [0.33, 1, 0.68, 1] as const;

export const useHoverDim = () => {
  const [hovered, setHovered] = useState<number | null>(null);

  const container = { onPointerLeave: () => setHovered(null) };

  const item = (index: number) => {
    const dimmed = hovered !== null && hovered !== index;
    const active = hovered === index;
    return {
      initial: false as const,
      animate: {
        opacity: dimmed ? 0.5 : 1,
        scale: dimmed ? 0.98 : active ? 1.02 : 1,
        filter: dimmed ? "blur(4px) brightness(0.4)" : "blur(0px) brightness(1)",
      },
      transition: { duration: 0.6, ease: hoverEase },
      onPointerEnter: (e: PointerEvent) => {
        if (e.pointerType === "mouse") setHovered(index);
      },
      onPointerLeave: () => setHovered((current) => (current === index ? null : current)),
    };
  };

  return { container, item };
};

export default useHoverDim;
