import OfferCard from "./OfferCard";

export default function OffersSection() {
  return (
    <section id="offers" className="offers" aria-label="Offers">
      <OfferCard
        tone="first"
        label="First Visit"
        value="€20"
        actionLabel="Claim your €20 first visit offer"
      >
        <p>Get €20 on your first visit</p>
      </OfferCard>

      <OfferCard
        tone="treasure"
        label={
          <>
            Dragon&rsquo;s
            <br />
            Treasure
          </>
        }
        value="€500"
        actionLabel="Discover Dragon's Treasure"
      >
        <p>€500 every hour</p>
        <p>
          <span className="nowrap">6PM–12AM</span> ·{" "}
          <span className="nowrap">Wednesday–Saturday</span>
        </p>
      </OfferCard>
    </section>
  );
}
