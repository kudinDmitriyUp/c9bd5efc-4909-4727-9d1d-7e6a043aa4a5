import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { EnvContext, EnvFrame, EnvParam } from "@/components/kit/env/EnvStage";
import * as S from "@/components/kit/env/skyline";
import { cameraRig } from "@/components/kit/env/cameraRig";

export const SCENE_PARAMS: EnvParam[] = [];

export const SCENE_VARIANTS: Record<string, { params?: Record<string, number>; colors?: Record<string, string> }> = {
  waterfront: {
    params: { glow: 0.75, haze: 0.8, flare: 0.35, bloom: 0.6 },
    colors: { "--skyline-sky": "#5f8fc6", "--skyline-haze": "#dfe2e4", "--skyline-glow": "#fff1d8", "--skyline-cloud": "#f4f3f0", "--skyline-glass": "#3a5372", "--skyline-water": "#25465e" },
  },
};

let cache: ReturnType<typeof build> | null = null;
const glsl = () => (cache ??= build());

function build() {
  const T = S.TOWER_FRAGMENT;
  const helpers = T.slice(T.indexOf("float box("), T.indexOf("void main(){"));
  const body = T.slice(T.indexOf("  vec3 n = normalize(vN);"), T.indexOf("  vec3 col = shade("));

  const KINDS = `
  if (k > 10.5) {
    vec3 wp = vClipP;
    float va = .5 + .25 * sin(wp.x * 2.3 + wp.z * 1.7 + wp.y * 3.1) + .25 * sin(wp.z * 3.7 - wp.x * 1.3 + wp.y * 2.3);
    alb = uGrass * mix(.5, 1.05, va) * mix(.7, 1.12, smoothstep(-.4, .9, n.y));
    F0 = vec3(.03);
    rough = .8;
    pn = normalize(n + vec3(sin(wp.y * 9. + wp.x * 7.), 0., cos(wp.y * 8. - wp.z * 7.)) * .25 * nfade(wp.y * 1.4, .2));
  }`;

  const BUILD_VERTEX = `
attribute float aKind, aBase;
uniform float uMirror, uWaterY;
varying vec3 vObj, vWorld, vN, vON, vClipP;
varying vec2 vUv;
varying float vKind, vBase;
void main(){
  vObj = position;
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.);
  vClipP = w.xyz;
  vec3 nn = mat3(modelMatrix) * normal;
  if (uMirror < 0.) { w.y = 2. * uWaterY - w.y; nn.y = -nn.y; }
  vWorld = w.xyz;
  vN = nn;
  vON = normal;
  vKind = aKind;
  vBase = aBase;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

  const FOG = `
uniform float uFogK, uFogMax;
vec3 fogged(vec3 col, vec3 v, float dist){
  vec3 air = mix(horizonCol(-v), mix(uHaze, uSky, .25), .25);
  return mix(col, air, clamp(1. - exp(-max(dist - uFog * .8, 0.) * uFogK * uHazeK), 0., uFogMax));
}`;

  const BUILD_FRAGMENT = `
${S.COMMON}
uniform float uFloor, uVis, uCloudY, uEnvLod, uFog, uPier, uWash, uWaterY, uClip;
uniform vec3 uBands, uGrass, uWater, uWin;
uniform sampler2D uEnv;
varying vec3 vObj, vWorld, vN, vON, vClipP;
varying vec2 vUv;
varying float vKind, vBase;
${FOG}
${helpers}
void main(){
  if (vClipP.y < uClip) discard;
${body}
${KINDS}
  vec3 col = shade(alb, F0, rough, pn, v, L, ao) + uGlow * uGlowK * rim * .3;
  col = fogged(col, v, length(vWorld - cameraPosition));
  col = mix(col, mix(uCloud, horizonCol(-v), .35), smoothstep(uWaterY + uWash, uWaterY - .3, vClipP.y) * .45);
  gl_FragColor = vec4(min(col, vec3(1.)) + (hash(gl_FragCoord.xy) - .5) / 160., 1.);
}`;

  const PLANE_VERTEX = `
varying vec3 vWorld;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

  const GROUND_FRAGMENT = `
${S.COMMON}
uniform float uCloudY, uEnvLod, uFog, uGridA, uStreet, uRoofs, uFill, uLand;
uniform vec2 uBlock, uCoast;
uniform vec3 uGrass, uWater;
uniform sampler2D uEnv;
varying vec3 vWorld;
${FOG}
${helpers}
void main(){
  vec3 v = normalize(cameraPosition - vWorld);
  float dist = length(vWorld - cameraPosition);
  float c = cos(uGridA), s = sin(uGridA);
  vec2 q = vec2(vWorld.x * c - vWorld.z * s, vWorld.x * s + vWorld.z * c);
  vec2 g = q / uBlock;
  vec2 cell = floor(g);
  vec2 fw = fwidth(g);
  float fd = 1. - smoothstep(.1, .35, max(fw.x, fw.y));
  float road = max(lines(g.x, uStreet / uBlock.x), lines(g.y, uStreet / uBlock.y));
  float walk = max(lines(g.x, (uStreet + .7) / uBlock.x), lines(g.y, (uStreet + .7) / uBlock.y));
  vec2 rq = q / 2.7;
  vec2 rw = fwidth(rq);
  float rf = 1. - smoothstep(.12, .4, max(rw.x, rw.y));
  float rh = hash(floor(rq) + 1.7);
  vec3 roofs = mix(vec3(.52, .51, .5), mix(vec3(.36, .37, .4), vec3(.74, .71, .66), rh) * (1. - .3 * max(lines(rq.x, .05), lines(rq.y, .05))), rf);
  float far = uRoofs * smoothstep(uFill, uFill + 30., dist);
  float park = step(hash(cell + 7.3), .13) * far;
  vec3 block = mix(vec3(.64, .61, .56), roofs, far);
  block = mix(block, uGrass * mix(.85, 1.05, rh * rf + .5 * (1. - rf)), park);
  vec3 avg = mix(mix(vec3(.64, .61, .56), vec3(.53, .52, .5), far), uGrass * .95, .13 * far);
  block = mix(avg, block, fd);
  vec3 alb = mix(block, vec3(.7, .68, .64), walk);
  alb = mix(alb, vec3(.27, .28, .3), road);
  vec3 up = vec3(0., 1., 0.);
  vec3 L = normalize(vec3(uSun.x * 1.5, .5, uSun.z * -.1));
  vec3 col = alb * (envAt(up, uEnvLod) * .8 + uGlow * 2.4 * uGlowK * L.y * .32);
  if (uCoast.y > 0.) {
    float edge = vWorld.z - (uCoast.x + sin(vWorld.x * .013) * uCoast.y + sin(vWorld.x * .041 + 1.) * uCoast.y * .3);
    float sea = clamp(-edge / max(fwidth(edge), 1e-3) + .5, 0., 1.);
    if (uLand > .5 && sea < .01) discard;
    float F = .02 + .98 * pow(1. - max(v.y, 0.), 5.);
    vec3 R = reflect(-v, up);
    vec3 w = mix(uWater * (envAt(up, uEnvLod) * .7 + .1), skyCol(R), clamp(F * 1.2 + .1, 0., 1.));
    w += uGlow * uGlowK * pow(max(dot(R, uSun), 0.), 60.) * .6;
    vec3 beach = vec3(.78, .72, .6) * (envAt(up, uEnvLod) * .8 + uGlow * 2.4 * uGlowK * L.y * .32);
    col = mix(col, beach, clamp(1. - abs(edge + 2.) / max(fwidth(edge) * 2., 3.), 0., 1.) * (1. - uLand));
    col = mix(col, w, uLand > .5 ? 0. : sea);
  }
  col = fogged(col, v, dist);
  col = mix(col, horizonCol(-v), smoothstep(.03, .0, v.y));
  gl_FragColor = vec4(col + (hash(gl_FragCoord.xy) - .5) / 160., 1.);
}`;

  const WATER_FRAGMENT = `
${S.COMMON}
uniform float uCloudY, uEnvLod, uFog, uRipple;
uniform vec2 uRes;
uniform vec3 uWater;
uniform sampler2D uEnv, uRefl;
varying vec3 vWorld;
${FOG}
${helpers}
const vec3 WV[6] = vec3[6](vec3(9., .05, .3), vec3(5.3, .03, -.5), vec3(3.1, .018, 1.1), vec3(1.9, .01, -1.3), vec3(1.1, .006, .6), vec3(.6, .003, 2.));
void main(){
  vec3 v = normalize(cameraPosition - vWorld);
  float dist = length(vWorld - cameraPosition);
  vec2 p = vWorld.xz;
  vec2 fw = fwidth(p);
  float fp = max(fw.x, fw.y);
  vec2 gr = vec2(0.);
  for (int i = 0; i < 6; i++) {
    vec3 w = WV[i];
    float k = 6.2832 / w.x;
    vec2 d = vec2(cos(w.z), sin(w.z));
    float x = k * dot(d, p) - sqrt(9.8 * k) * .35 * uTime + float(i) * 1.7;
    gr += d * k * w.y * cos(x) * (1. - smoothstep(.12, .45, fp / w.x));
  }
  gr *= uRipple;
  vec3 n = normalize(vec3(-gr.x, 1., -gr.y));
  float F = .02 + .98 * pow(1. - max(dot(n, v), 0.), 5.);
  vec3 R = reflect(-v, n);
  vec2 suv = gl_FragCoord.xy / uRes;
  float sc = 1. / (1. + dist * .025);
  vec2 off = vec2(n.x * .6, n.z) * .05 * sc;
  float spread = .004 * sc + .002;
  vec4 r = texture2D(uRefl, suv + off) * .4 + texture2D(uRefl, suv + off + vec2(0., spread)) * .3 + texture2D(uRefl, suv + off - vec2(0., spread)) * .3;
  vec3 refl = skyCol(R) * (1. - r.a) + r.rgb;
  vec3 body = uWater * (envAt(vec3(0., 1., 0.), uEnvLod) * .6 + .12);
  vec3 col = mix(body, refl, clamp(F * 1.3 + .28, 0., 1.));
  float sd = max(dot(R, uSun), 0.);
  col += uGlow * uGlowK * (pow(sd, 400.) * 1.6 + pow(sd, 40.) * .18);
  col = fogged(col, v, dist);
  col = mix(col, horizonCol(-v), smoothstep(.03, .0, v.y));
  gl_FragColor = vec4(col + (hash(gl_FragCoord.xy) - .5) / 160., 1.);
}`;

  const SKY_FRAGMENT = `
${S.COMMON}
uniform vec3 uFloorC;
varying vec3 vRay;
void main(){
  vec3 d = normalize(vRay);
  vec3 c = skyCol(d);
  c = mix(c, uFloorC, smoothstep(0., -.2, d.y));
  gl_FragColor = vec4(c + (hash(gl_FragCoord.xy) - .5) / 160., 1.);
}`;

  const COPY_FRAGMENT = `
uniform sampler2D uSrc;
varying vec2 vUv;
void main(){ gl_FragColor = vec4(texture2D(uSrc, vUv).rgb, 1.); }`;

  return { BUILD_VERTEX, BUILD_FRAGMENT, PLANE_VERTEX, GROUND_FRAGMENT, WATER_FRAGMENT, SKY_FRAGMENT, COPY_FRAGMENT };
}

type Ground = { y: number; block: [number, number]; street: number; roofs: number; fill: number; coast?: [number, number]; land?: boolean };
type Layout = {
  grid: number;
  field: THREE.BufferGeometry[];
  floor: number;
  ground?: Ground;
  water?: number;
  cam: { y: number; pitch: number; orbit: number };
  sun: [number, number];
  fog: [number, number, number];
};

const toWorld = (gx: number, gz: number, a: number): [number, number] => [gx * Math.cos(a) + gz * Math.sin(a), -gx * Math.sin(a) + gz * Math.cos(a)];
const toGrid = (wx: number, wz: number, a: number): [number, number] => toWorld(wx, wz, -a);
const inView = (wx: number, wz: number, spread: number, margin: number) => wz < 0 && Math.abs(wx) < -wz * S.TAN_X * spread + margin;
const blob = (r: number, x: number, y: number, z: number, sy = 1.15, detail = 1) => S.part(mergeVertices(new THREE.IcosahedronGeometry(r, detail).scale(1, sy, 1).translate(x, y, z)), 11);

const KINDS_TALL = [0, 0, 0, 7, 7, 2, 6, 0];

const tower = (out: THREE.BufferGeometry[], R: () => number, x: number, z: number, y0: number, w: number, d: number, h: number) => {
  const kind = KINDS_TALL[Math.floor(R() * KINDS_TALL.length)];
  if (R() < 0.45) out.push(S.box(w + 0.8, y0, y0 + 1.2 + R() * 1.6, R() < 0.5 ? 7 : 2, x, d + 0.8, z));
  out.push(S.box(w, y0, y0 + h, kind, x, d, z));
  let top = y0 + h;
  if (h > 9 && R() < 0.4) {
    const t2 = h * (0.1 + R() * 0.12);
    out.push(S.box(w * 0.72, top, top + t2, kind, x, d * 0.72, z));
    top += t2;
    out.push(S.box(w * 0.72 + 0.06, top, top + 0.12, 3, x, d * 0.72 + 0.06, z));
  } else out.push(S.box(w + 0.06, top, top + 0.12, 3, x, d + 0.06, z));
};

const farShore = (R: () => number, y: number, shore: number, depth: number, core: number, spread: number, lift: number, peaks: [number, number, number][]) => {
  const grid = S.YAW;
  const field: THREE.BufferGeometry[] = [];
  for (let gi = -70; gi <= 70; gi++)
    for (let gj = -80; gj <= -10; gj++) {
      const cx = (gi + 0.5) * 12, cz = (gj + 0.5) * 12;
      const [wx, wz] = toWorld(cx, cz, grid);
      const D = -wz;
      if (!inView(wx, wz, 1.2, 20) || wz > shore - 8 + Math.sin(wx * 0.013) * 22 || D > -shore + depth) continue;
      const c = Math.exp(-(((wx / (D * S.TAN_X) - core) / spread) ** 2));
      if (R() > 0.12 + 0.88 * c) continue;
      for (let k = 0; k < 2; k++) {
        if (R() < 0.3) continue;
        const h = 2 + R() * 6 + c * lift * Math.pow(R(), 2.2);
        tower(field, R, cx + (k - 0.5) * 5.5, cz + (R() - 0.5) * 3, y + 0.3, 2.6 + R() * 3, 2 + R() * 3, h);
      }
    }
  for (const [f, D, h] of peaks) {
    const [gx, gz] = toGrid(f * D * S.TAN_X, -D, grid);
    tower(field, R, gx, gz, y + 0.3, 6, 6, h);
  }
  return field;
};

function waterfront(xs: number): Layout {
  const y = -7.9;
  const R = S.rng(11);
  const field = farShore(R, y, -330, 300, 0.42 * xs, 0.4, 22, [
    [0.4 * xs, 380, 46],
    [0.56 * xs, 410, 34],
  ]);
  const [hx, hz] = toGrid(-0.8 * 470 * S.TAN_X, -470, S.YAW);
  field.push(blob(120, hx, y - 3, hz, 0.12, 3));
  return {
    grid: S.YAW,
    field,
    floor: 0.24,
    water: y,
    ground: { y: y + 0.3, block: [12, 12], street: 1.4, roofs: 1, fill: 0, coast: [-330, 22], land: true },
    cam: { y: 0, pitch: 0, orbit: S.ORBIT_R },
    sun: [1, 0.07],
    fog: [0.0035, 0.88, 44],
  };
}

export function setupScene({ scene, camera, small, colors, pointer, renderer }: EnvContext) {
  const g = glsl();
  const xs = small ? 0.42 : 1;
  const lay = waterfront(xs);
  camera.far = 2400;
  camera.updateProjectionMatrix();
  const sun = new THREE.Vector3(S.TAN_X * lay.sun[0], S.TAN_Y * lay.sun[1], -1).normalize();
  const shared = { uTime: { value: 0 }, uTan: { value: new THREE.Vector2(1, 1) }, uSun: { value: sun }, uGlowK: { value: 1 }, uHazeK: { value: 1 } };
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(d: T) => (disposables.push(d), d);
  const quad = keep(new THREE.PlaneGeometry(2, 2));
  const screen = (material: THREE.ShaderMaterial, order: number) => {
    const mesh = new THREE.Mesh(quad, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = order;
    return mesh;
  };

  const envW = small ? 256 : 512;
  const envRT = keep(new THREE.WebGLRenderTarget(envW, envW / 2, { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping }));
  const floorC = new THREE.Vector3();
  const fogU = { uFogK: { value: lay.fog[0] }, uFogMax: { value: lay.fog[1] }, uFog: { value: lay.fog[2] } };
  const envShared = { uEnv: { value: envRT.texture }, uEnvLod: { value: Math.log2(envW) - 2 }, ...fogU };
  const waterY = { value: lay.water ?? -1e4 };
  const mirror = { value: 1 };
  const clip = { value: -1e4 };
  const groundY = lay.ground?.y ?? lay.water ?? -40;

  const world = new THREE.Scene();
  const skyMat = keep(new THREE.ShaderMaterial({ vertexShader: S.RAY_VERTEX, fragmentShader: g.SKY_FRAGMENT, depthTest: false, depthWrite: false, uniforms: { ...colors, ...shared, uFloorC: { value: floorC } } }));
  const sky = screen(skyMat, -1);
  world.add(sky);
  const envScene = new THREE.Scene();
  const envGeo = keep(new THREE.PlaneGeometry(2, 2, 64, 32));
  const envMesh = new THREE.Mesh(envGeo, keep(new THREE.ShaderMaterial({ vertexShader: S.EQ_VERTEX, fragmentShader: g.SKY_FRAGMENT, depthTest: false, depthWrite: false, uniforms: { ...colors, ...shared, uFloorC: { value: floorC } } })));
  envMesh.frustumCulled = false;
  envScene.add(envMesh);
  const envCam = new THREE.PerspectiveCamera();

  const buildMat = (u: { floor: number; bands?: [number, number, number]; pier?: number; wash?: number }) =>
    keep(
      new THREE.ShaderMaterial({
        vertexShader: g.BUILD_VERTEX,
        fragmentShader: g.BUILD_FRAGMENT,
        uniforms: {
          ...colors,
          ...shared,
          ...envShared,
          uFloor: { value: u.floor },
          uBands: { value: new THREE.Vector3(...(u.bands ?? [99, 99, 0.1])) },
          uVis: { value: 1 },
          uCloudY: { value: groundY },
          uPier: { value: u.pier ?? 0 },
          uWash: { value: lay.water !== undefined ? Math.min(u.wash ?? 6, 3) : 0 },
          uWaterY: waterY,
          uMirror: mirror,
          uClip: clip,
        },
      }),
    );

  const distScene = new THREE.Scene();
  const distMat = keep(new THREE.ShaderMaterial({ vertexShader: S.DIST_VERTEX, fragmentShader: S.DIST_FRAGMENT, depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
  const mats: THREE.ShaderMaterial[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.ShaderMaterial, x: number, z: number, yaw: number) => {
    keep(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.position.set(x, 0, z);
    mesh.rotation.y = yaw;
    world.add(mesh);
    const ghost = new THREE.Mesh(geo, distMat);
    ghost.frustumCulled = false;
    ghost.position.copy(mesh.position);
    ghost.rotation.y = yaw;
    distScene.add(ghost);
    mats.push(mat);
  };
  if (lay.field.length) add(mergeGeometries(lay.field, false)!, buildMat({ floor: lay.floor }), 0, 0, lay.grid);

  const groundMat = lay.ground
    ? keep(
        new THREE.ShaderMaterial({
          vertexShader: g.PLANE_VERTEX,
          fragmentShader: g.GROUND_FRAGMENT,
          uniforms: {
            ...colors,
            ...shared,
            ...envShared,
            uCloudY: { value: lay.ground.y },
            uGridA: { value: lay.grid },
            uBlock: { value: new THREE.Vector2(...lay.ground.block) },
            uStreet: { value: lay.ground.street },
            uRoofs: { value: lay.ground.roofs },
            uFill: { value: lay.ground.fill },
            uCoast: { value: new THREE.Vector2(...(lay.ground.coast ?? [0, 0])) },
            uLand: { value: lay.ground.land ? 1 : 0 },
          },
        }),
      )
    : null;
  const flat = keep(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2));
  let ground: THREE.Mesh | null = null;
  if (groundMat && lay.ground) {
    ground = new THREE.Mesh(flat, groundMat);
    ground.frustumCulled = false;
    ground.position.y = lay.ground.y;
    world.add(ground);
  }

  const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const mainRT = keep(new THREE.WebGLRenderTarget(2, 2, { ...rtOpts, depthBuffer: true, samples: 4 }));
  const reflRT = keep(new THREE.WebGLRenderTarget(2, 2, { ...rtOpts, depthBuffer: true }));
  const res = new THREE.Vector2(2, 2);
  let water: THREE.Mesh | null = null;
  if (lay.water !== undefined) {
    const waterMat = keep(new THREE.ShaderMaterial({ vertexShader: g.PLANE_VERTEX, fragmentShader: g.WATER_FRAGMENT, uniforms: { ...colors, ...shared, ...envShared, uCloudY: { value: lay.water }, uRefl: { value: reflRT.texture }, uRes: { value: res }, uRipple: { value: 0.7 } } }));
    water = new THREE.Mesh(flat, waterMat);
    water.frustumCulled = false;
    water.position.y = lay.water;
    world.add(water);
  }

  const distRT = keep(new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, format: THREE.RedFormat, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }));
  scene.add(screen(keep(new THREE.ShaderMaterial({ vertexShader: S.RAY_VERTEX, fragmentShader: g.COPY_FRAGMENT, depthTest: false, depthWrite: false, blending: THREE.NoBlending, uniforms: { uSrc: { value: mainRT.texture }, uTan: shared.uTan } })), 0));

  const bloomOpts = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const bloomA = keep(new THREE.WebGLRenderTarget(2, 2, bloomOpts));
  const bloomB = keep(new THREE.WebGLRenderTarget(2, 2, bloomOpts));
  const blur = (src: THREE.Texture, thresh: number) => {
    const material = keep(new THREE.ShaderMaterial({ vertexShader: S.RAY_VERTEX, fragmentShader: S.BLUR_FRAGMENT, depthTest: false, depthWrite: false, blending: THREE.NoBlending, uniforms: { uSrc: { value: src }, uDir: { value: new THREE.Vector2() }, uThresh: { value: thresh }, uTan: shared.uTan } }));
    const s = new THREE.Scene();
    s.add(screen(material, 0));
    return { s, dir: material.uniforms.uDir.value as THREE.Vector2 };
  };
  const blurH = blur(mainRT.texture, 0.9);
  const blurV = blur(bloomA.texture, -1);
  const veilMat = keep(new THREE.ShaderMaterial({ vertexShader: S.RAY_VERTEX, fragmentShader: S.VEIL_FRAGMENT, transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, uniforms: { ...colors, ...shared, uBloom: { value: bloomB.texture }, uBloomK: { value: 1 } } }));
  scene.add(screen(veilMat, 998));
  const discs = S.DISCS.map(() => new THREE.Vector4());
  const flareMat = keep(new THREE.ShaderMaterial({ vertexShader: S.FLARE_VERTEX, fragmentShader: S.FLARE_FRAGMENT, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, uniforms: { uDisc: { value: discs }, uAspect: { value: 1 }, uFlare: { value: 1 }, uGlow: colors.uGlow } }));
  scene.add(screen(flareMat, 999));

  const sunNdc = new THREE.Vector3();
  const size = new THREE.Vector2();
  const clear = new THREE.Color();
  const ease = (x: number) => 1 - Math.pow(1 - THREE.MathUtils.clamp(x, 0, 1), 3);
  let envKey = "";
  const rig = cameraRig(camera, pointer, { base: new THREE.Vector3(0, lay.cam.y, 0), focus: new THREE.Vector3(0, lay.cam.y, -lay.cam.orbit), pitch: lay.cam.pitch });

  return {
    hoverMask: distRT.texture,
    update(frame: EnvFrame) {
      const { time, params, intro } = frame;
      rig(frame);
      const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      shared.uTan.value.set(tanY * camera.aspect, tanY);
      shared.uTime.value = time;
      shared.uGlowK.value = params.glow;
      shared.uHazeK.value = params.haze;

      const c = colors;
      floorC.copy(c.uWater.value).multiplyScalar(0.9);

      renderer.getDrawingBufferSize(size);
      const w = Math.max(2, size.x), h = Math.max(2, size.y);
      if (mainRT.width !== w || mainRT.height !== h) {
        mainRT.setSize(w, h);
        reflRT.setSize(Math.max(2, Math.round(w / 2)), Math.max(2, Math.round(h / 2)));
        distRT.setSize(Math.max(2, Math.round(w / 2)), Math.max(2, Math.round(h / 2)));
        res.set(w, h);
        const bw = Math.max(2, Math.round(w / 8)), bh = Math.max(2, Math.round(h / 8));
        bloomA.setSize(bw, bh);
        bloomB.setSize(bw, bh);
        blurH.dir.set(1.6 / bw, 0);
        blurV.dir.set(0, 1.6 / bh);
      }
      const prev = renderer.getRenderTarget();
      const key = [params.glow, params.haze, ...Object.values(colors).flatMap((v) => v.value.toArray())].join();
      if (key !== envKey) {
        envKey = key;
        renderer.setRenderTarget(envRT);
        renderer.render(envScene, envCam);
      }
      renderer.getClearColor(clear);
      const alpha = renderer.getClearAlpha();
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(distRT);
      renderer.clear();
      renderer.render(distScene, camera);
      if (water) {
        mirror.value = -1;
        clip.value = waterY.value;
        water.visible = sky.visible = false;
        if (ground) ground.visible = false;
        for (const m of mats) m.side = THREE.BackSide;
        renderer.setRenderTarget(reflRT);
        renderer.clear();
        renderer.render(world, camera);
        for (const m of mats) m.side = THREE.FrontSide;
        mirror.value = 1;
        clip.value = -1e4;
        water.visible = sky.visible = true;
        if (ground) ground.visible = true;
      }
      renderer.setClearColor(clear, alpha);
      renderer.setRenderTarget(mainRT);
      renderer.clear();
      renderer.render(world, camera);
      renderer.setRenderTarget(bloomA);
      renderer.render(blurH.s, camera);
      renderer.setRenderTarget(bloomB);
      renderer.render(blurV.s, camera);
      renderer.setRenderTarget(prev);
      veilMat.uniforms.uBloomK.value = params.bloom;

      sunNdc.copy(camera.position).addScaledVector(sun, 100).project(camera);
      const behind = sunNdc.z > 1;
      S.DISCS.forEach(([x, y, r, s, k], i) => discs[i].set(x + (sunNdc.x - lay.sun[0]) * k, y + (sunNdc.y - lay.sun[1]) * k, r, behind ? 0 : s));
      flareMat.uniforms.uAspect.value = camera.aspect;
      flareMat.uniforms.uFlare.value = params.flare * (0.85 + 0.15 * Math.sin(time * 0.3)) * ease(intro / 2.5 - 0.3);
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
