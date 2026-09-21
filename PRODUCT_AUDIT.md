# PRODUCT AUDIT — Neozy Invi (Wedding Invitation Product)

**Audit date:** 2026-09-21
**Audited commit:** `ecc5e49` (pushed to `origin/main`, `https://github.com/SriNexus/Neozy-Invi`)
**Auditor role:** Senior product auditor / frontend architect / premium UI-UX critic / QA reviewer / product-sales consultant
**Method:** Full static reading of the source tree, asset library, build/lint output, and data/state architecture. **No browser automation, screenshots, or rendering was performed** — every visual claim below is either (a) a direct code/CSS fact, (b) a design judgment clearly labeled as such, or (c) explicitly marked **"Needs visual verification."**

---

## SECTION 1 — EXECUTIVE SUMMARY

**1. What is this product?**
A single-page React/TypeScript wedding invitation experience: a cinematic full-screen "reel" (tap-to-reveal video → couple names → scratch-to-reveal Save-the-Date → countdown → per-ceremony pages → photo album → venue → RSVP → closing), plus an `/admin` panel intended to let a couple edit their own content and a 6-theme color system.

**2. What is its current state?**
A **visually accomplished, technically unfinished single-tenant demo**. The guest-facing animation/typography work is genuinely more careful than most products in this category (see Section 15). But the product has **no backend of any kind** — the admin panel and RSVP form both write only to the visiting browser's own `localStorage`, which means an admin's edits never reach a guest's device, and a guest's RSVP is invisible to the couple. That is not a polish gap; it disqualifies the product from being sold today as "an invitation you can send to guests and collect answers from," which is the core promise of this whole category.

**3. Strongest quality.**
The bespoke scroll/reel architecture (`useReelPager.ts`) and the layered typographic/animation craft in `CoupleIntro.tsx` and `DateReveal.tsx` (measured artwork geometry, per-letter "written by hand" reveals, embossed gold-foil type, a real scratch-canvas mechanic). This is well above template-grade engineering.

**4. Biggest weakness.**
No backend. RSVP submissions and admin edits are localStorage-only (`src/services/rsvp.ts` and `src/data/store.ts` say this explicitly in their own comments: *"development only"*, *"for now the implementation uses localStorage"*). A couple cannot actually receive guest responses.

**5. What prevents it from being truly premium?**
Two things pull it out of "premium" territory the moment you look past the animation: (a) the "6 themes" claim is not real — every theme shares the exact same Hindu-specific video, photos, and event names, including two themes explicitly categorized `"Muslim"`; (b) a chunk of visible content — event dates for Mehendi/Sangeet/Haldi — is chronologically broken (see Section 14, Bug #1), which is the kind of error a paying customer notices in the first minute.

**6. What prevents it from being sold confidently right now?**
The combination of (a) no working RSVP collection, (b) no working content customization path for a non-developer, (c) a mislabeled/misleading theme system, and (d) a hardcoded plaintext admin password shipped in the client bundle.

**7. Maturity stage: `FUNCTIONAL PRODUCT` (front-end only), NOT commercially ready.**
It is well past "prototype" — the guest-facing experience runs, builds cleanly, and is responsive by construction. It is not "near-production" because a near-production wedding invitation product must let its buyer put their own data in and get RSVP answers out; this one cannot do either across two different devices/browsers.

| Dimension | Score /10 | Why |
|---|---:|---|
| Overall Product Quality | **5.5** | Strong front-end, structurally incomplete product |
| Visual Design | **7.5** | Genuinely dimensional gold typography, considered composition, restrained motion — but let down by generic default copy and repeated "Our Story" labeling |
| UX | **6.5** | The reel navigation is well engineered; RSVP/admin flows silently fail to do their job |
| Technical Quality | **6** | Clean, well-commented, typed code; but zero backend, hardcoded auth, dead CSS, broken image path, orphaned QA script |
| Premium Feel | **6** | Real in isolated moments (Save the Date, couple names); undercut by the theme system's honesty problem |
| Mobile Experience | **7** | Mobile-first by construction (`dvh`, `clamp()`, custom touch-reel), but unverified visually — see Section 7 |
| Content/Presentation | **5** | Placeholder data throughout ("The Grand Palace", generic phone numbers); event date sequence is factually broken |
| Reliability | **5** | No error reporting/monitoring, no data durability (localStorage can be cleared any time), silent asset-404 fallback (Venue image) |
| Commercial Readiness | **3** | Cannot fulfill "guests RSVP, couple sees answers" — the category's basic promise |
| Sellability (today, as-is) | **3** | Sellable only as a portfolio/demo piece or as a bespoke one-off build with a developer manually hardcoding each customer's data |

---

## SECTION 2 — PRODUCT READINESS MATRIX

| Area | Status | Score /10 | Main Issue |
|---|---|---:|---|
| Visual Design | NEARLY READY | 7.5 | Strong core motifs, let down by placeholder copy and repeated labels |
| UX (guest journey) | NEARLY READY | 7 | Reel navigation is well designed; no in-invitation "you are here" indicator |
| Mobile | NEEDS WORK (code-verified, not render-verified) | 6.5 | `dvh`/`clamp()` used correctly throughout; two touch targets under 44px |
| Desktop | NEEDS WORK | 5 | Reel pager and vh-based layout are clearly mobile-first; desktop is functional but not designed-for (Needs visual verification) |
| Animation | READY | 8 | Coherent easing vocabulary, reduced-motion respected everywhere it matters |
| Content | MAJOR WORK | 3 | Broken event date sequence, dead admin fields, generic placeholder text throughout |
| Performance | NEEDS WORK | 5 | Not measured (no Lighthouse run); code shows unconditional eager preload of a 1.6 MB video + 4.2 MB audio file, unoptimized JPGs |
| Code Quality | NEARLY READY | 7 | Clean, typed, well-commented; meaningful dead-code volume (see Section 11) |
| Assets | NEEDS WORK | 5 | One broken path, ~4.9 MB of stray/duplicate files committed, no WebP/AVIF, one real photo set reused across 6 "themes" |
| Reliability | MAJOR WORK | 3 | No backend, no data durability, no monitoring/error tracking |
| Commercial Readiness | NOT READY | 3 | Core promise (RSVP collection) does not function across devices |

---

## SECTION 3 — SECTION-BY-SECTION AUDIT

For each section: purpose → what works → premium vs generic vs unfinished → problems → severity → fix. Severity: **CRITICAL / HIGH / MEDIUM / LOW / POLISH**.

### 3.1 Cover (`Cover.tsx`)
- **Purpose:** first-touch gate; a full-bleed tap target.
- **Works well:** deliberately minimal — no button chrome, the whole image is the target, `aria-label` present.
- **Premium:** the "no button, no text" restraint is a genuinely premium choice — most templates put a garish "Tap to Open" pill here.
- **Generic/unfinished:** none identified at the code level.
- **Technical risk:** the cover image (`cover.jpg`, ~360 KB) has no `loading`/`fetchPriority` hint; as the very first paint it should arguably be `fetchpriority="high"`, not left to default heuristics. LOW.
- **Severity:** LOW.

### 3.2 Gate cinematic (`gate-cinematic.mp4`, driven by `CoupleIntro.tsx`)
- **Purpose:** the ~23.8s opening film carrying envelope → couple illustration → welcome text → arched frame reveal.
- **Works well:** the whole foreground sequence is driven off the video's own `currentTime`/`ended`, not a wall clock — this is the right architecture and avoids drift.
- **Premium:** a bespoke painted/animated film (not a stock template animation) is a real differentiator, if the buyer is the couple this exact film was made for.
- **Generic/unfinished:** **this exact video is hardcoded (`GATE_VIDEO_SRC` is a module-level constant, not read from `theme.assets`) and used identically by all 6 color themes**, including two labeled "Muslim" category. The film opens on "a static Ganesha medallion" (per the component's own header comment) — a Hindu iconographic element — regardless of which theme a buyer selects. See Section 5 and the Bug Register (Bug #2) for why this matters commercially.
- **Technical risk:** `preload="auto"` on a 1.6 MB video with no user-gesture gating means every visitor's browser attempts to buffer it immediately on load, before they've tapped anything. MEDIUM performance risk (browser data-saver/heuristics vary; "Not measured, code-based assessment").
- **Severity:** **CRITICAL** for the theme-mismatch issue (business/reputational risk if sold as multi-community); MEDIUM for preload behavior.

### 3.3 Welcome text (`CoupleIntro.tsx`)
- **Purpose:** a short cinematic "Welcome To Our Wedding" moment before the couple's names.
- **Works well:** three-tier dimensional gold-foil typography (established over several rounds of work this session), now using the same per-letter "written by hand" reveal as the couple names — a genuinely premium, consistent treatment.
- **Premium:** the embossed-gold recipe (gradient fill + stepped extrusion shadow + ambient drop-shadow) reused consistently across this text, the Save the Date numeral, and the Events day numeral is a real "one hand, one voice" design decision — most template products do not maintain this discipline.
- **Generic:** the copy itself ("With Joy In Our Hearts / Welcome To Our / Wedding") is generic boilerplate — expected for a template, but there is no mechanism visible in the admin panel to actually change it (it is hardcoded JSX text, not driven by `invitation.ts` data at all).
- **Content bug:** the welcome text is **not part of the data model** — a buyer cannot personalize it even through the (non-functional) admin panel. It is literally three lines of JSX string content.
- **Severity:** MEDIUM (hardcoded copy, no personalization path).

### 3.4 Scroll cue / arrow (`ScrollCue.tsx`, used in `CoupleIntro.tsx` and `DateReveal.tsx`)
- **Purpose:** the invitation's one and only navigation affordance.
- **Works well:** a genuinely restrained treatment (thin arrow + tracked wordmark, warm light pool, no button chrome), with an explicit floor on the pulse animation (never below 74% opacity) so it can't fade to invisible against dark art. `reduceMotion` keeps it static and visible rather than hidden — correct accessibility behavior.
- **Premium:** avoiding "pill button" chrome here is a real design decision, not an oversight — the code's own comments document why.
- **Unfinished:** the couple-scene instance recently gained a manual contrast patch (a local radial dark backing + a stronger dim) specifically because the arrow was reported to merge into the gate film's pale ending frame — i.e., this was a **known, user-reported bug that required a targeted fix**, evidence that the underlying design (one fixed ivory treatment expected to read on any film frame) is fragile by nature. **Needs visual verification** that the current fix is sufficient on a real device.
- **Severity:** LOW (patched), MEDIUM underlying fragility.

### 3.5 Couple introduction — names, parents, wedding-hands (`CoupleIntro.tsx`)
- **Purpose:** present the couple's identity as the emotional peak of the opening scene.
- **Works well:** per-letter "type-on" reveal normalized to a fixed total duration regardless of name length (GUNJAN and ABHAY complete in the same ~0.7s) — a genuinely well-thought detail. The dimensional gold-foil ink (gradient + 3 stacked drop-shadows) is applied correctly per-letter, working around a real `background-clip:text` + animated-children browser bug that the code's own comments document having discovered and fixed.
- **Premium:** yes — this is the single most technically careful piece of typography in the product.
- **Generic:** none — this is bespoke, not template-grade.
- **Technical risk:** the whole composition is measured against one specific video's frame geometry (`top: 43dvh` is described in comments as "the arch's own measured geometry" for this exact film). If a customer ever wants a different opening film, this positioning has to be re-derived by hand — there is no generalized geometry system.
- **Severity:** LOW for current state; MEDIUM technical debt for reusability.

### 3.6 Ganesha
- Not present as a rendered element in the current build (`ganesha.png` does not exist in `public/`; the file is referenced only inside a legacy-path migration table in `store.ts`, for rewriting old `localStorage` data, never rendered). The Ganesha imagery that **does** exist is baked into the gate-cinematic video itself (see 3.2). **Flag: a data-model artifact (the migration entry) references an asset that no longer ships — dead reference, LOW severity, but confirms the product has removed and re-added devotional iconography at least once without full cleanup.**

### 3.7 Date Reveal — scratch interaction, date typography (`DateReveal.tsx`)
- **Purpose:** the "Save the Date" moment: scratch off a cover to reveal the date.
- **Works well:** resolution-independent canvas (sized from the live parent element, not hardcoded), real pointer/touch coordinate mapping, a documented and fixed aspect-ratio bug (the cover art was treated as 1457×996 when the actual file is a 500×500 square — this was quite literally causing the date to peek out around the edges before the fix landed this session).
- **Premium:** the day numeral's three-layer embossed-gold treatment (gradient + stepped extrusion + ambient shadow) is the strongest single typographic moment in the product.
- **Unfinished:** this exact bug history (a hardcoded asset dimension surviving four separate sizing passes before anyone measured the real file) is a concrete signal that **assumptions are not being verified against real files as a matter of process** — worth noting as a process risk, not just a fixed bug.
- **Severity:** LOW now (fixed), but flagged as a process-quality signal.

### 3.8 Countdown (`Countdown.tsx`)
- **Purpose:** live D/H/M/S countdown to the wedding.
- **Works well:** premium "raised ivory card" box treatment per unit, correctly derives its target from the single `getWeddingDate()` source of truth (a real bug — hardcoded `10:00` regardless of `wedding.time` — was fixed this session).
- **Technical:** recently refactored to avoid a "set state synchronously in effect" anti-pattern; now computes the displayed value fresh on every render, ticked by a plain re-render counter. This is a genuine improvement, not cosmetic.
- **Severity:** POLISH.

### 3.9 Celebration/burst effect (`CelebrationParticles.tsx`)
- **Purpose:** a confetti-like burst marking the date reveal.
- **Works well (after this session's rework):** density, spread (now `vw`/`vh`-relative rather than fixed-pixel, so it actually scales across phone sizes), and duration were all substantially increased after being reported as "far too weak."
- **Premium:** the palette (antique gold, champagne, muted rose, terracotta) is disciplined — no neon, no confetti-cannon cliché.
- **Risk:** 180 animated DOM nodes with individual CSS animations is a real, if likely modest, CPU/paint cost on low-end Android phones. **Not measured — code-based assessment: MEDIUM performance risk**, worth a real device check.
- **Severity:** LOW/MEDIUM (unverified on low-end hardware).

### 3.10 Events introduction / chapter divider (`TitleScene` in `EventsSection.tsx`)
- **Purpose:** a "The Celebrations / Our Wedding Events" divider page before the ceremony pages.
- **Works well:** restrained composition, staggered reveal.
- **Generic:** subtitle copy ("Four days of ceremony, music and love...") is boilerplate and, per the actual data, factually describes an event sequence that is currently broken (see 3.11).
- **Severity:** LOW.

### 3.11 Mehendi / Sangeet / Haldi / Wedding / Reception (`EventsSection.tsx`)
- **Purpose:** one full-screen "page" per ceremony, artwork-first.
- **Works well:** genuinely strong art direction — each ceremony's photo supplies its own name/frame, and the app only overlays date/venue into the photo's own measured blank panel (`≈39.5–68dvh`, derived from pixel-sampling the actual shipped images). This is meaningfully more sophisticated than "put text on top of a photo."
- **Premium:** the day numeral's embossed-gold treatment (added this session) and the hairline separator meaningfully lifted this from "flat text on a photo" toward "designed page."
- **CRITICAL CONTENT BUG:** the actual dates are **out of order relative to the wedding**. Wedding day = **4 December 2026**. Mehendi = 10 Dec, Sangeet = 11 Dec, Haldi = 12 Dec, Reception = 12 Dec — i.e., every pre-wedding ceremony is dated **after** the wedding itself, and Haldi/Reception are dated **8 days after** the wedding day. This is not a subtle inconsistency; it is the first thing a guest or evaluator checking dates would notice, and it directly undermines trust in the product's basic correctness. See Bug Register #1.
- **Repetitive:** all five ceremony pages use an identical composition template (weekday / numeral+month / time / hairline / venue / address / directions) — appropriate as a "design system," but flagged per audit instructions since five near-identical page layouts in a row is also where guest attention is likeliest to drop (see Section 4).
- **Severity:** **CRITICAL** (date logic bug), MEDIUM (visual repetition).

### 3.12 Venue (`VenueSection.tsx`)
- **Purpose:** display venue name/address/time with a photographic or fallback treatment.
- **CONFIRMED BROKEN ASSET:** `theme.assets.venueImage` resolves to `/themes/theme-1/images/couple-poster.jpg`, **which does not exist anywhere in `public/`.** Since the default `invitation.venue` object also carries no `image` field, this means the Venue section **has never shown its intended photographic background in the current build** — it silently falls back (via the component's own `onError`/`imgOk` handling) to the plain "jharokha" no-photo layout for every single visitor, with no visible error. This was not caught because the fallback looks intentional, not broken.
- **What works in the fallback state:** the jharokha arch + gold hairline frame is a reasonable "no-photo" treatment on its own — it just isn't the intended design.
- **Severity:** **HIGH** (broken reference silently degrading a real section for 100% of visitors, undetected until this audit).

### 3.13 Couple photo / "Our Story" (`CouplePhotoExperience.tsx`)
- **Purpose:** a full-screen photo-per-page album closing the cinematic reel.
- **Works well:** photos are contained (never cropped/stretched), captions truncate cleanly (`white-space:nowrap` + ellipsis) instead of overflowing, a broken image drops out of the set automatically rather than showing a broken-image icon.
- **Repetitive:** the "Our Story" kicker label repeats identically on every single photo page (5 times in the default gallery) — a guest scrolling through five photographs sees the same section label five times in a row. Flagged per audit instructions.
- **Severity:** LOW (repetition), acceptable engineering otherwise.

### 3.14 RSVP (`RsvpSection.tsx` + `services/rsvp.ts`)
- **Purpose:** collect a guest's attendance response.
- **Works well as a FORM:** validation, a stepper for guest count, per-event attendance checkboxes, a "sealed" wax-seal success state — the interaction design is genuinely thoughtful and on-brand.
- **CRITICAL FUNCTIONAL FAILURE:** `rsvpService` is `localRsvpService`, which writes to `localStorage` on the **submitting guest's own device**. The couple's `/admin/rsvp` dashboard reads from `localStorage` **on whatever device the admin happens to be using**. These are never the same storage. **A couple cannot see any guest's RSVP unless that guest happens to hand the admin their own physical phone.** This is a complete, silent failure of the single most business-critical feature category in this entire product, and the code's own comments openly acknowledge it: *"the RSVP UI depends on this interface, not any specific storage backend… For now the implementation uses localStorage so the experience is fully functional in development."*
- **Severity:** **CRITICAL.**

### 3.15 Closing section (`ClosingSection.tsx`)
- **Purpose:** a farewell page, ending the invitation on the same "paper world" it opened in.
- **Works well:** a considered visual bookend (uses the invitation's own cover art under a light veil, deliberately contrasting with Venue's dark veil).
- **Severity:** POLISH — no material issues found.

### 3.16 Hidden/secondary UI
- **`FloatingContact.tsx` (WhatsApp/Call dock)** — works, respects the "no glass pill" convention. Its 36×36px toggle button is below the commonly recommended 44×44px minimum touch target. LOW/MEDIUM.
- **`SoundToggle.tsx`** — same 36×36px touch-target concern. LOW/MEDIUM.
- **Admin panel (`/admin/*`, 10 page files)** — exists, is reasonably organized, but (a) is gated by a hardcoded plaintext credential shipped in the client bundle (see Bug Register #4), and (b) several of its editable fields (`couple.header`, `couple.body`) have **zero effect** on the rendered invitation because no guest-facing component reads them. A customer using this panel would reasonably conclude the software is broken.
- **`/scripts/qa.mjs`** — an orphaned Playwright script: it targets `localhost:4321` while Vite is configured for port `5555` (`vite.config.ts`), hardcodes a Linux-container-only Chromium path (`/opt/pw-browsers/chromium`), and encodes timing assumptions (~10s total video) from a video that is now ~23.8s long. **This script cannot currently run successfully in this project.**

### 3.17 Mobile-only / Desktop behavior
- The entire layout is built from `dvh` units, `clamp()` fluid type, and a custom touch/wheel reel pager — this is unambiguously a **mobile-first** build (confirmed at the code level: every measurement in every section comment references phone viewport reasoning).
- Desktop is not designed-for as a distinct experience: the reel pager also drives wheel input, and every scene is full-viewport-height regardless of aspect ratio, meaning a 1440×900 desktop viewport receives the same phone-shaped composition, just wider. **Needs visual verification**, but the code gives no indication of a desktop-specific layout branch anywhere.

---

## SECTION 4 — FIRST IMPRESSION AUDIT

*(Design/UX judgment based on full code/asset reading — flagged as such; actual pacing/impact should be visually verified.)*

- **First 3 seconds:** a full-bleed image, tap-to-reveal, no text — reads as a considered "invitation," not a website. Good.
- **First 10 seconds:** the gate film begins; per the component's own timing map, 0–8s is "pure film" (iris + medallion) with no interactive content yet. This is a deliberate cinematic choice but also a **dead-attention window** for an impatient guest — nothing to read, nothing to do, for 8 full seconds.
- **First 30 seconds:** welcome text (9–14s), then a further 3.5s of "pure film" before the couple's name begins at 17.5s. That is roughly **11 of the first 21 seconds carrying no foreground content at all** (8s + ~3.5s), which is a meaningful amount of passive waiting for a first-time viewer on a guest's phone, however well the film itself is produced. **Needs visual verification of whether the film content during those gaps reads as "worth watching" rather than "empty."**
- **First 60 seconds:** couple names resolve by ~21s; scroll cue appears once the ~23.8s film ends (minus a 1s early stop) — so a guest cannot proceed past the opening scene until ~23 seconds in, with no skip control offered.
- **Does it feel custom-made vs template-like?** In isolation, the typography and the scratch/date mechanic feel custom. Once a viewer notices the identical Hindu-specific imagery/video across every "theme" option (a buyer evaluating themes would notice this quickly), the impression flips toward "template with a palette switcher."
- **Where does it lose impact?** The five ceremony pages, back to back, using one repeated layout template — engineered well, but visually the least differentiated stretch of the experience.
- **Where does it feel unfinished?** The RSVP "success" state (wax seal, "Your reply is on its way to us") promises something that structurally cannot happen for the couple.
- **Where is it empty vs crowded?** Nothing in the code suggests over-crowding; if anything the opening film's passive stretches (above) are the "too empty" risk, not any visual section.

---

## SECTION 5 — PREMIUM / LUXURY DESIGN AUDIT

Judged specifically as a **premium Indian Hindu wedding invitation** (the content it currently, exclusively, actually depicts — see Section 16, #2).

| Element | Classification | Evidence |
|---|---|---|
| Gold typographic treatment (numerals, hero words, names) | **A. Premium** | Three-layer embossed-gold recipe (gradient fill + stepped extrusion shadow + ambient drop-shadow) applied consistently across Save the Date, welcome text, couple names, and event day numerals |
| Per-letter "written by hand" name/text reveal | **A. Premium** | Normalized-duration stagger, real engineering care, not a stock "fade in" |
| Scratch-to-reveal mechanic | **A. Premium** (after this session's fix) | Real canvas, real pointer mapping, resolution-independent |
| Reel/scroll architecture | **A. Premium (engineering), B. Good but ordinary (visible to guest)** | Technically excellent; to a guest it simply feels like "one swipe, one page," which is the intended, invisible outcome |
| Event-page composition (artwork + measured text panel) | **A. Premium** | Text is genuinely composed into the artwork's own negative space, not slapped over the middle |
| "6 theme" system | **D. Cheap / dishonest, once inspected** | Only colors and a couple of SVG corner styles change; the actual photography, video, and ceremony vocabulary (Mehendi/Sangeet/Haldi, a Ganesha medallion) do not, even for themes labeled a different religion's category |
| Placeholder content (venue name "The Grand Palace", phone "+91 98765 43210") | **C. Generic** | Expected for a template default, but currently the ONLY content that exists — there is no working path to replace it (see Section 16, #1) |
| RSVP visual design (form itself) | **A. Premium** | Wax seal, "Réponse" kicker, considered micro-copy |
| RSVP functional outcome | **D. Cheap** | The premium form promises an outcome (the couple receiving your answer) that the architecture cannot deliver |
| Admin panel | **C. Generic / B. Good but ordinary** | Functional CRUD-style forms; not judged against luxury criteria since it's a tool, not guest-facing |
| Negative space / restraint (no card chrome on Cover, ScrollCue, FloatingContact) | **A. Premium** | Explicit, documented design conviction against "glass pill" UI |

**Overall verdict:** the individual craft is frequently premium. The **system-level honesty** (does the product actually deliver what its "6 themes" and its RSVP form promise) is where it falls to "cheap" — and system-level honesty is exactly what a paying customer evaluates once they look past the first screenshot.

---

## SECTION 6 — TYPOGRAPHY AUDIT

- **Font choice:** Fraunces-style variable serif (`--font-couple`) for identity/hero moments, Cormorant/Cormorant SC (`--font-invite-label`/`--font-sc`) for supporting/caption voice, a self-hosted Telma Bold (`--font-couple-custom`) for the couple's names specifically. This is a coherent three-voice system, documented as such in the codebase, and it is actually followed consistently — a real strength.
- **Hierarchy:** generally correct — hero numerals/names largest, captions smallest, with one exception already fixed this session (the welcome text's hero word had been set in the caption font, diagnosed and corrected).
- **Global minimum size:** a **13px floor** was established and enforced across the entire guest-facing app this session (audited file-by-file: `ClosingSection`, `Countdown`, `CouplePhotoExperience`, `EventsSection`, `FloatingContact`, `RsvpSection`, `ScrollCue`, `VenueSection`). Events-section text was subsequently raised to a **14px floor** specifically. Admin pages are explicitly out of scope for this floor (internal tool, not guest-facing) — a reasonable, documented scoping decision.
- **Smallest problematic text (historically):** prior to this session's passes, several labels sat as low as **8.5px** (`ScrollCue` wordmark) — now fixed to ≥13/14px. **No remaining sub-13px guest-facing text was found in this audit's review of the components listed above.**
- **Letter-spacing vs. size tension:** several labels use heavy tracking (`letterSpacing: 0.2–0.5em`) at small sizes — a classic premium-stationery technique, but one that increases the risk of text needing more horizontal room than a 360px viewport offers. **Needs visual verification at 360px.**
- **Contrast over imagery:** every text-over-photo/video instance uses either a gradient veil (`VenueSection`, `ClosingSection`, `EventsSection` fallback) or a dedicated drop-shadow/text-shadow pairing (`ScrollCue`, `FloatingContact`) rather than relying on the underlying image being reliably dark/light — the right approach in principle. The one place this approach was insufficient in practice was the couple-scene scroll cue against the gate film's pale ending frame, which required a targeted patch this session (see 3.4).
- **Overlap:** none found at the code level (positioning is consistently `clamp()`-based with explicit vertical bands); cannot rule out overlap at extreme font-scaling accessibility settings without visual verification.

---

## SECTION 7 — RESPONSIVE / MOBILE AUDIT

**Method:** static analysis of `clamp()`, `dvh`, and flex/grid usage across every guest-facing component. **No emulator/device rendering was performed — every row below that is not explicitly evidenced by a code defect is marked "Needs visual verification."**

| Viewport | Problem | Severity | Likely Cause | Recommended Fix | Verification status |
|---|---|---|---|---|---|
| 360–412px | Events-section content (day numeral + hairline + venue block) grew slightly this session (embossed treatment, larger venue text, added separator); margins were trimmed to compensate but the total footprint is a few px taller than before | LOW | Deliberate trade-off made this session between hierarchy and vertical budget | Re-verify the actual rendered height against the artwork's measured 39.5–68dvh panel on a real 360px-tall-viewport device | **Needs visual verification** |
| All widths | Heavily tracked labels (`letterSpacing` up to 0.5em) combined with `clamp()` min-widths could overflow a 360px column in edge cases (very long venue/address strings) | LOW–MEDIUM | Tracking + fluid type without an explicit `overflow-wrap`/max-width guard on every label | Add `overflow-wrap: anywhere` or verify long real-world venue address strings | **Needs visual verification** |
| All widths | Reel-pager touch/wheel logic assumes every scene is `100dvh` (`data-reel-scene` selector, `readGeom()`); this correctly re-measures on resize/orientation change (Android chrome collapse is explicitly handled), so this is **not** flagged as a defect | — | — | — | Code-verified correct |
| Desktop (no dedicated breakpoint) | Full-viewport-height "reel" scenes on a wide, short desktop window will look like a narrow phone-shaped column of content in a wide frame | MEDIUM | No desktop-specific layout branch found anywhere in the codebase | Decide deliberately whether desktop is in-scope; if so, design a distinct wide-viewport composition | **Needs visual verification**, but the *absence* of any desktop-specific code is a **verified fact** |
| All widths | Two touch targets (`SoundToggle`, `FloatingContact` toggle) are 36×36px | LOW–MEDIUM | `w-9 h-9` Tailwind utility used directly | Bump to at least 44×44px hit area (padding can extend the tap area without growing the visual icon) | Code-verified |
| All widths | `RsvpSection`'s attending/decline buttons and event checkboxes use standard padding (`py-3`) — likely fine | — | — | — | **Needs visual verification** |

**Overall:** the code is written with real mobile-viewport discipline (this is a genuine strength — see Section 15). No overflow/clipping **defect** was found in the source; the honest caveat is that fluid-type + real-device rendering can still surprise, and that has not been checked here.

---

## SECTION 8 — USER EXPERIENCE AUDIT

- **Navigation intuitiveness:** the reel's "one gesture = one scene" model is consistent and, per its own code comments, carefully tuned (velocity-based fling detection, idle realignment, no accidental double-fires). This is a strength.
- **Does the guest know what to do next?** Yes during the reel (a single scroll cue is present at the two points that matter — end of intro, end of Date scene). No progress indicator exists anywhere ("page 3 of 9") — a minor but real omission for a multi-scene experience with more than a handful of scenes.
- **Dead moments:** the gate film's early ~8 seconds of "pure film, no foreground" (see Section 4) is the clearest dead moment.
- **Unnecessary/accidental interactions:** the RSVP form correctly requires name + an attendance choice before submitting; no evidence of accidental double-submission (a `phase` state machine gates the button). Good.
- **Guided vs. controlled:** the reel intentionally "hijacks" scroll — a well-known UX risk category. The implementation is unusually careful about not trapping the user (explicit hand-off logic past the last scene, native rests eased rather than snapped, horizontal drags handed back). This is one of the more defensible scroll-hijack implementations I've reviewed at the code level, but scroll-hijacking as a category always carries residual risk on unfamiliar hardware/browsers. **Needs visual/device verification.**
- **Scratch interaction discoverability:** a rocking idle animation on the scratch cover (documented) is the discoverability cue — reasonable.
- **RSVP/closing loop:** structurally the last "confirmed" thing a guest sees is a wax seal — emotionally satisfying, but (per 3.14) it is promising an outcome the system can't deliver to the couple.

---

## SECTION 9 — ANIMATION / MOTION AUDIT

| Animation | Verdict | Why |
|---|---|---|
| Per-letter name/welcome-text type-on | **KEEP** | Bespoke, well-timed, consistent across the two places it's used |
| Scratch-cover idle rock | **KEEP** | Serves a real discoverability purpose, small and restrained |
| Celebration burst (post-rework) | **KEEP**, monitor on low-end devices | Achieves the intended "real celebration" feeling; 180 DOM nodes is a performance number worth spot-checking on a budget Android phone |
| Reel glide (`useReelPager`'s custom cubic-bezier easing) | **KEEP** | A genuinely tuned, non-default curve; consistent with the rest of the product's easing vocabulary |
| Scroll-cue pulse/aura | **KEEP** | Explicit non-zero opacity floor prevents the "invisible cue" failure mode |
| ~18 of 26 CSS `@keyframes` in `index.css` (`charReveal`, `lineReveal`, `cardEntry`, `borderGlow`, `shimmerSweep`, `atmosphereDrift`, `introBloom`, `introRing`, `revealGlow`, `fadeSlideUp`, `dateSettle`, `driftSlow`, `shimmer`, `pulseDot`, `fadeUp`, `ringPulse`, `sectionFadeUp`, `sectionScaleIn`) | **REMOVE** | Confirmed, by direct grep, unreferenced by any component or utility class currently in use — pure dead weight in the stylesheet |
| Reduced-motion handling | **KEEP as-is** | Consistently implemented: motion is removed, not the content — the correct pattern, applied uniformly across every animated component reviewed |

**Sequencing/continuity:** the couple scene's animation clock (a single `CUE` timeline keyed to the video's own `currentTime`) is a strong, disciplined choice that keeps every reveal locked to what the guest is actually seeing regardless of device speed or buffering — a real technical strength worth preserving exactly as-is.

---

## SECTION 10 — ASSET AUDIT

| Finding | Evidence | Severity |
|---|---|---|
| **Broken reference:** `theme.assets.venueImage` → `couple-poster.jpg` does not exist in `public/` | `find` confirms the file is absent; `grep` confirms it is the only reference | **HIGH** |
| **Stray duplicate files at `public/themes/theme-1/` root** (not under `images/`/`videos/`): `couple-background.jpg` (122 KB), `cover.jpg` (320 KB), `gate-cinematic.mp4` (1.28 MB), `savethedate.jpg` (270 KB), `scratch.png` (2.64 MB) | Confirmed via `find`/`ls`; confirmed via `grep` that **none** of these root-level copies are referenced anywhere in source — only the `images/`/`videos/` copies are used | **MEDIUM** (repo bloat + deploy bloat, ~4.6 MB of dead weight) |
| **An accidental screenshot committed as a "theme asset"**: `public/themes/theme-1/Screenshot 2026-09-20 231107.png` (500 KB) | File present, unreferenced anywhere | **MEDIUM** (unprofessional if a customer or another developer ever inspects the repo/deploy) |
| **No modern image formats anywhere** — 15 JPGs + 4 PNGs, zero `.webp`/`.avif` | Confirmed via extension search across `public/` and `src/` | **MEDIUM** (performance) |
| **Inconsistent lazy-loading** — `ClosingSection` and `CouplePhotoExperience` set `loading="lazy"/"eager"` deliberately; `EventsSection`'s `EventBackdrop` is explicitly eager ("must already be decoded" — a documented, reasoned choice); `VenueSection`, `Cover` set no `loading` attribute at all (default eager) | Confirmed via grep across all components | LOW |
| **Real asset library is genuinely strong for ONE cultural context** — the five ceremony photographs, the couple gallery, and the gate film are cohesive, well-color-graded, and consistently art-directed | Visual judgment from file inspection/sizes and the codebase's own detailed per-photo ranking rationale (`themes.ts` comments) | Positive finding |
| **The same asset library is reused, unchanged, across all 6 "themes"** — no theme actually overrides `assets` except by inheriting the shared `BASE` object | `themes.ts`: only `royal-maroon` overrides `fonts`/`motifs`/`layout`/`paperWorld`; none override `assets` | **CRITICAL** (see Section 16, #2) |
| Fonts: one self-hosted `Telma-Bold.woff2` + Google-style serif family names (`Playfair Display`, `Cormorant Garamond`, `Cormorant SC`) referenced by name in `themes.ts` but **no `@font-face`/Google Fonts `<link>` was found for them in `index.css` or `index.html`** in this review — **worth a direct check** that these fonts are actually loading and not silently falling back to system serif | Not fully confirmed — flagged for verification | **Needs visual verification** |

**Verdict on asset library strength:** strong enough to sell **one specific bespoke build** to a Hindu couple who is happy with the exact visual identity (photography style, iconography, color story) already shot/produced. **Not** strong enough, honest, or differentiated enough per-theme to sell as "6 ready-made themes" — that claim does not survive inspection.

---

## SECTION 11 — TECHNICAL AUDIT

**Architecture (positive):**
- Clean separation: `data/invitation.ts` (content shape + defaults) → `data/store.ts` (persistence) → `data/useStore.ts`/`useTheme.ts` (React binding) → presentational components. Components consistently read typed data rather than hardcoding content (with the header/body exception noted below).
- `useReelPager.ts` is genuinely sophisticated: a hand-rolled cubic-bezier solver, velocity-based fling detection, idle realignment, explicit handling of Android's collapsing browser chrome resizing `100dvh` mid-gesture. This is not templated code.
- Reduced-motion is threaded through every animated component via one shared `prefersReducedMotion()` helper.
- TypeScript is used meaningfully (real interfaces for every data shape, not `any`).

**Architecture (negative / risk):**
- **No backend, no network calls anywhere in the codebase** (`grep -rl "fetch(\|axios\|XMLHttpRequest\|process.env\|import.meta.env"` returns zero real hits). Every piece of "dynamic" data (admin edits, RSVP submissions) is `localStorage`-scoped to one browser.
- **Hardcoded plaintext admin credentials shipped in the client bundle** (`adminAuth.ts`: `admin@neozy.in` / `admin123`, checked entirely client-side). This provides no real access control — anyone can bypass it via devtools — and the credential pair is present in the shipped JavaScript. **CRITICAL if this code is ever deployed as-is and treated as "secured."**
- **`/:slug` route parameter is captured by the router but never read** (`useParams` is not called anywhere) — the "multi-tenant by slug" URL shape is decorative; every URL renders the same single hardcoded dataset.
- **Dead form fields in the admin UI**: `AdminEdit.tsx` lets an admin edit `couple.header` and `couple.body`, but no guest-facing component reads either field — editing them has zero visible effect.
- **Dead CSS**: ~18 of 26 keyframes and their corresponding `.animate-*` utility classes are unreferenced by any component (see Section 9).
- **Orphaned QA tooling**: `scripts/qa.mjs` targets the wrong port, a Linux-only browser path, and stale (~10s) video-timing assumptions against a now-~24s video. It cannot currently run.
- **`README.md` is the unmodified default Vite scaffold** — zero project-specific documentation (no setup, no data-editing instructions, no deployment notes).
- One `useMemo` in `DateReveal.tsx` performs a DOM operation (`document.createElement("canvas")`) during render to feature-detect canvas support — functionally fine (feature detection, not a side effect that mutates anything visible), but worth naming as an unusual pattern.
- Lint (`oxlint`) currently reports **zero warnings/errors** after this session's fixes (previously 3 pre-existing warnings — all resolved via real refactors, not suppression, per the last two work rounds in this repository's history).
- Build (`tsc -b && vite build`) currently succeeds cleanly.

**Maintainability:** the component-level documentation (extensive header comments explaining *why*, not just *what*) is unusually good for a project this size — a real asset for anyone picking this codebase up later. The admin/public disconnect and the dead-field problem are the main things that would confuse a new developer.

---

## SECTION 12 — PERFORMANCE AUDIT

**"Not measured; code/asset-based assessment."** No Lighthouse run, no real-device timing, no network throttling test was performed.

| Risk | Level | Evidence |
|---|---|---|
| Gate video (1.6 MB) set to `preload="auto"`, mounted from first render, before any user gesture | **MEDIUM–HIGH** | `VideoBackground.tsx`; browsers vary in how strictly they honor `preload="auto"` pre-interaction, but the code does not defer or gate this load |
| Background audio (4.2 MB `.mp3`) rendered unconditionally with `preload="auto"` at the bottom of `PublicInvitation.tsx`, regardless of whether the guest ever taps in | **MEDIUM** | Same caveat — actual behavior depends on browser autoplay/data-saver heuristics, not measured here |
| Five ~450–520 KB JPGs (one per ceremony) with no responsive `srcset`/modern format | **MEDIUM** | Confirmed file sizes via `du -h`; confirmed no `srcset`/`.webp` anywhere |
| `scratch.png` (the live one, 426 KB) for a small decorative cover graphic | **LOW–MEDIUM** | A single 426 KB PNG for a scratch-off overlay is heavy relative to its rendered footprint |
| 180-particle celebration burst, all CSS-animated simultaneously | **LOW–MEDIUM** | Not benchmarked; a reasonable node count for modern phones, untested on low-end Android |
| `useReelPager`'s `requestAnimationFrame` glide loop | **LOW** | Correctly cancels in-flight animations before starting new ones; no evidence of leaked RAF loops |
| ~4.9 MB of unreferenced stray/duplicate files in `public/` | **LOW (runtime), MEDIUM (deploy/repo size)** | These are not fetched by the running app (unreferenced), but they do bloat the deployed static bundle if the hosting simply serves the whole `public/` tree, and they bloat every future `git clone` |

**Net assessment:** nothing here is disqualifying on its own, but the combined "eager everything" pattern (video + audio + several full-resolution JPGs on the reel) on a guest's mobile data connection is a real, currently-unquantified risk that should be measured before shipping to real weddings, where guests frequently open the link on cellular data at a venue.

---

## SECTION 13 — ACCESSIBILITY AUDIT

Practical findings, not WCAG-theory:

- **Contrast:** each text-over-media instance pairs a specific shadow/veil strategy with its background (documented reasoning throughout the codebase); the one place this broke down in practice (scroll cue vs. the gate film's pale ending frame) required a manual patch this session — a sign the "one treatment fits all backgrounds" assumption is not fully reliable.
- **Alt text:** present and meaningful on user-facing photographs (`alt={photo.caption || ...}`); correctly `aria-hidden` on purely decorative art (backgrounds, ornaments, the welcome-text block).
- **ARIA labels:** present on every icon-only control found (`Cover`, `SoundToggle`, `FloatingContact`, `DirectionsAction`, `ScrollCue`'s button wrapper).
- **Touch target size:** `SoundToggle` and `FloatingContact`'s toggle are both 36×36px — below the commonly cited 44×44px minimum (Apple HIG / WCAG 2.5.5 AAA). **Concrete, measurable issue.**
- **Reduced motion:** consistently and correctly implemented — content stays fully visible and static rather than hidden, across every animated component reviewed. This is one of the better reduced-motion implementations I've seen in a project this size.
- **Keyboard/scroll-hijack interaction:** no explicit `keydown` handling exists in `useReelPager`; native keyboard scrolling (PageDown/Space/arrows) is not blocked, and the idle-realignment logic will ease it onto the nearest scene after 140ms of stillness — functionally reasonable, but there is no visible focus management or "current scene" ARIA live-region announcement for a screen-reader user navigating a full-screen "reel" whose scenes are not conventional landmarks.
- **Semantic structure:** `<section>` elements are used consistently; heading levels (`h2`) are used for names/titles, but there is no single `<h1>` found for the page as a whole in the files reviewed — worth a direct check.
- **Form accessibility (`RsvpSection`):** labels are real `<label>` elements tied visually (not programmatically confirmed via `htmlFor`/`id` in the excerpt reviewed) to their inputs; the error message uses `role="alert"` correctly.

---

## SECTION 14 — BUG / ISSUE REGISTER

| ID | Section | Issue | Severity | User Impact | Business Impact | Likely Cause | Recommended Fix | Status |
|---|---|---|---|---|---|---|---|---|
| BUG-01 | Events | Mehendi (Dec 10) / Sangeet (Dec 11) / Haldi (Dec 12) are dated **after** the wedding day (Dec 4); Reception is 8 days after the wedding | **P0** | Guest sees a nonsensical, unusable event schedule | Directly damages first-impression credibility; was previously flagged internally and explicitly deferred as "out of scope" | Sample/default data was never fully reconciled after the wedding date was changed | Correct the default event dates to precede the wedding day in a realistic sequence | OPEN |
| BUG-02 | Theming/Assets | All 6 themes (including 2 labeled "Muslim") share one Hindu-specific video (opens on a Ganesha medallion), photo set, and ceremony vocabulary (Mehendi/Sangeet/Haldi) | **P0** | A non-Hindu customer selecting a themed option would receive iconography/content misrepresenting their own wedding | Reputational/business risk; the "6 themes" marketing claim does not hold up | `assets` were never actually overridden per theme; the gate video path is a hardcoded constant in `CoupleIntro.tsx`, not theme-driven at all | Either (a) build genuinely separate asset sets per theme/category, or (b) honestly scope the product as "one Hindu wedding identity, 6 color palettes" | OPEN |
| BUG-03 | RSVP | RSVP submissions are written to the submitting guest's own `localStorage`; the admin dashboard reads from the admin's own `localStorage`. The couple can never see a guest's real submission. | **P0** | The core "let guests RSVP" promise silently does not work | This alone should block any commercial sale claiming RSVP collection | No backend exists; explicitly a "development only" implementation per the code's own comments | Add a real backend (even a minimal serverless function + a database) before selling this as an RSVP-capable product | OPEN |
| BUG-04 | Admin/Data | Admin panel edits (`header`, `body`) persist to `localStorage` on the editing device only; guests on other devices never see them; additionally, `header`/`body` fields are edited in the UI but never rendered anywhere | **P0/P1** | Admin edits appear to silently "not work" | A customer would reasonably conclude the software is broken, or lose trust after their edits vanish for guests | Same root cause as BUG-03 (no backend) plus a data-model/UI mismatch for the two dead fields | Backend fix covers persistence; the two dead fields need either real rendering or removal from the form | OPEN |
| BUG-05 | Venue | `theme.assets.venueImage` points to a file that does not exist (`couple-poster.jpg`); the Venue section has been silently showing its "no photo" fallback for every visitor | **P1** | The Venue page never shows its intended photographic composition | A shipped section is quietly underperforming its own design without anyone noticing | Broken/renamed asset reference never caught because the fallback looks intentional | Point `venueImage` at an existing file, or ship the missing asset | OPEN |
| BUG-06 | Security | Admin login credentials are hardcoded in plaintext in client-shipped source (`adminAuth.ts`) | **P1** | None directly to guests; real risk only if this is treated as production auth | Would fail even a cursory security review before a real sale | Explicitly labeled "Phase 1" dev-only scaffolding that was never replaced | Replace with real server-verified auth before any production deployment | OPEN |
| BUG-07 | Routing | `/:slug` is captured by the router but never read (`useParams` unused) — every URL renders the same fixed dataset | **P2** | None visible to a single-couple deployment; blocks any multi-tenant/SaaS model | Limits the business model to "one static build per customer" unless fixed | Slug-based multi-tenancy was scaffolded but never wired to actual per-slug data loading | Decide the business model explicitly; if multi-tenant, wire slug → dataset lookup | OPEN |
| BUG-08 | Tooling | `scripts/qa.mjs` targets the wrong dev-server port, a Linux-only Chromium path, and stale (~10s) video timing vs. the current ~24s film | **P2** | None to guests; blocks internal QA automation | Wastes future engineering time if someone tries to run it without noticing it's stale | Script was written against an earlier version of the product and never updated | Either update or remove the script | OPEN |
| BUG-09 | Assets/Repo | ~4.9 MB of unreferenced duplicate/stray files (including an accidental screenshot) committed under `public/themes/theme-1/` root | **P3** | None to guests | Repo/deploy bloat; unprofessional if inspected by a technical buyer or collaborator | Files were dropped at the theme root during asset work and never cleaned up | Delete the unreferenced root-level duplicates and the screenshot | OPEN |
| BUG-10 | CSS | ~18 of 26 `@keyframes` (and their `.animate-*` classes) in `index.css` are unused by any current component | **P3** | None to guests | Minor maintainability tax; makes the stylesheet harder to trust/reason about | Iterative design work superseded earlier animation systems without cleanup | Delete confirmed-unused keyframes/classes | OPEN |
| BUG-11 | A11y | `SoundToggle` and `FloatingContact` toggle buttons are 36×36px, below the commonly recommended 44×44px touch target | **P3** | Slightly harder to tap accurately on a real phone | Minor; a polish-level accessibility gap | `w-9 h-9` used directly without a larger invisible hit area | Increase the tappable hit area via padding without growing the visual icon | OPEN |
| BUG-12 | Docs | `README.md` is the unmodified default Vite template | **P4** | None to guests | No onboarding path for a new developer or technical buyer inspecting the repo | Never customized after scaffolding | Write a real project README | OPEN |

---

## SECTION 15 — WHAT IS ACTUALLY GOOD

1. **`useReelPager.ts` — the custom scroll/reel navigator.** A hand-built cubic-bezier solver, velocity-based fling classification, idle-realignment for native scroll rests, and explicit handling of Android's collapsing browser chrome mid-gesture. This is meaningfully more sophisticated than a CSS `scroll-snap` template solution and should be preserved exactly as-is. **Could become a genuine selling point** ("built like a native app, not a scrolling webpage") if the product is marketed on its engineering, not just its visuals.
2. **The embossed-gold typography recipe** (gradient fill + stepped extrusion `text-shadow` + ambient `filter:drop-shadow`), applied consistently across the Save the Date numeral, the welcome-text hero word, and the Events day numeral. This is a real, disciplined design system, not a one-off effect, and it is the single most "premium wedding stationery" moment in the product. Preserve exactly.
3. **Per-letter "written by hand" name reveal**, normalized to a fixed total duration regardless of name length, applied consistently to both the couple's names and (now) the welcome text. Genuinely bespoke engineering, not a stock library animation.
4. **The scratch-to-reveal mechanic**, once corrected this session — resolution-independent, real pointer mapping, no dependency on hardcoded pixel assumptions going forward.
5. **The event-page art direction** — text composed into each ceremony photo's own measured negative space (pixel-sampled from the real shipped images), rather than centered blindly over every photo regardless of composition. This is uncommon care for a template-style product.
6. **Comprehensive, correct reduced-motion handling** across every animated component — content is always kept visible and static, never hidden, when reduced motion is requested. This is frequently done poorly or skipped entirely in comparable products.
7. **Code documentation quality** — extensive "why," not just "what," commentary throughout the component tree, including honest documentation of past bugs and the reasoning behind fixes. This materially lowers the cost of a future developer (or this auditor) understanding the system.

---

## SECTION 16 — WHAT IS HOLDING THE PRODUCT BACK (RANKED)

1. **No backend — RSVP and admin edits do not persist across devices.**
   *Why it matters:* this is the product's core promised capability (send an invitation, collect answers). *User impact:* couples get zero real RSVP data; guests' answers vanish into their own browser. *Commercial impact:* disqualifying for any sale that claims RSVP functionality. *Difficulty to fix:* MEDIUM–HIGH (needs a real backend, even a minimal one). *Expected improvement:* transforms the product from "impressive demo" to "usable product" — the single highest-leverage fix available.

2. **The "6 themes" claim does not survive inspection — one asset set, mislabeled across religions.**
   *Why it matters:* "Emerald Mughal"/"Arabesque Blue" (category: "Muslim") ship a Hindu-specific gate video (opening on a Ganesha medallion), Hindu ceremony names, and a couple in Hindu wedding attire. *User impact:* a buyer expecting a Muslim wedding identity gets a mislabeled Hindu one. *Commercial impact:* real reputational/business risk, and it undercuts the differentiation the theme system is meant to provide. *Difficulty to fix:* HIGH (needs genuinely separate asset production per category, or an honest re-scope). *Expected improvement:* either meaningfully expands the addressable market (if fixed) or removes a live liability (if honestly re-scoped to "one identity, color variants").

3. **Broken chronology in the default event data (Bug-01).**
   *Why it matters:* it's the first concrete factual error a careful viewer notices. *User impact:* confusing, looks careless. *Commercial impact:* undermines trust at first glance. *Difficulty to fix:* TRIVIAL (edit dates in `invitation.ts`). *Expected improvement:* immediate, for near-zero cost — this should be the very first fix made, regardless of anything else in this report.

4. **Hardcoded admin password shipped in the client bundle.**
   *Why it matters:* fails any real security review. *User impact:* none to guests directly. *Commercial impact:* a technically literate buyer or auditor would immediately flag this. *Difficulty to fix:* MEDIUM (needs real auth, tied to the backend work in #1). *Expected improvement:* removes a specific, easily-cited security objection.

5. **No content-personalization path for a non-developer.**
   *Why it matters:* even setting aside cross-device sync (#1), several pieces of guest-facing copy (welcome text, closing message wording beyond the data fields) are hardcoded JSX, not data-driven at all. *User impact:* every customer would need a developer to touch source code for full customization. *Commercial impact:* caps the business model to "bespoke build per customer," which is a valid model but should be a deliberate choice, not a gap. *Difficulty to fix:* MEDIUM. *Expected improvement:* enables a true self-serve or semi-self-serve sales motion if desired.

6. **Broken Venue background asset (Bug-05), silently degrading a real section.**
   *Why it matters:* a shipped feature has never actually appeared as designed. *User impact:* subtle — the fallback looks fine on its own, so it's easy to miss. *Commercial impact:* moderate, but only if someone with the design intent in mind actually checks. *Difficulty to fix:* TRIVIAL (fix the path or supply the file). *Expected improvement:* immediate visual upgrade to the Venue section for zero engineering risk.

7. **No performance measurement on a real device/network, against a media-heavy first load (video + audio + several full-res JPGs, all eager).**
   *Why it matters:* guests frequently open wedding invitation links on venue Wi-Fi or cellular data; a slow first paint directly undermines the "premium" impression it's trying to create. *User impact:* potentially long load times on weak connections. *Commercial impact:* moderate — this is a common failure mode across the whole product category, so it's not uniquely damaging, but it's easy to measure and fix. *Difficulty to fix:* LOW–MEDIUM (defer non-critical preloads, compress/convert images). *Expected improvement:* meaningful, measurable, and cheap relative to its impact.

8. **Repo/asset hygiene (stray duplicates, an accidental screenshot, dead CSS, an orphaned QA script).**
   *Why it matters:* none of this is visible to a guest, but all of it is visible to any technical buyer, collaborator, or future developer who inspects the repository — and a "premium" product with a visibly sloppy backing repo undercuts its own positioning. *Difficulty to fix:* TRIVIAL–LOW. *Expected improvement:* purely reputational/maintainability, but very cheap to realize.

9. **Two touch targets below the recommended minimum size.**
   *Why it matters:* small, real usability friction on a mobile-first product. *Difficulty to fix:* TRIVIAL. *Expected improvement:* minor but free.

10. **No project documentation (default scaffold README).**
    *Why it matters:* zero onboarding for a new developer or a technically curious buyer. *Difficulty to fix:* LOW. *Expected improvement:* minor, but relevant the moment this product needs to be handed to anyone else.

---

## SECTION 17 — SELLABILITY AUDIT

**Would this currently be credible as a paid product?** Only as a **portfolio/demo piece** or as the visual foundation for a **bespoke, developer-delivered build**, not as a self-serve SaaS-style product. The moment a buyer tries to actually use the two features that justify a "digital invitation with RSVP" purchase — editing their own content and collecting guest answers — the product does not deliver.

**What type of customer would buy it as-is?** A couple (or their planner) working directly with the developer, who is comfortable receiving a **bespoke, hand-built** invitation where the developer edits `invitation.ts` directly, manually rebuilds and redeploys per customer, and collects RSVP data through some separate, out-of-band channel (a shared spreadsheet, a WhatsApp group, a proper backend built for that specific job). This is a legitimate, sellable services model — it is just not what the current admin panel / RSVP form architecture implies it is.

**What type of customer would reject it?** Anyone expecting to self-serve: log into an admin panel, type in their own details, and have guests immediately see the update and be able to RSVP back to them. That expectation — which the admin panel and RSVP form visually promise — is not met.

**What would make a customer hesitate?** Testing the admin panel themselves, or asking "can I see who has RSVP'd from my phone if my fiancé filled it out on his laptop?" The honest answer today is no.

**What would make them say "this is premium"?** The opening cinematic, the Save the Date scratch/reveal moment, and the couple-name typography, shown as a finished video/demo rather than a live editable product.

**What would make them compare it to cheaper templates?** Realizing the "6 themes" are a palette swap over one fixed photo/video identity — a customer who samples two or three themes back-to-back would notice this within a minute.

**What justifies premium pricing?** The bespoke cinematic film, the scratch mechanic, and the typographic craft — genuinely differentiated relative to the ₹99–₹3,000 template tier of this market (see Section 19/20).

**What currently makes it look like a template?** The placeholder venue name, generic phone numbers, the repeated "Our Story" label across every album page, and (once discovered) the shared asset set across "themes."

**Is it differentiated enough?** Visually and animation-wise, **yes**, relative to the budget end of the market. Functionally (RSVP, customization), **no** — it currently sits below the feature bar that even mid-tier competitors (₹9,999 packages, per market research below) treat as standard: working RSVP with guest management.

**What needs to change before selling confidently?** At minimum: fix BUG-01 (dates), be honest about the theme system (fix or re-scope), and either build a real RSVP backend or explicitly sell this as a "bespoke cinematic invitation, RSVP handled by [phone/WhatsApp/a separate tool]" product rather than implying an integrated RSVP dashboard.

---

## SECTION 18 — TARGET CUSTOMER SEGMENTS

| Segment | Fit | Expectations | Likely objections | Customization needed | What matters to them |
|---|---|---|---|---|---|
| Budget wedding customers | POOR fit today | A cheap, fast, self-serve link | Price (this product's engineering investment implies it shouldn't be sold at budget-tier prices) | Minimal | Speed, price, simplicity — not this product's strength |
| Mid-range wedding customers | MODERATE fit, with fixes | A nice-looking site + working RSVP + easy self-edit | Will immediately hit the RSVP/admin gap if they try to self-serve | Needs the backend fix (#1) and content personalization | RSVP that actually reaches them; easy editing |
| Premium wedding customers | GOOD fit, as a bespoke service | A visually distinctive, cinematic experience matching their own wedding's identity | Will ask about multi-device RSVP visibility and about seeing "themes" that actually differ | Needs their own real photos/video, correct event dates/venue, and (if any theme beyond the default) a genuinely different asset set | The exact craft already present: typography, motion, scratch mechanic |
| Luxury/bespoke wedding customers | STRONG fit, as a fully custom build | A one-of-a-kind digital experience commissioned like a physical stationery suite | Will expect the developer to hand-tailor everything (which this architecture already assumes) | Full bespoke asset production per couple | Uniqueness, craft, white-glove delivery — matches how this product is *actually* built today (one dataset, hand-edited) |
| Wedding planners / agencies | MODERATE fit, as a white-label tool for their own clients | Multiple concurrent client invitations, ideally self-serve per client | The `/:slug` non-functionality and single-tenant architecture directly block this use case today | Needs real multi-tenancy (slug → dataset) | Ability to manage many clients' invitations from one dashboard |
| Photographers / invitation designers | GOOD fit, as a component/reference | Reusable animation/typography patterns they could commission variants of | Would want to know how much is genuinely reusable per theme vs. hardcoded | Needs the theme system to be real | The engineering craft (Section 15) more than the current default content |
| Event agencies | POOR fit today | A guest-management platform (RSVP, headcounts, seating) | The complete absence of a working RSVP backend is disqualifying here specifically | Needs #1 (backend) as a hard prerequisite | Data they can actually act on |

*(No claim of actual customer demand is made here — this is a fit analysis based on the product's demonstrated capabilities, not market research on demand.)*

---

## SECTION 19 — PRICING ANALYSIS

### MARKET RESEARCH *(external, web-search-based, dated 2026-09-21 — see Sources)*

- Budget/template digital wedding invitation platforms in India: **₹99–₹799** for basic countdown/animated-envelope tiers; **₹500–₹3,000** for template-based sites regardless of guest count.
- One-time, all-inclusive template platforms (design + RSVP + gallery + music + custom domain): around **₹999**.
- Custom single-page invitation sites: **₹4,999** typical starting point.
- A commonly cited **"Premium" package (~₹9,999)** bundles: multi-section custom site, **RSVP with guest management**, couple story/timeline, unlimited gallery, music, custom domain for a year. *This is the tier where working RSVP + guest management is treated as a baseline expectation, not a luxury add-on.*
- A commonly cited **"Luxe" package (from ₹19,999+)** adds a cinematic AI/custom invitation film, multi-language support, password-protected pages, and a **live RSVP analytics dashboard**.
- Freelancer-built fully custom event websites: **₹8,000–₹40,000**; agency-built: **₹40,000–₹1,50,000+**.
- Animated custom video invitations specifically: from roughly **₹1,500** (templated) up to **₹25,000** (fully custom animation).

Sources:
- [Digital Wedding Invitation Cost in India 2025: Complete Price Guide | Magical Star](https://magicalstar.in/blog/digital-wedding-invitation-cost-india-2025/)
- [Wedding Invitation Cost in India 2026: Cards, E-Invites & Design | Velvet Knot](https://velvetknot.in/wedding-invitation-cost-india/)
- [Wedding Invitation Cost in India 2026: Full Price Guide | Eventic](https://eventic.in/blog/wedding-invitation-cost-india/)
- [How Much Does a Wedding Invitation Website Cost in India? (2026 Guide) | Rachnakar Designs](https://rachnakardesigns.com/blog/wedding-invitation-website-cost-india)
- [Wedding Invitation Cost India: Budget to Luxury Guide 2026 | Happiffie](https://www.happiffie.com/blog/wedding-invitation-cost-india-budget-breakdown)
- [How Much Does a Digital Wedding Invitation Cost in India? — ShubhLink](https://shubhlink.com/blog/digital-wedding-invitation-cost-india)
- [How Much Does a Wedding Website Cost in India? (2026) | SitesPlaced](https://sitesplaced.com/blog/wedding-website-cost-india)
- [How Much Does a Custom Event Website Cost? (2026) | SitesPlaced](https://sitesplaced.com/blog/custom-event-website-cost)
- [WEB INVITES — Digital Wedding Invitations Online](https://www.webinvites.shop/)
- [Motion Stamp — Animated Digital Wedding Video Invitations](https://motionstamp.com/en-us)
- [Wedding Websites India — Custom Sites with RSVP & Live-Stream | SARK](https://www.marketingseo.in/digital-products/websitedevelopment/wedding-website)

### YOUR PRODUCT-BASED ESTIMATE *(my own reasoning, not guaranteed market pricing)*

| Tier | Price range (₹) | What the customer receives | Justification | What must be included first | Target segment |
|---|---:|---|---|---|---|
| **As-is, sold honestly today** | **₹3,000 – ₹8,000** | The current build, delivered as a one-off bespoke site with the buyer's own text/photos hand-edited into `invitation.ts` by the developer; RSVP explicitly routed to phone/WhatsApp, not the built-in form | Sits below the ₹9,999 "Premium" market tier specifically *because* it cannot offer working RSVP + guest management, which that tier treats as standard | Fix BUG-01 (dates) and the broken Venue asset at minimum, or don't ship with them visible | Budget-to-mid couples wanting a nicer-than-template look, working directly with a developer |
| **After essential fixes** (backend RSVP + admin sync, theme honesty, date fix, security fix) | **₹9,000 – ₹18,000** | A genuinely working RSVP + guest management flow the couple can check from any device, correct content, an honestly-scoped theme offering | Matches the market's own "Premium" tier feature set (RSVP + guest management + gallery + music + domain), on top of visibly stronger typography/animation craft than that tier typically shows | Everything in the P0/P1 bug list (Section 22/23) | Mid-range to premium couples wanting more polish than a generic ₹9,999 template |
| **Premium customized version** (per-couple bespoke video, real per-theme asset sets, self-serve admin that actually works) | **₹20,000 – ₹45,000** | A commissioned cinematic film matching the couple's own photos/story, a working live RSVP dashboard, genuinely distinct theme options | Matches/exceeds the market's "Luxe" tier (cinematic AI film + live RSVP dashboard, from ₹19,999+), while offering demonstrably more handcrafted typography/motion than an AI-templated film | The full backend, real per-couple asset production pipeline | Premium/luxury couples, wedding planners buying per-client |
| **High-end bespoke** (fully custom-shot video, dedicated development per client, white-glove delivery) | **₹50,000 – ₹1,50,000+** | A one-of-a-kind digital stationery suite built to agency-level standard | Comparable to agency-built custom event websites (₹40,000–₹1,50,000+ per the market research above), justified only if the video/photography itself is newly commissioned per couple, not reused stock-style assets | Everything above, plus real production budget for bespoke media per client | Luxury/bespoke segment, high-touch agencies |

**These are estimates derived from the product's demonstrated capabilities compared against researched market tiers — not guaranteed achievable sale prices.**

---

## SECTION 20 — COMPETITIVE POSITIONING

**Researched facts (see Section 19 sources):** the Indian digital wedding invitation market spans free/₹99 templated countdown pages up through ₹19,999+ "Luxe" packages that bundle a cinematic AI-generated invitation film with a live RSVP analytics dashboard, and further up into ₹40,000–₹1,50,000+ agency-built custom event sites. **Working RSVP with guest management is treated as a standard, expected feature starting at the mid-tier (~₹9,999), not a luxury extra.**

**My own assessment, based on this codebase specifically:**

- **Where this product is ahead of typical competitors:** the depth of typographic/motion craft (the embossed-gold recipe, the per-letter reveal, the measured-artwork event-page composition, the bespoke scroll-reel architecture) is more sophisticated than what a templated ₹999–₹9,999 product typically ships — those are usually built on shared, generic component libraries rather than this level of bespoke, per-detail engineering.
- **Where this product is behind:** it currently sits *below* even the ₹9,999 mid-tier on the one feature that tier treats as baseline — a working RSVP + guest-management flow the couple can actually see. A cheaper competitor that merely wires a form to a spreadsheet or a basic database currently delivers more *functional* value than this product does, despite looking less impressive.
- **Common industry pattern this product is missing:** a "Luxe"-tier competitor's headline feature is explicitly a **cinematic AI invitation film + live RSVP dashboard** — i.e., the market has already normalized pairing a cinematic visual with a functioning data layer. This product has built the cinematic half at a genuinely high level, and has not built the data half at all.
- **Differentiation opportunity:** if the backend/RSVP gap is closed, the existing visual/motion craft would likely place this product credibly in the ₹15,000–₹30,000+ band without needing an AI-generated film — a real, hand-crafted equivalent to what competitors currently sell as their top tier.

---

## SECTION 21 — COMMERCIAL PRODUCT SCORECARD

| Category | Score /10 | Reason |
|---|---:|---|
| Visual quality | 7.5 | Strong typography/motion craft; undercut by placeholder content and repeated labels |
| Premium feel | 6 | Real in isolated moments; broken by the theme-system honesty problem |
| Originality | 7 | Bespoke scroll pager and reveal animations, not templated components |
| UX | 6.5 | Reel navigation well engineered; RSVP/admin flows silently fail their purpose |
| Animation | 8 | Coherent, restrained, consistent easing vocabulary; comprehensive reduced-motion support |
| Mobile readiness | 6.5 | Genuinely mobile-first code; unverified on real devices; two sub-minimum touch targets |
| Technical quality | 6 | Clean, typed, well-documented; meaningful dead code and one hardcoded security shortcut |
| Reliability | 3 | No backend, no data durability, silent asset-404 fallback |
| Customization potential | 3 | No working self-serve path today; architecture assumes developer-mediated edits |
| Customer appeal | 6 | Strong at first glance; weakens on actual use/testing |
| Differentiation | 5 | Genuinely differentiated visually; not differentiated functionally versus mid-tier competitors |
| Production readiness | 4 | Front-end is production-quality; the product as a whole is not |
| Sellability | 3 | Sellable only as a bespoke service today, not as the self-serve product it visually implies |

---

## SECTION 22 — READY TO SELL?

**Status: NOT READY** (for the product as it visually presents itself — an editable, RSVP-capable wedding invitation platform).

**Status: READY FOR LIMITED SALES** (as a bespoke, developer-delivered cinematic invitation, RSVP handled out-of-band) — this narrower framing is honest and sellable today.

**Why:** the gap is not polish, it's function. A customer paying for "an invitation my guests can RSVP to" cannot get that from the current architecture across two different devices.

### MUST FIX BEFORE SALE (if selling the full self-serve promise)
- Real backend for RSVP + admin data (BUG-03, BUG-04)
- Fix the broken event-date sequence (BUG-01)
- Resolve the theme-system honesty problem — either real per-theme assets or an honest re-scope (BUG-02)
- Replace hardcoded admin credentials with real auth (BUG-06)
- Fix the broken Venue image path (BUG-05)

### CAN FIX AFTER FIRST SALE (if selling the bespoke-service framing today)
- Dead CSS cleanup (BUG-10)
- Stray file/repo cleanup (BUG-09)
- Orphaned QA script (BUG-08)
- Touch target sizing (BUG-11)
- README/documentation (BUG-12)
- `/:slug` multi-tenancy (BUG-07) — only relevant if/when selling to multiple simultaneous customers from one deployment

---

## SECTION 23 — MINIMUM VIABLE COMMERCIAL VERSION

**P0 (blocks any honest sale of "RSVP + self-edit" as a feature):**
- [ ] Real backend/data store for RSVP submissions, readable by the couple regardless of device
- [ ] Real backend/data store for admin edits, so a customer's changes reach guests
- [ ] Fix the Mehendi/Sangeet/Haldi/Reception date sequence
- [ ] Replace hardcoded admin credentials with real server-verified auth

**P1 (blocks confident premium positioning):**
- [ ] Resolve the theme-system mismatch (real assets per theme, or drop the multi-religion category claims)
- [ ] Fix the broken `venueImage` path
- [ ] Remove or wire up the dead `header`/`body` admin fields
- [ ] Measure real load performance (video/audio/image weight) and defer/compress accordingly

**P2 (raises quality without blocking a sale):**
- [ ] Clean up dead CSS keyframes/classes
- [ ] Remove stray/duplicate files and the accidental screenshot from the repo
- [ ] Fix or remove the orphaned QA script
- [ ] Raise the two sub-44px touch targets
- [ ] Write a real README

No redesign of the existing visual/animation system is recommended — it is the product's strongest asset.

---

## SECTION 24 — VALUE INCREASE ROADMAP

**STAGE 1 — Current → commercially credible**
*Changes:* fix BUG-01/BUG-05/BUG-06, add a minimal real backend for RSVP (even a simple serverless function + database), correct README.
*Complexity:* MEDIUM (backend is the only non-trivial piece).
*Customer value:* the product finally does what its form and admin panel visually promise.
*Pricing potential:* moves from the "as-is" band into the "essential fixes" band (Section 19): roughly **₹9,000–₹18,000**.

**STAGE 2 — Commercially strong**
*Changes:* real per-theme asset production (or an honest single-identity re-scope), a working admin-to-guest data sync, dead-field/dead-code cleanup, measured and optimized asset loading.
*Complexity:* MEDIUM–HIGH (asset production for genuine themes is the costliest part).
*Customer value:* a couple can actually self-manage their invitation and trust the theme they picked matches their wedding.
*Pricing potential:** **₹15,000–₹30,000** range, competitive with the market's "Luxe" tier on craft, ahead of it on hand-built distinctiveness.

**STAGE 3 — Premium product**
*Changes:* per-couple bespoke video/photo commissioning pipeline, a real multi-tenant admin (slug-driven), a live RSVP analytics view matching or exceeding the "Luxe" competitor feature.
*Complexity:* HIGH (production pipeline + multi-tenant engineering).
*Customer value:* a genuinely one-of-a-kind cinematic invitation with real guest-management tooling.
*Pricing potential:* **₹30,000–₹60,000**, positioned above the researched market's top-cited tier.

**STAGE 4 — Bespoke/luxury product**
*Changes:* fully custom-shot film and photography per couple, white-glove delivery, dedicated support through the event.
*Complexity:* HIGH, largely production (not engineering) cost.
*Customer value:* a true digital-stationery commission, comparable to hiring a boutique wedding-film studio.
*Pricing potential:* **₹60,000–₹1,50,000+**, comparable to agency-built custom event sites in the market research above.

---

## SECTION 25 — FINAL BUYER'S VERDICT

**"If I were paying for this product today, what would concern me?"**
That my guests' RSVP answers would never actually reach me, that editing my own wedding details through the admin panel might silently do nothing, and that the "theme" I picked might not actually reflect my own wedding's traditions once I looked closely.

**"What would convince me to buy it?"**
Watching the opening cinematic and the Save the Date scratch reveal on my own phone — that moment is genuinely strong, and it's the moment that would make me say yes before testing anything else.

**"What would I expect to be fixed before delivery?"**
The event dates (an obvious, checkable error), a working way for me to actually receive RSVP responses, and confirmation that my own photos/video/details are what guests will see — not a shared template dataset.

**"What would make me willing to pay significantly more?"**
A demonstrably working, real-time RSVP dashboard I can check from my own phone regardless of which device a guest used, and a version of this exact visual craft built around content that is genuinely mine — not a reskin of someone else's wedding.

---

## SECTION 26 — FINAL AUDIT SUMMARY

**CURRENT PRODUCT STATUS:** Functional front-end product; not a commercially ready product.

**OVERALL SCORE:** 5.5 / 10

**COMMERCIAL READINESS:** 3 / 10

**BIGGEST STRENGTH:** The bespoke typography/motion system (embossed-gold recipe, per-letter reveal, measured-geometry compositions) and the hand-built scroll-reel architecture — engineering and craft well above template grade.

**BIGGEST WEAKNESS:** No backend. RSVP and admin-panel edits are `localStorage`-only, so guests' answers never reach the couple and the couple's edits never reach guests. This is a structural gap, not a polish item.

**BIGGEST COMMERCIAL OPPORTUNITY:** Closing the backend gap would let the existing visual/animation craft compete credibly at the ₹15,000–₹30,000+ tier of the researched market — well above where a "palette-swap template" would otherwise sit.

**BIGGEST COMMERCIAL RISK:** Selling the "6 themes" claim as-is to a customer outside the Hindu wedding tradition the shipped video/photography actually depicts — a real reputational and refund risk, evidenced directly in the code (a hardcoded, non-theme-driven video opening on a Ganesha medallion, shared across themes explicitly labeled "Muslim").

**TOP 5 FIXES:**
1. Fix the Mehendi/Sangeet/Haldi/Reception date sequence (trivial, immediate credibility win).
2. Build a real backend so RSVP submissions and admin edits actually reach their intended audience.
3. Resolve the theme-system mismatch — real per-theme assets, or an honest single-identity re-scope.
4. Replace the hardcoded admin credentials with real authentication.
5. Fix the broken Venue image path and remove the dead `header`/`body` admin fields (or wire them up).

**ESTIMATED CURRENT VALUE RANGE:** ₹3,000 – ₹8,000 *(sold honestly, as a bespoke one-off with RSVP handled outside the app)*

**ESTIMATED VALUE AFTER ESSENTIAL FIXES:** ₹9,000 – ₹18,000

**ESTIMATED VALUE AFTER PREMIUM POLISH:** ₹20,000 – ₹45,000

*These are estimates derived from the product's demonstrated capabilities compared against researched market pricing — not guaranteed selling prices.*
