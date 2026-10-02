import Image from "next/image";
import { ArrowUpRight, Phone } from "lucide-react";
import type { SVGProps } from "react";

const PHONE_DISPLAY = "04 450 2009";
const PHONE_HREF = "tel:+35544502009";
const INSTAGRAM_HANDLE = "@international_casino_tirana";
const INSTAGRAM_URL = "https://www.instagram.com/international_casino_tirana/";
const MAP_EMBED_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3585.101197019722!2d19.818841799999998!3d41.329815499999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1350317562da06e9%3A0x84e4000b1215bbd0!2sInternational%20Casino%20Tirana!5e1!3m2!1sen!2s!4v1790942116094!5m2!1sen!2s";

const ICON = { size: 18, strokeWidth: 1.5, "aria-hidden": true } as const;

/** Lucide no longer ships brand icons; same 24px grid and line style. */
function InstagramIcon({ size = 18, strokeWidth = 1.5, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="site-footer">
      <span className="site-footer__drop" aria-hidden="true" />

      <div className="site-footer__inner">
        <div className="footer-logo footer-reveal">
          <Image
            src="/ict-logo.png"
            alt="International Casino Tirana"
            width={1024}
            height={725}
            className="footer-logo__image"
          />
        </div>

        <section className="footer-block footer-reveal" aria-labelledby="footer-reception">
          <h2 id="footer-reception" className="footer-label">
            Reception
          </h2>
          <a href={PHONE_HREF} className="footer-phone">
            <Phone {...ICON} />
            <span>{PHONE_DISPLAY}</span>
          </a>
        </section>

        <div className="footer-map footer-reveal">
          <iframe
            src={MAP_EMBED_SRC}
            title="International Casino Tirana on Google Maps"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>

        <section className="footer-block footer-reveal" aria-labelledby="footer-follow">
          <h2 id="footer-follow" className="footer-label">
            Follow Us
          </h2>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-instagram"
          >
            <InstagramIcon aria-hidden="true" />
            <span>{INSTAGRAM_HANDLE}</span>
            <ArrowUpRight {...ICON} className="footer-instagram__arrow" />
          </a>
        </section>
      </div>

      <div className="footer-legal">
        <span className="footer-legal__rule" aria-hidden="true" />
        <p>
          <strong>21+</strong>
          <span className="footer-legal__sep" aria-hidden="true">
            |
          </span>
          Play Responsibly
        </p>
      </div>
    </footer>
  );
}
