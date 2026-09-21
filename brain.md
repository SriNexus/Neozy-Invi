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
  → COUPLE INTRO — ONE continuous gate film (gate-cinematic.mp4, silent,
    23.8s, plays ONCE, never looped/reset), this scene's ONLY background —
    there is NO card/panel anywhere in this sequence (the old ivory
    "Couple Card" CONTAINER was removed by explicit request; the CONTENT
    it held — names, parent lines, wedding-hands — was NOT removed and is
    composited directly onto the film; see CoupleIntro.tsx's header):
      0–9s    envelope opening + Ganesha medallion, no overlay
      9–12s   WELCOME TEXT reveals (in the illustrated couple's blank
              sky): "With Joy In Our Hearts" / "We Welcome You" — a short
              cinematic phrase, deliberately NEVER the couple's own names
      12–14s  text fades out
      14–17s  bare film (crossfade to the arched frame)
      17–21s  COUPLE CONTENT reveals directly on the film, no box behind
              it: bride name → her parent line → wedding-hands (the union,
              between the two names) → groom name → his parent line —
              same data/typography/order the old plaque held, just with
              no container. Fully settled by ~21s, then holds unanimated.
      ~23.8s  film ends (fades to white) → the golden scroll chevron
  → DATE REVEAL (dateRevealPoster background + scratch cover → date + countdown)
  → EVENTS REEL (title page + one full-screen page per ceremony)
  → COUPLE PHOTOS (one complete full-screen SCENE per photograph, no carousel UI)
  → VENUE → RSVP → CLOSING
```

All orchestrated in `src/pages/PublicInvitation.tsx` (`revealed`/`introDone`
booleans, no more separate "video" stage — see `CoupleIntro.tsx` below for
why). The scroll document is a single div, mounted and laid out from the
first render (an opaque `Cover` overlay sits on top of it until the tap);
`CoupleIntro`'s gate-film `<video>` lives inside that document from the
start too, paused on its first frame, so the tap only calls `.play()` on
it and fades the Cover away — the film is never swapped or remounted.

## The reel / scroll architecture (critical)

- **The single source of truth is `src/lib/useReelPager.ts`** (see its big
  header comment). The old scroll-snap design (this section's earlier text)
  is GONE — no `scroll-snap`, no `useSceneSnapRelease`. Do not reintroduce
  CSS scroll-snap: it cannot guarantee one-scene rests and fights the pager.
- Full-screen reel scenes are normal-flow `100dvh` sections marked
  `data-reel-scene` — CoupleIntro, the Date wrapper div, TitleScene, every
  EventScene, every `AlbumLeaf` in CouplePhotoExperience, **and now
  VenueSection, RsvpSection and ClosingSection too**. `useReelPager` reads
  them via `document.querySelectorAll("[data-reel-scene]")` and pages the
  DOCUMENT scroll (wheel = one scene with preventDefault; touch = claim the
  vertical axis past a 6px slop, follow the finger 1:1, settle by
  fling/distance; native rests = 140ms idle align to the nearest scene top).
  **The reel now runs the ENTIRE invitation, top to bottom — there is no
  more "reel ends after the album, normal scrolling resumes" concept.**
  Venue/RSVP/Closing used to be plain document-flow sections with
  content-driven (`minHeight`, not `height`) sizing — that inconsistent,
  non-100dvh geometry was invisible to `readGeom()` (which only ever sees
  `[data-reel-scene]` elements) and is exactly what let a guest rest with
  two sections half-visible: the browser was free to stop anywhere inside
  untagged content. Fixed by giving all three the same `data-reel-scene` +
  fixed `height:"100dvh"` (+ flex-centering their own content, since
  their content no longer stretches the section to fit) every earlier
  scene already used. `useReelPager.ts` itself needed no new concept for
  this — only its backward-navigation/idle-align bounds, which used to
  stop at "the last scene's own top" or "50% into it" (both artifacts of
  there being real content below the reel to hand off to), were widened to
  cover the last scene's FULL height now that there's nothing beyond it.
- RSVP's own content is the hard part of this: once "accepting" reveals
  guest-count + up to 5 events + a note field, that's genuinely a lot for
  one 100dvh screen with an explicit "no internal scroll" rule. Fixed by
  real compaction, not by shrinking text below 14px: accept/decline are
  short words in one row (was two stacked full-sentence buttons), guest
  count is one inline row (was label-above-stepper), and event selection
  is small wrapped chips (was a five-row vertical list) — this was the
  single biggest space cost in the old layout. This was hand-verified
  against a 375×667-class viewport, not rendered — see PRODUCT_AUDIT.md's
  own standing caveat about anything not visually confirmed.
- **Smoothness (deliberate design — keep it).** Every programmatic move,
  gesture paging AND the idle align, runs through ONE `GLIDE` curve: an exact
  `cubic-bezier(0.34, 0, 0.18, 1)` (soft, unhurried start → long calm
  landing) evaluated by a module-local bezier solver, over
  `min(1040ms, max(560ms, |dist| × 0.52))`. Nothing snaps — the idle align
  used to assign `scrollTop` instantly, which is exactly what made a native
  rest read as a jump. `WHEEL_SETTLE_MS` (350ms, was 200ms — widened for
  trackpad momentum tails) keeps wheel events swallowed briefly after a
  landing, so one wheel burst pages exactly one scene instead of two. A
  sustained touch drag is also capped to exactly one scene of movement
  regardless of how many scene tops it visually crosses (an earlier
  version allowed up to three via `s.crossings`, which is exactly what let
  one strong swipe skip ahead multiple sections).
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
  **The wedding is 4 December 2026, 6:00 PM** (`wedding.date`/`.time`;
  was 12 December 10:00 AM — a real, since-fixed bug: `getWeddingDate()`
  used to HARDCODE `10, 0, 0` regardless of `wedding.time`, so the
  displayed time string and the actual countdown target could silently
  disagree; it now parses `wedding.time` for real via `parseTimeOfDay`).
  `venue.date`/`.time` updated to match (a duplicate of the same fact in
  a different object — the kind of "hidden old value" that's easy to
  miss).
  **Pass — official event schedule fixed**: the `events` array's dates
  previously placed Mehendi/Sangeet/Haldi/Reception AFTER the wedding day
  (a pre-existing placeholder-data bug, since corrected). The real
  schedule is now the single source of truth: Mehendi 3 Dec 2:00 PM,
  Sangeet 3 Dec 4:00 PM, Haldi 4 Dec 12:00 PM, Wedding 4 Dec (no
  confirmed time — `EventData.time` is optional precisely for this case,
  and `EventScene` simply omits the time line when absent), Reception
  4 Dec 6:00 PM.
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
  carries `dateRevealPoster`, `eventBackgrounds`, `venueImage`,
  `closingImage` AND `albumArt` — every image in the invitation is
  theme-owned; no component hardcodes an image path. There is no
  `wallpaperVideo`/`wallpaperPoster` any more: the Couple scene's
  background is the gate film itself now, and there is no card layered
  over it either (see "Guest journey" and `CoupleIntro.tsx` below). The
  gate film's own path is a small hardcoded constant inside
  `CoupleIntro.tsx` (matching how the old `OpeningVideo.tsx` — now
  deleted — already hardcoded it, rather than a new theme field).
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
  artwork. `albumArt` = the "Our Story" album's pages, ONE full-screen scene
  each (see CouplePhotoExperience) — currently the five real couple
  photographs (`couple1–5.jpg`), hand-ordered by visual/emotional ranking
  (NOT filename): `couple4 → couple3 → couple1 → couple2 → couple5` (full
  rationale in the `ThemeAssets.albumArt` doc comment in themes.ts).
  `couple5.jpg` is deliberately last — it's a solo bridal portrait, the
  groom isn't in frame at all, so it's the weakest fit for a COUPLE album
  despite being a beautiful photo on its own. This list is only shown
  while `invitation.gallery` is empty; an admin upload replaces it.
- Admin: `/admin/*` routes edit the store (RequireAdmin). Admin pages don't
  matter for public changes.

## Component map

- **Canonical guest-facing name order: Gunjan (`couple.name2`, bride) then
  Abhay (`couple.name1`, groom)** everywhere both names appear together.
  `CoupleIntro.tsx` already rendered this order (source of truth — the
  couple's first on-screen appearance). `ClosingSection.tsx` and
  `CouplePhotoExperience.tsx` had the opposite order at their own render
  sites and were swapped to match; `invitation.ts`'s `closing.familyMessage`
  string and `AdminEdit.tsx`'s matching placeholder were corrected too. The
  underlying `name1`/`name2` fields keep their existing semantic roles
  (groom/bride, tied to `groomParents`/`brideParents`) — only each
  render site's own display order was fixed, never the data itself.
- `CoupleIntro.tsx` — the couple scene. Currentime-driven clock off the
  gate film's own `currentTime`/`ended` (`CUE`, in SECONDS of film time —
  see its own header for the measured phases). **There is no Couple
  Card CONTAINER any more** — the old ivory/champagne gumbad-domed
  plaque (border, halo, pedestal, background fill) was REMOVED
  COMPLETELY by explicit request. **The CONTENT it held was NOT
  removed**: bride name, her parent line, the wedding-hands mark, the
  groom name, his parent line — all still render, same data bindings
  (`couple.name1/name2/brideParents/groomParents`), same order, same
  fonts, same relative hierarchy — now simply composited directly onto
  the still-fully-visible film with no box behind them. An earlier pass
  of this same correction over-read "remove the card" as "remove
  everything the card held" and deleted the names/parent lines, leaving
  only the hands mark floating alone — that was wrong and has been
  reverted; `NameBlock`/`LetterName`/`ParentLine` are back, adapted only
  where the loss of the plaque's own paper genuinely required it (see
  below), never redesigned. **No Ganesha in this scene** (removed
  separately, earlier; `ganesha.png` is still used elsewhere, see Assets).
  What the film now carries, in order:
  - **THE WELCOME TEXT** (9–13s in, 13–14.3s out — see "Pass 3" below, in
    the illustrated couple's blank sky) is a SEPARATE, SHORTER moment that
    comes FIRST,
    NEVER the couple's own names (a wrong pass once put `couple.name2 &
    couple.name1` here — reverted). THREE tiers now, not one flat line
    (a later correction: the previous single hero line, "We Welcome
    You", never actually said the word "wedding"): "With Joy In Our
    Hearts" → "Welcome To Our" → **"WEDDING"**.
    **All three tiers redesigned again, once more, after an explicit
    "this still reads like generic Word-document text" correction**:
    every tier now carries real dimensional ink (tier 1 got a proper
    two-step engraved `text-shadow`; tier 2 moved onto its own lighter
    gold gradient fill; tier 3's font changed from `--font-invite-label`
    — this project's own SUPPORTING/caption voice, never meant to carry
    a hero moment — to `--font-couple` (Fraunces), the IDENTITY voice
    already used for the Save the Date's own hero numeral, with the SAME
    three-layer embossed-gold recipe (gradient fill + stepped
    `text-shadow` extrusion + ambient `filter:drop-shadow`) rather than
    the old flat gradient + plain drop-shadow. `paddingTop` inside the
    fixed 20dvh band was pulled back (1.2dvh → 0.3dvh) and every
    inter-tier gap opened ~10%, per an explicit "use more of the band,
    don't sit compressed near its middle" correction. Still
    hard-confined to a 20dvh band, `overflow:hidden` — never outside it,
    regardless of tier count or spacing.
    **Pass 3 — targeted tweaks after "almost right, just needs a nudge"
    feedback**: (1) the whole band shifted from `top: 30dvh` to
    `top: 27dvh` — a straight ~10% upward shift of the existing
    composition, not a redesign of it. (2) `CUE.textOut` pushed from
    `12` to `13` (one straight extra second of fully-opaque reading time
    before the fade begins), with `CUE.brideName` untouched at 17.5s —
    plenty of clearance, so nothing downstream was delayed.
  - **THE COUPLE CONTENT** (17.5s bride name → 18.25s her parent line →
    18.75s wedding-hands → 19.5s groom name → 20.25s his parent line,
    fully settled ≈21s, then holds unanimated to the film's end) — the
    exact `GUNJAN / D/O MR. & MRS. VERMA / [hands] / ABHAY / S/O MR. &
    MRS. CHAUDHARY` composition, positioned as one group at `top: 43dvh`
    (the same optical centre the plaque used to occupy — the film's
    arch's own clear interior, ≈15–70% frame height). `LetterName` (the
    names) now uses the SAME dimensional gold-foil recipe as the welcome
    text and the Countdown numerals, because the old solid
    `--gold-invite-deep` ink was tuned for contrast against the plaque's
    OWN ivory paper, which no longer exists — set directly on the film,
    it read too flat without the foil's own built-in shadow/depth.
    `ParentLine` keeps a plain solid `--gold-invite-dim` ink (unchanged
    tier below the names) with a shadow rebuilt for the film's pale
    tones instead of the old ivory paper.
    ⚠️ **Gold-foil text bug, fixed**: `background-clip:"text"` MUST be
    applied to the LEAF element that actually contains the text, never
    to an ancestor that wraps animated children. `LetterName`'s
    per-letter reveal originally put the gradient/clip/`filter:drop-
    shadow` on the OUTER wrapping `<span>` and only `opacity`/`filter:
    blur` on each per-letter child; browsers appear to composite a
    child carrying its own `filter` as a separate layer, which broke the
    ancestor's text-shaped gradient mask — the names rendered fully
    invisible (`color:transparent` with no gradient successfully
    painted through) while `ParentLine` (a plain solid colour, no
    gradient/clip) stayed visible right next to them. Fixed by moving
    `NAME_GRADIENT`/`NAME_DROP_SHADOW` onto EACH per-letter `<span>`
    individually. `DateFace`'s and `Countdown`'s gold-foil numerals never
    had this bug because they are single plain-text spans with no
    animated children of their own. The wedding-hands mark
    (`wedding-hands.png`) has been enlarged FOUR TIMES since the plaque
    came out — `clamp(62px,8dvh,78px)` → `clamp(72px,9.5dvh,92px)` →
    `clamp(84px,11dvh,108px)` → `clamp(101px,13.2dvh,130px)` → now
    `clamp(121px,15.8dvh,156px)` (each of the last two an explicit "~20%
    from its CURRENT size, not the original" ask — 84×1.2≈101,
    108×1.2≈130, then 101×1.2≈121, 130×1.2≈156) — and the names
    (`LetterName`) once more too, `clamp(44px,6.4dvh,68px)` →
    `clamp(52px,7.4dvh,80px)`, per
    an explicit "one of the strongest voices in the scene" brief. Same
    `EASE_ARRIVE` scale-from-a-point reveal on the hands, same file,
    never recoloured beyond its grounding drop-shadow. The same
    `GOLD_FOIL_FILL`/`GOLD_FOIL_SHADOW`-shaped recipe (values duplicated
    per file, not shared via import) also appears in `DateReveal.tsx`'s
    date numeral, so the opening film's title/couple-name text and the
    revealed date read as one gold vocabulary. (`Countdown.tsx`'s
    numerals moved OFF this recipe in a later pass — see its own entry
    below — once white 3-D boxes made a gold-on-ivory numeral read as
    low-contrast; they keep the same antique-gold LANGUAGE in their
    labels and box border instead.)
  - **THE ARROW** — its cue is not a fixed time offset at all: it fires
    the instant DISPLAYED playback actually stops, which is now
    `EARLY_STOP_SECONDS` (1s) before the film's own real end, read live
    off `v.duration` inside the same `timeupdate` watchdog that drives
    `CUE` — the file itself is never cropped/trimmed/re-encoded, only
    the held frame is a beat earlier than the true last frame. `ended`
    stays wired as a safety net for the rare case `duration` isn't a
    finite number yet. A very subtle, uniform dim (`rgba(10,8,7,0.22)`,
    zIndex 20, fades in over 0.9s on the same `arrow` cue) lowers the
    held final frame just enough for the chevron to read clearly — NOT
    a blackout, NOT a card/replacement background, still the film's own
    last frame underneath. The chevron's own opacity transition carries
    a `0.3s` delay so it visibly follows the dim rather than arriving
    with it.
  Outside the welcome text and the couple content, the scene is
  otherwise unadorned: just the original whisper top/bottom vignette
  plus the dim above. The OLD "settled" quiet radial vignette that used
  to darken the scene for the CARD's final hold stays gone (it existed
  to quiet the card's own composition; with no card, it had nothing
  left to do) — the couple content simply holds, unanimated, from ~21s
  (≈2s before the film's new effective end) until playback stops, per
  the explicit "do not animate it away, do not start another transition"
  instruction.
  `SoundToggle.tsx`/`FloatingContact.tsx` are unaffected by this pass —
  still gated by `showChrome = revealed && introDone` in
  `PublicInvitation.tsx`, still de-glassmorphed (bare icons, no pill/blur).
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
  larger than the box). The cover dissolves over `FADE_MS` (900ms) and is
  only UNMOUNTED after that, so nothing is cut out mid-frame. **There is
  NO instructional copy anywhere on this cover** ("Scratch to reveal" and
  the "or tap to reveal" assist button were both removed by explicit
  request) — the painted gold scratch-off surface is left to explain
  itself; the ONLY fallback is a silent one (`!canScratch` force-reveals
  immediately for browsers without canvas support, no visible cue).
  `revealed` fires the instant the threshold is crossed — the date settles
  immediately, in parallel with the dissolve. Reveal = warm bloom
  (mix-blend screen, exits over 2.2s starting 1.7s) + the two-sided
  corner celebration (see `CelebrationParticles.tsx` below) at the
  reveal moment; countdown settles at 2.3s at FULL
  brightness (no dimming layer exists — don't add one). The countdown is
  MOUNTED from the start so its space is reserved (no layout jump) and
  interpolates opacity 0 → 0.45 → 1 across revealed → settled. The SCROLL
  NOW cue appears 3.6s after `settled` and is non-interactive (the pager
  owns the gesture). Callbacks passed into `ScratchCover` must stay
  identity-stable — its paint effect would otherwise re-run and wipe the
  guest's scratching.
  **Background & layout — the artwork has now been replaced MULTIPLE
  times**, each with a genuinely different composition and even
  different pixel dimensions; every LAYOUT number in this file must be
  re-derived from the CURRENT file each time, never assumed stable.
  Current file: `theme.assets.dateRevealPoster` → `savethedate.jpg`,
  **784×1373** (was 768×1376 two passes ago — the aspect ratio itself
  moved, 0.558 → 0.571), a monochrome antique-cream/rose-gold palette
  (the earlier distinct pink/sage colour-blocked version is gone). "SAVE
  THE DATE" is lettered into the art up top (≈0–22% — the section adds
  NO heading of its own), then a stack of nested scalloped frames
  ≈23–68%, then a large OPEN cream field ≈68–90% (lotus-flower
  illustrations confined to the bottom corners only) before the very
  bottom mandala emblem. `DATE_STAGE_TOP/BOTTOM_DVH` and
  `COUNTDOWN_TOP/BOTTOM_DVH` at the top of the file encode the CURRENT
  measured zones — see that comment block for the full breakdown; don't
  trust the specific percentages here once the artwork changes again.
  **Scratch/date stage size, now FOUR sizing passes deep**: pass 1 sized
  the stage to the innermost ivory panel's own interior; pass 2 ("make it
  ~2× larger") sized it to a second, larger frame layer; pass 3 sized it
  to (just inside) the artwork's OUTER frame boundary — `min(48dvh,
  400px)`, dvh-based (not vw) because `object-fit:cover` only guarantees
  the HEIGHT axis maps 1:1 to dvh.
  ⚠️ **Pass 3's dvh-only width had a real overflow bug, fixed in pass 4**:
  a pure-dvh width overflows the viewport's own WIDTH whenever the dvh
  value exceeds `100 × (viewport width / viewport height)` — on a
  typical 390×844 phone (aspect ≈0.462) that threshold is ≈46, so
  `48dvh` was already silently overflowing ~15px past the screen edge
  (clipped by the section's own `overflow:hidden`, not visibly broken,
  but an accident, not a deliberate framed placement). Pass 4 is `min(
  94vw, 62dvh, 460px)` — `94vw` is now the REAL governing term on every
  phone-shaped viewport (a controlled, ~edge-to-edge width with a small
  intentional margin); `62dvh`/`460px` remain only as ceilings for
  unusually wide/short viewports. General rule for next time: a WIDTH
  that must respect the viewport's own bounds always needs a `vw` (or
  `px`) term in the `min()`, even when a `dvh` term is also needed to
  track a cover-fit image's proportions — dvh alone is only safe when
  its value is known to stay below `100 × aspectRatio` for every
  supported device, which is easy to violate by accident. The scratch
  canvas needs NO internal change across any of these resizes:
  `ScratchCover` measures its own parent's live `offsetWidth/Height` via
  `ResizeObserver` and maps pointer coordinates through that same live
  size, so it is inherently resolution-independent.
  ⚠️ **Pass 5 — the ACTUAL root cause of "the date peeks out around the
  scratch image", found by finally inspecting the real file**:
  `COVER_W`/`COVER_H` had been hardcoded `1457×996` (a 1.463:1 landscape
  ratio) since this cover system was first built. The real file,
  read directly with a real tool, is **500×500 — a perfect square**.
  Every `aspectRatio` built from the wrong constants was forcing a
  square image into a much wider, shorter box, which (a) STRETCHED/
  distorted the artwork, and (b) gave the cover far LESS height than a
  correctly-shaped square cover would — not enough to cover a tall
  weekday→numeral→month→year stack, which is exactly what "peeking"
  looked like. Fixed by correcting the two constants; the stage width
  formula changed from the landscape-tuned `min(94vw,62dvh,460px)` to
  the square-tuned `min(80vw,52dvh,380px)` — smaller in raw WIDTH than
  before but a genuinely bigger, fully-covering, undistorted cover once
  the shape itself is correct. **Lesson: measure an asset's real pixel
  dimensions with a tool before hardcoding them anywhere — a wrong
  assumption here survived FOUR separate sizing passes because every
  fix kept "improving" the wrong shape.**
  **Idle rock, fixed to stay stopped**: `ScratchCover` now tracks
  `everScratched` (state, not a ref — a ref was tried first and correctly
  flagged by lint as "accessed during render") and pauses `scratchRock`
  permanently once the guest's FIRST touch lands, rather than resuming
  between individual strokes as it did before — the idle wobble's job is
  inviting the first touch, not accompanying every one after it.
  **`DateFace` was fully redesigned this pass, not just enlarged again**
  — a real THREE-TIER hierarchy instead of "one big numeral, three
  equally-small labels": PRIMARY the day numeral (Fraunces,
  `--font-couple`), SECONDARY the month (Cormorant, `--font-engrave`,
  solid `--gold-invite-deep`, no foil), TERTIARY weekday + year/time
  (Cormorant SC, `--font-invite-label`, a warm NEUTRAL ink —
  `--text-secondary`/`--text-tertiary`, deliberately NOT gold, which is
  what actually creates the hierarchy instead of four gold elements at
  different sizes). The numeral's "engraved gold" is THREE layered
  techniques, not one gradient + one shadow (`HERO_GOLD_FILL` /
  `HERO_GOLD_EXTRUDE` / `HERO_GOLD_AMBIENT`): a richer, higher-contrast
  gradient fill; a STEPPED `text-shadow` (several 1px-apart,
  progressively deeper gold/bronze layers) that reads as real extruded
  depth — `text-shadow` paints from the glyph's own outline regardless
  of `color:transparent`, so it keeps working alongside
  `background-clip:text`, which a single `filter:drop-shadow` alone
  cannot fake; and one soft, wide `filter:drop-shadow` for the ambient
  "resting on the page" shadow. Still entirely 2-D paint — no
  backdrop-filter, no glow, no real 3-D transform. Numeral now
  92–156px (was 76–128px); month 24–34px (was 16–22px, and switched
  from the tracked ALL-CAPS `--gold-invite` treatment to a bolder solid
  `--gold-invite-deep`); weekday/year 15–19px (was 13–17px, and switched
  ink family from gold to neutral, per the hierarchy change above).
  **Spacing tightened in the very next pass**: the numeral's own margins
  (2–6px/3–7px → 0–3px/0–3px) and the year/time line's `marginTop`
  (8–13px → 6–10px) both shrank — NOT the numeral itself, which is the
  one element explicitly protected from shrinking — because the
  slightly looser spacing let the whole lockup grow taller than the
  panel's own vertical room on some viewports, pushing year/time down
  toward the decorative border. Month tracking also eased 0.2em → 0.15em
  (still reads as engraved stationery, less visual gap at the larger
  size). General lesson: when a multi-tier composition is too tall for
  its panel, tighten the GAPS between tiers before ever shrinking the
  hero/anchor element.
- `Countdown.tsx` — REDESIGNED into four premium white/ivory 3-D BOXES
  (`BOX_STYLE`), one per unit, replacing a plain-text-on-artwork layout
  that read as "merging into the background" once the surrounding
  artwork got busier. A deliberate, explicitly-requested, NAMED exception
  to the project's "no cards" convention — same standing as the Couple
  scene's own past exceptions. Each box: a warm ivory gradient surface
  (never flat white, never glassmorphism/backdrop-filter), a hairline
  antique-gold border, and layered shadows for the dimensional "raised
  stationery" read (inset highlight along the top edge, inset shadow
  along the bottom edge, a close warm outer drop shadow lifting it off
  the artwork) — no heavy dark UI shadow, no glow. The numerals moved
  OFF the gold-foil treatment used everywhere else in this sequence:
  gold-on-ivory read as low-contrast inside a white box, so numerals are
  now dark charcoal (`#241f18`) — genuinely readable — with the antique-
  gold touch carried only in the `textShadow` beneath the glyph (a warm
  highlight above, a soft gold-tinted shadow below), never in the glyph's
  own colour. The old hairline dividers between units are gone — the
  boxes themselves are now the separators.
  **Enlarged again this pass**, per an explicit "the DAYS/HOURS/MINUTES/
  SECONDS labels are still too small" correction: numerals 26–36px →
  32–46px, labels **8–9.5px → 12–15px** (the labels specifically had
  stayed tiny even as the numerals grew in the redesign pass), box
  `minWidth` 56–82px → 64–96px, to fill the artwork's own much larger
  open lower field (see `DateReveal.tsx`'s LAYOUT note — the countdown's
  stage grew from ≈15dvh to ≈19dvh). "Until We Celebrate" also enlarged
  (10–12px → 13–16px) — still clearly secondary to the date, but no
  longer near-illegible.
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
  day numeral, month, time) and venue (name, address, `ViewOnMapButton`
  — grouped with venue as "location details"). Same three-voice type
  system, same `step()` fade+translateY reveal, same colours
  (`--text-primary` for the day numeral, `--gold-invite`/`-dim` for
  labels) — none of that changed, only what surrounds it and where it
  sits. A ceremony with no matching theme artwork (no shipped event hits
  this; the data model allows a hypothetical custom one) falls back to
  the earlier plain-paper + arch-ghost + `PageEnvelope` + its own title
  text, since there is no photograph to supply a name there.
  **Pass — "too plain, weak hierarchy" fix**: the day numeral moved off
  a flat `--text-primary` solid onto the SAME three-layer embossed-gold
  recipe (gradient fill + stepped `text-shadow` extrusion + ambient
  `filter:drop-shadow`, scaled down from the Save the Date's own) used
  everywhere else in the invitation for a hero moment — `DAY_GOLD_FILL/
  EXTRUDE/AMBIENT` at the top of the file — and grew slightly
  (30–42px → 32–46px). The venue name gained its own step above the
  address (13–14.5px flat → 14–16px, `--gold-invite-dim` ink) so DATE →
  VENUE → address now reads as three tiers, not one uniform size. A
  small `HairRule` (diamond node, 64px wide) was added between the date
  and venue clusters as the section's missing "refined gold separator."
  None of this touched the artwork-panel positioning (`top: 39.5dvh` /
  `bottom: 32dvh`) — that intersection was already measured per-pixel
  across all five images in an earlier pass and is not something a
  build-only pass (no screenshots, no browser automation) should
  re-derive; the added elements' margins were trimmed elsewhere to keep
  the total vertical budget close to what it was before.
  **Pass 2 — date hierarchy fixed again, further, per "the huge 4 makes
  December unreadable"**: the numeral had already been pulled onto its
  own line above, but month/year was still only a modest step up from
  caption size, and a separate WEEKDAY line existed above the numeral
  purely to carry the per-ceremony `EventEmblem`. Fixed by moving the
  emblem to stand alone above the numeral, and merging WEEKDAY + TIME
  onto one line below month/year ("THURSDAY · 7:00 PM") — that
  consolidation removed a whole line, which is what paid for month/year
  growing from 17–21px to a genuinely large 19–25px without the block
  getting taller overall. Venue (14–16px→16–19px) and address
  (14–15px→14–16px) were also bumped. The measured artwork-panel bounds
  were widened slightly too (39.5–68dvh → 38–70dvh) — still inside the
  actual measured ≈37–72% safe zone, just using less of the extra safety
  margin the previous pass banked, since this pass's size increases
  needed real room back from somewhere. `TitleScene`'s own title/kicker/
  subtitle were also substantially enlarged (kicker 15–17px→16–19px,
  title 34–48px→38–60px, subtitle 15–17px→17–20px) and the JharokhaArch
  background ghost went from an almost-invisible 0.055 opacity/300px to
  a genuinely visible 0.1 opacity/420px spanning behind the whole text
  block — the previous version's "huge blank paper, tiny text" problem
  was as much about an under-used background as it was about type size.
- `CouplePhotoExperience.tsx` — the album as a VERTICAL REEL: `AlbumLeaf`
  renders ONE photograph per full-screen `data-reel-scene` 100dvh section, so
  the existing pager consumes the photographs one deliberate gesture at a
  time, then hands off to Venue — now itself a `data-reel-scene`, not a
  hand-off boundary; the reel runs the full document through Closing (see
  the reel architecture note above). **NO CONTROLS AT ALL — no arrows, chevrons,
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
- `VenueSection.tsx` — the Venue page: `venue.image || theme.assets.venueImage`.
  Now a fixed `100dvh` `data-reel-scene` (was `minHeight:"92dvh"`, plain
  document flow) — see the reel architecture note above.
  **Pass — recomposed into two zones, not text-over-a-darkened-photo**:
  the photo (or, absent one, an enlarged JharokhaArch) now fills an
  upper visual zone with only a light bottom-edge fade, not a heavy veil
  across the whole image; a SOLID ivory information panel — dark ink on
  light paper, not ivory-on-photo — sits at the bottom, sized by its own
  content (kicker/name/address/time/map button), which lands close to
  the requested ~60/40 visual split without hard-coding a percentage.
  The `layout` prop's `"jharokha"` vs `"minimal"` distinction is now
  "arch shown in the upper zone" vs "not," rather than "arch inside the
  old framed box."
- `RsvpSection.tsx` — now a fixed `100dvh` `data-reel-scene` too, flex-
  centered so both the compact default form and the short confirmed/
  declined states sit centered rather than pinned to the top. Its
  expanded state (guest count + event chips shown) is genuinely tight on
  375px-class phones — hand-verified, not rendered.
- `ClosingSection.tsx` — the closing page: `theme.assets.closingImage`
  (now `endsection.jpg`, a deliberate placeholder copy of `cover.jpg` —
  see the asset note near `themes.ts`) full-bleed under a CREAM radial
  veil (light, not the Venue's dark one) so the printed dark ink stays
  exactly as readable as on paper and the invitation ends on its own
  paper world. `object-position: center 38%`; falls back to the paper
  world if the artwork fails. Now a fixed `100dvh` `data-reel-scene`
  (was `minHeight:"96dvh"`).
  **Pass — couple names substantially enlarged (30–46px → 40–62px)**
  per an explicit "the couple names must be the strongest visual
  element on the page" direction — a modest nudge would still have read
  as an afterthought next to how large names get treated everywhere
  else in the invitation. Closing message bumped 15–18px→17–21px,
  family message 14–15px→14–16px. This was explicitly scoped to
  typography/spacing only — the background/veil mechanism (which is
  what actually makes the text system tolerant of whatever photo ends
  up in `closingImage`) was deliberately left untouched.
- `ViewOnMapButton.tsx` — the shared premium 3D "View on Map" action
  (the same raised-ivory-card recipe as Countdown's boxes: layered
  inset+outer shadows, hairline gold border, no glassmorphism). Used by
  both VenueSection and every EventScene's directions link — previously
  each drew its own plain underlined-text-style link ("Find the way" /
  "View Directions"); now one component, one label, one CSS hover/press
  treatment (`.view-on-map-button` in index.css).
  **Pass — true horizontal oval, not a rounded rectangle**: swapped the
  fixed `8–12px` corner radius for a full capsule (`borderRadius: 999`,
  clamped by the browser to exact half-height at any size) and made the
  padding deliberately wider than tall (`11px 26px`, was `14px 28px`),
  so the shape itself reads as an oval rather than a squared plaque; also
  nudged `EventScene`'s own gap above the button down (`marginTop`
  `clamp(5,1.1dvh,8)` → `clamp(3,0.7dvh,5)`) so it sits higher inside the
  artwork's measured text-safe panel (which ends at `bottom: 30dvh`),
  with more breathing room beneath it, not less.
- `decor/Ornaments.tsx` — the illustrated SVG language: CornerFloret/
  CornerArabesque/ThemeCorner, HairRule (tapered rule + dot/diamond node),
  Divider (emblem + rules), Emblem (lotus/star/geometric), AmpersandOrnament,
  EventEmblem (mehendi/haldi/sangeet/wedding/reception/blessing/lotus),
  `motifForEvent(e)`, JharokhaArch, AmbientParticles. Reuse these — do not
  invent new decoration.
- `VideoBackground.tsx`, `Cover.tsx`, `SoundToggle.tsx`,
  `FloatingContact.tsx` — supporting pieces. (`OpeningVideo.tsx` is gone —
  its one job, rendering the gate film, is now `CoupleIntro.tsx`'s own
  background; see "Guest journey" above.)
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
  animation — the cue stays bright, static and fully visible.
  **Pass — `hideLabel` prop, arrow-only mode**: the Couple page's own
  cue is now rendered with `hideLabel` (no wordmark at all), per an
  explicit "arrow only, no text" direction for that scene — added as an
  opt-in prop rather than removing the label globally, so `DateReveal`'s
  existing labeled usage is untouched. The Couple page's local dark
  contrast-backing behind the arrow (in `CoupleIntro.tsx`) was also
  deepened and pulled in tighter around just the arrow's own footprint
  (was sized to also cover the now-removed wordmark) — the report was
  that the ivory arrow still merged into the gate film's pale ending
  frame; the fix is a darker, tighter pool exactly behind the mark, not
  a brighter mark. (History: the
  old bare chevron pulsed with the retired `scrollBounce`, whose 0.28
  opacity floor made a thin gold stroke read as "not there" over the
  artwork's dark lower band.)
  **CoupleIntro-only contrast fix**: reported as merging into the gate
  film's own pale, near-white held final frame. `ScrollCue.tsx` itself
  was left untouched (it also mounts in `DateReveal.tsx`, unaffected by
  this report); instead `CoupleIntro.tsx` gained (1) its own
  section-wide "arrow" dim nudged 0.22 → 0.30 opacity, and (2) a new
  small radial dark backing pool (`rgba(18,13,9,…)`, no edge/border)
  positioned directly behind the arrow+wordmark inside its button — a
  guaranteed local contrast boost regardless of the exact pixel colour
  behind it at that moment, without turning the mark into a pill/plate.
- **Global idle-scroll cue** — a NEW, separate system from `ScrollCue`
  (which stays the couple/date scenes' own contextual invitation):
  `lib/idleActivity.ts` keeps one shared "last activity" clock via a
  single lazily-mounted set of passive `wheel`/`touchstart`/`touchmove`/
  `pointerdown`/`keydown`/`scroll` window listeners (never
  `preventDefault`, never touches scroll position — cannot affect
  `useReelPager`); `lib/useIdleScrollCue.ts` is a per-scene hook —
  `useIdleScrollCue(active, suppressed?)` — that takes each scene's OWN
  existing `inView` signal and shows true once ~7s pass with no activity
  since the scene became active (resets instantly on every `active`
  change, masked by `active` in its return rather than an extra
  setState, so it hides the instant a scene leaves view); `IdleDownArrow.tsx`
  is the arrow-only visual (no wordmark, `pointer-events:none`,
  `aria-hidden`, safe-area-aware `bottom`, gold-on-cream by default for
  this invitation's light paper scenes) with its own `idleArrowSpring`
  keyframe in index.css — mostly still, one gentle spring dip per 3.6s
  cycle, not a continuous bounce; `animation:"none"` under reduced
  motion (cue stays static, never hidden). Wired into `TitleScene` and
  every `EventScene` (EventsSection.tsx) and `RsvpSection.tsx`
  (suppressed while `phase==="submitting"`) — each already had its own
  `inView`, so no new observers were added. Deliberately NOT wired into:
  `ClosingSection` (the reel's last scene — nothing left to scroll to),
  `VenueSection` (its map button already occupies the same bottom
  safe-area band), `CouplePhotoExperience`/`AlbumLeaf` (same collision
  with the per-photo caption footer), and `DateReveal`/`CoupleIntro`
  (each already has its own contextual `ScrollCue`, gated so it can
  never show during the scratch interaction or before the gate video
  ends — adding this system there would duplicate, not improve, the
  existing cue).
- `CelebrationParticles.tsx` — REDESIGNED into ONE system (no `mode` prop
  any more — the old `"fall"`/`"burst"` modes, and their
  `celebrationFall`/`celebrationBurst` keyframes in index.css, are gone;
  nothing else used this component, so removing them was a clean
  deletion, not a breaking change). Fires a DENSE two-sided burst — ~32
  leaf/petal/confetti/dot pieces PER SIDE (64 total by default),
  releasing from the section's own TOP-LEFT and TOP-RIGHT corners and
  sweeping down/inward — replacing what used to be two much sparser,
  separate effects (a 6-piece ambient sprinkle + a 14-spark radial burst
  from the date's own centre) that read as too faint against the
  artwork. Palette is a restrained wedding set (antique gold, champagne,
  muted rose, blush, ivory, terracotta, muted red) — explicitly NOT the
  saturated/neon range. One shared `celebrationConfetti` keyframe (index.
  css) drives every piece via `--conf-dx/--conf-dy/--conf-rot-from/
  --conf-rot-to` custom properties, each piece randomised in shape,
  colour, size, angle, distance, rotation, delay and duration so the
  burst reads as organic, never uniform. Mounted in `DateReveal.tsx` at
  the SECTION level (not inside the small scratch/date box) so the two
  bursts genuinely sweep across the whole composition, at `zIndex: 7` —
  ONE below the date/countdown content's own `zIndex: 8` — so the pieces
  frame the reveal rather than sit on top of and obscure the numerals.
  Triggered by the exact same `sprinkle` state as before (set by
  `beginReveal()`, itself only called from the scratch cover's real
  threshold-crossing) — the TRIGGER was already correct; only what
  renders on it changed. Unmount timeout bumped 3000ms → 3300ms to
  clear the new animation's own 3.2s duration instead of cutting it off
  ~200ms early.
  **Pass 2 — "still far too weak" fix**: the numbers above are the
  ORIGINAL ones; after a "make the overall visual impact ~10× stronger
  and keep it alive for 1–2s" correction, three things changed together
  (`count` 64→180 default, `durationMs` 3200→4500 at the `DateReveal.tsx`
  call site): (1) each corner's release point is now jittered across a
  small strip of the top edge (`startXVw`/`startYVh`) instead of one
  exact pixel, so the burst visibly originates from a region; (2) travel
  distance (`--conf-dx`/`--conf-dy`) switched from fixed PX to `vw`/`vh`,
  so the sweep genuinely spans the screen on every device instead of a
  constant, easily-dwarfed pixel amount; (3) per-piece delay/duration
  widened (0–0.9s delay, 2.3–4.2s duration) so motion keeps visibly
  developing for ~1.5–2s instead of resolving in one instant. Unmount
  timeout moved 3300ms → 4600ms to match the new 4.5s container duration.

## Artwork geometry facts (measured, trust these)

- `couple-poster.jpg`: 720×1280, painted jharokha — blue watercolor outside,
  cream arch channel in the center, lanterns, peacocks, pavilions at the
  bottom. This was the Couple Card's video poster and the old
  `couple-background.mp4`'s own artwork (both retired — see "Guest journey"
  above); `themes.ts` still points `venueImage` at this file. ⚠️ The file is
  currently MISSING from `public/themes/theme-1/images/` (deleted outside
  of this change, pre-existing, not something this pass touched) — the
  Venue page's fallback artwork is broken until either the file is restored
  or `venueImage` is repointed.
- Under `object-fit: cover` on any portrait phone that art is height-matched
  (scale ≈ 0.658): a painted feature lands at the SAME viewport pixel row on
  every device (img_y = vp_y / 0.658).
- Lanterns bottom out at ≈ **113px** from the viewport top; the clear cream
  arch channel runs ≈ 120px → ~640px; pavilions own everything below.
- Ganesha's PNG (394×441) has almost no transparent padding — box ≈ figure.
- Poster mean luminance ≈ 206 (bright) — legibility washes, not dimmers.

### Gate film geometry (gate-cinematic.mp4, 1080×1920, 25fps, 23.8s —
### measured by extracting real frames with PyAV; trust these)

CoupleIntro's whole foreground sequence (`CUE` in that file) is built from
these measured phases, not a guess from watching the file at a glance:

- **0–~8s**: an opening iris (white circle growing from centre) into a
  static pink Ganesha "OM" calligraphy medallion framed by watercolor
  peonies, then a whiteout transition.
- **~9–~13s**: an illustrated cartoon couple in traditional dress, in the
  LOWER half of frame (heads start ≈43–45% of frame height, feet ≈78%),
  leaving a genuinely blank sky above them from ≈17% to ≈43% of height —
  stable/unchanging across this whole window, THEN crossfading to white.
  This blank sky is the WELCOME TEXT's stage; the text is kept inside
  30–50dvh (per the invitation spec) but biased to the TOP of that band
  (padding-top only, not centred) to clear the couple's heads at ≈43%.
- **~13–17s**: crossfade (whiteout) from the illustrated couple to —
- **~17–~23.8s**: an empty arched oval outline (thin pink line, floral
  wreath concentrated at its base), interior ≈15%–70% of frame height,
  COMPLETELY BLANK inside, centre ≈42.7% — held static (only a subtle
  warm/golden colour-grade shift near the very end) all the way to the
  film's own end. This is the Couple Plaque's stage — see the `top: 43dvh`
  note beside the plaque's container in `CoupleIntro.tsx`.
- The film ends in a genuine fade-to-white (already ≈90% faded by 23.6s) —
  there is no jarring cut, which is why the scroll chevron is cued off the
  `ended` event rather than a guessed second.

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
- **Global type-size floor: 13px, the parent-name (`ParentLine` in
  CoupleIntro.tsx) baseline.** No readable text anywhere in the
  guest-facing invitation should render smaller than this on any
  supported width (360–412px) — an explicit, repeated correction after
  an audit found labels/captions across EventsSection, VenueSection,
  RsvpSection, ClosingSection, CouplePhotoExperience, ScrollCue,
  FloatingContact and Countdown sitting as low as 8.5–12px. Fixed by
  raising each `clamp()`'s MIN (and nudging its max up a little, and
  often trimming letter-spacing slightly to keep the now-larger tracked
  label from overflowing its own row) — never by leaving the smallest
  tier tiny "because there's a hierarchy". Hierarchy still exists; it
  just no longer means "the bottom tier is unreadable". This floor does
  NOT apply to `src/pages/admin/*.tsx` — that's a separate internal CMS
  surface, not part of the wedding invitation a guest reads, and keeps
  its own plain dashboard conventions.
- Decorations: `aria-hidden`, `pointer-events: none`. Real links keep real
  `href`s. Titles h2/h3 semantic.
- Style bar: luxury invitation stationery — restraint, proportion, editorial
  type. NO cards/pills/glassmorphism/gradients-as-decoration/SaaS chrome.
  No new fonts without checking the established set. No new assets unless
  genuinely needed and style-matched.
  The CoupleIntro scene's own exception (a named, explicitly-requested
  "Couple Card" plaque) was removed completely by later explicit request
  — see "Guest journey" and `CoupleIntro.tsx` in the Component map; the
  whole cinematic reel (the couple/date/celebrations/events/album reel)
  stays card-free. There IS one current exception, in the paper Save the
  Date section rather than the cinematic reel: `Countdown.tsx`'s four
  white/ivory 3-D boxes — explicitly requested by name, to fix the
  countdown "merging into the background". Not a precedent for adding
  cards elsewhere.

## Assets (public/)

All Theme 1 media lives under `public/themes/theme-1/` (images/, videos/,
  audio/, fonts/) — a future Theme 2 adds its own parallel folder; app/system
  assets (favicon.svg) stay at public/ root.

- `themes/theme-1/videos/gate-cinematic.mp4` (1080×1920, 23.8s — the ONLY
  cinematic video now; see "Gate film geometry" above. `couple-background.mp4`
  is deleted — it was the Couple Card's old, separate background video,
  fully replaced by this file),
  `themes/theme-1/images/couple-poster.jpg` (currently missing — see
  "Artwork geometry facts" above), `themes/theme-1/images/cover.jpg`,
  `themes/theme-1/images/savethedate.jpg` (784×1373 as of the current
  upload — this file has been REPLACED multiple times with different
  compositions AND different pixel dimensions, so treat any recorded
  size here as a snapshot, not a guarantee; re-measure before trusting
  it — the Date Reveal scene's own artwork, `ThemeAssets.dateRevealPoster`;
  MUST stay lowercase, see DateReveal.tsx in the Component map),
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
- Other theme artwork: `couple-poster.jpg` (720×1280 painted jharokha,
  currently missing on disk) is only `venueImage` now — Date Reveal moved to
  its own `savethedate.jpg` and the Couple Card's video poster went away
  with `couple-background.mp4`; `cover.jpg` (1594×987 envelope art) serves
  the Cover gate, the gate film's poster (in `CoupleIntro.tsx`) and the
  closing page (`closingImage`);
  `ganesha.png` (394×441) and `wedding-hands.png` (500×500) are transparent
  marks (both are also album placeholder pages) and `scratch.png`
  (**500×500 — a perfect SQUARE**, ~2.5MB) is the scratch cover. ⚠️ This
  file's real dimensions were wrongly documented here as "1457×996" for
  a long time, matching a real bug in `DateReveal.tsx`'s own
  `COVER_W`/`COVER_H` constants (see that entry below) — always verify
  an asset's actual pixel size with a real tool before hardcoding it
  anywhere; a wrong assumption here silently distorted this artwork and
  broke its coverage of the date across several passes before being
  caught. `albumArt` lists five files, one full-screen
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