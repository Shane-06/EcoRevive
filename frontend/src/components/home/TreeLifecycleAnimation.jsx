import { memo } from 'react';

/**
 * Botanical Tree Lifecycle Animation (Editorial Environmental Technology).
 *
 * Sequence:
 * Seed (0-12%) → Sprout (12-24%) → Growth (24-36%) → Mature Tree (36-54%) →
 * Autumn (54-68%) → Dormancy (68-84%) → Renewal (84-100%) → Loop
 *
 * Designed with fine botanical linework, restrained forest-green & amber palette,
 * CSS-driven 20s continuous loop with zero React re-renders, and full
 * prefers-reduced-motion accessibility support.
 */
function TreeLifecycleAnimation() {
  return (
    <div
      data-testid="tree-lifecycle-animation"
      className="tree-lifecycle-container relative w-full max-w-[380px] sm:max-w-[400px] lg:max-w-[420px] mx-auto select-none flex flex-col items-center"
      aria-label="Botanical animation depicting the natural tree lifecycle: seed germination, sprouting, mature growth, autumn foliage, dormancy, and continuous renewal."
    >
      {/* Synchronized Stage Indicator Pill */}
      <div className="mb-2 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-warm-100 border border-warm-300 text-[11px] font-mono text-charcoal-700 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-forest-700 tree-lifecycle-pulse" />
        <span className="relative h-4 w-40 overflow-hidden font-semibold text-charcoal-900 tracking-wide text-left inline-block">
          <span className="lifecycle-phase-text phase-seed">Seed Germination</span>
          <span className="lifecycle-phase-text phase-sprout">Young Sprout</span>
          <span className="lifecycle-phase-text phase-growth">Active Growth</span>
          <span className="lifecycle-phase-text phase-mature">Mature Canopy</span>
          <span className="lifecycle-phase-text phase-autumn">Autumn Shift</span>
          <span className="lifecycle-phase-text phase-dormant">Winter Dormancy</span>
          <span className="lifecycle-phase-text phase-renewal">Natural Renewal</span>
          <span className="lifecycle-phase-text phase-reduced-motion">Mature Tree & Renewal</span>
        </span>
      </div>

      {/* Botanical Illustration Plate */}
      <div className="relative w-full aspect-[400/410] rounded-2xl bg-warm-100/60 border border-warm-300/80 p-2 sm:p-3 overflow-hidden shadow-sm">
        {/* Subtle decorative framing motif */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#172c1c_1px,transparent_1px)] [background-size:16px_16px]" />

        <svg
          viewBox="0 0 400 410"
          className="w-full h-full relative z-10"
          aria-hidden="true"
        >
          <defs>
            {/* Subtle atmospheric backlight glow */}
            <radialGradient id="tl-sky-glow" cx="50%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#f7f6f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#efece4" stopOpacity="0" />
            </radialGradient>

            {/* Earth subsoil gradient */}
            <linearGradient id="tl-soil-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ded6c8" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#cfc4b2" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#b8ab97" stopOpacity="1" />
            </linearGradient>

            {/* Autumn leaf gradient */}
            <linearGradient id="tl-autumn-leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d98926" />
              <stop offset="50%" stopColor="#c0521e" />
              <stop offset="100%" stopColor="#8c2323" />
            </linearGradient>

            {/* Mature forest leaf gradient */}
            <linearGradient id="tl-green-leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3d6f46" />
              <stop offset="60%" stopColor="#1e4429" />
              <stop offset="100%" stopColor="#15321e" />
            </linearGradient>
          </defs>

          {/* Background Ambient Aura */}
          <circle cx="200" cy="180" r="160" fill="url(#tl-sky-glow)" />

          {/* ========================================================
              LAYER 1: SOIL & UNDERGROUND STRATA
              ======================================================== */}
          <g className="tl-ground-layer">
            {/* Subsoil mass beneath y=320 */}
            <path
              d="M 15 320 Q 110 317, 200 319 T 385 320 L 385 405 L 15 405 Z"
              fill="url(#tl-soil-gradient)"
            />

            {/* Fine soil texture strata lines */}
            <path
              d="M 25 340 C 90 338, 150 343, 220 340 S 330 338, 375 342"
              fill="none"
              stroke="#baa993"
              strokeWidth="0.8"
              strokeDasharray="4 6"
            />
            <path
              d="M 30 365 C 110 363, 180 368, 250 364 S 320 363, 370 367"
              fill="none"
              stroke="#baa993"
              strokeWidth="0.8"
              strokeDasharray="6 8"
            />
            <path
              d="M 20 390 C 80 388, 170 392, 260 389 S 340 388, 380 391"
              fill="none"
              stroke="#a89680"
              strokeWidth="0.8"
              strokeDasharray="3 5"
            />

            {/* Earth horizon ground line */}
            <path
              d="M 10 320 Q 110 317, 200 319 T 390 320"
              fill="none"
              stroke="#736148"
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            {/* Fine earth pebbles & stipple */}
            <circle cx="85" cy="336" r="1.5" fill="#8c785f" />
            <circle cx="130" cy="355" r="1.8" fill="#7a6750" />
            <circle cx="160" cy="380" r="2.0" fill="#8c785f" />
            <circle cx="270" cy="345" r="1.5" fill="#7a6750" />
            <circle cx="310" cy="370" r="1.8" fill="#8c785f" />
            <circle cx="345" cy="335" r="1.6" fill="#7a6750" />
          </g>

          {/* ========================================================
              LAYER 2: SEED & GERMINATING ROOT SYSTEM (Phase A)
              ======================================================== */}
          <g className="tl-seed-system">
            {/* Primary Taproot & Branching Rootlets */}
            <g className="tl-roots" stroke="#6b5134" fill="none" strokeLinecap="round">
              <path
                d="M 200 354 C 199 368, 202 380, 200 405"
                strokeWidth="2.4"
              />
              {/* Lateral root hairs */}
              <path d="M 200 365 C 188 372, 178 378, 168 384" strokeWidth="1.4" />
              <path d="M 200 373 C 212 379, 224 384, 235 390" strokeWidth="1.4" />
              <path d="M 199 385 C 190 392, 182 398, 176 404" strokeWidth="1.2" />
              <path d="M 201 388 C 210 395, 218 400, 224 406" strokeWidth="1.2" />
              <path d="M 172 381 C 164 386, 158 390, 154 396" strokeWidth="0.8" />
              <path d="M 230 388 C 238 393, 244 397, 248 402" strokeWidth="0.8" />
            </g>

            {/* Seed Husk (Acorn / Seed grain) */}
            <g className="tl-seed-husk">
              <ellipse
                cx="200"
                cy="348"
                rx="6.5"
                ry="8"
                fill="#59442e"
                stroke="#3d2c1c"
                strokeWidth="1.4"
              />
              {/* Germination crack line */}
              <path
                d="M 199 342 Q 202 348, 198 354"
                stroke="#a6845c"
                strokeWidth="1.0"
                fill="none"
              />
              {/* Emerging radical shoot tip */}
              <circle cx="200" cy="355" r="2.2" fill="#528246" />
            </g>
          </g>

          {/* ========================================================
              LAYER 3: YOUNG SPROUT & COTYLEDONS (Phase B)
              ======================================================== */}
          <g className="tl-sprout-shoot">
            {/* Tender young shoot rising through soil line */}
            <path
              d="M 200 342 C 200 320, 199 300, 200 275"
              fill="none"
              stroke="#3e7544"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {/* Left cotyledon leaf */}
            <path
              d="M 200 282 C 188 276, 180 274, 175 277 C 172 284, 185 289, 200 286 Z"
              fill="#528a57"
              stroke="#2e5932"
              strokeWidth="1.0"
            />
            {/* Right cotyledon leaf */}
            <path
              d="M 200 278 C 212 272, 220 270, 225 273 C 228 280, 215 285, 200 282 Z"
              fill="#528a57"
              stroke="#2e5932"
              strokeWidth="1.0"
            />
          </g>

          {/* ========================================================
              LAYER 4: MATURE TRUNK & ARCHITECTURAL BRANCHES (Phase C–E)
              ======================================================== */}
          <g className="tl-trunk-tree" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Root flare anchoring into the earth */}
            <path
              d="M 188 320 C 193 308, 196 280, 197 235 L 203 235 C 204 280, 207 308, 212 320 Z"
              fill="#2e2b24"
              stroke="#1f1d17"
              strokeWidth="1.2"
            />

            {/* Main Central Trunk */}
            <path
              d="M 197 240 C 197 200, 198 170, 200 135"
              stroke="#332f28"
              strokeWidth="7"
            />

            {/* Primary Left Bough */}
            <path
              d="M 198 215 C 180 195, 150 178, 128 155"
              stroke="#332f28"
              strokeWidth="4.5"
            />
            {/* Left secondary sub-boughs */}
            <path
              d="M 152 182 C 140 162, 122 150, 105 138"
              stroke="#3f3a31"
              strokeWidth="2.8"
            />
            <path
              d="M 166 193 C 158 172, 150 155, 148 135"
              stroke="#4a443a"
              strokeWidth="2.2"
            />
            <path
              d="M 128 155 C 118 142, 110 130, 96 122"
              stroke="#4a443a"
              strokeWidth="1.8"
            />

            {/* Primary Right Bough */}
            <path
              d="M 202 210 C 220 192, 250 174, 272 150"
              stroke="#332f28"
              strokeWidth="4.5"
            />
            {/* Right secondary sub-boughs */}
            <path
              d="M 248 177 C 260 157, 278 145, 295 132"
              stroke="#3f3a31"
              strokeWidth="2.8"
            />
            <path
              d="M 234 188 C 242 167, 250 150, 252 130"
              stroke="#4a443a"
              strokeWidth="2.2"
            />
            <path
              d="M 272 150 C 282 137, 290 125, 304 117"
              stroke="#4a443a"
              strokeWidth="1.8"
            />

            {/* Upper Crown Boughs & Apex Twigs */}
            <path
              d="M 199 155 C 190 125, 178 98, 168 74"
              stroke="#3f3a31"
              strokeWidth="3.2"
            />
            <path
              d="M 201 150 C 210 120, 222 92, 232 68"
              stroke="#3f3a31"
              strokeWidth="3.2"
            />
            <path
              d="M 200 135 C 200 105, 199 82, 200 58"
              stroke="#4a443a"
              strokeWidth="2.6"
            />
            <path
              d="M 182 108 C 172 90, 160 80, 146 70"
              stroke="#4a443a"
              strokeWidth="1.8"
            />
            <path
              d="M 218 102 C 228 85, 240 75, 254 65"
              stroke="#4a443a"
              strokeWidth="1.8"
            />
            <path
              d="M 200 80 C 194 65, 190 55, 186 45"
              stroke="#4a443a"
              strokeWidth="1.5"
            />
            <path
              d="M 200 80 C 206 65, 210 55, 214 45"
              stroke="#4a443a"
              strokeWidth="1.5"
            />

            {/* Fine botanical bark striations on trunk */}
            <path d="M 198 290 Q 199 265, 198 245" stroke="#4a443a" strokeWidth="0.8" />
            <path d="M 202 295 Q 201 270, 202 250" stroke="#4a443a" strokeWidth="0.8" />
          </g>

          {/* ========================================================
              LAYER 5: MATURE GREEN FOLIAGE CANOPY (Phase C–D)
              ======================================================== */}
          <g className="tl-canopy-mature">
            {/* Crown Apex Foliage Clusters */}
            <g className="tl-leaf-cluster" transform="translate(200, 52)">
              <ellipse cx="-12" cy="0" rx="14" ry="9" fill="url(#tl-green-leaf-grad)" transform="rotate(-25)" />
              <ellipse cx="12" cy="-2" rx="14" ry="9" fill="url(#tl-green-leaf-grad)" transform="rotate(25)" />
              <ellipse cx="0" cy="-10" rx="15" ry="10" fill="#1b4125" />
              <ellipse cx="-4" cy="-18" rx="11" ry="7" fill="#2d5e38" transform="rotate(-15)" />
              <ellipse cx="6" cy="-16" rx="11" ry="7" fill="#2d5e38" transform="rotate(15)" />
            </g>

            {/* Upper Left Foliage Cluster */}
            <g className="tl-leaf-cluster" transform="translate(155, 78)">
              <ellipse cx="-16" cy="0" rx="16" ry="10" fill="url(#tl-green-leaf-grad)" transform="rotate(-35)" />
              <ellipse cx="8" cy="-8" rx="15" ry="10" fill="#1b4125" transform="rotate(-10)" />
              <ellipse cx="-8" cy="-14" rx="14" ry="9" fill="#2d5e38" transform="rotate(-20)" />
              <ellipse cx="-20" cy="-10" rx="12" ry="8" fill="#386b43" transform="rotate(-40)" />
            </g>

            {/* Upper Right Foliage Cluster */}
            <g className="tl-leaf-cluster" transform="translate(245, 72)">
              <ellipse cx="16" cy="0" rx="16" ry="10" fill="url(#tl-green-leaf-grad)" transform="rotate(35)" />
              <ellipse cx="-8" cy="-8" rx="15" ry="10" fill="#1b4125" transform="rotate(10)" />
              <ellipse cx="8" cy="-14" rx="14" ry="9" fill="#2d5e38" transform="rotate(20)" />
              <ellipse cx="20" cy="-10" rx="12" ry="8" fill="#386b43" transform="rotate(40)" />
            </g>

            {/* Far Left Mid Bough Cluster */}
            <g className="tl-leaf-cluster" transform="translate(108, 136)">
              <ellipse cx="-14" cy="2" rx="18" ry="11" fill="url(#tl-green-leaf-grad)" transform="rotate(-40)" />
              <ellipse cx="10" cy="-6" rx="16" ry="10" fill="#1b4125" transform="rotate(-20)" />
              <ellipse cx="-6" cy="-12" rx="15" ry="9" fill="#2d5e38" transform="rotate(-30)" />
              <ellipse cx="-20" cy="-8" rx="14" ry="8" fill="#386b43" transform="rotate(-50)" />
            </g>

            {/* Far Right Mid Bough Cluster */}
            <g className="tl-leaf-cluster" transform="translate(292, 130)">
              <ellipse cx="14" cy="2" rx="18" ry="11" fill="url(#tl-green-leaf-grad)" transform="rotate(40)" />
              <ellipse cx="-10" cy="-6" rx="16" ry="10" fill="#1b4125" transform="rotate(20)" />
              <ellipse cx="6" cy="-12" rx="15" ry="9" fill="#2d5e38" transform="rotate(30)" />
              <ellipse cx="20" cy="-8" rx="14" ry="8" fill="#386b43" transform="rotate(50)" />
            </g>

            {/* Inner Left Mid Cluster */}
            <g className="tl-leaf-cluster" transform="translate(150, 142)">
              <ellipse cx="-12" cy="0" rx="18" ry="11" fill="url(#tl-green-leaf-grad)" transform="rotate(-25)" />
              <ellipse cx="10" cy="-4" rx="16" ry="10" fill="#17361f" transform="rotate(-15)" />
              <ellipse cx="0" cy="-12" rx="15" ry="9" fill="#2d5e38" transform="rotate(-20)" />
            </g>

            {/* Inner Right Mid Cluster */}
            <g className="tl-leaf-cluster" transform="translate(250, 138)">
              <ellipse cx="12" cy="0" rx="18" ry="11" fill="url(#tl-green-leaf-grad)" transform="rotate(25)" />
              <ellipse cx="-10" cy="-4" rx="16" ry="10" fill="#17361f" transform="rotate(15)" />
              <ellipse cx="0" cy="-12" rx="15" ry="9" fill="#2d5e38" transform="rotate(20)" />
            </g>

            {/* Center Heart Cluster */}
            <g className="tl-leaf-cluster" transform="translate(200, 118)">
              <ellipse cx="-14" cy="0" rx="16" ry="10" fill="#15321e" transform="rotate(-15)" />
              <ellipse cx="14" cy="-2" rx="16" ry="10" fill="#15321e" transform="rotate(15)" />
              <ellipse cx="0" cy="-10" rx="17" ry="11" fill="#224b2c" />
              <ellipse cx="0" cy="8" rx="15" ry="9" fill="#2d5e38" />
            </g>

            {/* Fine botanical leaf veins on selected front leaves */}
            <g stroke="#61996d" strokeWidth="0.8" fill="none" opacity="0.7">
              <path d="M 194 116 L 206 122" />
              <path d="M 145 138 L 157 146" />
              <path d="M 245 134 L 257 142" />
              <path d="M 195 50 L 205 56" />
            </g>
          </g>

          {/* ========================================================
              LAYER 6: AUTUMN FOLIAGE CANOPY (Phase D)
              ======================================================== */}
          <g className="tl-canopy-autumn">
            {/* Crown Apex Autumn Leaves */}
            <g transform="translate(200, 52)">
              <ellipse cx="-12" cy="0" rx="14" ry="9" fill="url(#tl-autumn-leaf-grad)" transform="rotate(-25)" />
              <ellipse cx="12" cy="-2" rx="14" ry="9" fill="#bf571f" transform="rotate(25)" />
              <ellipse cx="0" cy="-10" rx="15" ry="10" fill="#8c2323" />
              <ellipse cx="-4" cy="-18" rx="11" ry="7" fill="#d98926" transform="rotate(-15)" />
              <ellipse cx="6" cy="-16" rx="11" ry="7" fill="#d98926" transform="rotate(15)" />
            </g>

            {/* Upper Left Autumn Leaves */}
            <g transform="translate(155, 78)">
              <ellipse cx="-16" cy="0" rx="16" ry="10" fill="#c0521e" transform="rotate(-35)" />
              <ellipse cx="8" cy="-8" rx="15" ry="10" fill="#8c2323" transform="rotate(-10)" />
              <ellipse cx="-8" cy="-14" rx="14" ry="9" fill="#d98926" transform="rotate(-20)" />
              <ellipse cx="-20" cy="-10" rx="12" ry="8" fill="#e09a31" transform="rotate(-40)" />
            </g>

            {/* Upper Right Autumn Leaves */}
            <g transform="translate(245, 72)">
              <ellipse cx="16" cy="0" rx="16" ry="10" fill="#c0521e" transform="rotate(35)" />
              <ellipse cx="-8" cy="-8" rx="15" ry="10" fill="#8c2323" transform="rotate(10)" />
              <ellipse cx="8" cy="-14" rx="14" ry="9" fill="#d98926" transform="rotate(20)" />
              <ellipse cx="20" cy="-10" rx="12" ry="8" fill="#e09a31" transform="rotate(40)" />
            </g>

            {/* Far Left Mid Autumn Leaves */}
            <g transform="translate(108, 136)">
              <ellipse cx="-14" cy="2" rx="18" ry="11" fill="url(#tl-autumn-leaf-grad)" transform="rotate(-40)" />
              <ellipse cx="10" cy="-6" rx="16" ry="10" fill="#8c2323" transform="rotate(-20)" />
              <ellipse cx="-6" cy="-12" rx="15" ry="9" fill="#d98926" transform="rotate(-30)" />
              <ellipse cx="-20" cy="-8" rx="14" ry="8" fill="#c0521e" transform="rotate(-50)" />
            </g>

            {/* Far Right Mid Autumn Leaves */}
            <g transform="translate(292, 130)">
              <ellipse cx="14" cy="2" rx="18" ry="11" fill="url(#tl-autumn-leaf-grad)" transform="rotate(40)" />
              <ellipse cx="-10" cy="-6" rx="16" ry="10" fill="#8c2323" transform="rotate(20)" />
              <ellipse cx="6" cy="-12" rx="15" ry="9" fill="#d98926" transform="rotate(30)" />
              <ellipse cx="20" cy="-8" rx="14" ry="8" fill="#c0521e" transform="rotate(50)" />
            </g>

            {/* Inner Left Autumn Leaves */}
            <g transform="translate(150, 142)">
              <ellipse cx="-12" cy="0" rx="18" ry="11" fill="#bf571f" transform="rotate(-25)" />
              <ellipse cx="10" cy="-4" rx="16" ry="10" fill="#7a1f1f" transform="rotate(-15)" />
              <ellipse cx="0" cy="-12" rx="15" ry="9" fill="#d98926" transform="rotate(-20)" />
            </g>

            {/* Inner Right Autumn Leaves */}
            <g transform="translate(250, 138)">
              <ellipse cx="12" cy="0" rx="18" ry="11" fill="#bf571f" transform="rotate(25)" />
              <ellipse cx="-10" cy="-4" rx="16" ry="10" fill="#7a1f1f" transform="rotate(15)" />
              <ellipse cx="0" cy="-12" rx="15" ry="9" fill="#d98926" transform="rotate(20)" />
            </g>

            {/* Center Autumn Heart */}
            <g transform="translate(200, 118)">
              <ellipse cx="-14" cy="0" rx="16" ry="10" fill="#8c2323" transform="rotate(-15)" />
              <ellipse cx="14" cy="-2" rx="16" ry="10" fill="#8c2323" transform="rotate(15)" />
              <ellipse cx="0" cy="-10" rx="17" ry="11" fill="#bf571f" />
              <ellipse cx="0" cy="8" rx="15" ry="9" fill="#d98926" />
            </g>
          </g>

          {/* ========================================================
              LAYER 7: FALLING AUTUMN LEAVES (Phase D–E)
              ======================================================== */}
          <g className="tl-falling-foliage">
            {/* Leaf 1: Drifts from upper left */}
            <g className="tl-leaf-fall-1">
              <path
                d="M 0 -7 C 5 -4, 5 4, 0 7 C -5 4, -5 -4, 0 -7 Z"
                fill="#c75a22"
                stroke="#8a2a16"
                strokeWidth="0.6"
              />
            </g>

            {/* Leaf 2: Drifts from upper right */}
            <g className="tl-leaf-fall-2">
              <path
                d="M 0 -8 C 6 -4, 6 4, 0 8 C -6 4, -6 -4, 0 -8 Z"
                fill="#d98c28"
                stroke="#9e5917"
                strokeWidth="0.6"
              />
            </g>

            {/* Leaf 3: Drifts from crown center */}
            <g className="tl-leaf-fall-3">
              <path
                d="M 0 -7 C 5 -4, 5 4, 0 7 C -5 4, -5 -4, 0 -7 Z"
                fill="#8f2424"
                stroke="#5c1414"
                strokeWidth="0.6"
              />
            </g>

            {/* Leaf 4: Drifts from far right */}
            <g className="tl-leaf-fall-4">
              <path
                d="M 0 -6 C 5 -3, 5 3, 0 6 C -5 3, -5 -3, 0 -6 Z"
                fill="#c75a22"
                stroke="#8a2a16"
                strokeWidth="0.6"
              />
            </g>

            {/* Leaf 5: Drifts from far left */}
            <g className="tl-leaf-fall-5">
              <path
                d="M 0 -7 C 5 -4, 5 4, 0 7 C -5 4, -5 -4, 0 -7 Z"
                fill="#d98c28"
                stroke="#9e5917"
                strokeWidth="0.6"
              />
            </g>
          </g>

          {/* ========================================================
              LAYER 8: GROUND LEAF MULCH (Phase E–F)
              ======================================================== */}
          <g className="tl-soil-mulch">
            <ellipse cx="140" cy="321" rx="9" ry="2.5" fill="#8c3322" transform="rotate(-8 140 321)" />
            <ellipse cx="165" cy="321" rx="8" ry="2.2" fill="#ba6024" transform="rotate(5 165 321)" />
            <ellipse cx="185" cy="322" rx="10" ry="2.8" fill="#5c2618" transform="rotate(-3 185 322)" />
            <ellipse cx="218" cy="321" rx="9" ry="2.6" fill="#ba6024" transform="rotate(8 218 321)" />
            <ellipse cx="250" cy="322" rx="8" ry="2.4" fill="#8c3322" transform="rotate(-5 250 322)" />
            <ellipse cx="275" cy="321" rx="7" ry="2.2" fill="#c97726" transform="rotate(4 275 321)" />
          </g>

          {/* ========================================================
              LAYER 9: NEW RENEWAL SPROUT (Phase F)
              ======================================================== */}
          <g className="tl-renewal-sprout">
            {/* Tender young shoot rising beside dormant tree trunk */}
            <path
              d="M 238 320 C 238 305, 239 298, 240 286"
              fill="none"
              stroke="#2e6b36"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            {/* Small renewal taproot */}
            <path
              d="M 238 320 C 237 328, 239 336, 238 344"
              fill="none"
              stroke="#59442e"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Left new leaflet */}
            <path
              d="M 240 293 C 230 288, 224 286, 220 289 C 218 295, 228 299, 240 296 Z"
              fill="#428a4c"
              stroke="#235c2b"
              strokeWidth="0.8"
            />
            {/* Right new leaflet */}
            <path
              d="M 240 290 C 250 285, 256 283, 260 286 C 262 292, 252 296, 240 293 Z"
              fill="#428a4c"
              stroke="#235c2b"
              strokeWidth="0.8"
            />
          </g>
        </svg>
      </div>

      {/* Understated Botanical Lifecycle Caption */}
      <p className="mt-2 text-[10px] sm:text-[11px] font-mono text-charcoal-500 uppercase tracking-wider text-center">
        Botanical Lifecycle • Continuous Renewal Cycle
      </p>
    </div>
  );
}

export default memo(TreeLifecycleAnimation);
