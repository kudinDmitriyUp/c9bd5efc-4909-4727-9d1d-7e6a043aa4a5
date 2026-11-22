"use client";

import { useEffect, useRef } from "react";
import { mountCanStage, type CanFlavourSpec, type CanStageTextures } from "./canStage";
import { introSignal } from "./introSignal";
import { useWebildHold } from "./webildReady";

const MEDIA = "https://storage.googleapis.com/webild/default/templates/prebiotic-soda";

const DEFAULT_FLAVOURS: CanFlavourSpec[] = [
  { name: "Red Berry", labelSrc: `${MEDIA}/textures/weeby-berry.webp`, fruitSrcs: [`${MEDIA}/models/fruit/blueberry.glb`, `${MEDIA}/models/fruit/raspberry.glb`, `${MEDIA}/models/fruit/blackberry.glb`] },
  { name: "Guava Kiwi", labelSrc: `${MEDIA}/textures/weeby-guava.webp`, fruitSrcs: [`${MEDIA}/models/fruit/kiwi.glb`, `${MEDIA}/models/fruit/kiwi-half.glb`, `${MEDIA}/models/fruit/guava.glb`] },
  { name: "Lemon Lime", labelSrc: `${MEDIA}/textures/weeby-lemon.webp`, fruitSrcs: [`${MEDIA}/models/fruit/lemon.glb`, `${MEDIA}/models/fruit/lime.glb`, `${MEDIA}/models/fruit/lime-half.glb`] },
];

const DEFAULT_STREAMS = [
  [`${MEDIA}/models/fruit/kiwi-half.glb`, `${MEDIA}/models/fruit/guava.glb`, `${MEDIA}/models/fruit/kiwi.glb`],
  [`${MEDIA}/models/fruit/lime-half.glb`, `${MEDIA}/models/fruit/lemon.glb`, `${MEDIA}/models/fruit/lime.glb`],
];

const DEFAULT_TEXTURES: CanStageTextures = {
  noise: `${MEDIA}/textures/noise.webp`,
  dropletMatcap: `${MEDIA}/textures/droplet_matcap.webp`,
  glassAlpha: `${MEDIA}/textures/glass-alpha.webp`,
  stream: `${MEDIA}/textures/weeby-stream.png`,
  voronoi: `${MEDIA}/textures/voronoi.webp`,
  normalEdge: `${MEDIA}/textures/normal-edge.webp`,
};

export type CanFlavourStageProps = {
  flavours?: CanFlavourSpec[];
  streamFruitSrcs?: string[][];
  canSrc?: string;
  paperSrc?: string;
  envSrc?: string;
  pourCanSrc?: string;
  pourLabelSrc?: string;
  pourVideoSrc?: string;
  textures?: Partial<CanStageTextures>;
  backgroundVar?: string;
};

export default function CanFlavourStage({
  flavours = DEFAULT_FLAVOURS,
  streamFruitSrcs = DEFAULT_STREAMS,
  canSrc = `${MEDIA}/models/AnimCan.glb`,
  paperSrc = `${MEDIA}/models/Paper.glb`,
  envSrc = `${MEDIA}/env/hdr.ktx2`,
  pourCanSrc = `${MEDIA}/models/CanWater.glb`,
  pourLabelSrc = `${MEDIA}/textures/weeby-lemon.webp`,
  pourVideoSrc = `${MEDIA}/video/SodaLoop.webm`,
  textures,
  backgroundVar = "--secondary",
}: CanFlavourStageProps) {
  const frontRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const release = useWebildHold();
  const options = useRef({ flavours, streamFruitSrcs, canSrc, paperSrc, envSrc, pourCanSrc, pourLabelSrc, pourVideoSrc, textures: { ...DEFAULT_TEXTURES, ...textures }, backgroundVar });

  useEffect(() => {
    const front = frontRef.current;
    const back = backRef.current;
    if (!front || !back) return;
    const done = () => {
      introSignal.markReady();
      release();
    };
    return mountCanStage({
      ...options.current,
      front,
      back,
      onReady: done,
      onFail: () => {
        front.style.display = "none";
        back.style.display = "none";
        done();
      },
      onReveal: (start) => (introSignal.isClaimed() ? introSignal.onReveal(start) : (start(), () => {})),
    });
  }, [release]);

  return (
    <>
      <canvas ref={backRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 block h-full w-full" />
      <canvas ref={frontRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[30] block h-full w-full" />
    </>
  );
}
