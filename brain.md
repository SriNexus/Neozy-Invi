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
- 4 pre-existing oxlint warnings are expected and not ours to fix: Countdown
  set-state-in-effect, CouplePhotoExperience set-state-in-effect, DateReveal
  set-state-in-effect, Ornaments only-export-components.

## Guest journey / page flow

```
COVER (cover.jpg, tap)
  → GATE FILM (gate-cinematic.mp4, silent, ~10s)
  → COUPLE INTRO (couple-background.mp4 = painted jharokha, plays ONCE, frozen ~20.6s)
  → DATE REVEAL (couple-poster background + scratch cover → date + countdown)
  → EVENTS REEL (title page + one full-screen page per ceremony)
  → COUPLE PHOTOS (one complete full-screen SCENE per photograph, no carousel UI)
  → VENUE → RSVP → CLOSING
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
  EventScene, and EVERY `AlbumLeaf` in CouplePhotoExperience — the album
  contributes one scene per photograph, so a 5-photo album is 5 scenes and
  the LAST photograph is the reel's final scene / hand-off boundary).
  `useReelPager` reads them via
  `document.querySelectorAll("[data-reel-scene]")` and pages the DOCUMENT
  scroll (wheel = one scene with preventDefault; touch = claim the vertical
  axis past a 6px slop, follow the finger 1:1, settle by fling/distance;
  native rests = 140ms idle align to the nearest scene top).
- **Smoothness (deliberate design — keep it).** Every programmatic move,
  gesture paging AND the idle align, runs through ONE `GLIDE` curve: an exact
  `cubic-bezier(0.34, 0, 0.18, 1)` (soft, unhurried start → long calm
  landing) evaluated by a module-local bezier solver, over
  `min(1040ms, max(560ms, |dist| × 0.52))`. Nothing snaps — the idle align
  used to assign `scrollTop` instantly, which is exactly what made a native
  rest read as a jump. `WHEEL_SETTLE_MS` (200ms) keeps wheel events swallowed
  briefly after a landing, so one wheel burst (or a trackpad momentum tail)
  pages exactly one scene instead of two.
- **Index.css deliberately has NO global `scroll-behavior: smooth`** — the
  pager assigns `scrollTop` every frame and needs instant-assignment
  semantics (smooth turns every write into a compositor animation that
  outlives the JS transition lock and fights the easing). Smooth scrolling
  only where explicitly requested (the intro arrow's `scrollIntoView`).
- `[data-reel-scene]` sets `touch-action: pan-x pinch-zoom` (vertical is
  JS-owned so preventDefault beats native pan on Android/iOS; pinch-zoom
  stays native). EVERY scene keeps that default — there is no horizontal
  surface left to own (the album's old `touch-action: none` stage is gone
  with its carousel). Paper sections below
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
Type Foundry, ITF Free Font License) at `public/themes/theme-1/fonts/telma/` —
single Bold 700 face, woff2 only, registered in index.css as
`--font-couple-custom`, applied ONLY to the CoupleIntro name wordmarks
(the "Telma experiment").

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
  Since the Theme-1 asset reorganisation, `load()` also runs a legacy-path
  migration (`migrateLegacyPaths`): any stored `/video/`, `/audio/`,
  `/fonts/` path from before the move is rewritten to its
  `/themes/theme-1/...` location and the clean copy is persisted once.
- `src/data/themes.ts` — ThemeConfig (palette/fonts/assets/motifs/layout/
  paperWorld/ornamentation/motion); `getTheme(id)`, `useActiveTheme()`,
  `useThemeApplication()` sets CSS vars on document root. `ThemeAssets`
  carries `wallpaperVideo`, `wallpaperPoster`, `eventBackgrounds`,
  `venueImage`, `closingImage` AND `albumArt` — every image in the invitation
  is theme-owned; no component hardcodes an image path.
  `eventBackgrounds` is a `Record<string, EventWallpaper>` of ceremony MOTIF
  (`motifForEvent()`: mehendi / haldi / sangeet / wedding / reception) → that
  ceremony's ONE background painting, built from the `EVENT_BACKGROUNDS` map
  (`{ ground: `${IMG}${ceremony}.jpg` }`) and rendered statically by
  `EventBackdrop`. An `EventWallpaper` is
  `{ ground, groundPosition?, motif?, motifWidth?, motifTop?, motifOpacity? }`:
  a full-bleed painting plus an optional TRANSPARENT mark laid over it.
  **ONE painting per event, applied permanently: no carousel, no crossfade,
  no timer, no mount/unmount on scroll.** An earlier per-ceremony image
  rotation is exactly what made event backgrounds appear to change or reset
  on their own — do NOT reintroduce it. The artwork files are the
  `{mehendi,sangeet,haldi,wedding,reception}.jpg` in
  `public/themes/theme-1/images/`, so replacing one changes that ceremony's
  page with no code change.
  `venueImage` = the Venue page's painting (used when `venue.image` is unset;
  an uploaded venue photo always wins). `closingImage` = the closing page's
  artwork. `albumArt` = the album's placeholder pages, ONE full-screen scene
  each (see CouplePhotoExperience).
- Admin: `/admin/*` routes edit the store (RequireAdmin). Admin pages don't
  matter for public changes.

## Component map

- `CoupleIntro.tsx` — the couple scene. Deterministic rAF clock from a fixed
  t0 (`CUE` timings; StrictMode-immune via `t0Ref`). Ganesha enters from
  `translateY(-150dvh)` over 5s `EASE_DESCENT` (cubic-bezier(0.12,0.72,0.2,1)),
  rests at `top: 17.8dvh` (pure fraction; the painted lanterns bottom out at
  ≈13.4% of scene height, which is the figure's UPPER bound), `width:
  clamp(83px,12.1dvh,121px)` (≈10% smaller than the original 92/13.4dvh/134
  clamp; the top has since been lowered twice — 15dvh → 16.2dvh → 17.8dvh,
  each ≈10% of the previous rest). Clear air to the bride's name is ≥ ~88px
  on a 360×640 and grows on taller phones.
  Names = Telma Bold via
  `--font-couple-custom` `clamp(40px,5.8dvh,60px)` with a normalized ~2.5s
  per-letter type-on reveal (LetterName: TOTAL 2500ms / PER_LETTER 560ms,
  stagger = (TOTAL−PER_LETTER)/(len−1)); parent lines = Cormorant SC with
  flanking hairline+diamond; wedding-hands `clamp(150px,21.6dvh,210px)`.
  The names + parents + hands are ONE block, bottom-anchored at
  `clamp(80px,16.4dvh,150px)` (≈10% higher than the previous
  `clamp(73px,14.9dvh,136px)`, itself ≈10% above 66/13.5dvh/124) — move it as
  a unit, never element by element. The `arrow` cue (22.2s)
  renders the shared `ScrollCue` (chevron + tracked SCROLL NOW).
  Video paused at 20.6s (watchdog), never reset, never replayed. THE WHOLE
  FOREGROUND IS ONE PROPORTIONAL dvh SYSTEM — scene is 100dvh and the art is
  height-matched, so dvh fractions track painted-feature rows on every phone.
- `DateReveal.tsx` — scratch cover (canvas, painted gold PNG
  public/themes/theme-1/images/scratch.png, `destination-out` erasing, ~50% of originally
  opaque alpha must be erased; phases sealed → revealed → settled). The
  canvas' wrapper (never the canvas) carries `scratchRock`: a fast, tiny
  clockwise ↔ anticlockwise spring (peak 1.8°, decaying, then a beat of
  stillness) — rotation ONLY, about the layer's own centre. Because a
  rotation about its own centre leaves that centre fixed, `toCanvas`
  inverts it exactly: the bounding box's centre IS the layer centre, the
  layout size comes from `offsetWidth/Height` (transform-independent) and
  the finger delta is rotated back by `-tilt`, so a touch always scratches
  where it touches. The rock PAUSES (holds, never snaps) while a stroke is
  live and while the cover dissolves. Cover fitting also uses
  `offsetWidth/Height`, not the bounding box (a rotated box's AABB is
  larger than the box). The cover dissolves over `FADE_MS` (900ms) and is only UNMOUNTED
  after that (assist path included), so nothing is cut out mid-frame.
  `revealed` fires the instant the threshold is crossed — the date settles
  immediately, in parallel with the dissolve. Reveal = warm bloom
  (mix-blend screen, exits over 2.2s starting 1.7s) + the celebration (6
  drifting flecks + a 14-spark `CelebrationParticles mode="burst"` behind
  the date) at the reveal moment; countdown settles at 2.3s at FULL
  brightness (no dimming layer exists — don't add one). The countdown is
  MOUNTED from the start so its space is reserved (no layout jump) and
  interpolates opacity 0 → 0.45 → 1 across revealed → settled. The SCROLL
  NOW cue appears 3.6s after `settled` and is non-interactive (the pager
  owns the gesture). Callbacks passed into `ScratchCover` must stay
  identity-stable — its paint effect would otherwise re-run and wipe the
  guest's scratching.
- `Countdown.tsx` — Fraunces numerals `clamp(28px,8.4vw,38px)` +
  Cormorant SC labels; "Until We Celebrate" label; same footprint rules.
- `EventsSection.tsx` — full-screen reel: `TitleScene` + one `EventScene` per
  ceremony (100dvh sections, `data-reel-scene`). Each ceremony page carries
  ITS OWN artwork as the scene's back layer through `EventBackdrop`, from
  `theme.assets.eventBackgrounds[motif]`: the printed PAPER ground first (a
  slow or failed image can never blank the page), then the painting
  (`object-fit: cover`, EAGER on purpose — the background must already be
  decoded when the pager lands on the scene; `loading="lazy"` is what let it
  flash empty), then the ceremony's watercolour breath and the warm
  `ART_WASH` veil for legibility — never a dark overlay, and the artwork is
  never mixed into the type. It is STATICALLY rendered: no timers, no
  crossfade buffers, no state, no mount/unmount on scroll, so the background
  cannot change, disappear or reset underneath the guest. The arch ghost
  remains only for a ceremony with no artwork. It takes no gestures
  (`pointer-events: none`, no handlers) — vertical swipes stay with
  useReelPager.
  Roman chapter marks, `Medallion` emblem ring, Fraunces titles, date anchor,
  venue small-caps, description, `.directions-action` button (index.css).
- `CouplePhotoExperience.tsx` — the album as a VERTICAL REEL: `AlbumLeaf`
  renders ONE photograph per full-screen `data-reel-scene` 100dvh section, so
  the existing pager consumes the photographs one deliberate gesture at a
  time and only after the LAST photograph does the page hand off below the
  reel (Venue → RSVP → Closing). **NO CONTROLS AT ALL — no arrows, chevrons,
  dots, buttons or horizontal track** — and no pointer handlers anywhere, so
  vertical touch/wheel stays entirely with the pager; the scenes keep the
  default `touch-action: pan-x pinch-zoom` (the old `touch-action: none`
  stage went with the carousel). Each leaf = the album's warm paper ground,
  the printed double-hairline envelope + corner florets, the photograph
  contained at its natural aspect ratio (never cropped or stretched), the
  "03 / 05" mark, and the caption beneath (caption falls back to the couple's
  names). The photograph breathes in as its page arrives (`useInView`, 0.3,
  disconnect) with a slow scale settle + fade — no bounce, no zoom, no slide.
  When the gallery is empty (as shipped) the pages come from
  `theme.assets.albumArt` — five theme artworks, one page each — so the
  sequence is always a real multi-photograph album; uploaded photographs
  replace the whole set, and a page whose file fails drops out via the
  `broken` set (keyed by the image path).
- `VenueSection.tsx` — the Venue page: `venue.image || theme.assets.venueImage`
  under a deep warm veil with ivory type (`hasImage` swaps the whole palette).
- `ClosingSection.tsx` — the closing page: `theme.assets.closingImage`
  full-bleed under a CREAM radial veil (light, not the Venue's dark one) so
  the printed dark ink stays exactly as readable as on paper and the
  invitation ends on its own paper world. `object-position: center 38%`;
  falls back to the paper world if the artwork fails.
- `decor/Ornaments.tsx` — the illustrated SVG language: CornerFloret/
  CornerArabesque/ThemeCorner, HairRule (tapered rule + dot/diamond node),
  Divider (emblem + rules), Emblem (lotus/star/geometric), AmpersandOrnament,
  EventEmblem (mehendi/haldi/sangeet/wedding/reception/blessing/lotus),
  `motifForEvent(e)`, JharokhaArch, AmbientParticles. Reuse these — do not
  invent new decoration.
- `VideoBackground.tsx`, `OpeningVideo.tsx`, `Cover.tsx`, `SoundToggle.tsx`,
  `FloatingContact.tsx` — supporting pieces.
- `ScrollCue.tsx` — the one scroll invitation: a thin-line downward arrow
  with a tracked SCROLL NOW wordmark beneath it, floating on a pool of warm
  light. Luminous treatment (the cue must be found at a glance over a
  full-screen painting): ivory marks (`var(--ivory)`) with BOTH a tight dark
  shadow (readable over the painting's light areas) and a warm gold halo
  (readable over its dark ones), plus a soft radial cream light behind the
  whole mark — light, never a panel, and deliberately NOT screen-blended
  (the cue lives in its own stacking context, so a blend could not reach the
  painting; the glows ride on `drop-shadow`/`text-shadow` instead).
  `scrollCuePulse` (floor 0.74, 5px drift) and `scrollCueAura` (the light
  swelling) share ONE 3.2s clock. Non-interactive by design (the couple
  scene wraps it in its arrow button; the date scene positions it in the
  empty band below the countdown). Reduced motion removes ONLY the
  animation — the cue stays bright, static and fully visible. (History: the
  old bare chevron pulsed with the retired `scrollBounce`, whose 0.28
  opacity floor made a thin gold stroke read as "not there" over the
  artwork's dark lower band.)
- `CelebrationParticles.tsx` — two modes, one system: `"fall"` (the original
  drifting petals) and `"burst"` (gold sparks radiating from the centre, for
  the date reveal; `celebrationBurst` keyframes live in index.css).

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
- **Per-event backgrounds** —
  `themes/theme-1/images/{mehendi,sangeet,haldi,wedding,reception}.jpg`: ONE
  file per ceremony, referenced from `ThemeAssets.eventBackgrounds`
  (`EVENT_BACKGROUNDS` in themes.ts) and rendered as that page's PERMANENT
  back layer. **This is where per-ceremony artwork is edited.** As shipped,
  four are byte-identical copies of `couple-poster.jpg` and `haldi.jpg` has
  been replaced by hand (941×1672) — so four ceremonies currently look the
  same until real artwork is dropped in.
- Other theme artwork: `couple-poster.jpg` (720×1280 painted jharokha) serves
  the Couple film poster, the Date Reveal background AND the Venue page
  (`venueImage`); `cover.jpg` (1594×987 envelope art) serves the Cover gate,
  the gate film's poster and the closing page (`closingImage`);
  `ganesha.png` (394×441) and `wedding-hands.png` (500×500) are transparent
  marks (both are also album placeholder pages) and `scratch.png` (1457×996,
  2.5MB) is the scratch cover. `albumArt` lists five files, one full-screen
  album page each — including `haldi.jpg`, so the album reflects edited
  artwork too. There are only TWO wallpaper-grade paintings in the theme,
  so the ceremony files are the ones to edit.
- There are no event PHOTOS — the small framed image on a page only appears
  if `event.image` is set (admin-uploaded); otherwise the page uses
  `EventEmblem`.
- Admin-uploaded gallery/music are base64 data URLs persisted in
  localStorage — never files under public/.

## Editing checklist

1. Read the relevant component(s) + PublicInvitation wiring before editing.
2. Keep scenes self-contained (own background, moves as one unit).
3. If adding a full-screen scene to the reel: `height: 100dvh`, the
   `data-reel-scene` attribute (that ONE attribute is all the pager needs —
   no scroll-snap, no snap-release helper, they are gone), its own
   background inside the section, and wire it in PublicInvitation.
4. Respect reduceMotion, preserve data (invitation.ts / store), keep the
   built-in ornaments and fonts.
5. Verify with `npm run build` and `npm run lint`.