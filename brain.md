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
  (CoupleIntro LetterName; clamp(44px,6.4dvh,68px), weight 700). Kept as a
  separate variable so the experiment never leaks into Date/Events numerals.
- `--font-engrave` = **Cormorant** — SYMBOLIC: month wordmark, done-state.
- `--font-invite-label` = **Cormorant SC** — labels/kickers/parent lines,
  small caps + tracked.
- Playfair Display italic = content-section display voice (Venue/RSVP/Closing
  headers; NOT the cinematic scenes).

Palette tokens (classic-gold default): `--text-primary #2c2520`,
`--text-secondary #6b5e50`, `--text-tertiary #9a8c7a`, `--gold-invite #b8943f`,
`--gold-invite-dim #a08540`, `--gold-invite-light #d4b86a`,
`--gold-invite-deep #8c6f32` (added for the CoupleIntro card names — the
richest/deepest tier, for contrast against the card's own ivory base; see
Component map), `--paper-world` (cream radial).
Text directly on the video/artwork gets a tiny dark offset
`textShadow: 0 1px 2px rgba(38,26,14,…)` for legibility — never
glow/outline/gradient text. Text on a warm-ivory CARD (CoupleIntro) instead
gets a whisper of a light printed-ink highlight, not a contrast shadow —
the card is behind it, not the video.

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
  t0 (`CUE` timings; StrictMode-immune via `t0Ref`). **No Ganesha in this
  scene** (removed deliberately; `ganesha.png` is still used elsewhere, see
  Assets). **The foreground is a COUPLE PLAQUE** — a deliberate, explicit
  exception to the "no cards" convention below, asked for by name for this
  one scene: a warm ivory/champagne piece of stationery (`.paper-grain`
  texture + a soft shadow + a 1px outer gold border + a 9px-inset gold
  hairline, lifted from the same recipe as `RsvpSection.tsx`'s `Frame`)
  holding the whole introduction, floating over the still-fully-visible
  video.
  **Shape (5th pass — a TRUE semicircular gumbad, not an ellipse-arc):**
  the 4th pass's top used a small fixed `--arch-cap` (`36–50px`) as both
  horizontal(50%)/vertical radius, which is a flattened ellipse-arc, not a
  proper dome. Now `--dome-radius: calc(var(--plaque-w) / 2)` — EXACTLY
  half the plaque's own width — is used as a SINGLE value (so horizontal
  AND vertical radius are equal) on both top corners:
  `borderTopLeftRadius`/`borderTopRightRadius: "var(--dome-radius)"`. Two
  top corners each with horizontal radius = half-width meet exactly in the
  middle (one unbroken arc); vertical radius = half-width too means the
  dome's height equals its radius — the geometric definition of "upper
  half of a circle". Bottom corners keep their own small, independent,
  near-flat `--base-corner` (`clamp(8px,1.3dvh,12px)`, unchanged) plus the
  small PEDESTAL BAR (`56%` width, vertical highlight→bronze gradient, its
  own soft warm `boxShadow` — the ONLY deliberately-placed grounding
  shadow in the composition) at `bottom: -4px`, unchanged from the 4th
  pass. `--dome-radius` doubles as the plaque's own top padding.
  **ONE continuous dimensional border wraps the WHOLE perimeter**
  (previously only the pedestal read as "3-D"): two thin INSET
  box-shadows — `inset 0 1px 0 rgba(255,252,244,0.55)` (light highlight,
  upper inside edge) and `inset 0 -1px 0 rgba(120,92,45,0.22)` (warm
  shadow, lower inside edge) — layered onto the existing outer ambient
  `boxShadow`, under the 1px solid gold border (`rgba(184,148,63,0.3)`,
  eased down slightly from `0.34` for restraint). Box-shadow always
  respects border-radius, so this bevel travels around the dome's curve
  exactly as it does the straight sides and flat base.
  **7th pass removed the inner hairline entirely** (the second, concentric
  gold line 9px inset) — named explicitly as part of a "box within box" /
  competing-framing complaint. The outer border + the inset bevel above
  already carry the "dimensional frame" job; a second line was pure
  repetition. (This also removes a formula — `calc(var(--dome-radius) -
  9px)` — that had been silently referencing the RETIRED `--arch-cap`
  variable one pass prior; had that shipped, the undefined custom property
  would have produced an invalid radius. Moot now that the element is gone.)
  **Width:** `clamp(212px, 63vw, 266px)` (`--plaque-w`) — `63vw` keeps a
  constant proportional side margin (~18.5vw per flank). Horizontal padding
  `clamp(14px,4.5vw,22px)`.
  **Position: `top: 50dvh`** (44 → 47 → 51 → 45 → 49.5 → 45 → **50dvh**
  across eight passes). The 6th pass moved it to `49.5dvh` on a literal
  "10% lower, verbatim" request and was flagged as a real overshoot past
  the pavilion band on 360×640; the 7th pass reverted to `45dvh` because
  that pass also added height (bigger hands, more parent-line spacing)
  the `49.5dvh` budget had no room for. The 8th pass asked again, a
  second time, for "10–15% lower, do not resize or touch internal
  spacing" — explicitly ruling out the compensating trims used in earlier
  passes — so `top` moved to `50dvh` (+11.1% from 45) with NOTHING else
  in the file touched. **This is now flagged as a likely real overshoot
  a second time, not silently absorbed**: with hands/spacing at their
  current (larger, post-7th-pass) size, `50dvh` probably reproduces or
  slightly worsens the same 360×640 bottom-pavilion collision `49.5dvh`
  was reverted for. There is no remaining lever inside this file to fix
  it without violating "do not resize the plaque" — if this is reported
  as a real visual problem, the fix has to be a smaller downward shift, a
  smaller plaque, or moving `ScrollCue` itself.
  **Known thin spot, not visually verified:** at 360px width the parent
  lines (now `clamp(13px,3.5vw,16px)`, tracking `0.13em` — see below) may
  still not reliably fit on one line by hand-estimate and could wrap to 2
  (`ParentLine` has never set `white-space: nowrap`, so this is a graceful
  wrap, not clipping/an overflow bug) — if BOTH wrap simultaneously on the
  shortest supported phone (360×640), clearance above the lantern/pavilion
  bands drops to only a few px each side. Check this specific combination
  by hand before shipping.
  Names = Telma Bold via `--font-couple-custom`, `clamp(44px,6.4dvh,68px)`,
  colour `--gold-invite-deep` (a new, deeper token added specifically for
  this — see Typography system) — the card's richest gold tier, chosen for
  contrast against the card's OWN ivory base (not the video, now that a
  card sits between them). Per-letter type-on reveal unchanged (LetterName:
  TOTAL 2500ms / PER_LETTER 560ms, stagger = (TOTAL−PER_LETTER)/(len−1)).
  Parent lines = Cormorant SC, **refined this pass for presence**:
  `clamp(12.5px,3.4vw,15.5px)` → `clamp(13px,3.5vw,16px)`, tracking `0.2em`
  → `0.13em` (at a genuinely readable size, `0.2em` read as spaced-out
  metadata rather than engraved stationery), line-height `1.4` → `1.55`,
  `marginTop` `clamp(8px,1.8vh,15px)` → `clamp(10px,2vh,17px)` for more
  separation from the name above. Still DELIBERATELY WITHOUT a flanking
  hairline+diamond (see the comment above `ParentLine`) and still
  explicitly NOT to be shrunk to buy vertical budget — it was flagged once
  already as too small at the original `8.5–11px`.
  Wedding-hands (`wedding-hands.png`, the original transparent handshake
  artwork — the SAME FILE across every pass, never swapped, never
  recoloured beyond a grounding drop-shadow) is now `clamp(62px,8dvh,78px)`
  with `clamp(9px,1.8dvh,16px)` margin — nudged back UP this pass from
  `56–74px` (it had been trimmed twice, purely to buy vertical budget for
  the dome, past the point of reading as a meaningful symbolic element
  rather than a small icon) so it reads as the connector between the two
  names, not a second focal point; still grows from a single point to rest
  via `EASE_ARRIVE`.
  The `arrow` cue (22.2s, unchanged — still synced to the video's own
  ≈20.6s settle) renders the shared `ScrollCue` (chevron + tracked wordmark,
  currently "Begin Our Story"), positioned independently near the bottom of
  the screen. Video paused at 20.6s
  (watchdog), never reset, never replayed. Outside the card, the scene is
  otherwise unadorned: just the original whisper top/bottom vignette and
  the "settled" quiet radial vignette — no added colour grade or grain
  layer over the video itself.
  **`SoundToggle.tsx` and `FloatingContact.tsx`** (fixed-position global
  chrome, gated by `showChrome = inCard && introDone` in
  `PublicInvitation.tsx` — they mount at the EXACT moment `ScrollCue`
  appears, i.e. `introDone` is set by `CoupleIntro`'s own `onComplete`)
  were de-glassmorphed this pass: both used a `backdrop-blur-md` circular
  glass-pill button, and `FloatingContact`'s expanded WhatsApp/Call actions
  used coloured chip backgrounds (WhatsApp green, gold) with their own
  `backdrop-blur` — all explicitly against this project's "no
  cards/pills/glassmorphism" convention, and prominent enough to compete
  with "Begin Our Story" at the one moment they share the screen. Now bare
  icons/text (ivory, `filter: drop-shadow` for legibility over any
  artwork — the same technique `ScrollCue` already used), no background,
  no border, no blur. Functionality/positioning/wiring untouched.
  THE WHOLE FOREGROUND IS ONE PROPORTIONAL dvh SYSTEM — scene is 100dvh and
  the art is height-matched, so dvh fractions track painted-feature rows on
  every phone.
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
  flash empty). It is STATICALLY rendered: no timers, no crossfade buffers,
  no state, no mount/unmount on scroll, so the background cannot change,
  disappear or reset underneath the guest. It takes no gestures
  (`pointer-events: none`, no handlers) — vertical swipes stay with
  useReelPager.
  **Redesigned around the Theme 1 event photographs** (all five —
  mehendi/haldi/sangeet/wedding/reception — shipped as real 768×1376
  artwork; measured directly with pixel sampling, not eyeballed): each
  photo is a flat-lay of an ornamental gold-framed PLAQUE with the
  ceremony's own name already engraved into a ribbon banner near the top,
  and a large blank cream panel below it. That panel sits at a consistent
  ≈37–72% of image height / ≈16–83% of width across all five images. Since
  `cover` height-matches the art (same principle as the Couple scene's
  video), a vertical image-% maps directly to the same dvh-%, so the date/
  venue content wrapper is positioned at a conservative `top: 39.5dvh` /
  `bottom: 32dvh` — the INTERSECTION of all five images' own measured
  ranges. `maxWidth: min(70vw, 280px)` keeps text safely inside the
  measured horizontal panel too.
  Because the artwork now supplies the ceremony's name/title and its own
  frame, the app no longer draws one: **REMOVED** — the Roman chapter
  mark, the `Medallion` emblem ring (component deleted), the
  code-generated event-name `<h2>` + circle, the per-page double-hairline
  `PageEnvelope` (a photographed gold frame doesn't need a second drawn
  frame on top of it — `PageEnvelope` now only renders on `TitleScene` and
  the no-artwork fallback), the `event.description` paragraph, the
  per-event admin-uploaded `event.image` badge, `ART_WASH` and the
  watercolour-breath tint (both were legibility/mood aids for busy or
  variable art; the new photographs are already colour-graded and the
  text sits on a guaranteed cream panel, so both are now redundant —
  `accentFor`/`ACCENTS` still exist but only render in the plain-paper
  fallback). **KEPT and now the ENTIRE overlay:** date (weekday, Fraunces
  day numeral, month, time) and venue (name, address, `DirectionsAction`
  — grouped with venue as "location details"). Same three-voice type
  system, same `step()` fade+translateY reveal, same colours
  (`--text-primary` for the day numeral, `--gold-invite`/`-dim` for
  labels) — none of that changed, only what surrounds it and where it
  sits. A ceremony with no matching theme artwork (no shipped event hits
  this; the data model allows a hypothetical custom one) falls back to
  the earlier plain-paper + arch-ghost + `PageEnvelope` + its own title
  text, since there is no photograph to supply a name there.
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
  **Named exception: the CoupleIntro couple card** — explicitly requested
  by name, modelled on the SAME card recipe already used elsewhere
  (`.paper-grain`, the `Frame` pattern in `RsvpSection.tsx`: warm ivory
  gradient, soft two-layer shadow, hairline border, `ThemeCorner` florets,
  `borderRadius: 2`). Not a precedent for adding cards elsewhere — the rest
  of the cinematic reel stays card-free.

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
  back layer. **This is where per-ceremony artwork is edited.** All five are
  now real, distinct photographs (768×1376 each) — no longer placeholder
  copies of `couple-poster.jpg`. Each is a flat-lay of an ornamental
  gold-framed plaque with the ceremony's name engraved into a ribbon banner
  and a large blank cream text-safe panel beneath it (measured: ≈37–72% of
  height, ≈16–83% of width — see `EventsSection.tsx`'s header comment and
  `EventScene`, which position the date/venue overlay directly against
  these numbers). Replacing one of these files changes that ceremony's
  page with no code change, PROVIDED the new artwork keeps a similar
  plaque-with-blank-panel composition in a similar place — the date/venue
  position is measured from the current photos, not computed generically.
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