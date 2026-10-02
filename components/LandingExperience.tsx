"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import Header from "./Header";
import Hero from "./Hero";
import OffersSection from "./OffersSection";
import Footer from "./Footer";
import { setupScrollAnimations } from "@/lib/animations";

// WebGL only runs in the browser; the CSS atmosphere shows until it loads.
const DragonScene = dynamic(() => import("./three/DragonScene"), {
  ssr: false,
});

export default function LandingExperience() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    return setupScrollAnimations(rootRef.current);
  }, []);

  return (
    <div ref={rootRef} className="experience">
      <div className="scene-layer" aria-hidden="true">
        <DragonScene />
      </div>
      <div className="scene-shade" aria-hidden="true" />
      <div className="scene-vignette" aria-hidden="true" />

      <div className="ui-content">
        <Header />
        <main>
          <Hero />
          <OffersSection />
          {/* Open stage where the dragon turns to face the viewer. */}
          <div className="finale-stage" aria-hidden="true" />
        </main>
        <Footer />
      </div>
    </div>
  );
}
