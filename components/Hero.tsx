export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy-block">
        <p className="hero-eyebrow">Super Offers</p>
        <h1 id="hero-title" className="hero-title">
          First Visit
        </h1>
        <p className="hero-subtitle">Exclusive Rewards Await</p>
        <span className="hero-divider" aria-hidden="true" />
        <p className="hero-lede">
          Step into a world of elegance, excitement
          <br />
          and unforgettable moments.
        </p>
      </div>

      <a href="#offers" className="scroll-cue" aria-label="Scroll to offers">
        <span className="scroll-cue__mouse">
          <span className="scroll-cue__wheel" />
        </span>
        <span className="scroll-cue__chevron" />
      </a>
    </section>
  );
}
