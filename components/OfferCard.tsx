import type { ReactNode } from "react";

type OfferCardProps = {
  label: ReactNode;
  value: string;
  children: ReactNode;
  actionLabel: string;
  href?: string;
  tone?: "first" | "treasure";
};

export default function OfferCard({
  label,
  value,
  children,
  actionLabel,
  href = "#",
  tone = "first",
}: OfferCardProps) {
  return (
    <article className={`offer-card offer-card--${tone} reveal-card`}>
      <span className="offer-card__glow" aria-hidden="true" />
      <p className="offer-card__label">{label}</p>
      <p className="offer-card__value">{value}</p>
      <div className="offer-card__footer">
        <div className="offer-card__details">{children}</div>
        <a href={href} className="arrow-button" aria-label={actionLabel}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h13M13 7l5 5-5 5" />
          </svg>
        </a>
      </div>
    </article>
  );
}
