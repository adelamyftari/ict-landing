"use client";

import { useCallback, useRef, useState } from "react";
import OfferCard from "./OfferCard";
import { DragonTreasureDetails, FirstVisitDetails } from "./OfferDetails";

type OfferId = "first-visit" | "dragons-treasure";

export default function OffersSection() {
  const [openId, setOpenId] = useState<OfferId | null>(null);
  // Offer waiting to open once the currently open one has finished closing.
  const pendingRef = useRef<OfferId | null>(null);

  const toggle = useCallback(
    (id: OfferId) => {
      if (openId === id) {
        pendingRef.current = null;
        setOpenId(null);
      } else if (openId) {
        pendingRef.current = id;
        setOpenId(null);
      } else {
        setOpenId(id);
      }
    },
    [openId]
  );

  const handleClosed = useCallback(() => {
    const next = pendingRef.current;
    pendingRef.current = null;
    if (next) setOpenId(next);
  }, []);

  const close = useCallback(() => {
    pendingRef.current = null;
    setOpenId(null);
  }, []);

  return (
    <section id="offers" className="offers" aria-label="Offers">
      <OfferCard
        id="first-visit"
        tone="first"
        label="First Visit"
        value="€20"
        actionLabel="First Visit offer details"
        isOpen={openId === "first-visit"}
        onToggle={() => toggle("first-visit")}
        onClosed={handleClosed}
        details={<FirstVisitDetails onClose={close} />}
      >
        <p>Get €20 on your first visit</p>
      </OfferCard>

      <OfferCard
        id="dragons-treasure"
        tone="treasure"
        label={
          <>
            Dragon&rsquo;s
            <br />
            Treasure
          </>
        }
        value="€500"
        actionLabel="Dragon's Treasure raffle details"
        isOpen={openId === "dragons-treasure"}
        onToggle={() => toggle("dragons-treasure")}
        onClosed={handleClosed}
        details={<DragonTreasureDetails onClose={close} />}
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
