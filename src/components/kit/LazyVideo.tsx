import { useEffect, type ComponentProps } from "react";
import { queueEarlyImages } from "@/components/kit/earlyImages";
import { localMediaSrc } from "@/components/kit/mediaSrc";

export default function LazyVideo(props: ComponentProps<"video">) {
  useEffect(queueEarlyImages, []);
  return <video data-webild-media="" muted loop playsInline {...props} src={localMediaSrc(props.src)} poster={localMediaSrc(props.poster)} preload="none" autoPlay={false} />;
}
