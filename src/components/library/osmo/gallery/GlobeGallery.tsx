"use client";

import { useMemo, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Media from "@/components/kit/Media";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface GlobeGalleryImage {
  imageSrc: string;
  imageAlt?: string;
}

interface GlobeGalleryProps {
  images?: (GlobeGalleryImage | string)[];
  rows?: number;
  columns?: number;
  latitude?: number;
  staggerRows?: boolean;
  taper?: boolean;
  tilt?: number;
  cameraDistance?: number;
  idleSpeed?: number;
  direction?: "left" | "right";
  className?: string;
  rootClassName?: string;
}

const PHOTOS = [1179863, 10499488, 3184465, 1640777, 2079249, 323780, 1571460, 3769138, 2253275, 1350789].map(
  (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`,
);
const defaultImages = PHOTOS;

const distribute = (count: number, rows: number, columns: number) => {
  let seed = 2024;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const shuffled = () => {
    const deck = Array.from({ length: count }, (_, i) => i);
    for (let index = deck.length - 1; index > 0; index--) {
      const swap = Math.floor(random() * (index + 1));
      [deck[index], deck[swap]] = [deck[swap], deck[index]];
    }
    return deck;
  };
  const order: number[] = [];
  const deck: number[] = [];
  for (let slot = 0; slot < rows * columns; slot++) {
    const row = Math.floor(slot / columns);
    const column = slot % columns;
    const neighbours = new Set<number>();
    if (column > 0) neighbours.add(order[slot - 1]);
    if (column === columns - 1) neighbours.add(order[slot - column]);
    if (row > 0) {
      [-1, 0, 1].forEach((shift) => neighbours.add(order[(row - 1) * columns + ((column + shift + columns) % columns)]));
    }
    let pick = deck.findIndex((index) => !neighbours.has(index));
    if (pick < 0) {
      deck.push(...shuffled());
      pick = deck.findIndex((index) => !neighbours.has(index));
    }
    order.push(deck.splice(Math.max(pick, 0), 1)[0]);
  }
  return order;
};

const GlobeGallery = ({
  images: imagesProp = defaultImages,
  rows = 7,
  columns = 18,
  latitude = 58,
  staggerRows = true,
  taper = true,
  tilt = 0,
  cameraDistance = 4,
  idleSpeed = 8,
  direction = "left",
  className,
  rootClassName,
}: GlobeGalleryProps) => {
  const images = imagesProp.map((image) => (typeof image === "string" ? { imageSrc: image } : image));
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const order = useMemo(() => (images.length ? distribute(images.length, rows, columns) : []), [images.length, rows, columns]);
  const firstSlot = useMemo(() => {
    const seen = new Map<number, number>();
    order.forEach((index, slot) => {
      if (!seen.has(index)) seen.set(index, slot);
    });
    return seen;
  }, [order]);

  useGSAP(
    () => {
      const root = ref.current;
      const list = listRef.current;
      if (!root || !list) return;
      const elements = gsap.utils.toArray<HTMLElement>("[data-card]", list);
      if (!elements.length) return;

      const scrollBoost = 0.05;
      const maxBoost = 80;
      const boostIn = 4;
      const boostOut = 1.2;
      const edgeOpacity = 0.2;
      const fadeZone = 0.35;
      const backOpacity = 0.1;

      const toRadians = Math.PI / 180;
      const band = latitude * toRadians;
      const rowStep = (2 * band) / rows;
      const columnStep = (2 * Math.PI) / columns;
      const rowLatitudes = Array.from({ length: rows }, (_, row) => band - rowStep * (row + 0.5));
      const tiltAngle = tilt * toRadians;
      const sinTilt = Math.sin(-tiltAngle);
      const cosTilt = Math.cos(-tiltAngle);
      const spinDirection = direction === "right" ? 1 : -1;
      let radius = 0;
      let halfHeight = 0;
      let spin = 0;
      let boost = 0;
      let scrollDistance = 0;
      let lastScroll = window.scrollY;
      let motionAllowed = true;
      let inView = true;

      const facing = (normalZ: number) => (cameraDistance * normalZ - 1) / Math.sqrt(1 + cameraDistance ** 2 - 2 * cameraDistance * normalZ);
      const ease = (value: number) => {
        const p = Math.min(Math.max(value / Math.max(fadeZone, 0.001), 0), 1);
        return p * p * (3 - 2 * p);
      };

      const cards = elements.map((element, slot) => {
        const row = Math.floor(slot / columns);
        const column = slot % columns;
        const lat = rowLatitudes[row];
        return {
          element,
          row,
          longitude: columnStep * (column + (staggerRows && row % 2 ? 0.5 : 0)),
          sinLatitude: Math.sin(lat),
          cosLatitude: Math.cos(lat),
          frontPeak: Math.max(facing(Math.cos(lat - tiltAngle)), 0.001),
          backPeak: Math.max(-facing(-Math.cos(lat + tiltAngle)), 0.001),
          halfWidth: 0,
          visibility: "",
          zIndex: -1,
        };
      });

      const layout = () => {
        const style = getComputedStyle(list);
        const columnGap = parseFloat(style.columnGap) || 0;
        const rowGap = parseFloat(style.rowGap) || 0;
        radius = list.offsetWidth / 2;
        halfHeight = Math.max(radius * Math.tan(rowStep / 2) - rowGap / 2, 0);
        const rowHalfWidths = rowLatitudes.map((rowLatitude) => {
          const widthLatitude = taper ? rowLatitude : rowLatitudes[0];
          return Math.max(radius * Math.cos(widthLatitude) * Math.tan(columnStep / 2) - columnGap / 2, 0);
        });
        list.style.perspective = `${radius * cameraDistance}px`;
        cards.forEach((card) => {
          card.halfWidth = rowHalfWidths[card.row];
          card.element.style.width = `${card.halfWidth * 2}px`;
          card.element.style.height = `${halfHeight * 2}px`;
        });
      };

      const render = () => {
        cards.forEach((card) => {
          const { element, sinLatitude, cosLatitude } = card;
          const theta = card.longitude + spin;
          const sinTheta = Math.sin(theta);
          const cosTheta = Math.cos(theta);
          const normalX = sinTheta * cosLatitude;
          const normalY = -cosTilt * sinLatitude - sinTilt * cosTheta * cosLatitude;
          const normalZ = cosTilt * cosTheta * cosLatitude - sinTilt * sinLatitude;
          const cardFacing = facing(normalZ);
          const opacity =
            cardFacing < 0
              ? edgeOpacity + (backOpacity - edgeOpacity) * ease(-cardFacing / card.backPeak)
              : edgeOpacity + (1 - edgeOpacity) * ease(cardFacing / card.frontPeak);
          const visibility = opacity > 0 ? "visible" : "hidden";
          const zIndex = Math.round((normalZ + 1) * 1000);
          if (card.visibility !== visibility) {
            element.style.visibility = visibility;
            card.visibility = visibility;
          }
          if (opacity <= 0) return;
          if (card.zIndex !== zIndex) {
            element.style.zIndex = String(zIndex);
            card.zIndex = zIndex;
          }
          element.style.opacity = String(opacity);
          element.style.transform = `matrix3d(${cosTheta},${sinTilt * sinTheta},${-cosTilt * sinTheta},0,${sinTheta * sinLatitude},${cosTilt * cosLatitude - sinTilt * cosTheta * sinLatitude},${sinTilt * cosLatitude + cosTilt * cosTheta * sinLatitude},0,${normalX},${normalY},${normalZ},0,${radius * normalX - card.halfWidth},${radius * normalY - halfHeight},${radius * normalZ},1)`;
        });
      };

      const onScroll = () => {
        const y = window.scrollY;
        scrollDistance += Math.abs(y - lastScroll);
        lastScroll = y;
      };
      window.addEventListener("scroll", onScroll, { passive: true });

      const ro = new ResizeObserver(() => {
        layout();
        render();
      });
      ro.observe(list);

      const io = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
      });
      io.observe(root);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        motionAllowed = false;
        return () => {
          motionAllowed = true;
        };
      });

      const tick = (_time: number, deltaTime: number) => {
        const seconds = Math.min(deltaTime, 100) / 1000;
        const scrollSpeed = scrollDistance / seconds;
        scrollDistance = 0;
        if (!motionAllowed || !inView) return;
        const target = Math.min(scrollSpeed * scrollBoost, maxBoost);
        const rate = target > boost ? boostIn : boostOut;
        boost += (target - boost) * (1 - Math.exp(-rate * seconds));
        spin += spinDirection * (idleSpeed + boost) * seconds * toRadians;
        render();
      };
      gsap.ticker.add(tick);

      return () => {
        gsap.ticker.remove(tick);
        window.removeEventListener("scroll", onScroll);
        ro.disconnect();
        io.disconnect();
        mm.revert();
      };
    },
    { scope: ref, dependencies: [order, rows, columns, latitude, staggerRows, taper, tilt, cameraDistance, idleSpeed, direction] },
  );

  return (
    <div ref={ref} className={cn("flex h-svh w-full items-center justify-center overflow-hidden select-none", rootClassName)}>
      <div className={cn("relative aspect-square w-[50em] max-w-full", className)}>
        <div ref={listRef} className="absolute inset-0 flex gap-[0.25em] md:gap-[1em]">
          {order.map((index, slot) => {
            const image = images[index];
            const primary = firstSlot.get(index) === slot;
            return (
              <div
                key={slot}
                data-card
                aria-hidden={primary ? undefined : true}
                className="invisible absolute top-1/2 left-1/2 overflow-hidden rounded-[0.25em] bg-muted md:rounded-[0.5em]"
              >
                <Media src={image.imageSrc} alt={primary ? (image.imageAlt ?? "") : ""} loading="lazy" draggable={false} className="block h-full w-full object-cover" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GlobeGallery;
