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
