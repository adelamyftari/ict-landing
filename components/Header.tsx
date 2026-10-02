import Image from "next/image";

export default function Header() {
  return (
    <header className="site-header">
      <a href="#" className="site-logo" aria-label="International Casino Tirana">
        <Image
          src="/ict-logo.png"
          alt="International Casino Tirana"
          width={1024}
          height={725}
          priority
          className="site-logo__image"
        />
      </a>
    </header>
  );
}
