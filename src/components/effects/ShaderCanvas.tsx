"use client";

import { useEffect, useRef } from "react";

type ShaderCanvasProps = {
  /**
   * GLSL ES 1.0 fragment shader body. Available uniforms:
   *   uniform float u_time;        // seconds
   *   uniform vec2  u_resolution;  // canvas size in px
   *   uniform vec2  u_mouse;       // 0..1, eased toward the pointer
   *   uniform vec3  u_color0..u_color3; // theme colors (see `colors`)
   * Write `void main() { … gl_FragColor = vec4(…); }`. Precision is prepended.
   */
  fragmentShader: string;
  /**
   * Up to 4 colors fed to u_color0..3 — CSS variable names from the theme
   * ("--primary", "--background", …) or hex values. Defaults follow the theme.
   */
  colors?: string[];
  /** Animation speed multiplier (1 = default). */
  speed?: number;
  className?: string;
};

const VERTEX = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const DEFAULT_COLORS = ["--primary", "--background", "--accent", "--foreground"];

/** Resolve a CSS color (var name or literal) to linear 0..1 RGB via the browser. */
const toRgb = (value: string, el: HTMLElement): [number, number, number] => {
  const probe = document.createElement("span");
  probe.style.color = value.startsWith("--") ? `var(${value})` : value;
  el.appendChild(probe);
  const rgb = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  probe.remove();
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
};

/**
 * Full-bleed WebGL background for a hand-written fragment shader. Handles
 * the plumbing so sections only supply GLSL: DPR cap, resize, pausing
 * off-screen, a single static frame under reduced motion, and hiding itself
 * when WebGL or the shader fails (the parent's CSS background shows instead).
 */
const ShaderCanvas = ({ fragmentShader, colors = DEFAULT_COLORS, speed = 1, className }: ShaderCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Inline `colors={[…]}` is a new array every render — key the effect on its content.
  const colorKey = colors.join("|");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    const fail = () => {
      canvas.style.display = "none";
    };
    if (!gl) return fail();

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("[ShaderCanvas]", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const header =
      "precision highp float;uniform float u_time;uniform vec2 u_resolution;uniform vec2 u_mouse;" +
      "uniform vec3 u_color0;uniform vec3 u_color1;uniform vec3 u_color2;uniform vec3 u_color3;\n";
    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, header + fragmentShader);
    if (!vs || !fs) return fail();
    const program = gl.createProgram();
    if (!program) return fail();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return fail();
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uMouse = gl.getUniformLocation(program, "u_mouse");
    const palette = [...colorKey.split("|").filter(Boolean), ...DEFAULT_COLORS].slice(0, 4);
    palette.forEach((c, i) => {
      gl.uniform3fv(gl.getUniformLocation(program, `u_color${i}`), toRgb(c, canvas.parentElement ?? canvas));
    });

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width;
      mouse.ty = 1 - (e.clientY - r.top) / r.height;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      gl.uniform1f(uTime, ((now - start) / 1000) * speed);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    if (reduced) {
      gl.uniform1f(uTime, 0);
      gl.uniform2f(uMouse, 0.5, 0.5);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, [fragmentShader, colorKey, speed]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
    />
  );
};

export default ShaderCanvas;
