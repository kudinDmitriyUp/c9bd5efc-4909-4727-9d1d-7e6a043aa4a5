"use client";

import WordByWordReveal from "@/components/animation/WordByWordReveal";
import GradientWordReveal from "@/components/animation/GradientWordReveal";
import CardEdgeGlow from "@/components/animation/CardEdgeGlow";
import AppearOnScroll from "@/components/animation/AppearOnScroll";
import type { LucideIcon } from "lucide-react";
import { useRef } from "react";
import { useInView } from "motion/react";
import NumberFlow from "@/components/vendor/NumberFlow";
import StaggerText from "@/components/animation/StaggerText";

type FeatureItem = {
  icon: LucideIcon;
  title: string;
  stat: { value: number; suffix?: string };
};

const Stat = ({ value, suffix }: { value: number; suffix?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  return (
    <div ref={ref} className="text-4xl md:text-6xl 2xl:text-7xl font-semibold leading-none tracking-tight -my-[0.15em]">
      <NumberFlow value={inView ? value : 0} suffix={suffix} transformTiming={{ duration: 1800, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }} spinTiming={{ duration: 1800, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }} />
    </div>
  );
};

interface FeaturesStatCardsProps {
  tag: string;
  title: string;
  description?: string;
  primaryButton?: { text: string; href: string };
  secondaryButton?: { text: string; href: string };
  features: FeatureItem[];
  titleGradient?: boolean;
  cardAnimation?: "slide-up" | "rotate-scale";
  textAnimation: "slide-up" | "fade-blur" | "fade";
}

const FeaturesStatCards = ({
  tag,
  title,
  description,
  primaryButton,
  secondaryButton,
  features,
  titleGradient,
  cardAnimation = "slide-up",
  textAnimation,
}: FeaturesStatCardsProps) => {
  return (
    <section aria-label="Features section" className="flex flex-col gap-8 md:gap-10 py-20">
      <div className="flex flex-col items-center gap-2 w-full max-w-6xl px-6 mx-auto">
        <AppearOnScroll variant="fade">
          <div className="px-3 py-1 mb-1 text-sm card rounded w-fit">
            <p>{tag}</p>
          </div>
        </AppearOnScroll>

        {titleGradient ? (
          <GradientWordReveal
            text={title}
            variant={textAnimation}
            tag="h2"
            className="md:max-w-8/10 text-3xl md:text-5xl 2xl:text-6xl leading-[1.15] font-semibold text-center text-balance"
          />
        ) : (
          <WordByWordReveal
            text={title}
            variant={textAnimation}
            tag="h2"
            className="md:max-w-8/10 text-3xl md:text-5xl 2xl:text-6xl leading-[1.15] font-semibold text-center text-balance"
          />
        )}

        {description && (
          <WordByWordReveal
            text={description}
            variant={textAnimation}
            tag="p"
            className="md:max-w-7/10 text-base md:text-lg 2xl:text-xl leading-snug text-center text-balance"
          />
        )}

        {(primaryButton || secondaryButton) && (
          <AppearOnScroll variant="slide-up" delay={0.15}>
            <div className="flex flex-wrap justify-center gap-3 mt-2 md:mt-3">
              {primaryButton && <a href={primaryButton.href} className="flex items-center justify-center h-10 px-6 text-sm rounded-lg cursor-pointer btn-primary bg-primary text-primary-foreground"><StaggerText text={primaryButton.text} /></a>}
              {secondaryButton && <a href={secondaryButton.href} className="flex items-center justify-center h-10 px-6 text-sm rounded-lg cursor-pointer btn-secondary bg-secondary text-secondary-foreground"><StaggerText text={secondaryButton.text} /></a>}
            </div>
          </AppearOnScroll>
        )}
      </div>

      <AppearOnScroll variant="slide-up">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 w-full max-w-6xl px-6 mx-auto">
          {features.map((feature, index) => {
            const FeatureIcon = feature.icon;
            return (
              <AppearOnScroll key={feature.title} variant={cardAnimation} delay={index * 0.08} className="h-full">
                <CardEdgeGlow className="flex flex-col justify-between gap-4 xl:gap-5 2xl:gap-6 p-6 xl:p-7 2xl:p-8 mt-0.5 h-full min-h-72 md:min-h-84 2xl:min-h-96 card">
                  <div className="flex items-center justify-center size-12 md:size-14 2xl:size-16 bg-primary text-primary-foreground rounded-full">
                    <FeatureIcon className="size-4 text-primary-foreground" strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Stat value={feature.stat.value} suffix={feature.stat.suffix} />
                    <h3 className="text-base md:text-lg 2xl:text-xl leading-snug text-balance opacity-75">{feature.title}</h3>
                  </div>
                </CardEdgeGlow>
              </AppearOnScroll>
            );
          })}
        </div>
      </AppearOnScroll>
    </section>
  );
};

export default FeaturesStatCards;
