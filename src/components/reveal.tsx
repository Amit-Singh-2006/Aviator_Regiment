"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// Slides its children in from one side the first time they scroll into view.
// Content renders visible, so it still shows without JavaScript, with reduced
// motion, or when it is already on screen at load.
export function Reveal({ from, className, children }: { from: "left" | "right"; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (element.getBoundingClientRect().top < window.innerHeight * 0.85) return;

    setHidden(true);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setHidden(false);
      observer.disconnect();
    }, { rootMargin: "0px 0px -15% 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${className ? `${className} ` : ""}reveal reveal-${from}${hidden ? " is-hidden" : ""}`}>
      {children}
    </div>
  );
}
