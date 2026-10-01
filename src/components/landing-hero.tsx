"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const words = [
  { text: "Find", image: null },
  { text: "your", image: "runway" },
  { text: "Flight", image: null },
  { text: "path.", image: "sky" },
];

export function LandingHero() {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setStarted(true), reducedMotion ? 0 : 250);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="editorial-hero" aria-labelledby="landing-title">
      <div className="editorial-hero-glow" aria-hidden="true" />
      <div className="editorial-hero-inner">
        <h1 id="landing-title" className={started ? "editorial-title is-started" : "editorial-title"}>
          {words.map((word, index) => (
            <span
              className={`editorial-word editorial-word-${index + 1}`}
              style={{ "--word-index": index } as CSSProperties}
              key={word.text}
            >
              {word.image ? (
                <span className={`editorial-image editorial-image-${word.image}`} aria-hidden="true" />
              ) : null}
              <span className="editorial-word-text">{word.text}</span>
              {index === 2 ? <span className="editorial-flight-line" aria-hidden="true" /> : null}
            </span>
          ))}
        </h1>
      </div>
    </section>
  );
}
