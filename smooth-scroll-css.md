# smooth-scroll-css

## Objective
Implement a scroll-container experience that uses **`dvh`-based pacing windows** for consistent animation timing across short and long pages, with CSS-native features first and JS fallback/performance enhancements.

## Architecture summary
- **Primary pacing unit:** `dvh` (dynamic viewport height), with pixel caps where needed.
- **Progress model:** distance-first windows (`dvh` / px) + derived normalized `0..1` values per effect.
- **Enhancement order:** native CSS timelines → JS hybrid fallback → low-end performance tier.
- **Accessibility baseline:** `prefers-reduced-motion` and no scroll hijacking.

---

## Phase 1 — Foundation (variable contract + layout)

### Deliverables
1. Establish shared variables on root or scroll container:
   - `--scroll-y-px`
   - `--scroll-range-px`
   - `--scroll-progress` (derived)
   - `--vh-px` (runtime; optional for fallback math)
   - effect vars (e.g. `--light-azimuth`, `--section-progress`)
2. Add typed custom properties where supported (`@property`).
3. Define a scroll container with clear boundaries and containment strategy.

### Notes
- Keep all effects readable without motion (static baseline state).

---

## Phase 2 — dvh pacing model

### Deliverables
1. Define effect windows using `dvh` first, optionally capped by px:
   - Example concept: `introWindow = min(120dvh, 1400px)`.
2. For each animation, define:
   - `effectStart` (distance offset)
   - `effectWindow` (dvh/px length)
   - derived `effectProgress = clamp((scrollY - effectStart) / effectWindow, 0, 1)`
3. Use global progress only for page-level indicators.

### Why this model
- Avoids tying animation pacing to full document length.
- Produces consistent feel across very short and very tall pages.

---

## Phase 3 — Native CSS path (preferred)

### Deliverables
1. Use `animation-timeline: scroll(self block)` for container-linked progression.
2. Use view-based timelines/triggers for element enter/exit effects.
3. Map keyframes to local interaction windows (not full-page scroll span).
4. Add `@supports` guards for timeline features.

### Acceptance criteria
- On supported browsers, effects run without JS-driven per-frame style writes.

---

## Phase 4 — JS fallback + hybrid path

### Deliverables
1. Add passive `scroll` listener on container.
2. Compute metrics:
   - `scrollY = scrollTop`
   - `range = scrollHeight - clientHeight`
   - `progress = clamp(scrollY / range, 0, 1)` (only where needed)
3. Write CSS variables for distance and derived progress.
4. Add `IntersectionObserver` (with container root) for viewport trigger states.
5. For continuous element effects, update only intersecting elements in shared rAF.

### Acceptance criteria
- Behavior remains functionally equivalent when timelines are unsupported.

---

## Phase 5 — Performance strategy

### Deliverables
1. One scheduler (single rAF) for batched read/write cycles.
2. Visibility culling for offscreen elements.
3. Quality tiers (`high`, `medium`, `low`) driven by:
   - device hints (memory/concurrency)
   - frame budget trend
4. Low-tier degradations:
   - reduce update frequency
   - reduce secondary visuals (noise/specular detail)

### Acceptance criteria
- No layout thrash in scroll loop; stable frame pacing on long pages.

---

## Phase 6 — Accessibility and UX

### Deliverables
1. `prefers-reduced-motion: reduce` profile:
   - freeze or sharply reduce scroll-coupled animation.
2. Preserve native scrolling semantics (keyboard, screen readers, touch).
3. Ensure content meaning is not dependent on animation state.

### Acceptance criteria
- Experience is usable and understandable with reduced/no motion.

---

## Phase 7 — QA checklist

### Functional
- Top/bottom metrics are correct (`0` and max bounds).
- Each effect starts/ends at the intended `dvh` window.
- Viewport trigger enter/exit behavior is consistent.

### Compatibility
- Test at least:
  - one browser with scroll/view timeline support,
  - one browser using JS fallback.

### Performance
- Validate short and very long documents.
- Confirm no repeated forced synchronous layout patterns.

---

## Execution order (recommended)
1. Implement variable contract + baseline styles.
2. Implement dvh window definitions for core effects.
3. Add native timeline path with `@supports`.
4. Add JS fallback metrics + variable writer.
5. Add viewport triggers (`IntersectionObserver`).
6. Add performance tiers and reduced-motion profile.
7. Validate on short/long content and finalize tuning constants.

---

## Definition of done
- Scroll interactions are paced by **dvh distance windows** (not solely whole-page percentage).
- Native CSS path works where available; fallback path is functionally aligned.
- Performance remains stable under continuous scroll.
- Reduced-motion mode is implemented and verified.
