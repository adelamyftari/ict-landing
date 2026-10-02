"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
 * TODO(casino): confirm whether the €20 Welcome Offer applies to slots only
 * or to other eligible games, then replace this answer.
 */
const WELCOME_OFFER_USAGE_ANSWER =
  "Our reception team will confirm the eligible games for your Welcome Offer when you register.";

function FaqItem({ question, children }: { question: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const el = answerRef.current;
    if (!el) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tween = gsap.to(el, {
      height: open ? "auto" : 0,
      opacity: open ? 1 : 0,
      duration: reduce ? 0.01 : 0.45,
      ease: "power3.out",
      onComplete: () => ScrollTrigger.refresh(),
    });
    return () => void tween.kill();
  }, [open]);

  return (
    <div className={`faq-item${open ? " is-open" : ""}`} data-reveal>
      <button
        type="button"
        className="faq-item__question"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{question}</span>
        <span className="faq-item__icon" aria-hidden="true" />
      </button>
      <div ref={answerRef} className="faq-item__answer" inert={!open}>
        <p>{children}</p>
      </div>
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" className="panel-close" onClick={onClose} data-reveal>
      Close Details
    </button>
  );
}

export function FirstVisitDetails({ onClose }: { onClose: () => void }) {
  return (
    <>
      <h3 className="panel-title" data-reveal>
        Your First Visit
      </h3>
      <p className="panel-lede" data-reveal>
        Receive €20 on your first visit to International Casino Tirana.
      </p>

      <h4 className="panel-heading" data-reveal>
        How It Works
      </h4>
      <ol className="panel-steps">
        <li data-reveal>
          <span className="panel-steps__num">01</span>
          <p>Visit International Casino Tirana for the first time.</p>
        </li>
        <li data-reveal>
          <span className="panel-steps__num">02</span>
          <p>Register at reception.</p>
        </li>
        <li data-reveal>
          <span className="panel-steps__num">03</span>
          <p>Receive your €20 Welcome Offer.</p>
        </li>
      </ol>

      <div className="panel-note" data-reveal>
        <h4 className="panel-heading">Good to Know</h4>
        <ul className="panel-list">
          <li>Available to first-time guests only.</li>
          <li>Registration at reception is required.</li>
          <li>21+ only.</li>
          <li>Terms &amp; conditions apply.</li>
        </ul>
      </div>

      <div className="panel-faq">
        <FaqItem question="Where can I use my €20 Welcome Offer?">
          {WELCOME_OFFER_USAGE_ANSWER}
        </FaqItem>
        <FaqItem question="Do I need to register?">
          Yes. Please visit reception when you arrive.
        </FaqItem>
        <FaqItem question="Can I receive the offer more than once?">
          No. The offer is available on your first visit only.
        </FaqItem>
      </div>

      <CloseButton onClose={onClose} />
    </>
  );
}

export function DragonTreasureDetails({ onClose }: { onClose: () => void }) {
  return (
    <>
      <h3 className="panel-title" data-reveal>
        Dragon&rsquo;s Treasure
        <span className="panel-title__sub">October Raffle</span>
      </h3>
      <p className="panel-lede" data-reveal>
        Play, collect points and turn your play into raffle tickets for the chance to win €500.
      </p>

      <div className="panel-schedule">
        <h4 className="panel-heading" data-reveal>
          Raffle Schedule
        </h4>
        <p className="panel-body" data-reveal>
          The Dragon&rsquo;s Treasure raffle runs from Wednesday to Saturday, from 7PM to 12AM.
        </p>
        <p className="panel-body" data-reveal>
          Players collect points during these hours and can convert them into raffle tickets.
        </p>
        <p className="panel-rate" data-reveal>
          1 Point = 4 Raffle Tickets
        </p>
        <p className="panel-body" data-reveal>
          All tickets collected during the promotional period are entered into the raffle.
        </p>
        <p className="panel-body" data-reveal>
          Winners are announced every hour between 7PM and 12AM.
        </p>
        <p className="panel-small" data-reveal>
          Keep your raffle tickets and check the official draw timing at International Casino
          Tirana.
        </p>
      </div>

      <div className="panel-highlight" data-reveal>
        <span className="panel-highlight__big">6 Winners</span>
        <span className="panel-highlight__value">€500 Each</span>
      </div>

      <p className="panel-body" data-reveal>
        Raffle runs from Wednesday to Saturday, with winner announcements every hour from 7PM
        to 12AM.
      </p>

      <p className="panel-legal" data-reveal>
        21+ <span aria-hidden="true">|</span> Play Responsibly <span aria-hidden="true">|</span>{" "}
        Terms &amp; Conditions Apply
      </p>

      <CloseButton onClose={onClose} />
    </>
  );
}
