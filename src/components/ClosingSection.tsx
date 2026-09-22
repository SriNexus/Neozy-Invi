import { useEffect, useRef, useState } from "react";
import type { CoupleData, ClosingData, ContactData } from "../data/invitation";
import { useActiveTheme } from "../data/useTheme";
import { Divider, AmpersandOrnament, JharokhaArch, HairRule } from "./decor/Ornaments";

/* the couple's names here — the invitation's literal closing words —
   previously sat in flat `--text-primary` ink, the one remaining place
   in the whole invitation where the names weren't given the same
   dimensional gold the couple scene, the welcome text and the Save the
   Date all use. This is the SAME light gold-gradient recipe already
   used for "Welcome To Our" in CoupleIntro.tsx — reused rather than
   invented, so the closing page reads as the same hand finishing the
   same book, restrained enough for the italic display serif here
   (the heavier, stepped-extrusion recipe is reserved for hero moments
   like the couple's own Telma wordmark and the Save the Date numeral). */
const CLOSING_NAME_GRADIENT: React.CSSProperties = {
  background: "linear-gradient(180deg, #f3e3c0 0%, #d9bd72 45%, #a8863c 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  filter:
    "drop-shadow(0 1px 0 rgba(255,250,236,0.45)) drop-shadow(0 2px 4px rgba(60,42,16,0.32))",
};

function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export default function ClosingSection({
  couple,
  closing,
  contact,
}: {
  couple: CoupleData;
  closing: ClosingData;
  /** the SAME contact-person data FloatingContact already reads —
   *  optional so existing invitations with no configured contact simply
   *  don't render the right-side call action (never a fake number) */
  contact?: ContactData;
}) {
  const theme = useActiveTheme();
  const { ref, inView } = useInView<HTMLDivElement>();
  const [artOk, setArtOk] = useState(true);

  const step = (i: number): React.CSSProperties => ({
    opacity: inView ? 1 : 0,
    transform: inView ? "translateY(0)" : "translateY(14px)",
    transition: `opacity 0.9s ease ${0.15 * i}s, transform 0.9s ease ${0.15 * i}s`,
  });

  return (
    <section
      data-reel-scene
      className="relative w-full overflow-hidden flex items-center justify-center"
      style={{ height: "100dvh", padding: "clamp(28px,6vw,52px) clamp(24px,6vw,48px)" }}
    >
      {/* The closing page's artwork — the invitation's COVER, closing the
          book it opened.
          PASS — the near-opaque white radial veil that used to sit here
          (up to 0.94 opacity, covering nearly the whole frame) is
          REMOVED: `endsection.jpg` is itself an ivory/cream decorative
          stationery border (gold filigree, hanging lamps, floral
          garlands, a maroon peacock band) with an already-blank cream
          centre — the veil was washing out exactly the ornamental detail
          this image exists to show, on top of a centre that already
          reads as plain paper underneath the text with no help needed.
          No replacement overlay: this invitation's ink colours (the
          gold-gradient names, `--text-secondary` message,
          `--gold-invite-dim` labels) are already the same set used
          directly on light/cream paper everywhere else in the
          invitation, so they read correctly here with nothing added.

          PASS 2 — fixed real cropping, not just the wash: this image is
          941×1672 (aspect ≈0.563), noticeably taller/narrower than a
          typical phone viewport (≈0.46 at 375×812). `object-fit:cover`
          (the previous sizing) picks whichever axis needs LESS scaling
          to fill both — here that's height, which forces the image
          wider than the viewport and crops roughly 54% off its total
          WIDTH, split evenly off both sides. That crop lands almost
          exactly on the hanging-lamp/garland clusters and the gold-pot
          side borders — this image's decorative content is spread
          across its full width, so a width-crop this severe was
          destroying almost everything it exists to show, leaving mostly
          the blank cream middle. `background-size:contain` was rejected
          too (per the brief) — it would letterbox ~150px of visibly
          empty space above and below on that same 375×812 viewport.
          Fixed instead by fitting to WIDTH exactly (`width:100%,
          height:auto`, no `object-fit`) — every side border, both top
          corners and the full peacock band stay completely visible,
          nothing left-to-right is ever cropped, on any phone width. The
          image is then naturally a little SHORTER than a typical tall
          phone viewport, anchored to the top (`top:0`) so its own
          engraved crown/lamps sit exactly at the very top of the scene
          the way a real card's border would; the small remaining gap at
          the very bottom (well below the centred text) is not an empty
          void — it reveals `PublicInvitation`'s own fixed "World B" paper
          ground (`--paper-world`), the SAME warm cream/ivory this
          section's own artwork ends on, so the seam reads as continued
          paper, not a cut-off image. */}
      {artOk && (
        <div aria-hidden="true" className="absolute inset-x-0 top-0 pointer-events-none" style={{ zIndex: 0 }}>
          <img
            src={theme.assets.closingImage}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setArtOk(false)}
            className="w-full block"
            style={{ height: "auto" }}
          />
        </div>
      )}

      <div ref={ref} className="relative z-10 text-center flex flex-col items-center" style={{ maxWidth: 420 }}>
        {/* a small kicker announcing this as the invitation's own closing
            page, the same "tracked label" voice every other section
            opens with (The Venue / Our Story / The Celebrations) — the
            one thing missing before, which made the page read as simply
            "another section" rather than a deliberate final page. */}
        <span
          className="font-sc"
          style={{
            ...step(0),
            color: "var(--gold-invite-dim)",
            fontSize: "clamp(15px, 3.2vw, 17px)",
            letterSpacing: "0.4em",
            marginLeft: "0.4em",
            textTransform: "uppercase",
          }}
        >
          With Love
        </span>

        <div className="mt-3" style={{ ...step(1), color: "var(--gold-invite)" }}>
          <JharokhaArch width={68} style={{ opacity: 0.7 }} />
        </div>

        {/* PASS — the couple's names are the invitation's literal last
            words and should read as the strongest visual element on the
            page, per an explicit "main couple names must be the
            strongest visual element" direction — bumped substantially
            (30–46px → 40–62px) rather than nudged, since a modest
            increase here would still have left the closing page's own
            hero moment reading as an afterthought next to how large
            names get treated everywhere else in the invitation.

            NAME ORDER — canonical guest-facing order is Gunjan (bride,
            `couple.name2`) then Abhay (groom, `couple.name1`), matching
            CoupleIntro.tsx's own render order (bride's NameBlock first,
            groom's second). This page previously rendered name1 then
            name2 — i.e. Abhay then Gunjan — inconsistent with
            CoupleIntro. The underlying `name1`/`name2` data fields keep
            their existing semantic roles (groom/bride, tied to
            groomParents/brideParents) unchanged; only the DISPLAY order
            here was swapped to match. */}
        <h2
          className="mt-5"
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(40px,11.5vw,62px)",
            fontWeight: 500,
            lineHeight: 1.1,
            ...CLOSING_NAME_GRADIENT,
            ...step(2),
          }}
        >
          {couple.name2}
        </h2>
        <div className="my-1" style={{ color: "var(--gold-invite)", ...step(2) }}>
          <AmpersandOrnament size={20} />
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(40px,11.5vw,62px)",
            fontWeight: 500,
            lineHeight: 1.1,
            ...CLOSING_NAME_GRADIENT,
            ...step(3),
          }}
        >
          {couple.name1}
        </h2>

        <Divider emblem={theme.motifs.divider} width={130} className="my-5" style={step(4)} />

        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            color: "var(--text-secondary)",
            fontSize: "clamp(17px,4.2vw,21px)",
            lineHeight: 1.55,
            maxWidth: 360,
            ...step(4),
          }}
        >
          {closing.message}
        </p>

        {closing.familyMessage && (
          <p
            className="font-sc mt-4"
            style={{
              color: "var(--gold-invite-dim)",
              // kept comfortably above the parent-name baseline (13px)
              fontSize: "clamp(14px,3vw,16px)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              ...step(5),
            }}
          >
            {closing.familyMessage}
          </p>
        )}

        {/* the invitation's own last mark — a single small hairline with
            a diamond node, the visual "full stop" after the last word.
            Restrained on purpose: this closes the book, it doesn't open
            a new section. */}
        <div className="mt-5" style={{ ...step(6), opacity: 0.6 }}>
          <HairRule width={56} node="diamond" />
        </div>
      </div>

      {/* ── THE CLOSING PAGE'S OWN TWO ACTIONS — a small, balanced pair in
          the lower corners, independent of the centred farewell text
          above (anchored to the viewport's own bottom, not the text
          block), so they read as the invitation's printed footer rather
          than competing with its last words. Same "engraved stationery
          plaque" recipe as ViewOnMapButton (ivory-gradient capsule,
          hairline gold border, layered dimensional shadow) at an even
          smaller, corner-appropriate scale — visible and unmistakably
          pressable without turning into a flashy CTA. Neither claims a
          gesture, so the reel pager is unaffected. */}
      <div
        style={{
          position: "absolute",
          left: "max(14px, env(safe-area-inset-left, 0px))",
          bottom: "max(14px, env(safe-area-inset-bottom, 0px))",
          zIndex: 20,
        }}
      >
        {/* LEFT — the product/creator action. No "Make It Yours" flow
            exists yet in this codebase (that's the next, SaaS-platform
            phase) — this links to the one self-service entry point that
            already exists, `/admin/login`, as a real, working interim
            destination rather than a dead or fake link. */}
        <a
          href="/admin/login"
          className="footer-cta inline-flex items-center justify-center"
          style={{
            padding: "8px 15px",
            minHeight: 30,
            background: "linear-gradient(160deg, #fffdf8 0%, #f4ecda 100%)",
            border: "1.25px solid rgba(184,148,63,0.55)",
            borderRadius: 999,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 2px rgba(120,92,45,0.12), 0 2px 5px rgba(60,42,16,0.16), 0 4px 10px rgba(60,42,16,0.2)",
            color: "#5c3f16",
            fontFamily: "var(--font-sc)",
            fontSize: "clamp(10.5px, 2.6vw, 11.5px)",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Make It Yours
        </a>
      </div>

      {contact?.phone && (
        <div
          style={{
            position: "absolute",
            right: "max(14px, env(safe-area-inset-right, 0px))",
            bottom: "max(14px, env(safe-area-inset-bottom, 0px))",
            zIndex: 20,
          }}
        >
          {/* RIGHT — the guest-facing contact action. Name/phone come
              from the SAME `invitation.contact` data FloatingContact
              already reads elsewhere in the invitation — never a second,
              competing contact source, never a hardcoded number. When no
              contact name is configured the button still works, showing
              "Call" alone rather than blocking on a field nothing
              currently requires. */}
          <a
            href={`tel:${contact.phone}`}
            aria-label={contact.name ? `Call ${contact.name}` : "Call"}
            className="footer-cta inline-flex items-center justify-center"
            style={{
              gap: 6,
              padding: "8px 15px",
              minHeight: 30,
              background: "linear-gradient(160deg, #fffdf8 0%, #f4ecda 100%)",
              border: "1.25px solid rgba(184,148,63,0.55)",
              borderRadius: 999,
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 2px rgba(120,92,45,0.12), 0 2px 5px rgba(60,42,16,0.16), 0 4px 10px rgba(60,42,16,0.2)",
              color: "#5c3f16",
              fontFamily: "var(--font-sc)",
              fontSize: "clamp(10.5px, 2.6vw, 11.5px)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--gold-invite)" strokeWidth="2" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            {contact.name || "Call"}
          </a>
        </div>
      )}
    </section>
  );
}
