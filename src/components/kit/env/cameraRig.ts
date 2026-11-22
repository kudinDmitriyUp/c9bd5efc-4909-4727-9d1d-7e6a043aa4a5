import * as THREE from "three";
import type { EnvFrame, EnvPointer } from "@/components/kit/env/EnvStage";

type Rig = { base: THREE.Vector3; focus: THREE.Vector3; yaw?: number; pitch?: number; strength?: number };

const UP = new THREE.Vector3(0, 1, 0);
const INTRO = 2.8;
const ease = (x: number) => 1 - Math.pow(1 - THREE.MathUtils.clamp(x, 0, 1), 3);

export function cameraRig(camera: THREE.PerspectiveCamera, pointer: EnvPointer, { base, focus, yaw = 0, pitch = 0, strength = 1 }: Rig) {
  const arm = new THREE.Vector3().subVectors(base, focus);
  const radius = arm.length();
  const back = new THREE.Vector3(arm.x, 0, arm.z);
  const flat = back.length() || 1;
  back.divideScalar(flat);
  const side = new THREE.Vector3().crossVectors(UP, back);
  const start = back.clone().multiplyScalar(flat * 0.42).addScaledVector(side, flat * 0.1).addScaledVector(UP, radius * 0.015);
  const off = new THREE.Vector3();
  return ({ time, intro, scroll, params }: Pick<EnvFrame, "time" | "intro" | "scroll"> & { params?: Record<string, number> }, idle = 1) => {
    const p = pointer.uPointer.value;
    const s = THREE.MathUtils.clamp(scroll, 0, 1);
    const leave = s * (2 - s) * strength;
    const length = params?.flightLength || INTRO;
    const k = ease(intro / length);
    const rest = 1 - k;
    off.copy(arm).addScaledVector(start, rest * (params?.flightDolly ?? 1)).applyAxisAngle(UP, leave * 0.22 + rest * (params?.flightOrbit ?? 0));
    off.y += leave * radius * 0.05 + rest * radius * (params?.flightRise ?? 0);
    camera.position.copy(focus).add(off);
    camera.lookAt(focus);
    camera.translateX(p.x * radius * 0.008 * strength + (Math.sin(time * 0.57) * 0.7 + Math.sin(time * 0.23 + 2) * 0.3) * radius * 0.004 * idle);
    camera.translateY(p.y * radius * 0.004 * strength + (Math.sin(time * 0.66 + 1.2) * 0.7 + Math.sin(time * 0.29) * 0.3) * radius * 0.002 * idle);
    camera.rotateY(yaw - p.x * 0.09 * strength + (Math.sin(time * 0.55) * 0.75 + Math.sin(time * 0.21 + 0.4) * 0.25) * 0.0075 * idle);
    camera.rotateX(pitch + p.y * 0.045 * strength + (Math.sin(time * 0.7 + 1) * 0.75 + Math.sin(time * 0.33 + 2.1) * 0.25) * 0.0055 * idle);
    camera.rotateZ(-p.x * 0.01 * strength - leave * 0.02 + Math.sin(time * 0.43 + 0.6) * 0.0015 * idle);
    camera.updateMatrixWorld();
  };
}
