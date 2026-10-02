export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy-block">
        <h1 id="hero-title" className="hero-title">
          <span className="hero-title__text">Exclusive Rewards Await</span>
        </h1>
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
