# Metal Border via CSS Paint API + Scroll Animation

## Recommended architecture (best-practice stack)

1. **Use a wrapper element for the "true border" illusion**
   - Keep your content element background transparent.
   - Render the metal border in a pseudo-element (`::before`) or sibling overlay so you can:
     - draw outward shadow (outside the element),
     - draw inward shadow (inside the element),
     - preserve transparent content background and still see inner shadow from the border.

2. **Render the border material in a Paint Worklet**
   - Register a custom paint worklet, e.g. `paint(metal-border)`.
   - Feed it CSS custom properties (`--metal-*`) for:
     - bevel width/depth,
     - highlight angle,
     - conic gradient stops,
     - roughness/noise strength,
     - texture tiling.
   - Worklet draws only the border ring (outer rect minus inner rect), not the content area.

3. **Separate concerns into 3 visual layers**
   - **Layer A (Material):** paint worklet produces metal base + conic response + texture.
   - **Layer B (Bevel lighting):** optional second paint worklet or CSS gradients for edge highlights/lowlights.
   - **Layer C (Shadows):** `filter: drop-shadow(...)` for outer cast + inset shadow layer for interior occlusion.
   - This decomposition makes tuning physically plausible lighting easier than a single giant shader-like paint pass.

4. **Animate light direction from scroll timeline**
   - Use **Scroll-driven Animations** (`@scroll-timeline` / `animation-timeline`) where available.
   - Animate CSS variables like `--light-azimuth`, `--light-elevation`, `--spec-intensity`.
   - Paint worklet reads those values every frame to rotate specular lobes and conic highlight bands.

5. **Use Typed OM + `@property` for smooth interpolation**
   - Register animatable properties:
     - `@property --light-azimuth { syntax: "<angle>"; ... }`
     - `@property --bevel-depth { syntax: "<length>"; ... }`
   - Avoid untyped string interpolation artifacts and reduce jitter.

---

## Why this approach is strongest

- **Real-border behavior:** border ring is physically separate from content fill.
- **Transparent center support:** inner area stays clear while still receiving border-driven inner shadow.
- **Dynamic realism:** conic + bevel + texture + scroll-driven light gives convincing metal response.
- **Scalability:** custom properties expose artistic controls without rewriting worklet logic.

---

## Practical implementation pattern

### 1) DOM structure
- `div.frame` (positioning/shadow context)
  - `div.frame::before` → painted border ring
  - `div.content` → transparent or semi-transparent center

### 2) Border ring drawing model (worklet)
- Compute `outerPath = rect(0,0,w,h)`.
- Compute `innerPath = rect(border,border,w-2*border,h-2*border)` with optional corner radius offsets.
- Fill `outerPath - innerPath` with:
  - base metal gradient (linear/conic hybrid),
  - directional specular highlight based on light vector,
  - micro-noise or brushed anisotropic streaks.

### 3) Bevel model
- Evaluate signed distance from border centerline.
- Use a remapped curve (e.g. smoothstep) to split "facing light" vs "away from light".
- Brighten one edge and darken opposite edge to fake geometry.

### 4) Shadows (inner + outer)
- **Outer:** `filter: drop-shadow()` on border layer.
- **Inner:** additional pseudo-element clipped to content box using inset mask, with multiply/overlay blend.
- Keep inner shadow subtle and tied to bevel depth.

### 5) Scroll coupling
- Map scroll progress `[0..1]` to light azimuth `[0deg..360deg]`.
- Optionally modulate elevation and roughness slightly for richer movement.
- Respect `prefers-reduced-motion` by freezing azimuth.

---

## Texturing options for metal

1. **Procedural noise in worklet**
   - Fast hash/value noise for cast metal.
   - Directional streak noise for brushed aluminum.

2. **Image texture + blend in worklet**
   - Sample repeated texture map (if pipeline allows); otherwise compose via layered background images in CSS.

3. **Hybrid**
   - Low-frequency procedural + high-frequency texture map = best realism/perf balance.

---

## Browser/platform realities

- CSS Paint API has uneven support and may require flags in some browsers.
- Scroll-driven animations are modern and still rolling out.
- **Best production path:** progressive enhancement:
  1. fallback static gradient border,
  2. enable scroll-linked light where supported,
  3. enable paint worklet material when available.

---

## Performance guardrails

- Keep paint area small (just border thickness).
- Cache expensive noise calculations by quantizing parameters.
- Avoid too many independently animated bordered elements at once.
- Prefer one composited animation variable over many per-frame property mutations.

---

## "Best approaches" shortlist

1. **Progressive enhancement architecture** (fallback → scroll timeline → paint worklet).
2. **Layered rendering** (material, bevel, shadows separated).
3. **Scroll-driven light vector animation** via typed custom properties.
4. **Ring-only paint geometry** for real-border behavior + transparent center.
5. **Hybrid texturing** (procedural + optional map) with strict perf budgets.

If you want, I can next provide a **reference implementation skeleton** (CSS + JS worklet + minimal HTML) with:
- `paint(metal-border)` ring rendering,
- scroll-linked `--light-azimuth`,
- inner+outer shadow composition,
- reduced-motion fallback.

---

## Implementation plan: scroll-container + viewport triggers with JS fallback/perf layer

### 0) Goals and constraints
- Build a **scroll container driven experience** where visual response is based primarily on **distance units** (pixels/viewport lengths), not only whole-page percentages.
- Derive normalized progress (`0..1`) only as a secondary abstraction for effects that actually need it.
- Use **CSS-first features** when available (scroll timelines, view timelines, typed custom properties).
- Add **JavaScript fallback** when features are missing and for performance tuning on lower-end devices.

### 1) Capability detection and mode selection
- At startup, detect support for:
  - `animation-timeline: scroll()` / `view()`.
  - `@property` typed custom properties.
  - CSS Paint API (`CSS.paintWorklet`).
- Set a root mode flag (`data-scroll-mode`) with one of:
  - `native-css` (full support),
  - `hybrid-js` (partial support),
  - `js-fallback` (minimal support).
- Keep all mode switching centralized in one bootstrap module.

### 2) Core CSS architecture (works in every mode)
- Define stable visual contract with both **distance** and **normalized** variables:
  - `--scroll-y-px` (absolute scrollTop in px),
  - `--scroll-range-px` (max scroll distance),
  - `--vh-px` (runtime viewport height in px, optional),
  - `--scroll-progress` (`0..1`, derived),
  - `--section-progress` (`0..1` per element, derived),
  - `--light-azimuth`, `--spec-intensity`, etc.
- Drive major effect distances from px/vh (`calc(var(--scroll-y-px) * k)`, `clamp()` windows) so behavior is stable on long pages.
- Register typed variables via `@property` where supported.
- Ensure effects degrade gracefully if variables are static.

### 3) Native CSS path (`native-css`)
- Use `animation-timeline: scroll(self block)` for container-level progress.
- Use `animation-timeline: view(block)` (or equivalent) on child elements for viewport triggers.
- Prefer **finite distance windows** for key interactions (e.g. animate over first `120vh` or next `800px`) instead of mapping the entire document scroll to one effect.
- Map timeline progress into visual variables via keyframes, but cap/saturate with `clamp()` so very tall pages do not make effects feel too fast or too compressed.
- Add container-query based tuning for density/size breakpoints (`@container`) but do not rely on it for metric extraction.

### 4) JS fallback path (`hybrid-js` and `js-fallback`)
- Container metrics:
  - Listen to container `scroll` (passive listener).
  - Read and write `--scroll-y-px` and `--scroll-range-px`.
  - Compute normalized `progress = scrollTop / (scrollHeight - clientHeight)` only for effects that need a `0..1` value.
- Distance-first mapping strategy:
  - Define effect windows in px/vh (example: `introWindow = min(120 * vh, 1400px)`).
  - Compute per-effect progress as `effectP = clamp(scrollY / introWindow, 0, 1)`.
  - This avoids whole-page-percentage coupling that can feel inconsistent across very short vs very long pages.
- Element viewport triggers:
  - Use `IntersectionObserver` with scoped `root` equal to the scroll container.
  - For stepped triggers: threshold array (e.g. `[0, .25, .5, .75, 1]`).
  - For continuous effects: compute rect-based normalized value in an rAF loop only for visible elements.
- Missing `@property` support:
  - Continue writing numeric CSS variables; animation quality may reduce, but behavior remains correct.

### 5) Performance enhancement layer
- Use a single `requestAnimationFrame` scheduler that batches all reads then writes.
- Avoid per-element scroll handlers; keep one container listener.
- Apply visibility culling:
  - Only update elements currently intersecting.
  - Suspend heavy effects outside viewport range.
- Add quality tiers (`high`, `medium`, `low`) based on:
  - device memory / hardware concurrency hints,
  - observed frame budget (simple moving average).
- In `low` tier:
  - reduce noise/detail,
  - lower update frequency (e.g. every 2nd frame),
  - disable nonessential secondary effects.

### 6) Accessibility and UX safeguards
- Respect `prefers-reduced-motion: reduce`:
  - freeze scroll-linked light movement,
  - keep static but readable visual state.
- Maintain keyboard/assistive scrolling behavior (no scroll hijacking).
- Ensure content remains functional with JS disabled (static styling baseline).

### 7) Testing and verification plan
- Functional checks:
  - distance-driven effects complete over intended windows (e.g. first `120vh`) regardless of total page length.
  - normalized progress reaches exactly `0` at top and `1` at end when used.
  - viewport triggers fire consistently entering/leaving.
- Compatibility checks:
  - one browser with full timeline support,
  - one browser on JS fallback path.
- Performance checks:
  - verify frame time under continuous scroll in sample long page.
  - test both short and very long pages to ensure pacing is consistent.
  - confirm no layout thrash (read/write separation).

### 8) Rollout plan
- Phase 1: ship baseline static visuals + JS progress fallback.
- Phase 2: enable native CSS scroll/view timelines behind feature detection.
- Phase 3: enable paint worklet enhancements and quality tiers.
- Phase 4: tune thresholds/curves from real telemetry.

### 9) Suggested implementation order
1. Build bootstrap capability detector + mode flags.
2. Implement shared CSS variable contract.
3. Implement JS scroll progress fallback.
4. Implement `IntersectionObserver` viewport triggers.
5. Add native timeline CSS path.
6. Add performance tiering and reduced-motion refinements.
7. Validate and document support matrix.

### 10) Practical recommendation on units (answer to pacing concern)
- Yes: for most scroll UX, **base timing on px/vh distance windows** first.
- Use global percentage only for document-wide indicators (progress bar, chapter index).
- For interaction animations, prefer **local progress from fixed windows** so users get predictable pacing independent of page length.
