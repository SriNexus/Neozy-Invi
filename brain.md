# brain.md — Project knowledge base

One-file context for the wedding invitation project (`neozy-invi`), so future
sessions can work from memory instead of re-reading the codebase. Keep this
updated when architecture or conventions change.

## What this is

A premium **digital Indian wedding invitation** — React 19 + Vite + TypeScript +
Tailwind v4 (loaded but mostly unused; styling is inline). Mobile-first
(360/375/390/412px), felt like **luxury wedding stationery + cinematic reel**,
NOT a website. No git repo in this directory. No tests.

## Commands

```bash
npm run dev      # vite dev server
npm run build    # tsc -b && vite build   (typecheck + build — the go-to check)
npm run lint     # oxlint
npm run preview  # vite preview
```

- Never run `qa` (scripts/qa.mjs) — it uses Playwright; the user forbids
  browser automation, screenshots, and visual testing. Typecheck/lint/build only.
- 3 pre-existing oxlint warnings are expected and not ours to fix: Countdown
  set-state-in-effect, DateReveal set-state-in-effect, Ornaments
  only-export-components.

## Guest journey / page flow

```
COVER (cover.jpg, tap)
  → GATE FILM (gate-cinematic.mp4, silent, ~10s)
  → COUPLE INTRO (couple-background.mp4 = painted jharokha, plays ONCE, frozen ~20.6s)
  → DATE REVEAL (couple-poster background + scratch cover → date + countdown)
  → EVENTS REEL (title page + one full-screen page per ceremony)
  → VENUE → COUPLE PHOTOS (sticky stage) → RSVP → CLOSING
```

All orchestrated in `src/pages/PublicInvitation.tsx` (stages: cover/video/card).
The scroll document is a single div (display:none until tap) containing every
section in order.

## The reel / scroll architecture (critical)

- **The single source of truth is `src/lib/useReelPager.ts`** (see its big
  header comment). The old scroll-snap design (this section's earlier text)
  is GONE — no `scroll-snap`, no `useSceneSnapRelease`. Do not reintroduce
  CSS scroll-snap: it cannot guarantee one-scene rests and fights the pager.
- Full-screen reel scenes are normal-flow `100dvh` sections marked
  `data-reel-scene` (CoupleIntro, the Date wrapper div, TitleScene, every
  EventScene, CouplePhotoExperience). `useReelPager` reads them via
  `document.querySelectorAll("[data-reel-scene]")` and pages the DOCUMENT
  scroll (wheel = one scene with preventDefault; touch = claim the vertical
  axis past a 6px slop, follow the finger 1:1, settle by fling/distance;
  native rests = 140ms idle align to the nearest scene top).
- **Index.css deliberately has NO global `scroll-behavior: smooth`** — the
  pager assigns `scrollTop` every frame and needs instant-assignment
  semantics (smooth turns every write into a compositor animation that
  outlives the JS transition lock and fights the easing). Smooth scrolling
  only where explicitly requested (the intro arrow's `scrollIntoView`).
- `[data-reel-scene]` sets `touch-action: pan-x pinch-zoom` (vertical is
  JS-owned so preventDefault beats native pan on Android/iOS; pinch-zoom
  stays native). The photo album's stage is `touch-action: none` (both axes
  JS: carousel = horizontal, pager = vertical). Paper sections below
  (Venue/RSVP/Closing) are `auto` — fully native.
- Transition lock: `lockedRef` in useReelPager, held for the whole glide and
  released after a landing verification. Wheel deltas and touches during a
  glide are swallowed so one gesture cannot stack scenes.
- Reel hand-off: the album is the last scene; an upward swipe on it is
  claimed and hands off past its midpoint; below the album everything is
  native page scroll.
- Each cinematic scene **owns its own background inside its own section**
  (video/poster/image absolute inset-0) so background + foreground move
  together. Never a fixed background behind moving content.
- Non-scene sections (Venue/RSVP/Closing are paper content sections) read
  against the fixed "World B" paper layer (zIndex 1, pointer-events none,
  `--paper-world`).
- Scroll lock exists only pre-card: `root.style.overflow = "hidden"` until
  `stage === "card" && introDone`. `useReelPager` is armed at exactly that
  moment from PublicInvitation.

## Typography system (index.css `:root` tokens)

Google Fonts import in index.css: Allura, Cinzel, Cormorant, Cormorant
Garamond, Cormorant SC, Fraunces (variable: opsz/SOFT/WONK), Petit Formal
Script, Playfair Display. Self-hosted: Telma Bold (Fontshare / Indian
Type Foundry, ITF Free Font License) at `public/fonts/telma/` — single
Bold 700 face, woff2 only, registered in index.css as `--font-couple-custom`,
applied ONLY to the CoupleIntro name wordmarks (the "Telma experiment").
Original download zip kept at project root (FontshareKit-2609000315.zip).

Three-voice system (overridden by themes via useThemeApplication → CSS vars):
- `--font-couple` = **Fraunces** — IDENTITY: date numeral "12", event titles,
  day numerals. Set with `fontVariationSettings: '"opsz" 96–144, "SOFT" 40–50,
  "WONK" 0–1'`.
- `--font-couple-custom` = **Telma Bold** — the couple names ONLY
  (CoupleIntro LetterName; clamp(38px,12.5vw,54px), weight 700). Kept as a
  separate variable so the experiment never leaks into Date/Events numerals.
- `--font-engrave` = **Cormorant** — SYMBOLIC: month wordmark, done-state.
- `--font-invite-label` = **Cormorant SC** — labels/kickers/parent lines,
  small caps + tracked.
- Playfair Display italic = content-section display voice (Venue/RSVP/Closing
  headers; NOT the cinematic scenes).

Palette tokens (classic-gold default): `--text-primary #2c2520`,
`--text-secondary #6b5e50`, `--text-tertiary #9a8c7a`, `--gold-invite #b8943f`,
`--gold-invite-dim`, `--gold-invite-light`, `--paper-world` (cream radial).
Text on art gets a tiny dark offset `textShadow: 0 1px 2px rgba(38,26,14,…)`
for legibility — never glow/outline/gradient text.

## Data & state

- `src/data/invitation.ts` — types + default `invitation` object (couple
  names, wedding date, events[5], venue, rsvp, closing, music, settings).
  Events: mehendi, sangeet, haldi, wedding, reception (in that order).
- `src/data/store.ts` — `invitationStore` (get/set/patch/subscribe/reset),
  **persisted to localStorage key `neozy-invi:invitation-data`**; stored data
  is merged over defaults and WINS. ⚠️ Changing a default in invitation.ts
  won't show for a browser with a cached copy — admin "reset" or clear the key.
- `src/data/themes.ts` — ThemeConfig (palette/fonts/assets/motifs/layout/
  paperWorld/ornamentation/motion); `getTheme(id)`, `useActiveTheme()`,
  `useThemeApplication()` sets CSS vars on document root.
- Admin: `/admin/*` routes edit the store (RequireAdmin). Admin pages don't
  matter for public changes.

## Component map

- `CoupleIntro.tsx` — the couple scene. Deterministic rAF clock from a fixed
  t0 (`CUE` timings; StrictMode-immune via `t0Ref`). Ganesha enters from
  `translateY(-150dvh)` over 5s `EASE_DESCENT` (cubic-bezier(0.12,0.72,0.2,1)),
  rests at `top: 15dvh` (pure fraction — lanterns bottom out at ≈13.4% of
  scene height), `width: clamp(92px,13.4dvh,134px)`. Names = Telma Bold via
  `--font-couple-custom` `clamp(40px,5.8dvh,60px)` with a normalized ~2.5s
  per-letter type-on reveal (LetterName: TOTAL 2500ms / PER_LETTER 560ms,
  stagger = (TOTAL−PER_LETTER)/(len−1)); parent lines = Cormorant SC with
  flanking hairline+diamond; wedding-hands `clamp(150px,21.6dvh,210px)`.
  Video paused at 20.6s (watchdog), never reset, never replayed. THE WHOLE
  FOREGROUND IS ONE PROPORTIONAL dvh SYSTEM — scene is 100dvh and the art is
  height-matched, so dvh fractions track painted-feature rows on every phone.
- `DateReveal.tsx` — scratch cover (canvas, painted gold PNG
  public/themes/theme-1/images/scratch.png, `destination-out` erasing, ~50% of originally
  opaque alpha must be erased; phases sealed → revealed → settled). Reveal =
  warm bloom (mix-blend screen, exits over 2.2s starting 1.6s) + 6 celebratory
  particles; countdown settles at 2.3s at FULL brightness (no dimming layer
  exists — don't add one).
- `Countdown.tsx` — Fraunces numerals `clamp(28px,8.4vw,38px)` +
  Cormorant SC labels; "Until We Celebrate" label; same footprint rules.
- `EventsSection.tsx` — full-screen reel: `TitleScene` + one `EventScene` per
  ceremony (100dvh sections, `scrollSnapAlign` from `snapEnabled` prop,
  `lastSceneRef` on the final page). Paper pages have corner florets + accent
  watercolour; the wedding ceremony page uses `theme.assets.wallpaperPoster`
  as its background. Roman chapter marks, `Medallion` emblem ring, Fraunces
  titles, date anchor, venue small-caps, description, `.directions-action`
  button (styles in index.css).
- `CouplePhotoExperience.tsx` — the album reel scene: horizontal pointer-drag
  carousel (photo follows 1:1, settle by distance/flick); vertical swipes
  belong to the reel pager. Stage is `touch-action: none`.
- `decor/Ornaments.tsx` — the illustrated SVG language: CornerFloret/
  CornerArabesque/ThemeCorner, HairRule (tapered rule + dot/diamond node),
  Divider (emblem + rules), Emblem (lotus/star/geometric), AmpersandOrnament,
  EventEmblem (mehendi/haldi/sangeet/wedding/reception/blessing/lotus),
  `motifForEvent(e)`, JharokhaArch, AmbientParticles. Reuse these — do not
  invent new decoration.
- `VideoBackground.tsx`, `OpeningVideo.tsx`, `Cover.tsx`, `SoundToggle.tsx`,
  `FloatingContact.tsx`, `CelebrationParticles.tsx` — supporting pieces.

## Artwork geometry facts (measured, trust these)

- `couple-poster.jpg` / `couple-background.mp4`: 720×1280, painted jharokha — blue
  watercolor outside, cream arch channel in the center, lanterns, peacocks,
  pavilions at the bottom.
- Under `object-fit: cover` on any portrait phone the art is height-matched
  (scale ≈ 0.658): a painted feature lands at the SAME viewport pixel row on
  every device (img_y = vp_y / 0.658).
- Lanterns bottom out at ≈ **113px** from the viewport top; the clear cream
  arch channel runs ≈ 120px → ~640px; pavilions own everything below.
- Ganesha's PNG (394×441) has almost no transparent padding — box ≈ figure.
- Poster mean luminance ≈ 206 (bright) — legibility washes, not dimmers.

## Conventions

- Inline `style` objects everywhere; dvh/dvw units + `clamp()` for everything
  viewport-relative; `100dvh` scenes (never `100vh` for scenes).
- `prefersReducedMotion()` from `src/lib/motion` — gate every animation
  (inline: `reduce ? "none" : transition`), never rely only on CSS media.
- Reveal pattern: `useInView`/IntersectionObserver (threshold ~0.15–0.3,
  disconnect after first hit) → opacity/translateY transitions with the
  shared ease `cubic-bezier(0.22,1,0.36,1)`.
- Uppercase tracked labels: compensate tracking with `marginLeft` equal to
  the `letterSpacing` em value (existing pattern, keep it).
- Decorations: `aria-hidden`, `pointer-events: none`. Real links keep real
  `href`s. Titles h2/h3 semantic.
- Style bar: luxury invitation stationery — restraint, proportion, editorial
  type. NO cards/pills/glassmorphism/gradients-as-decoration/SaaS chrome.
  No new fonts without checking the established set. No new assets unless
  genuinely needed and style-matched.

## Assets (public/)

All Theme 1 media lives under `public/themes/theme-1/` (images/, videos/,
  audio/, fonts/) — a future Theme 2 adds its own parallel folder; app/system
  assets (favicon.svg) stay at public/ root.

- `themes/theme-1/videos/couple-background.mp4` (portrait film),
  `themes/theme-1/videos/gate-cinematic.mp4`,
  `themes/theme-1/images/couple-poster.jpg`, `themes/theme-1/images/cover.jpg`,
  `themes/theme-1/images/ganesha.png`, `themes/theme-1/images/wedding-hands.png`,
  `themes/theme-1/images/scratch.png`, `themes/theme-1/audio/wedding-music.mp3`,
  `themes/theme-1/fonts/telma/Telma-Bold.woff2` (+ FFL.txt).
- No event-specific images exist — events use SVG emblems, not photos.
- Admin-uploaded gallery/music are base64 data URLs persisted in
  localStorage — never files under public/.

## Editing checklist

1. Read the relevant component(s) + PublicInvitation wiring before editing.
2. Keep scenes self-contained (own background, moves as one unit).
3. If adding a full-screen scene to the reel: `height: 100dvh`,
   `scrollSnapAlign` via a ref + `useSceneSnapRelease` (keyed sensibly —
   usually on the LAST element of the run), and wire it in PublicInvitation.
4. Respect reduceMotion, preserve data (invitation.ts / store), keep the
   built-in ornaments and fonts.
5. Verify with `npm run build` and `npm run lint`.