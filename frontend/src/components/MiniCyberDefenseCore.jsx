import React, { useId } from 'react';

/**
 * MiniCyberDefenseCore — Concept A: Precision SOC Console
 *
 * Dedicated Motion Design: "MINI CYBER DEFENSE CORE"
 *
 * A compact, visually sophisticated cybersecurity visualization engineered for the
 * ThreatLens application sidebar. Fills vertical space with continuous SOC telemetry
 * and defense core motion.
 *
 * Visual Components:
 * - A. Central Security Core: Geometric multi-layer shield with indigo glow, subtle breathing,
 *      and active laser scan line.
 * - B. Network Topology: Connected satellite nodes with asynchronous streaming data packet trails.
 * - C. Defense Radar: Faint concentric perimeter circles with rotating radar beam and node illumination.
 * - D. Threat Detection Pulse: Periodic subtle red detection ring with green protective deflection return.
 * - E. Precision SOC Micro-Typography: Truthful illustrative labels ("SECURITY CORE", "DEFENSE MATRIX").
 *
 * Collapsed Sidebar Mode:
 * - Seamlessly contracts into a centered 40px icon-sized shield and radar core.
 * - Completely hides text labels to guarantee zero overflow within the 56px collapsed sidebar.
 *
 * Performance & Accessibility:
 * - Pure offline SVG + CSS keyframes (0 React re-renders, 60fps GPU acceleration).
 * - Full `prefers-reduced-motion: reduce` compliance (pauses all movement).
 * - Seamless light and dark theme adaptation via CSS variables.
 */
export default function MiniCyberDefenseCore({
  collapsed = false,
  className = '',
  style = {}
}) {
  const uid = useId().replace(/:/g, '');

  return (
    <div
      className={`mini-cyber-defense-root ${collapsed ? 'is-collapsed' : 'is-expanded'} ${className}`.trim()}
      style={style}
      aria-label="ThreatLens Security Core — Local Defense Matrix"
      title={collapsed ? 'ThreatLens Security Core — Local Defense Matrix' : undefined}
    >
      <style>{`
        /* Scoped Keyframes for MiniCyberDefenseCore_${uid} */
        @keyframes miniRadarSweep_${uid} {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes miniShieldBreathe_${uid} {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 3px rgba(99, 102, 241, 0.35));
          }
          50% {
            transform: scale(1.05);
            filter: drop-shadow(0 0 7px rgba(99, 102, 241, 0.7));
          }
        }

        @keyframes miniScanHighlight_${uid} {
          0% {
            transform: translateY(-20px);
            opacity: 0;
          }
          25% {
            opacity: 0.85;
          }
          75% {
            opacity: 0.85;
          }
          100% {
            transform: translateY(24px);
            opacity: 0;
          }
        }

        @keyframes miniThreatPulse_${uid} {
          0%, 72% {
            r: 14px;
            opacity: 0;
            stroke: var(--tl-sev-critical, #EF4444);
            stroke-width: 1.5px;
          }
          76% {
            opacity: 0.85;
            stroke: var(--tl-sev-critical, #EF4444);
          }
          82% {
            r: 52px;
            opacity: 0;
            stroke: var(--tl-sev-critical, #EF4444);
            stroke-width: 2px;
          }
          83% {
            r: 16px;
            opacity: 0;
            stroke: var(--tl-sev-low, #10B981);
            stroke-width: 1.5px;
          }
          86% {
            opacity: 0.9;
            stroke: var(--tl-sev-low, #10B981);
          }
          92% {
            r: 42px;
            opacity: 0;
            stroke: var(--tl-sev-low, #10B981);
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes miniThreatPulseCollapsed_${uid} {
          0%, 72% {
            r: 10px;
            opacity: 0;
            stroke: var(--tl-sev-critical, #EF4444);
          }
          76% {
            opacity: 0.9;
            stroke: var(--tl-sev-critical, #EF4444);
          }
          82% {
            r: 19px;
            opacity: 0;
            stroke: var(--tl-sev-critical, #EF4444);
          }
          84% {
            r: 10px;
            opacity: 0;
            stroke: var(--tl-sev-low, #10B981);
          }
          88% {
            opacity: 0.9;
            stroke: var(--tl-sev-low, #10B981);
          }
          94% {
            r: 18px;
            opacity: 0;
            stroke: var(--tl-sev-low, #10B981);
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes miniStreamFlow1_${uid} {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -30; }
        }

        @keyframes miniStreamFlow2_${uid} {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 36; }
        }

        @keyframes miniStreamFlow3_${uid} {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -32; }
        }

        @keyframes miniNodeGlow_${uid} {
          0%, 100% {
            opacity: 0.6;
            r: 2px;
          }
          50% {
            opacity: 1;
            r: 2.8px;
          }
        }

        @keyframes miniActiveDotPulse_${uid} {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          }
          50% {
            transform: scale(1.15);
            opacity: 0.85;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0);
          }
        }

        /* Scoped Component Styles */
        .mini-defense-card_${uid} {
          margin: 0.5rem 0.75rem 0.45rem 0.75rem;
          padding: 0.6rem 0.65rem 0.55rem 0.65rem;
          background: var(--tl-bg-surface-elev, #1A1F26);
          border: 1px solid var(--tl-border-subtle, #1E232B);
          border-radius: var(--radius-md, 6px);
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          user-select: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
          transition: border-color var(--t-fast, 150ms ease), background var(--t-fast, 150ms ease);
        }

        .mini-defense-card_${uid}:hover {
          border-color: var(--tl-border-default, #282E38);
        }

        .mini-defense-collapsed-btn_${uid} {
          width: 40px;
          height: 40px;
          margin: 0.35rem auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--tl-bg-surface-elev, #1A1F26);
          border: 1px solid var(--tl-border-subtle, #1E232B);
          border-radius: var(--radius-md, 6px);
          user-select: none;
          cursor: default;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: border-color var(--t-fast, 150ms ease);
        }

        .mini-defense-collapsed-btn_${uid}:hover {
          border-color: var(--tl-border-default, #282E38);
        }

        .mini-defense-header_${uid} {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: var(--font-mono, monospace);
          line-height: 1;
        }

        .mini-defense-title_${uid} {
          font-size: 0.61rem;
          font-weight: 700;
          letter-spacing: 0.07em;
          color: var(--tl-text-secondary, #94A3B8);
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .mini-defense-status_${uid} {
          font-size: 0.55rem;
          font-weight: 700;
          color: var(--tl-accent-hover, #818CF8);
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          letter-spacing: 0.04em;
        }

        .mini-defense-pulse-dot_${uid} {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--tl-accent-primary, #6366F1);
          display: inline-block;
          animation: miniActiveDotPulse_${uid} 2.5s infinite ease-in-out;
        }

        .mini-defense-footer_${uid} {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.56rem;
          color: var(--tl-text-muted, #78889B);
          line-height: 1;
          padding-top: 0.15rem;
          border-top: 1px solid var(--tl-border-subtle, #1E232B);
        }

        .mini-defense-sub_${uid} {
          font-weight: 600;
          letter-spacing: 0.05em;
          color: var(--tl-text-muted, #78889B);
        }

        .mini-defense-badge_${uid} {
          font-family: var(--font-mono, monospace);
          font-size: 0.52rem;
          color: var(--tl-text-muted-raw, #64748B);
          letter-spacing: 0.04em;
        }

        /* SVG Element Animations */
        .radar-sweep-expanded_${uid} {
          transform-origin: 100px 43px;
          animation: miniRadarSweep_${uid} 8s linear infinite;
        }

        .radar-sweep-collapsed_${uid} {
          transform-origin: 20px 20px;
          animation: miniRadarSweep_${uid} 7s linear infinite;
        }

        .shield-core-expanded_${uid} {
          transform-origin: 100px 43px;
          animation: miniShieldBreathe_${uid} 4s ease-in-out infinite;
        }

        .shield-core-collapsed_${uid} {
          transform-origin: 20px 20px;
          animation: miniShieldBreathe_${uid} 4s ease-in-out infinite;
        }

        .shield-scanner_${uid} {
          animation: miniScanHighlight_${uid} 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .threat-pulse-ring-expanded_${uid} {
          animation: miniThreatPulse_${uid} 10s ease-out infinite;
        }

        .threat-pulse-ring-collapsed_${uid} {
          animation: miniThreatPulseCollapsed_${uid} 10s ease-out infinite;
        }

        .stream-left-1_${uid} {
          stroke-dasharray: 4 10;
          animation: miniStreamFlow1_${uid} 2.2s linear infinite;
        }

        .stream-left-2_${uid} {
          stroke-dasharray: 3 9;
          animation: miniStreamFlow2_${uid} 2.8s linear infinite;
        }

        .stream-right-1_${uid} {
          stroke-dasharray: 4 11;
          animation: miniStreamFlow1_${uid} 2.5s linear infinite;
        }

        .stream-right-2_${uid} {
          stroke-dasharray: 3 8;
          animation: miniStreamFlow3_${uid} 3.1s linear infinite;
        }

        .stream-arch-top_${uid} {
          stroke-dasharray: 4 14;
          animation: miniStreamFlow1_${uid} 3.8s linear infinite;
        }

        .stream-arch-bottom_${uid} {
          stroke-dasharray: 4 14;
          animation: miniStreamFlow2_${uid} 4.2s linear infinite;
        }

        .node-pulse-1_${uid} { animation: miniNodeGlow_${uid} 3s ease-in-out infinite; }
        .node-pulse-2_${uid} { animation: miniNodeGlow_${uid} 3.5s ease-in-out infinite 0.6s; }
        .node-pulse-3_${uid} { animation: miniNodeGlow_${uid} 2.8s ease-in-out infinite 1.2s; }
        .node-pulse-4_${uid} { animation: miniNodeGlow_${uid} 3.2s ease-in-out infinite 1.8s; }

        /* Full Prefers-Reduced-Motion Support */
        @media (prefers-reduced-motion: reduce) {
          .radar-sweep-expanded_${uid},
          .radar-sweep-collapsed_${uid},
          .shield-core-expanded_${uid},
          .shield-core-collapsed_${uid},
          .shield-scanner_${uid},
          .threat-pulse-ring-expanded_${uid},
          .threat-pulse-ring-collapsed_${uid},
          .stream-left-1_${uid},
          .stream-left-2_${uid},
          .stream-right-1_${uid},
          .stream-right-2_${uid},
          .stream-arch-top_${uid},
          .stream-arch-bottom_${uid},
          .node-pulse-1_${uid},
          .node-pulse-2_${uid},
          .node-pulse-3_${uid},
          .node-pulse-4_${uid},
          .mini-defense-pulse-dot_${uid} {
            animation: none !important;
            filter: none !important;
          }
          .threat-pulse-ring-expanded_${uid},
          .threat-pulse-ring-collapsed_${uid} {
            display: none !important;
          }
          .radar-sweep-expanded_${uid} {
            transform: rotate(45deg);
          }
          .radar-sweep-collapsed_${uid} {
            transform: rotate(45deg);
          }
        }
      `}</style>

      {/* ================================================================
          COLLAPSED SIDEBAR MODE (Width 56px, icon-sized 40x40 core)
          ================================================================ */}
      {collapsed ? (
        <div className={`mini-defense-collapsed-btn_${uid}`}>
          <svg
            viewBox="0 0 40 40"
            width="36"
            height="36"
            style={{ display: 'block', overflow: 'visible' }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`miniSweepGradCol_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--tl-accent-primary, #6366F1)" stopOpacity="0.85" />
                <stop offset="100%" stopColor="var(--tl-accent-primary, #6366F1)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Radar Perimeter */}
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="var(--tl-border-default, #282E38)"
              strokeWidth="0.8"
              strokeDasharray="2 3"
              opacity="0.5"
            />
            <circle
              cx="20"
              cy="20"
              r="9"
              fill="none"
              stroke="var(--tl-border-default, #282E38)"
              strokeWidth="0.6"
              opacity="0.4"
            />

            {/* Rotating Radar Sweep */}
            <g className={`radar-sweep-collapsed_${uid}`}>
              <line
                x1="20"
                y1="20"
                x2="20"
                y2="4"
                stroke={`url(#miniSweepGradCol_${uid})`}
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </g>

            {/* Periodic Threat Detection Pulse */}
            <circle
              className={`threat-pulse-ring-collapsed_${uid}`}
              cx="20"
              cy="20"
              r="10"
              fill="none"
              strokeWidth="1.2"
              opacity="0"
            />

            {/* Collapsed Central Shield */}
            <g className={`shield-core-collapsed_${uid}`}>
              {/* Outer Shield Geometry */}
              <path
                d="M 20 10 L 27.5 13.5 L 27.5 21.5 C 27.5 25.8 20 29.5 20 29.5 C 20 29.5 12.5 25.8 12.5 21.5 L 12.5 13.5 Z"
                fill="var(--tl-accent-subtle, rgba(99, 102, 241, 0.15))"
                stroke="var(--tl-accent-primary, #6366F1)"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              {/* Inner Diamond Core */}
              <path
                d="M 20 16.5 L 23 19.5 L 20 22.5 L 17 19.5 Z"
                fill="var(--tl-accent-primary, #6366F1)"
              />
              {/* Center Specular Dot */}
              <circle cx="20" cy="19.5" r="1" fill="#FFFFFF" opacity="0.9" />
            </g>
          </svg>
        </div>
      ) : (
        /* ================================================================
           EXPANDED SIDEBAR MODE (Full visual card with topology & labels)
           ================================================================ */
        <div className={`mini-defense-card_${uid}`}>
          {/* Header */}
          <div className={`mini-defense-header_${uid}`}>
            <span className={`mini-defense-title_${uid}`}>
              THREATLENS // SEC CORE
            </span>
            <span className={`mini-defense-status_${uid}`}>
              <span className={`mini-defense-pulse-dot_${uid}`} />
              SCHEMATIC
            </span>
          </div>

          {/* SVG Vector Animation Body */}
          <div style={{ width: '100%', height: '82px', position: 'relative' }}>
            <svg
              viewBox="0 0 200 86"
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              style={{ display: 'block', overflow: 'hidden' }}
              aria-hidden="true"
            >
              <defs>
                {/* Shield Scanning Mask & Linear Gradient */}
                <clipPath id={`shieldClip_${uid}`}>
                  <path d="M 100 27 L 112.5 31.5 L 112.5 45.5 C 112.5 52.8 100 58 100 58 C 100 58 87.5 52.8 87.5 45.5 L 87.5 31.5 Z" />
                </clipPath>

                <linearGradient id={`scanLaserGrad_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#818CF8" stopOpacity="0" />
                  <stop offset="50%" stopColor="#C7D2FE" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                </linearGradient>

                {/* Radar Sweep Gradients */}
                <linearGradient id={`radarBeamGrad_${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--tl-accent-primary, #6366F1)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="var(--tl-accent-primary, #6366F1)" stopOpacity="0.2" />
                </linearGradient>

                <linearGradient id={`radarTrailSector_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--tl-accent-primary, #6366F1)" stopOpacity="0.22" />
                  <stop offset="60%" stopColor="var(--tl-accent-primary, #6366F1)" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="var(--tl-accent-primary, #6366F1)" stopOpacity="0" />
                </linearGradient>

                {/* Core Soft Glow Filter */}
                <filter id={`coreGlowFilter_${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* --------------------------------------------------------
                  LAYER C: DEFENSE RADAR CONCENTRIC RINGS
                  -------------------------------------------------------- */}
              <circle
                cx="100"
                cy="43"
                r="18"
                fill="none"
                stroke="var(--tl-border-default, #282E38)"
                strokeWidth="0.8"
                strokeDasharray="2 3"
                opacity="0.45"
              />
              <circle
                cx="100"
                cy="43"
                r="36"
                fill="none"
                stroke="var(--tl-border-default, #282E38)"
                strokeWidth="0.75"
                opacity="0.35"
              />
              <circle
                cx="100"
                cy="43"
                r="56"
                fill="none"
                stroke="var(--tl-border-subtle, #1E232B)"
                strokeWidth="0.65"
                strokeDasharray="3 4"
                opacity="0.3"
              />

              {/* Radar Crosshairs */}
              <line
                x1="44"
                y1="43"
                x2="156"
                y2="43"
                stroke="var(--tl-border-subtle, #1E232B)"
                strokeWidth="0.6"
                opacity="0.25"
              />
              <line
                x1="100"
                y1="10"
                x2="100"
                y2="76"
                stroke="var(--tl-border-subtle, #1E232B)"
                strokeWidth="0.6"
                opacity="0.25"
              />

              {/* Rotating Radar Sweep Sector & Line */}
              <g className={`radar-sweep-expanded_${uid}`}>
                {/* 35-degree trailing sweep sector */}
                <path
                  d="M 100 43 L 100 -13 A 56 56 0 0 1 133 0 Z"
                  fill={`url(#radarTrailSector_${uid})`}
                />
                {/* Leading sweep line */}
                <line
                  x1="100"
                  y1="43"
                  x2="100"
                  y2="-13"
                  stroke={`url(#radarBeamGrad_${uid})`}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </g>

              {/* --------------------------------------------------------
                  LAYER D: PERIODIC THREAT DETECTION PULSE
                  -------------------------------------------------------- */}
              <circle
                className={`threat-pulse-ring-expanded_${uid}`}
                cx="100"
                cy="43"
                r="14"
                fill="none"
                stroke="var(--tl-sev-critical, #EF4444)"
                strokeWidth="1.5"
                opacity="0"
              />

              {/* --------------------------------------------------------
                  LAYER B: NETWORK TOPOLOGY VECTORS & DATA STREAMS
                  -------------------------------------------------------- */}
              {/* Topology Passive Backing Lines */}
              <g stroke="var(--tl-border-default, #282E38)" strokeWidth="0.8" opacity="0.45">
                <line x1="26" y1="22" x2="64" y2="43" />
                <line x1="28" y1="64" x2="64" y2="43" />
                <line x1="64" y1="43" x2="88" y2="43" />
                <line x1="174" y1="22" x2="136" y2="43" />
                <line x1="172" y1="64" x2="136" y2="43" />
                <line x1="136" y1="43" x2="112" y2="43" />
                {/* Peripheral arches */}
                <path d="M 26 22 Q 100 12 174 22" fill="none" />
                <path d="M 28 64 Q 100 74 172 64" fill="none" />
              </g>

              {/* Topology Active Flow Streams (Animated stroke-dasharray) */}
              <g stroke="var(--tl-accent-primary, #6366F1)" strokeWidth="1" fill="none" opacity="0.85">
                {/* Ingest stream left-top to hub */}
                <line x1="26" y1="22" x2="64" y2="43" className={`stream-left-1_${uid}`} />
                {/* Telemetry stream left-bottom to hub */}
                <line x1="28" y1="64" x2="64" y2="43" className={`stream-left-2_${uid}`} />
                {/* Sensor stream right-top to hub */}
                <line x1="174" y1="22" x2="136" y2="43" className={`stream-right-1_${uid}`} />
                {/* Sensor stream right-bottom to hub */}
                <line x1="172" y1="64" x2="136" y2="43" className={`stream-right-2_${uid}`} />
                {/* Arch streams across perimeter */}
                <path d="M 26 22 Q 100 12 174 22" className={`stream-arch-top_${uid}`} />
                <path d="M 28 64 Q 100 74 172 64" className={`stream-arch-bottom_${uid}`} />
              </g>

              {/* Topology Satellite Sensor Nodes */}
              {/* Node 1: Left Top */}
              <g>
                <circle cx="26" cy="22" r="4.5" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke="var(--tl-border-default, #282E38)" strokeWidth="0.8" />
                <circle cx="26" cy="22" r="2" fill="var(--tl-accent-primary, #6366F1)" className={`node-pulse-1_${uid}`} />
              </g>
              {/* Node 2: Left Bottom */}
              <g>
                <circle cx="28" cy="64" r="4.5" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke="var(--tl-border-default, #282E38)" strokeWidth="0.8" />
                <circle cx="28" cy="64" r="2" fill="var(--tl-sev-info, #38BDF8)" className={`node-pulse-2_${uid}`} />
              </g>
              {/* Node 3: Mid-Left Gateway */}
              <g>
                <circle cx="64" cy="43" r="5" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke="var(--tl-accent-primary, #6366F1)" strokeWidth="1" />
                <circle cx="64" cy="43" r="2.2" fill="#818CF8" />
              </g>
              {/* Node 4: Mid-Right Gateway */}
              <g>
                <circle cx="136" cy="43" r="5" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke="var(--tl-accent-primary, #6366F1)" strokeWidth="1" />
                <circle cx="136" cy="43" r="2.2" fill="#818CF8" />
              </g>
              {/* Node 5: Right Top */}
              <g>
                <circle cx="174" cy="22" r="4.5" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke="var(--tl-border-default, #282E38)" strokeWidth="0.8" />
                <circle cx="174" cy="22" r="2" fill="var(--tl-accent-primary, #6366F1)" className={`node-pulse-3_${uid}`} />
              </g>
              {/* Node 6: Right Bottom */}
              <g>
                <circle cx="172" cy="64" r="4.5" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke="var(--tl-border-default, #282E38)" strokeWidth="0.8" />
                <circle cx="172" cy="64" r="2" fill="var(--tl-sev-low, #10B981)" className={`node-pulse-4_${uid}`} />
              </g>

              {/* --------------------------------------------------------
                  LAYER A: CENTRAL GEOMETRIC SECURITY CORE (SHIELD)
                  -------------------------------------------------------- */}
              <g className={`shield-core-expanded_${uid}`} filter={`url(#coreGlowFilter_${uid})`}>
                {/* Outer Faceted Shield */}
                <path
                  d="M 100 27 L 112.5 31.5 L 112.5 45.5 C 112.5 52.8 100 58 100 58 C 100 58 87.5 52.8 87.5 45.5 L 87.5 31.5 Z"
                  fill="var(--tl-accent-subtle, rgba(99, 102, 241, 0.16))"
                  stroke="var(--tl-accent-primary, #6366F1)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />

                {/* Inner Shield Bevel Accent */}
                <path
                  d="M 100 30.5 L 109.5 33.8 L 109.5 44.5 C 109.5 50.2 100 54.5 100 54.5 C 100 54.5 90.5 50.2 90.5 44.5 L 90.5 33.8 Z"
                  fill="none"
                  stroke="var(--tl-border-active, #818CF8)"
                  strokeWidth="0.8"
                  opacity="0.6"
                />

                {/* Vertical Scanning Highlight Laser Beam */}
                <g clipPath={`url(#shieldClip_${uid})`}>
                  <rect
                    x="85"
                    y="43"
                    width="30"
                    height="8"
                    fill={`url(#scanLaserGrad_${uid})`}
                    className={`shield-scanner_${uid}`}
                  />
                </g>

                {/* Core Symbolic Glyph (Lock / Diamond Hub) */}
                <path
                  d="M 100 38 L 104.5 42.5 L 100 47 L 95.5 42.5 Z"
                  fill="var(--tl-accent-primary, #6366F1)"
                />
                <circle cx="100" cy="42.5" r="1.4" fill="#FFFFFF" opacity="0.95" />
              </g>
            </svg>
          </div>

          {/* Footer Metadata */}
          <div className={`mini-defense-footer_${uid}`}>
            <span className={`mini-defense-sub_${uid}`}>
              LOCAL DEFENSE MATRIX
            </span>
            <span className={`mini-defense-badge_${uid}`}>
              DECORATIVE
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

