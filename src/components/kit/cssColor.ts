let paint: CanvasRenderingContext2D | null = null;

export type Rgb = [number, number, number];

export const readCssColor = (host: Element, name: string, fallback: Rgb = [1, 1, 1]): Rgb => {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;width:0;height:0;visibility:hidden;color:var(${name})`;
  host.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  paint ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!paint || !value) return fallback;
  paint.clearRect(0, 0, 1, 1);
  paint.fillStyle = "black";
  paint.fillStyle = value;
  paint.fillRect(0, 0, 1, 1);
  const d = paint.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
};

export const watchPalette = (host: Element, onChange: () => void) => {
  const targets = [document.documentElement, host.closest("main"), host].filter((el): el is Element => !!el);
  const observer = new MutationObserver(onChange);
  targets.forEach((el) => observer.observe(el, { attributes: true, attributeFilter: ["style", "class", "data-palette", "data-theme"] }));
  return () => observer.disconnect();
};
