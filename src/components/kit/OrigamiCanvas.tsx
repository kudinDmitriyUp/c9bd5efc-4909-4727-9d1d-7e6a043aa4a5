"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, useTexture } from "@react-three/drei";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as THREE from "three";

type OrigamiObject = "coins" | "rubik";
type OrigamiFinish = "matcap" | "studio";
type Pointer = { x: number; y: number };
type Tint = { studio: string; matcap: string; metal: string };
export type OrigamiShapeProps = { speed: number; finish: OrigamiFinish; tint: Tint };
type OrigamiCanvasProps = { className?: string; speed?: number; intensity?: number; finish?: OrigamiFinish } & ({ object: OrigamiObject; shape?: never } | { shape: ComponentType<OrigamiShapeProps>; object?: never });
type Tintable = THREE.Material & { color: THREE.Color };

const MATCAP = "https://storage.googleapis.com/webild/default/textures/origami/matcap-1.jpeg";
const COIN_COUNT = 8;
const COIN_RADIUS = 3;
const RUBIK_STEP = 1.1;
const RUBIK_CYCLE = 4.6;
const RUBIK_LAYERS = [0, 0.35, 0.7];

const STUDIO_BASE = "#121212";
const METAL_BASE = "#5c5c5c";
const DEFAULT_TINT: Tint = { studio: STUDIO_BASE, matcap: "#ffffff", metal: METAL_BASE };

function cssColor(cs: CSSStyleDeclaration, name: string, fallback: string) {
  const c = new THREE.Color(fallback);
  const v = cs.getPropertyValue(name).trim();
  if (/^#[0-9a-f]{3,8}$/i.test(v) || /^rgb/i.test(v)) c.setStyle(v, THREE.SRGBColorSpace);
  return c;
}

function readTint(el: HTMLElement): Tint {
  const cs = getComputedStyle(el);
  const hue = { h: 0, s: 0, l: 0 };
  cssColor(cs, "--tint-3", "#171717").getHSL(hue, THREE.SRGBColorSpace);
  const base = { h: 0, s: 0, l: 0 };
  new THREE.Color(STUDIO_BASE).getHSL(base, THREE.SRGBColorSpace);
  const studio = new THREE.Color().setHSL(hue.h, Math.min(hue.s * 2, 0.5), base.l + hue.s * 0.08, THREE.SRGBColorSpace);
  const a = cssColor(cs, "--accent", "#ffffff").getRGB(new THREE.Color(), THREE.SRGBColorSpace);
  const max = Math.max(a.r, a.g, a.b, 0.01);
  const lift = (v: number) => Math.min(1, Math.max(0, 1 - (1 - v / max) * 1.6));
  const matcap = new THREE.Color().setRGB(lift(a.r), lift(a.g), lift(a.b), THREE.SRGBColorSpace);
  const metal = new THREE.Color(METAL_BASE).multiply(new THREE.Color().setHSL(hue.h, Math.min(hue.s * 2.5, 0.45), hue.s > 0.02 ? 0.82 : 1, THREE.SRGBColorSpace));
  const hex = (c: THREE.Color) => `#${c.getHexString(THREE.SRGBColorSpace)}`;
  return { studio: hex(studio), matcap: hex(matcap), metal: hex(metal) };
}

function useTint(material: THREE.Material, color: string) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    (material as Tintable).color.set(color);
    invalidate();
  }, [material, color, invalidate]);
}

const step = (delta: number, speed: number) => Math.min(delta, 0.1) * speed;
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const progress = (t: number, start: number, duration: number) => easeInOut(Math.min(1, Math.max(0, (t - start) / duration)));

function useMatcap() {
  const texture = useTexture(MATCAP, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
  });
  return useMemo(() => new THREE.MeshMatcapMaterial({ matcap: texture }), [texture]);
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function paint(size: number, draw: (ctx: CanvasRenderingContext2D, rand: () => number) => void, seed: number, repeat = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, seeded(seed));
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function useStudio() {
  return useMemo(() => {
    const carbon = paint(
      128,
      (ctx) => {
        ctx.fillStyle = "#0b0b0b";
        ctx.fillRect(0, 0, 128, 128);
        for (let y = 0; y < 128; y += 16) {
          for (let x = 0; x < 128; x += 16) {
            const across = (x / 16 + y / 16) % 2 === 0;
            const g = ctx.createLinearGradient(x, y, across ? x + 16 : x, across ? y : y + 16);
            g.addColorStop(0, "#151515");
            g.addColorStop(0.5, "#3a3a3a");
            g.addColorStop(1, "#151515");
            ctx.fillStyle = g;
            ctx.fillRect(x + 1, y + 1, 14, 14);
          }
        }
      },
      3,
      3,
    );
    const brushed = paint(
      256,
      (ctx, rand) => {
        ctx.fillStyle = "#8a8a8a";
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 900; i++) {
          const v = Math.floor(90 + rand() * 90);
          ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
          ctx.fillRect(0, rand() * 256, 256, 0.6 + rand());
        }
      },
      11,
    );
    const stone = paint(
      256,
      (ctx, rand) => {
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 2600; i++) {
          const v = Math.floor(rand() < 0.75 ? 10 + rand() * 30 : 110 + rand() * 120);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          const r = rand() * 1.4 + 0.3;
          ctx.beginPath();
          ctx.arc(rand() * 256, rand() * 256, r, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      23,
    );
    const grain = paint(
      128,
      (ctx, rand) => {
        for (let i = 0; i < 128 * 128; i += 1) {
          const v = Math.floor(150 + rand() * 105);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          ctx.fillRect(i % 128, Math.floor(i / 128), 1, 1);
        }
      },
      37,
      2,
    );
    grain.colorSpace = THREE.NoColorSpace;
    const materials: THREE.Material[] = [
      new THREE.MeshPhysicalMaterial({ color: "#121212", roughness: 0.78, roughnessMap: grain, metalness: 0.1, clearcoat: 0.15, clearcoatRoughness: 0.6 }),
      new THREE.MeshPhysicalMaterial({ map: carbon, roughness: 0.42, metalness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.18 }),
      new THREE.MeshStandardMaterial({ map: brushed, color: "#9a9a9a", roughness: 0.32, metalness: 1 }),
      new THREE.MeshStandardMaterial({ map: stone, roughness: 0.88, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: METAL_BASE, roughness: 0.28, metalness: 1 }),
    ];
    const geometry = new RoundedBoxGeometry(1, 1, 1, 4, 0.13);
    return { materials, geometry };
  }, []);
}


function StudioLights() {
  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight position={[4, 6, 6]} intensity={2.2} />
      <directionalLight position={[-6, -2, -4]} intensity={1.6} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.4} position={[0, 5, -3]} scale={[10, 2.5, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-5, 0.5, 1]} rotation-y={Math.PI / 2} scale={[3, 8, 1]} />
        <Lightformer form="rect" intensity={0.9} position={[5, -1, 3]} rotation-y={-Math.PI / 2} scale={[2, 6, 1]} />
        <Lightformer form="circle" intensity={1.6} position={[2, 3, 5]} scale={1.5} />
        <Lightformer form="rect" intensity={1.1} position={[0, 1, 9]} scale={[14, 7, 1]} />
      </Environment>
    </>
  );
}

function Coin({ index, material, geometry, speed }: { index: number; material: THREE.Material; geometry: THREE.BufferGeometry; speed: number }) {
  const spin = useRef<THREE.Group>(null);
  const time = useRef(0);
  const angle = (index * 2 * Math.PI) / COIN_COUNT;
  useFrame((_, delta) => {
    const g = spin.current;
    if (!g) return;
    time.current += step(delta, speed);
    const t = time.current * 0.9 + index * 0.8;
    g.rotation.x = Math.PI / 2 + Math.sin(t) * 0.75;
    g.rotation.z = Math.cos(t * 0.8) * 0.5;
  });
  return (
    <group position={[COIN_RADIUS * Math.cos(angle + Math.PI / 4), COIN_RADIUS * Math.sin(angle + Math.PI / 4), 0]} rotation={[0, 0, angle]}>
      <group ref={spin} rotation={[Math.PI / 2, 0, 0]}>
        <mesh geometry={geometry} material={material} />
      </group>
    </group>
  );
}

function Coins({ speed, tint }: OrigamiShapeProps) {
  const matcap = useMatcap();
  useTint(matcap, tint.matcap);
  const geometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 0.1, 64), []);
  const ring = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.z -= step(delta, speed) * 0.6;
  });
  return (
    <group ref={ring} scale={0.66}>
      {Array.from({ length: COIN_COUNT }, (_, i) => (
        <Coin key={i} index={i} material={matcap} geometry={geometry} speed={speed} />
      ))}
    </group>
  );
}

function Rubik({ speed, finish, tint }: OrigamiShapeProps) {
  const matcap = useMatcap();
  const studio = useStudio();
  useTint(matcap, tint.matcap);
  useTint(studio.materials[4], tint.metal);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const geometry = finish === "studio" ? studio.geometry : box;
  const material = finish === "studio" ? studio.materials[4] : matcap;
  const spin = useRef<THREE.Group>(null);
  const layers = useRef<(THREE.Group | null)[]>([]);
  const time = useRef(0);
  const cubes = useMemo(
    () =>
      [-1, 0, 1].map((z) => {
        const list: [number, number, number][] = [];
        for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) list.push([x * RUBIK_STEP, y * RUBIK_STEP, z * RUBIK_STEP]);
        return list;
      }),
    [],
  );
  useFrame((_, delta) => {
    time.current = (time.current + step(delta, speed)) % RUBIK_CYCLE;
    const t = time.current;
    layers.current.forEach((layer, i) => {
      if (layer) layer.rotation.z = Math.PI * progress(t, RUBIK_LAYERS[i], 2.6);
    });
    if (spin.current) spin.current.rotation.y = Math.PI / 2 + Math.PI * 2 * progress(t, 0, 3.9);
  });
  return (
    <group rotation={[0, 0, Math.PI / 8]} scale={finish === "studio" ? 1.6 : 1.2}>
      <group ref={spin} rotation={[0, Math.PI / 2, 0]} scale={0.6}>
        {cubes.map((layer, i) => (
          <group
            key={i}
            ref={(g) => {
              layers.current[i] = g;
            }}
          >
            {layer.map((p, j) => (
              <mesh key={j} position={p} geometry={geometry} material={material} />
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

function Rig({ object, shape, speed, intensity, calm, pointer, finish, tint }: { object?: OrigamiObject; shape?: ComponentType<OrigamiShapeProps>; speed: number; intensity: number; calm: boolean; pointer: React.RefObject<Pointer>; finish: OrigamiFinish; tint: Tint }) {
  const tilt = useRef<THREE.Group>(null);
  const aspect = useThree((s) => s.viewport.aspect);
  useFrame((_, delta) => {
    const g = tilt.current;
    if (!g || calm) return;
    const k = 1 - Math.exp(-Math.min(delta, 0.1) * 3);
    g.rotation.y += (pointer.current.x * 0.5 * intensity - g.rotation.y) * k;
    g.rotation.x += (-pointer.current.y * 0.35 * intensity - g.rotation.x) * k;
  });
  const Shape = shape ?? (object === "coins" ? Coins : Rubik);
  return (
    <group scale={Math.min(1, aspect)}>
      {finish === "studio" && <StudioLights />}
      <Float speed={calm ? 0 : 1.2 * speed} rotationIntensity={calm ? 0 : 0.4 * intensity} floatIntensity={calm ? 0 : 0.8 * intensity} floatingRange={[-0.15, 0.15]}>
        <group ref={tilt}>
          <Shape speed={calm ? 0 : speed} finish={finish} tint={tint} />
        </group>
      </Float>
    </group>
  );
}

export default function OrigamiCanvas({ object, shape, className, speed = 1, intensity = 1, finish = "matcap" }: OrigamiCanvasProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const pointer = useRef<Pointer>({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [tint, setTint] = useState<Tint>(DEFAULT_TINT);
  const [calm] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const update = () => {
      const next = readTint(el);
      setTint((prev) => (prev.studio === next.studio && prev.matcap === next.matcap && prev.metal === next.metal ? prev : next));
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-theme"] });
    const host = el.closest("main");
    if (host) observer.observe(host, { attributes: true, attributeFilter: ["style", "class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (calm || !window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: MouseEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, [calm]);

  return (
    <div ref={wrap} className={className} style={{ pointerEvents: "none" }}>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        camera={{ fov: 35, position: [0, 0, 10] }}
        resize={{ scroll: false, offsetSize: true }}
        frameloop={visible && !calm ? "always" : "demand"}
        style={{ pointerEvents: "none", width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <Rig object={object} shape={shape} speed={speed} intensity={intensity} calm={calm} pointer={pointer} finish={finish} tint={tint} />
        </Suspense>
      </Canvas>
    </div>
  );
}
