import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Mutable state shared between GSAP (DOM / scroll) and the R3F scene.
 * GSAP only scrubs plain numbers here; the scene turns them into motion
 * every frame. No mesh transform is ever tweened directly.
 */
export const sceneState = {
  dragon: {
    /** 0 → 1: how far the head has swum along its path (scrubbed) */
    progress: 0,
  },
  camera: { z: 7, y: 0 },
  /** 0 → 1 across the whole page (unsmoothed) */
  progress: 0,
  reducedMotion: false,
  pointer: { x: 0, y: 0 },
};

/** Static, partially uncoiled pose used when motion is reduced. */
const REDUCED_MOTION_PROGRESS = 0.2;

function buildDragonTimeline(root: HTMLElement) {
  gsap.set(sceneState.dragon, { progress: 0 });
  gsap.set(sceneState.camera, { z: 7, y: 0 });

  // The dragon swims as the page scrolls. sine.inOut: it eases out of the
  // opening coil and settles slowly into the closing curl. It arrives when the
  // finale stage is fully in view; the footer then scrolls up over it.
  const dragonRange = {
    trigger: root,
    start: "top top",
    endTrigger: ".finale-stage",
    end: "bottom bottom",
  };
  gsap.to(sceneState.dragon, {
    progress: 1,
    ease: "sine.inOut",
    scrollTrigger: { ...dragonRange, scrub: 1.8 },
  });

  // Very small camera dolly.
  gsap.to(sceneState.camera, {
    z: 6.4,
    y: -0.1,
    ease: "none",
    scrollTrigger: { ...dragonRange, scrub: 1.2 },
  });
}

/** Wires every scroll-driven animation on the page. Returns a cleanup. */
export function setupScrollAnimations(root: HTMLElement) {
  const mm = gsap.matchMedia();

  // Page progress (drives particles / smoke drift), active in every mode.
  const progressTrigger = ScrollTrigger.create({
    trigger: root,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      sceneState.progress = self.progress;
    },
  });

  mm.add(
    {
      motion: "(prefers-reduced-motion: no-preference)",
      reduce: "(prefers-reduced-motion: reduce)",
    },
    (ctx) => {
      const { reduce } = ctx.conditions as { motion: boolean; reduce: boolean };
      sceneState.reducedMotion = reduce;

      if (reduce) {
        // Keep the composition, skip scroll-driven motion.
        gsap.set(sceneState.dragon, { progress: REDUCED_MOTION_PROGRESS });
        gsap.set(sceneState.camera, { z: 7, y: 0 });
        gsap.set(".reveal-card, .footer-reveal", { opacity: 1, y: 0, scale: 1 });
        return;
      }

      buildDragonTimeline(root);

      // Footer: quiet staggered fade-up as it enters.
      gsap.fromTo(
        ".footer-reveal",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: { trigger: ".site-footer__inner", start: "top 85%", once: true },
        }
      );

      // Hero copy lifts and fades as the hero leaves the viewport.
      gsap.to(".hero-copy-block", {
        y: -50,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // Environment darkens slowly through the page.
      gsap.fromTo(
        ".scene-shade",
        { opacity: 0 },
        {
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          },
        }
      );

      gsap.utils.toArray<HTMLElement>(".reveal-card").forEach((card) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 70, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              start: "top 95%",
              end: "top 62%",
              scrub: 0.8,
            },
          }
        );
      });
    }
  );

  const onPointer = (e: PointerEvent) => {
    sceneState.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    sceneState.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  // Webfonts change layout heights; re-measure once they are ready.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return () => {
    window.removeEventListener("pointermove", onPointer);
    progressTrigger.kill();
    mm.revert();
  };
}
