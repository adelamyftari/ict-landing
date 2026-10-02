"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type OfferCardProps = {
  id: string;
  label: ReactNode;
  value: string;
  children: ReactNode;
  actionLabel: string;
  tone?: "first" | "treasure";
  /** Expandable details revealed inside the card. */
  details: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  /** Called once the close animation has fully finished. */
  onClosed: () => void;
};

const OPEN_DURATION = 0.7;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** On mobile, nudge a freshly opened panel up into comfortable view. */
function nudgeIntoView(panel: HTMLElement) {
  if (!window.matchMedia("(max-width: 767px)").matches) return;
  const top = panel.getBoundingClientRect().top;
  const target = window.innerHeight * 0.3;
  if (top > window.innerHeight * 0.55) {
    window.scrollBy({ top: top - target, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }
}

export default function OfferCard({
  id,
  label,
  value,
  children,
  actionLabel,
  tone = "first",
  details,
  isOpen,
  onToggle,
  onClosed,
}: OfferCardProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const mountedRef = useRef(false);
  const onClosedRef = useRef(onClosed);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    const items = panel.querySelectorAll<HTMLElement>("[data-reveal]");
    const reduce = prefersReducedMotion();
    const d = reduce ? 0.01 : OPEN_DURATION;
    tlRef.current?.kill();

    if (isOpen) {
      tlRef.current = gsap
        .timeline({
          defaults: { ease: "power3.out" },
          onComplete: () => {
            ScrollTrigger.refresh();
            nudgeIntoView(panel);
          },
        })
        .fromTo(
          panel,
          { height: 0, opacity: 0, y: 30 },
          { height: "auto", opacity: 1, y: 0, duration: d }
        )
        .fromTo(
          items,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: d * 0.8, stagger: reduce ? 0 : 0.07 },
          d * 0.25
        );
    } else {
      // Reverse: content folds away last-first, then the panel collapses.
      tlRef.current = gsap
        .timeline({
          defaults: { ease: "power3.out" },
          onComplete: () => {
            ScrollTrigger.refresh();
            onClosedRef.current();
          },
        })
        .to(items, {
          opacity: 0,
          y: 10,
          duration: d * 0.4,
          stagger: reduce ? 0 : { each: 0.025, from: "end" },
        })
        .to(panel, { height: 0, opacity: 0, y: 30, duration: d * 0.85 }, d * 0.15);
    }
  }, [isOpen]);

  useEffect(() => () => void tlRef.current?.kill(), []);

  const panelId = `${id}-details`;

  return (
    <article className={`offer-card offer-card--${tone} reveal-card${isOpen ? " is-open" : ""}`}>
      <span className="offer-card__glow" aria-hidden="true" />
      <p className="offer-card__label">{label}</p>
      <p className="offer-card__value">{value}</p>
      <div className="offer-card__footer">
        <div className="offer-card__details">{children}</div>
        <button
          type="button"
          className="arrow-button"
          aria-label={actionLabel}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h13M13 7l5 5-5 5" />
          </svg>
        </button>
      </div>

      <div
        ref={panelRef}
        id={panelId}
        className="offer-panel"
        role="region"
        aria-label={actionLabel}
        inert={!isOpen}
      >
        <div className="offer-panel__inner">{details}</div>
      </div>
    </article>
  );
}
