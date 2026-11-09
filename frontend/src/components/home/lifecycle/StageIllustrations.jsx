import { memo } from 'react';

/**
 * Botanical Micro-Illustrations for the 9-Stage Plantation Lifecycle.
 *
 * Each stage features fine-line SVG artwork, responsive viewBox coordinates,
 * restrained botanical/earth color palette, and micro-animations activated
 * on hover, focus, or tap.
 */

/* =========================================================================
   STAGE 01: DISCOVER (Site Selection & Geospatial Targeting)
   ========================================================================= */
export const DiscoverIllustration = memo(function DiscoverIllustration({ active }) {
  return (
    <svg
      viewBox="0 0 240 110"
      className={`w-full h-full select-none stage-illustration-svg ${active ? 'stage-active' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="s1-radar-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#488b53" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#488b53" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#488b53" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="s1-pin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#24452a" />
          <stop offset="100%" stopColor="#172c1c" />
        </linearGradient>
      </defs>

      {/* Coordinate Grid Background */}
      <g stroke="#ded9cd" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.8">
        <line x1="20" y1="25" x2="220" y2="25" />
        <line x1="20" y1="55" x2="220" y2="55" />
        <line x1="20" y1="85" x2="220" y2="85" />
        <line x1="50" y1="10" x2="50" y2="100" />
        <line x1="120" y1="10" x2="120" y2="100" />
        <line x1="190" y1="10" x2="190" y2="100" />
      </g>

      {/* Grid Coordinates Label */}
      <text x="25" y="20" fill="#968e82" fontSize="7" fontFamily="monospace" opacity="0.85">
        12.9716° N, 77.5946° E
      </text>

      {/* Target Reticle Crosshair */}
      <g transform="translate(120, 72)">
        {/* Pulsing Concentric Radar Rings */}
        <circle cx="0" cy="0" r="18" fill="url(#s1-radar-glow)" className="s1-radar-area" />
        <circle cx="0" cy="0" r="10" fill="none" stroke="#488b53" strokeWidth="1" className="s1-radar-ring-1" opacity="0.6" />
        <circle cx="0" cy="0" r="22" fill="none" stroke="#6ea778" strokeWidth="0.75" strokeDasharray="2 2" className="s1-radar-ring-2" opacity="0.4" />
        
        {/* Target Ground Node */}
        <ellipse cx="0" cy="2" rx="7" ry="2.5" fill="#ded9cd" />
        <circle cx="0" cy="0" r="2" fill="#24452a" />
      </g>

      {/* Dropping Location Pin & Sprout */}
      <g className="s1-pin-group">
        {/* Location Pin */}
        <g transform="translate(120, 52)">
          <path
            d="M 0 -22 C -8 -22, -14 -16, -14 -8 C -14 3, 0 16, 0 18 C 0 16, 14 3, 14 -8 C 14 -16, 8 -22, 0 -22 Z"
            fill="url(#s1-pin-grad)"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          <circle cx="0" cy="-8" r="4.5" fill="#ffffff" />
          <circle cx="0" cy="-8" r="2" fill="#366e40" />
        </g>
        
        {/* Emerging Micro Sprout at pinpoint */}
        <g className="s1-micro-sprout" transform="translate(120, 70)">
          <path d="M 0 0 C 0 -6, -3 -9, -7 -10 C -4 -5, -1 -3, 0 0 Z" fill="#488b53" />
          <path d="M 0 0 C 0 -6, 3 -9, 7 -10 C 4 -5, 1 -3, 0 0 Z" fill="#6ea778" />
        </g>
      </g>
    </svg>
  );
});

/* =========================================================================
   STAGE 02: ASSESS (Suitability Engine & Soil Strata Scan)
   ========================================================================= */
export const AssessIllustration = memo(function AssessIllustration({ active }) {
  return (
    <svg
      viewBox="0 0 240 110"
      className={`w-full h-full select-none stage-illustration-svg ${active ? 'stage-active' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="s2-beam-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#488b53" stopOpacity="0" />
          <stop offset="50%" stopColor="#488b53" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#2b5733" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="s2-topsoil" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d4c5b0" />
          <stop offset="100%" stopColor="#cfc0aa" />
        </linearGradient>
        <linearGradient id="s2-subsoil" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#bfae98" />
          <stop offset="100%" stopColor="#b8a68e" />
        </linearGradient>
      </defs>

      {/* Atmosphere / Sunlight layer */}
      <g transform="translate(42, 22)">
        <circle cx="0" cy="0" r="7" fill="#d98926" opacity="0.85" />
        <g stroke="#d98926" strokeWidth="1" strokeLinecap="round" opacity="0.75" className="s2-sun-rays">
          <line x1="0" y1="-10" x2="0" y2="-13" />
          <line x1="7" y1="-7" x2="9" y2="-9" />
          <line x1="10" y1="0" x2="13" y2="0" />
          <line x1="7" y1="7" x2="9" y2="9" />
          <line x1="0" y1="10" x2="0" y2="13" />
          <line x1="-7" y1="7" x2="-9" y2="9" />
          <line x1="-10" y1="0" x2="-13" y2="0" />
          <line x1="-7" y1="-7" x2="-9" y2="-9" />
        </g>
      </g>

      <text x="60" y="24" fill="#68746c" fontSize="8" fontFamily="monospace">
        Weather: Optimal 24°C
      </text>

      {/* Soil Strata Layers (Ground cross-section) */}
      <g transform="translate(20, 42)">
        {/* Surface Grass/Humus Band */}
        <rect x="0" y="0" width="130" height="4" fill="#366e40" rx="1" />
        {/* Topsoil Layer */}
        <rect x="0" y="5" width="130" height="24" fill="url(#s2-topsoil)" rx="1" />
        <circle cx="25" cy="14" r="1.5" fill="#8c775d" opacity="0.6" />
        <circle cx="65" cy="18" r="1.2" fill="#8c775d" opacity="0.6" />
        <circle cx="105" cy="12" r="1.8" fill="#8c775d" opacity="0.6" />
        {/* Subsoil Strata */}
        <rect x="0" y="30" width="130" height="28" fill="url(#s2-subsoil)" rx="1" />
        <line x1="10" y1="42" x2="120" y2="42" stroke="#9e8b74" strokeWidth="0.8" strokeDasharray="6 4" />
        <line x1="20" y1="48" x2="110" y2="48" stroke="#9e8b74" strokeWidth="0.8" strokeDasharray="4 5" />
      </g>

      {/* Scanning Suitability Beam */}
      <g className="s2-scanner-group">
        <rect x="20" y="38" width="130" height="14" fill="url(#s2-beam-grad)" className="s2-scanner-beam" />
        <line x1="20" y1="52" x2="150" y2="52" stroke="#2b5733" strokeWidth="1.5" className="s2-scanner-line" />
      </g>

      {/* Deterministic Evaluation Badge / Leaf Score */}
      <g transform="translate(195, 60)" className="s2-evaluation-gauge">
        <rect x="-35" y="-30" width="68" height="60" rx="8" fill="#ffffff" stroke="#c4dcc8" strokeWidth="1.2" />
        <circle cx="-1" cy="-6" r="14" fill="#f2f7f3" stroke="#9bc5a2" strokeWidth="1" />
        {/* Rotating botanical leaf indicator */}
        <g className="s2-leaf-icon" transform="translate(-1, -6)">
          <path
            d="M 0 -8 C 5 -8, 8 -3, 8 3 C 8 8, 3 8, 0 8 C -3 8, -8 8, -8 3 C -8 -3, -5 -8, 0 -8 Z"
            fill="#366e40"
          />
          <path d="M 0 -7 L 0 7" stroke="#ffffff" strokeWidth="0.8" />
        </g>
        <text x="-1" y="18" textAnchor="middle" fill="#24452a" fontSize="8" fontWeight="bold" fontFamily="monospace">
          94% MATCH
        </text>
      </g>
    </svg>
  );
});

/* =========================================================================
   STAGE 03: PLANT (Field Planting & Sapling Germination)
   ========================================================================= */
export const PlantIllustration = memo(function PlantIllustration({ active }) {
  return (
    <svg
      viewBox="0 0 240 110"
      className={`w-full h-full select-none stage-illustration-svg ${active ? 'stage-active' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="s3-earth-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#cfc0aa" />
          <stop offset="100%" stopColor="#b3a28b" />
        </linearGradient>
      </defs>

      {/* Underground Earth Mass */}
      <path
        d="M 20 72 Q 120 70, 220 72 L 220 105 L 20 105 Z"
        fill="url(#s3-earth-grad)"
      />
      <line x1="20" y1="72" x2="220" y2="72" stroke="#8c775d" strokeWidth="1.5" />

      {/* Subsurface Roots */}
      <g className="s3-roots-system" stroke="#6d5843" strokeWidth="1.2" strokeLinecap="round" fill="none">
        <path d="M 120 74 Q 118 84, 115 94" />
        <path d="M 120 75 Q 124 85, 128 93" />
        <path d="M 117 84 Q 110 89, 106 91" strokeWidth="0.8" />
        <path d="M 123 83 Q 131 87, 136 90" strokeWidth="0.8" />
      </g>

      {/* Displaced Soil Crumb Particles */}
      <g className="s3-soil-crumbs" fill="#7a654c">
        <circle cx="112" cy="71" r="1.5" />
        <circle cx="128" cy="71" r="1.8" />
        <circle cx="106" cy="73" r="1.2" />
        <circle cx="134" cy="73" r="1.4" />
      </g>

      {/* Growing Sprout Stem & Foliage */}
      <g transform="translate(120, 72)" className="s3-sapling-group">
        {/* Main Stem */}
        <path
          d="M 0 0 C -1 -12, 1 -24, 0 -36"
          fill="none"
          stroke="#2e6b36"
          strokeWidth="2.4"
          strokeLinecap="round"
          className="s3-sprout-stem"
        />

        {/* Left Leaflet */}
        <g className="s3-leaf-left" transform="translate(0, -34)">
          <path
            d="M 0 0 C -8 -4, -14 -4, -18 1 C -15 7, -7 6, 0 0 Z"
            fill="#488b53"
            stroke="#235c2b"
            strokeWidth="0.75"
          />
        </g>

        {/* Right Leaflet */}
        <g className="s3-leaf-right" transform="translate(0, -36)">
          <path
            d="M 0 0 C 8 -4, 14 -4, 18 1 C 15 7, 7 6, 0 0 Z"
            fill="#5ea369"
            stroke="#235c2b"
            strokeWidth="0.75"
          />
        </g>

        {/* Tender Top Bud */}
        <circle cx="0" cy="-37" r="2" fill="#78bc83" className="s3-top-bud" />
      </g>

      {/* Planting Specification Pill */}
      <g transform="translate(180, 28)">
        <rect x="-35" y="-10" width="70" height="20" rx="10" fill="#ffffff" stroke="#c4dcc8" strokeWidth="1" />
        <text x="0" y="3" textAnchor="middle" fill="#24452a" fontSize="7.5" fontWeight="bold" fontFamily="monospace">
          DEPTH: 30 CM
        </text>
      </g>
    </svg>
  );
});

/* =========================================================================
   STAGE 04: PROVE (Viewfinder Reticle & Photographic Evidence)
   ========================================================================= */
export const ProveIllustration = memo(function ProveIllustration({ active }) {
  return (
    <svg
      viewBox="0 0 240 110"
      className={`w-full h-full select-none stage-illustration-svg ${active ? 'stage-active' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="s4-shutter-flash" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Photographic Plate / Field Card Container */}
      <g transform="translate(120, 55)">
        {/* Photo Card Border */}
        <rect
          x="-65"
          y="-38"
          width="130"
          height="76"
          rx="6"
          fill="#fbfbf9"
          stroke="#ded9cd"
          strokeWidth="1.2"
        />

        {/* Photo Card Landscape Artwork */}
        <g opacity="0.85">
          {/* Ground Silhouette */}
          <path d="M -60 26 Q -10 20, 60 25 L 60 33 L -60 33 Z" fill="#cfc0aa" />
          {/* Tree Silhouette */}
          <path d="M -2 22 L 2 22 L 1 5 L -1 5 Z" fill="#5a725f" />
          <circle cx="0" cy="2" r="9" fill="#366e40" />
          <circle cx="-5" cy="5" r="6" fill="#488b53" />
          <circle cx="5" cy="5" r="6" fill="#2e6b36" />
        </g>

        {/* Central Viewfinder Reticle / Focus Crosshair */}
        <g stroke="#24452a" strokeWidth="0.8" opacity="0.4">
          <line x1="-12" y1="0" x2="12" y2="0" />
          <line x1="0" y1="-12" x2="0" y2="12" />
          <circle cx="0" cy="0" r="14" fill="none" strokeDasharray="2 2" />
        </g>

        {/* Viewfinder Corner Focus Brackets */}
        <g stroke="#24452a" strokeWidth="2.4" fill="none" strokeLinecap="round">
          {/* Top-Left */}
          <path d="M -54 -20 L -54 -30 L -44 -30" className="s4-bracket-tl" />
          {/* Top-Right */}
          <path d="M 44 -30 L 54 -30 L 54 -20" className="s4-bracket-tr" />
          {/* Bottom-Left */}
          <path d="M -54 18 L -54 28 L -44 28" className="s4-bracket-bl" />
          {/* Bottom-Right */}
          <path d="M 44 28 L 54 28 L 54 18" className="s4-bracket-br" />
        </g>

        {/* Camera Shutter Flash Wave */}
        <circle cx="0" cy="0" r="45" fill="url(#s4-shutter-flash)" className="s4-camera-flash" />

        {/* Verification Checkmark Stamp Badge */}
        <g transform="translate(45, 20)" className="s4-evidence-badge">
          <circle cx="0" cy="0" r="11" fill="#24452a" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M -4 0 L -1 3 L 4 -3" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* EXIF Data Strip */}
        <text x="-58" y="-26" fill="#859088" fontSize="6.5" fontFamily="monospace">
          GPS: GEO-TAGGED • 100% EVIDENCE
        </text>
      </g>
    </svg>
  );
});

/* =========================================================================
   STAGE 05: VERIFY (Coordinator Audit & Authoritative Approval)
   ========================================================================= */
export const VerifyIllustration = memo(function VerifyIllustration({ active }) {
  return (
    <svg
      viewBox="0 0 240 110"
      className={`w-full h-full select-none stage-illustration-svg ${active ? 'stage-active' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <filter id="s5-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Auditor Clipboard Sheet */}
      <g transform="translate(120, 55)">
        <rect
          x="-75"
          y="-45"
          width="150"
          height="88"
          rx="6"
          fill="#ffffff"
          stroke="#ded9cd"
          strokeWidth="1.2"
          filter="url(#s5-shadow)"
        />

        {/* Clipboard Top Binder Clip */}
        <rect x="-24" y="-48" width="48" height="6" rx="2" fill="#70685c" />
        <rect x="-14" y="-52" width="28" height="5" rx="2" fill="none" stroke="#70685c" strokeWidth="1.2" />

        {/* Document Header Line */}
        <text x="-62" y="-30" fill="#24452a" fontSize="7.5" fontWeight="bold" fontFamily="monospace" letterSpacing="0.5">
          COORDINATOR AUDIT CHECKLIST
        </text>
        <line x1="-62" y1="-25" x2="62" y2="-25" stroke="#eceae3" strokeWidth="1" />

        {/* Checklist Item 1: GPS Boundary */}
        <g transform="translate(-62, -14)">
          <rect x="0" y="0" width="10" height="10" rx="2" fill="#f2f7f3" stroke="#9bc5a2" strokeWidth="1" />
          <path d="M 2 5 L 4 7 L 8 3" fill="none" stroke="#2b5733" strokeWidth="1.4" strokeLinecap="round" className="s5-check-1" />
          <text x="16" y="8" fill="#515c55" fontSize="7" fontFamily="sans-serif">GPS Coordinate Boundaries</text>
        </g>

        {/* Checklist Item 2: Species Verification */}
        <g transform="translate(-62, 0)">
          <rect x="0" y="0" width="10" height="10" rx="2" fill="#f2f7f3" stroke="#9bc5a2" strokeWidth="1" />
          <path d="M 2 5 L 4 7 L 8 3" fill="none" stroke="#2b5733" strokeWidth="1.4" strokeLinecap="round" className="s5-check-2" />
          <text x="16" y="8" fill="#515c55" fontSize="7" fontFamily="sans-serif">Species Identity & Health</text>
        </g>

        {/* Checklist Item 3: Photographic Integrity */}
        <g transform="translate(-62, 14)">
          <rect x="0" y="0" width="10" height="10" rx="2" fill="#f2f7f3" stroke="#9bc5a2" strokeWidth="1" />
          <path d="M 2 5 L 4 7 L 8 3" fill="none" stroke="#2b5733" strokeWidth="1.4" strokeLinecap="round" className="s5-check-3" />
          <text x="16" y="8" fill="#515c55" fontSize="7" fontFamily="sans-serif">Photo Evidence Authenticity</text>
        </g>

        {/* Authoritative "APPROVED" Audit Stamp */}
        <g className="s5-audit-stamp" transform="translate(32, 12)">
          <g transform="rotate(-12)">
            <rect
              x="-32"
              y="-12"
              width="64"
              height="24"
              rx="4"
              fill="#f2f7f3"
              stroke="#24452a"
              strokeWidth="2"
              strokeDasharray="28 2 28 2"
            />
            <text
              x="0"
              y="4"
              textAnchor="middle"
              fill="#172c1c"
              fontSize="10"
              fontWeight="900"
              fontFamily="monospace"
              letterSpacing="1.5"
            >
              VERIFIED
            </text>
          </g>
        </g>
      </g>
    </svg>
  );
});

/* =========================================================================
   STAGE 06: IDENTIFY (Permanent QR Code & Authoritative Tree ID)
   ========================================================================= */
export const IdentifyIllustration = memo(function IdentifyIllustration({ active }) {
  return (
    <svg
      viewBox="0 0 240 110"
      className={`w-full h-full select-none stage-illustration-svg ${active ? 'stage-active' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="s6-laser-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#488b53" stopOpacity="0" />
          <stop offset="50%" stopColor="#488b53" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#2b5733" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* QR Code Container Plate */}
      <g transform="translate(35, 20)">
        {/* Background Frame */}
        <rect x="0" y="0" width="70" height="70" rx="6" fill="#ffffff" stroke="#ded9cd" strokeWidth="1.2" />

        {/* QR Corner Position Detection Squares (Top-Left, Top-Right, Bottom-Left) */}
        {/* TL */}
        <rect x="6" y="6" width="16" height="16" fill="none" stroke="#172c1c" strokeWidth="2.5" />
        <rect x="10" y="10" width="8" height="8" fill="#172c1c" />

        {/* TR */}
        <rect x="48" y="6" width="16" height="16" fill="none" stroke="#172c1c" strokeWidth="2.5" />
        <rect x="52" y="10" width="8" height="8" fill="#172c1c" />

        {/* BL */}
        <rect x="6" y="48" width="16" height="16" fill="none" stroke="#172c1c" strokeWidth="2.5" />
        <rect x="10" y="52" width="8" height="8" fill="#172c1c" />

        {/* QR Data Matrix Dots */}
        <g fill="#172c1c" className="s6-qr-matrix">
          <rect x="28" y="8" width="4" height="4" />
          <rect x="36" y="12" width="4" height="4" />
          <rect x="28" y="20" width="4" height="4" />
          <rect x="36" y="24" width="4" height="4" />
          <rect x="12" y="30" width="4" height="4" />
          <rect x="20" y="34" width="4" height="4" />
          <rect x="30" y="32" width="5" height="5" />
          <rect x="42" y="32" width="4" height="4" />
          <rect x="50" y="30" width="4" height="4" />
          <rect x="58" y="36" width="4" height="4" />
          <rect x="30" y="46" width="4" height="4" />
          <rect x="40" y="48" width="4" height="4" />
          <rect x="52" y="50" width="4" height="4" />
          <rect x="34" y="58" width="4" height="4" />
          <rect x="46" y="56" width="4" height="4" />
        </g>

        {/* Sweeping Laser Scan Line */}
        <g className="s6-laser-scanner">
          <rect x="2" y="0" width="66" height="8" fill="url(#s6-laser-grad)" opacity="0.4" />
          <line x1="2" y1="8" x2="68" y2="8" stroke="#366e40" strokeWidth="1.8" />
        </g>
      </g>

      {/* Authoritative Permanent Identity Badge (Right Column) */}
      <g transform="translate(125, 30)">
        {/* Chip Graphic / Circuit Traces */}
        <g stroke="#9bc5a2" strokeWidth="1" fill="none" opacity="0.8">
          <path d="M 0 15 L 14 15" />
          <path d="M 0 35 L 14 35" />
        </g>

        {/* Permanent Digital Card */}
        <g className="s6-id-chip-card">
          <rect x="14" y="0" width="90" height="50" rx="6" fill="#f2f7f3" stroke="#24452a" strokeWidth="1.2" />
          
          <text x="24" y="16" fill="#68746c" fontSize="6.5" fontFamily="monospace">
            AUTHORITATIVE ID
          </text>
          
          {/* Canonical Sequential Tree ID */}
          <text x="24" y="32" fill="#172c1c" fontSize="10.5" fontWeight="bold" fontFamily="monospace">
            ER-PLT-00042
          </text>
          
          <g transform="translate(24, 38)">
            <circle cx="3" cy="3" r="2.5" fill="#366e40" />
            <text x="9" y="5.5" fill="#2b5733" fontSize="6.5" fontWeight="bold" fontFamily="monospace">
              IMMUTABLE RECORD
            </text>
          </g>
        </g>
      </g>
    </svg>
  );
});

/* =========================================================================
   STAGE 07: MONITOR (Clinical Vitals & Caretaker Health Observation)
   ========================================================================= */
export const MonitorIllustration = memo(function MonitorIllustration({ active }) {
  return (
    <svg
      viewBox="0 0 240 110"
      className={`w-full h-full select-none stage-illustration-svg ${active ? 'stage-active' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="s7-dot-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#488b53" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#488b53" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#488b53" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Swaying Foliage Branch at Top */}
      <g className="s7-branch-group" transform="translate(120, 24)">
        <path
          d="M -70 0 Q 0 -6, 70 0"
          fill="none"
          stroke="#485a4c"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Branch Leaves */}
        <path d="M -45 -2 C -52 -8, -55 -2, -45 -2 Z" fill="#366e40" />
        <path d="M -20 -3 C -25 -10, -15 -10, -20 -3 Z" fill="#488b53" />
        <path d="M 10 -4 C 15 -11, 25 -10, 10 -4 Z" fill="#366e40" />
        <path d="M 40 -2 C 48 -9, 52 -2, 40 -2 Z" fill="#488b53" />
      </g>

      {/* Clinical Health Monitor Grid Background */}
      <g stroke="#eceae3" strokeWidth="0.75" opacity="0.8">
        <line x1="20" y1="50" x2="220" y2="50" />
        <line x1="20" y1="70" x2="220" y2="70" />
        <line x1="20" y1="90" x2="220" y2="90" />
        <line x1="60" y1="42" x2="60" y2="98" />
        <line x1="120" y1="42" x2="120" y2="98" />
        <line x1="180" y1="42" x2="180" y2="98" />
      </g>

      {/* Clinical EKG Heartbeat / Vitals Waveform Path */}
      {/* Waveform: Flat -> P-wave -> Sharp QRS Complex -> T-wave -> Flat */}
      <path
        d="M 20 70 L 65 70 Q 72 65, 78 70 L 86 70 L 92 78 L 98 46 L 104 84 L 110 66 L 116 70 Q 124 64, 132 70 L 220 70"
        fill="none"
        stroke="#24452a"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="s7-ekg-waveform"
      />

      {/* Pulsing Beacon Dot at QRS Apex */}
      <g transform="translate(98, 46)" className="s7-health-beacon">
        <circle cx="0" cy="0" r="10" fill="url(#s7-dot-glow)" />
        <circle cx="0" cy="0" r="3.5" fill="#2b5733" stroke="#ffffff" strokeWidth="1" />
      </g>

      {/* Frozen Clinical Health Status Pill */}
      <g transform="translate(175, 42)">
        <rect x="-35" y="-9" width="70" height="18" rx="9" fill="#f2f7f3" stroke="#9bc5a2" strokeWidth="1" />
        <circle cx="-25" cy="0" r="2.5" fill="#366e40" className="s7-status-pulse" />
        <text x="-16" y="3" fill="#24452a" fontSize="7" fontWeight="bold" fontFamily="monospace">
          HEALTH: GOOD
        </text>
      </g>
    </svg>
  );
});

/* =========================================================================
   STAGE 08: REWARD (Authoritative Point Ledger & Gleaming Medallion)
   ========================================================================= */
export const RewardIllustration = memo(function RewardIllustration({ active }) {
  return (
    <svg
      viewBox="0 0 240 110"
      className={`w-full h-full select-none stage-illustration-svg ${active ? 'stage-active' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="s8-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f3ca65" />
          <stop offset="45%" stopColor="#d98926" />
          <stop offset="100%" stopColor="#b36715" />
        </linearGradient>
        <linearGradient id="s8-sheen-sweep" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Celebratory Ambient Sparkles */}
      <g className="s8-sparkles-group" fill="#d98926">
        {/* Star 1 */}
        <path d="M 60 25 Q 63 30, 68 30 Q 63 30, 60 35 Q 57 30, 52 30 Q 57 30, 60 25 Z" className="s8-sparkle-1" />
        {/* Star 2 */}
        <path d="M 180 28 Q 182 32, 186 32 Q 182 32, 180 36 Q 178 32, 174 32 Q 178 32, 180 28 Z" className="s8-sparkle-2" />
        {/* Star 3 */}
        <path d="M 165 72 Q 167 75, 170 75 Q 167 75, 165 78 Q 163 75, 160 75 Q 163 75, 165 72 Z" className="s8-sparkle-3" />
      </g>

      {/* Central Medallion Unit */}
      <g transform="translate(120, 58)" className="s8-medallion-group">
        {/* Hanging Ribbons Beneath Coin */}
        <path d="M -8 18 L -14 42 L -2 36 L 0 42 L 0 18 Z" fill="#24452a" opacity="0.9" />
        <path d="M 8 18 L 14 42 L 2 36 L 0 42 L 0 18 Z" fill="#172c1c" opacity="0.9" />

        {/* Outer Laurel / Medallion Rim */}
        <circle cx="0" cy="0" r="26" fill="url(#s8-gold-grad)" stroke="#9e5917" strokeWidth="1.2" />
        <circle cx="0" cy="0" r="22" fill="#24452a" stroke="#f3ca65" strokeWidth="1" />

        {/* Embossed Tree Icon Inside Medallion */}
        <g transform="translate(0, 2)">
          <path d="M -1 8 L 1 8 L 0 0 Z" stroke="#f3ca65" strokeWidth="1.2" />
          <circle cx="0" cy="-3" r="7" fill="#f3ca65" />
          <circle cx="-4" cy="-1" r="5" fill="#f3ca65" />
          <circle cx="4" cy="-1" r="5" fill="#f3ca65" />
        </g>

        {/* Diagonal Light Sheen Sweep Overlay */}
        <g clipPath="url(#s8-coin-clip)">
          <rect x="-35" y="-35" width="20" height="70" fill="url(#s8-sheen-sweep)" transform="rotate(30)" className="s8-sheen-beam" />
        </g>

        {/* Clip Path for the Medallion Circle */}
        <clipPath id="s8-coin-clip">
          <circle cx="0" cy="0" r="22" />
        </clipPath>
      </g>

      {/* Floating Animated Reward Points Badge */}
      <g transform="translate(120, 20)" className="s8-points-pill">
        <rect
          x="-38"
          y="-11"
          width="76"
          height="22"
          rx="11"
          fill="#ffffff"
          stroke="#d98926"
          strokeWidth="1.5"
          filter="drop-shadow(0 2px 4px rgba(217,137,38,0.2))"
        />
        <text
          x="0"
          y="4"
          textAnchor="middle"
          fill="#172c1c"
          fontSize="9.5"
          fontWeight="bold"
          fontFamily="monospace"
        >
          +50 PTS
        </text>
      </g>
    </svg>
  );
});

/* =========================================================================
   STAGE 09: TRACK (Longitudinal Trajectory & Mature Spreading Canopy)
   ========================================================================= */
export const TrackIllustration = memo(function TrackIllustration({ active }) {
  return (
    <svg
      viewBox="0 0 240 110"
      className={`w-full h-full select-none stage-illustration-svg ${active ? 'stage-active' : ''}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="s9-canopy-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#488b53" />
          <stop offset="50%" stopColor="#2e6b36" />
          <stop offset="100%" stopColor="#172c1c" />
        </linearGradient>
      </defs>

      {/* Longitudinal Graph Axes & Growth Timeline */}
      <g stroke="#ded9cd" strokeWidth="0.8">
        {/* Baseline X-axis */}
        <line x1="25" y1="88" x2="215" y2="88" />
        {/* Y-axis Biomass Scale */}
        <line x1="25" y1="20" x2="25" y2="88" />
      </g>

      {/* Timeline Labels */}
      <text x="45" y="98" fill="#968e82" fontSize="6.5" fontFamily="monospace">Y0 (Plant)</text>
      <text x="110" y="98" fill="#968e82" fontSize="6.5" fontFamily="monospace">Y3</text>
      <text x="180" y="98" fill="#24452a" fontSize="6.5" fontWeight="bold" fontFamily="monospace">Y10 (Canopy)</text>

      {/* Young Sapling Silhouette at Year 0 */}
      <g transform="translate(45, 88)" opacity="0.85">
        <line x1="0" y1="0" x2="0" y2="-18" stroke="#485a4c" strokeWidth="1.5" />
        <ellipse cx="-3" cy="-14" rx="4" ry="2" fill="#5a725f" />
        <ellipse cx="3" cy="-16" rx="4" ry="2" fill="#5a725f" />
      </g>

      {/* Upward Parabolic Growth Curve Line */}
      <path
        d="M 45 74 C 95 72, 135 48, 175 32"
        fill="none"
        stroke="#24452a"
        strokeWidth="2"
        strokeLinecap="round"
        className="s9-growth-curve"
      />

      {/* Intermediate Timeline Node */}
      <circle cx="115" cy="58" r="2.5" fill="#ffffff" stroke="#366e40" strokeWidth="1.2" />

      {/* Mature Spreading Canopy Tree at Year 10 */}
      <g transform="translate(180, 88)" className="s9-canopy-tree">
        {/* Ground Support */}
        <ellipse cx="0" cy="0" rx="16" ry="3" fill="#cfc0aa" />
        
        {/* Sturdy Trunk & Branch Framework */}
        <path
          d="M -3 0 L -2 -24 L -8 -34 M 2 0 L 1 -24 L 8 -34 M 0 -24 L 0 -36"
          stroke="#59442e"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Spreading Foliage Canopy Masses */}
        <g className="s9-canopy-foliage">
          {/* Main Crown */}
          <circle cx="0" cy="-42" r="15" fill="url(#s9-canopy-grad)" />
          {/* Left Lateral Canopy */}
          <circle cx="-12" cy="-38" r="11" fill="#366e40" opacity="0.95" />
          {/* Right Lateral Canopy */}
          <circle cx="12" cy="-38" r="11" fill="#488b53" opacity="0.95" />
          {/* Upper Crest */}
          <circle cx="0" cy="-50" r="9" fill="#5ea369" opacity="0.9" />
        </g>

        {/* Established 100% Impact Marker */}
        <g transform="translate(0, -62)" className="s9-peak-marker">
          <circle cx="0" cy="0" r="3" fill="#d98926" stroke="#ffffff" strokeWidth="1" />
        </g>
      </g>
    </svg>
  );
});

/**
 * Stage Illustration Resolver
 */
export function StageIllustration({ num, active }) {
  switch (num) {
    case '01':
      return <DiscoverIllustration active={active} />;
    case '02':
      return <AssessIllustration active={active} />;
    case '03':
      return <PlantIllustration active={active} />;
    case '04':
      return <ProveIllustration active={active} />;
    case '05':
      return <VerifyIllustration active={active} />;
    case '06':
      return <IdentifyIllustration active={active} />;
    case '07':
      return <MonitorIllustration active={active} />;
    case '08':
      return <RewardIllustration active={active} />;
    case '09':
      return <TrackIllustration active={active} />;
    default:
      return null;
  }
}

export default StageIllustration;
