"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type MobileMarqueeProps = {
  children: ReactNode;
  className?: string;
  role?: "list";
  label: string;
};

export function MobileMarquee({ children, className = "", role, label }: MobileMarqueeProps) {
  const scroller = useRef<HTMLDivElement>(null);

  const move = (direction: -1 | 1) => {
    const container = scroller.current;
    if (!container) return;
    const card = container.querySelector<HTMLElement>(".carousel-card, .home-resource-carousel-card");
    const distance = (card?.getBoundingClientRect().width || container.clientWidth * 0.8) + 18;
    container.scrollBy({ left: direction * distance, behavior: "smooth" });
  };

  return (
    <div className="mobile-marquee-frame">
      <div ref={scroller} className={`marquee-shell ${className}`.trim()} role={role} aria-label={label}>
        {children}
      </div>
      <button className="mobile-marquee-arrow mobile-marquee-arrow-left" type="button" onClick={() => move(-1)} aria-label={`Voir les éléments précédents : ${label}`}>
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <button className="mobile-marquee-arrow mobile-marquee-arrow-right" type="button" onClick={() => move(1)} aria-label={`Voir les éléments suivants : ${label}`}>
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
