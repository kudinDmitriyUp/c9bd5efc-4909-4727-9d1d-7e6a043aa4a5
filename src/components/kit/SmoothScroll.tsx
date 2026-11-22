"use client";

import { useEffect, useState } from "react";
import { ReactLenis } from "lenis/react";

const SmoothScroll = () => {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return on ? <ReactLenis root options={{ lerp: 0.1, anchors: true }} /> : null;
};

export default SmoothScroll;
