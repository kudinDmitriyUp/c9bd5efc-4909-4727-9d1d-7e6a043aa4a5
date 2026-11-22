"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { twMerge } from "tailwind-merge";
import { readCssColor, watchPalette } from "@/components/kit/cssColor";
import { DRACO_DECODERS } from "@/components/kit/DriverPortraitScene";
import { frameBudget } from "@/components/kit/frameBudget";
import { localMediaSrc } from "@/components/kit/mediaSrc";
import { holdWebildReady } from "@/components/kit/webildReady";

type Triple = [number, number, number];
export type CarPose = { pos: Triple; tgt: Triple; fov: number; aero?: number; wind?: number; step?: number };
export type CarFrame = { speed: number; step: number; aero: number };

type CarAeroStageProps = {
  src: string;
  root: RefObject<HTMLElement | null>;
  poses: Record<string, CarPose>;
  wheels?: string[];
  maxSpeed?: number;
  onFrame?: (frame: CarFrame) => void;
  className?: string;
};

const HM = { w: 256, h: 96, x: 3.4, z: 1.25 };

const LINE_VERT = `
attribute float aU;
attribute float aSeed;
varying float vU;
varying float vSeed;
void main() {
  vU = aU;
  vSeed = aSeed;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const LINE_FRAG = `
uniform float uFlow;
uniform float uLevel;
uniform vec3 uBase;
uniform vec3 uHot;
varying float vU;
varying float vSeed;
void main() {
  float p = fract(vU * 5.0 - uFlow + vSeed);
  float pulse = smoothstep(0.0, 0.05, p) * (1.0 - smoothstep(0.05, 0.3, p));
  float edge = smoothstep(0.0, 0.1, vU) * (1.0 - smoothstep(0.85, 1.0, vU));
  float a = (0.16 + pulse * 0.8) * uLevel * edge;
  gl_FragColor = vec4(mix(uBase, uHot, pulse) * a, a);
}`;

const HEIGHT_VERT = `
varying float vY;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vY = w.y;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const HEIGHT_FRAG = `
varying float vY;
void main() {
  gl_FragColor = vec4(clamp(vY / 2.0, 0.0, 1.0), 0.0, 0.0, 1.0);
}`;

const WHEELS = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"];
const smoothstep = (t: number) => t * t * (3 - 2 * t);

export default function CarAeroStage({ src, root, poses, wheels = WHEELS, maxSpeed = 330, onFrame, className }: CarAeroStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wheelKey = wheels.join("|");
  const live = useRef({ poses, onFrame, maxSpeed });

  useEffect(() => {
    live.current = { poses, onFrame, maxSpeed };
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const host = root.current ?? canvas.parentElement!;
    let disposed = false;
    const box = host.getBoundingClientRect();
    const release = box.bottom > 0 && box.top < innerHeight ? holdWebildReady() : () => {};
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      release();
      return;
    }
    const budget = frameBudget();
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;

    const world = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envMap = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    world.environment = envMap;
    world.environmentIntensity = 0.5;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);

    const key = new THREE.DirectionalLight(new THREE.Color(1, 1, 1), 2.2);
    key.position.set(2.5, 9, 1.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 8;
    key.shadow.blurSamples = 16;
    key.shadow.bias = -0.0004;
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
    world.add(key, key.target);
    const rimA = new THREE.PointLight(new THREE.Color(), 45, 18, 2);
    rimA.position.set(-2.5, 1.6, -5);
    const rimB = new THREE.PointLight(new THREE.Color(), 45, 18, 2);
    rimB.position.set(2.5, 1.6, 5);
    const back = new THREE.PointLight(new THREE.Color(1, 1, 1), 18, 14, 2);
    back.position.set(-6, 3.2, 0);
    const hemi = new THREE.HemisphereLight(new THREE.Color(), new THREE.Color(), 0.6);
    world.add(rimA, rimB, back, hemi);

    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.55 }));
    catcher.rotation.x = -Math.PI / 2;
    catcher.receiveShadow = true;
    world.add(catcher);
    const pool = document.createElement("canvas");
    pool.width = 256;
    pool.height = 128;
    const g = pool.getContext("2d")!;
    const grd = g.createRadialGradient(128, 64, 4, 128, 64, 124);
    grd.addColorStop(0, "rgba(0,0,0,0.9)");
    grd.addColorStop(0.5, "rgba(0,0,0,0.5)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 128);
    const poolTexture = new THREE.CanvasTexture(pool);
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 3.1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: poolTexture }));
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.002;
    world.add(contact);

    const car = new THREE.Group();
    car.rotation.y = Math.PI / 2;
    world.add(car);
    const wheelNodes: THREE.Object3D[] = [];
    let ready = false;

    const lineMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uFlow: { value: 0 }, uLevel: { value: 0 }, uBase: { value: new THREE.Color() }, uHot: { value: new THREE.Color() } },
      vertexShader: LINE_VERT,
      fragmentShader: LINE_FRAG,
    });
    let lines: THREE.LineSegments | null = null;

    const readColors = () => {
      const set = (c: THREE.Color, name: string) => c.setRGB(...readCssColor(host, name), THREE.SRGBColorSpace);
      set(rimA.color, "--accent");
      set(rimB.color, "--accent");
      set(hemi.color, "--scene-sky");
      set(hemi.groundColor, "--background");
      set(lineMat.uniforms.uBase.value, "--scene-line");
      set(lineMat.uniforms.uHot.value, "--scene-hot");
    };
    readColors();

    const buildLines = () => {
      const target = new THREE.WebGLRenderTarget(HM.w, HM.h);
      const ortho = new THREE.OrthographicCamera(-HM.x, HM.x, HM.z, -HM.z, 0.1, 20);
      ortho.position.set(0, 10, 0);
      ortho.up.set(0, 0, -1);
      ortho.lookAt(0, 0, 0);
      const temp = new THREE.Scene();
      temp.background = new THREE.Color(0, 0, 0);
      const heightMat = new THREE.ShaderMaterial({ vertexShader: HEIGHT_VERT, fragmentShader: HEIGHT_FRAG });
      temp.overrideMaterial = heightMat;
      world.remove(car);
      temp.add(car);
      car.updateMatrixWorld(true);
      renderer.setRenderTarget(target);
      renderer.render(temp, ortho);
      const data = new Uint8Array(HM.w * HM.h * 4);
      renderer.readRenderTargetPixels(target, 0, 0, HM.w, HM.h, data);
      renderer.setRenderTarget(null);
      target.dispose();
      heightMat.dispose();
      temp.remove(car);
      world.add(car);

      const heightAt = (x: number, z: number) => {
        if (Math.abs(x) > HM.x || Math.abs(z) > HM.z) return 0;
        const i = Math.floor(((x + HM.x) / (2 * HM.x)) * (HM.w - 1));
        const j = Math.floor(((HM.z - z) / (2 * HM.z)) * (HM.h - 1));
        return (data[(j * HM.w + i) * 4] / 255) * 2;
      };
      const X0 = 7;
      const X1 = -7.5;
      const STEPS = 110;
      const pos: number[] = [];
      const u: number[] = [];
      const seed: number[] = [];
      for (let zi = 0; zi < 15; zi++) {
        for (let yi = 0; yi < 6; yi++) {
          const z = -1.4 + zi * (2.8 / 14);
          const y0 = 0.1 + yi * 0.2 + (zi % 2) * 0.07;
          const h0 = Math.sin((zi * 6 + yi + 1) * 12.9898) * 43758.5453;
          const s = h0 - Math.floor(h0);
          const ys: number[] = [];
          for (let k = 0; k <= STEPS; k++) {
            const x = X0 + ((X1 - X0) * k) / STEPS;
            let h = 0;
            for (let d = -0.9; d <= 1.5; d += 0.1) h = Math.max(h, heightAt(x + d, z) * (d < 0 ? 1 + d * 0.5 : 1 - d * 0.28));
            ys.push(Math.max(y0, h + 0.06 + (h > 0 ? y0 * 0.25 : 0)));
          }
          for (let pass = 0; pass < 3; pass++) for (let k = 1; k < STEPS; k++) ys[k] = (ys[k - 1] + ys[k] * 2 + ys[k + 1]) / 4;
          for (let k = 0; k < STEPS; k++) {
            const xa = X0 + ((X1 - X0) * k) / STEPS;
            const xb = X0 + ((X1 - X0) * (k + 1)) / STEPS;
            pos.push(xa, ys[k], z, xb, ys[k + 1], z);
            u.push(k / STEPS, (k + 1) / STEPS);
            seed.push(s, s);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geometry.setAttribute("aU", new THREE.Float32BufferAttribute(u, 1));
      geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
      lines = new THREE.LineSegments(geometry, lineMat);
      lines.renderOrder = 2;
      lines.visible = false;
      world.add(lines);
    };

    let anchors: { y: number; pose: CarPose }[] = [];
    let w = 1;
    let h = 1;
    const layout = () => {
      w = canvas.clientWidth || innerWidth;
      h = canvas.clientHeight || innerHeight;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75) * budget.scale());
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const all = live.current.poses;
      anchors = Array.from(host.querySelectorAll<HTMLElement>("[data-car-pose]"))
        .map((el) => ({ y: el.getBoundingClientRect().top + scrollY, pose: all[el.dataset.carPose ?? ""] }))
        .filter((a) => a.pose)
        .sort((a, b) => a.y - b.y);
    };

    const draco = new DRACOLoader().setDecoderPath(DRACO_DECODERS);
    const loader = new GLTFLoader().setDRACOLoader(draco);
    loader.load(
      localMediaSrc(src),
      async (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        model.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = true;
          const material = mesh.material as THREE.MeshStandardMaterial;
          if (material && "envMapIntensity" in material) material.envMapIntensity = 1;
        });
        wheelKey.split("|").forEach((name) => {
          const wheel = model.getObjectByName(name);
          if (wheel) wheelNodes.push(wheel);
        });
        car.add(model);
        buildLines();
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          ([] as THREE.Material[]).concat(mesh.material).forEach((m) => {
            Object.values(m).forEach((v) => v instanceof THREE.Texture && renderer.initTexture(v));
          });
        });
        if (lines) lines.visible = true;
        layout();
        try {
          await renderer.compileAsync(world, camera);
        } catch {
          release();
          return;
        }
        if (disposed) return;
        const culled: THREE.Object3D[] = [];
        world.traverse((o) => {
          if (!o.frustumCulled) return;
          culled.push(o);
          o.frustumCulled = false;
        });
        camera.lookAt(0, 0.5, 0);
        renderer.shadowMap.needsUpdate = true;
        renderer.render(world, camera);
        culled.forEach((o) => (o.frustumCulled = true));
        if (lines) lines.visible = false;
        ready = true;
        release();
        start();
      },
      undefined,
      () => release(),
    );

    const first = Object.values(live.current.poses)[0];
    const camGoal = new THREE.Vector3();
    const tgtGoal = new THREE.Vector3();
    const look = new THREE.Vector3(0, 0.5, 0);
    camera.position.set(...first.pos);
    const m = { flow: 0, fov: 30, aero: 0, wind: 0, spin: 0, mx: 0, my: 0, tmx: 0, tmy: 0, step: -1, speed: -1 };
    const onPointer = (e: PointerEvent) => {
      m.tmx = (e.clientX / innerWidth) * 2 - 1;
      m.tmy = (e.clientY / innerHeight) * 2 - 1;
    };
    addEventListener("pointermove", onPointer, { passive: true });

    const poseAt = (y: number) => {
      if (!anchors.length) return { A: first, B: first, t: 0 };
      if (y <= anchors[0].y) return { A: anchors[0].pose, B: anchors[0].pose, t: 0 };
      for (let i = 0; i < anchors.length - 1; i++) {
        if (y <= anchors[i + 1].y) return { A: anchors[i].pose, B: anchors[i + 1].pose, t: smoothstep((y - anchors[i].y) / (anchors[i + 1].y - anchors[i].y)) };
      }
      const last = anchors[anchors.length - 1].pose;
      return { A: last, B: last, t: 0 };
    };

    let raf = 0;
    let shown = false;
    let grace = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = 0;
      if (disposed || document.hidden) return;
      if (!shown && grace-- <= 0) {
        last = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      if (last && budget.measure(now - last)) layout();
      last = now;
      const f = 1 - Math.pow(1 - 0.08, dt * 60);
      m.mx += (m.tmx - m.mx) * f * 0.5;
      m.my += (m.tmy - m.my) * f * 0.5;
      const { A, B, t } = poseAt(scrollY + innerHeight * 0.5);
      const narrow = w / h < 1 ? 1 + (1 - w / h) * 1.1 : 1;
      camGoal.set(A.pos[0] + (B.pos[0] - A.pos[0]) * t, A.pos[1] + (B.pos[1] - A.pos[1]) * t, A.pos[2] + (B.pos[2] - A.pos[2]) * t).multiplyScalar(narrow);
      tgtGoal.set(A.tgt[0] + (B.tgt[0] - A.tgt[0]) * t, A.tgt[1] + (B.tgt[1] - A.tgt[1]) * t, A.tgt[2] + (B.tgt[2] - A.tgt[2]) * t);
      camGoal.x += m.mx * 0.35;
      camGoal.y -= m.my * 0.15;
      camera.position.lerp(camGoal, f);
      look.lerp(tgtGoal, f);
      camera.lookAt(look);
      const mix = (k: "fov" | "aero" | "wind" | "step", d: number) => (A[k] ?? d) + ((B[k] ?? d) - (A[k] ?? d)) * t;
      m.fov += (mix("fov", 30) - m.fov) * f;
      camera.fov = m.fov;
      camera.updateProjectionMatrix();
      m.aero += (mix("aero", 0) - m.aero) * f * 0.9;
      m.wind += (mix("wind", 0) - m.wind) * f * 0.9;
      m.flow += (0.05 + m.wind * 1.8) * dt;
      lineMat.uniforms.uFlow.value = m.flow;
      lineMat.uniforms.uLevel.value = m.aero * (0.35 + m.wind * 0.65);
      if (lines) lines.visible = m.aero > 0.01;
      m.spin -= m.wind * m.aero * 40 * dt;
      wheelNodes.forEach((wheel) => (wheel.rotation.x = -m.spin));
      const speed = Math.round(m.wind * m.aero * live.current.maxSpeed);
      const step = m.aero > 0.5 ? Math.round(mix("step", 0)) : -1;
      if (speed !== m.speed || step !== m.step) {
        m.speed = speed;
        m.step = step;
        live.current.onFrame?.({ speed, step, aero: m.aero });
      }
      if (ready) renderer.render(world, camera);
    };
    const start = () => {
      if (!raf && !disposed && !document.hidden && (shown || grace > 0)) raf = requestAnimationFrame(tick);
    };
    const onScreen = new IntersectionObserver(([e]) => {
      shown = e.isIntersecting;
      if (shown) {
        grace = 10;
        start();
      }
    });
    onScreen.observe(host);
    const onVisible = () => start();
    document.addEventListener("visibilitychange", onVisible);
    const sizer = new ResizeObserver(layout);
    sizer.observe(host);
    addEventListener("resize", layout);
    const unwatch = watchPalette(host, readColors);
    layout();

    return () => {
      disposed = true;
      release();
      cancelAnimationFrame(raf);
      onScreen.disconnect();
      sizer.disconnect();
      unwatch();
      removeEventListener("resize", layout);
      removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisible);
      world.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh && !(o as THREE.LineSegments).isLineSegments) return;
        mesh.geometry?.dispose();
        ([] as THREE.Material[]).concat(mesh.material).forEach((mat) => {
          Object.values(mat).forEach((v) => v instanceof THREE.Texture && v.dispose());
          mat.dispose();
        });
      });
      envMap.dispose();
      draco.dispose();
      renderer.dispose();
    };
  }, [src, root, wheelKey]);

  return <canvas ref={canvasRef} aria-hidden="true" className={twMerge("absolute inset-0 block size-full", className)} />;
}
