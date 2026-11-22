import * as THREE from "three";
import type { EnvModule } from "@/components/kit/env/EnvStage";

const VERTEX = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 1., 1.);
}`;

const FRAGMENT = `
uniform sampler2D uImage;
uniform vec2 uRes, uSize;
varying vec2 vUv;
void main(){
  float sa = uRes.x / uRes.y, ia = uSize.x / max(uSize.y, 1.);
  vec2 s = sa > ia ? vec2(1., ia / sa) : vec2(sa / ia, 1.);
  vec2 uv = (vUv - .5) * s + .5;
  gl_FragColor = vec4(texture2D(uImage, uv).rgb, 1.);
}`;

export const photoEnv = (src: string): EnvModule => ({
  id: "photo",
  title: "Photo",
  palette: {},
  params: [],
  fov: [50, 50],
  travelPerScreen: 0,
  creep: 0,
  hover: { liquid: 0.25, turn: 0 },
  setup({ scene, renderer }) {
    const size = new THREE.Vector2(1, 1);
    const res = new THREE.Vector2(1, 1);
    const texture = new THREE.TextureLoader().setCrossOrigin("anonymous").load(src, (t) => {
      const img = t.image as HTMLImageElement;
      size.set(img.naturalWidth || img.width, img.naturalHeight || img.height);
    });
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthTest: false,
      depthWrite: false,
      uniforms: { uImage: { value: texture }, uRes: { value: res }, uSize: { value: size } },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    scene.add(quad);
    return {
      update() {
        renderer.getDrawingBufferSize(res);
      },
      dispose() {
        quad.geometry.dispose();
        material.dispose();
        texture.dispose();
      },
    };
  },
});
