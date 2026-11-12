import React, { useId } from 'react';

/**
 * CyberSecurityAnimation — Concept A: Precision SOC Console
 *
 * Dedicated Motion Design: "CYBER THREAT INTELLIGENCE NETWORK"
 *
 * An original, layered vector animation visualizing continuous Security Operations Center (SOC)
 * network telemetry, threat correlation, and active containment defense.
 *
 * Coordinated Motion Layers:
 * - Layer A: Central Security Core (multi-layered shield with scanning beam & breathing pulse)
 * - Layer B: Network Topology (distributed sensor, ingest, correlation, and audit nodes)
 * - Layer C: Moving Data Packets (continuous multi-speed packet streams along vector paths)
 * - Layer D: Threat Detection & Containment Sequence (periodic anomaly alert, deflection shockwave, containment)
 * - Layer E: Radar Scanner (subtle rotating radar sweep beam across defense perimeters)
 * - Layer F: Precision SOC Telemetry HUD (decorative status indicators, coordinates, tick marks)
 *
 * Performance & Accessibility:
 * - Pure SVG + CSS hardware-accelerated animations (0 re-renders, 60fps GPU transforms)
 * - Full `prefers-reduced-motion` compliance (freezes animation cleanly into high-contrast static topology)
 * - Responsive vector viewBox (640 x 520) with zero external image dependencies (100% offline)
 * - Seamless dual-theme support via CSS variables
 */
export default function CyberSecurityAnimation({ className = '', style = {} }) {
  const uid = useId().replace(/:/g, '');

  return (
    <div
      className={`cyber-animation-container ${className}`.trim()}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        ...style
      }}
      aria-hidden="true"
    >
      <style>{`
        /* --- Animation Keyframes --- */
        @keyframes tlRadarSweep_${uid} {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes tlCoreBreathe_${uid} {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 16px rgba(99, 102, 241, 0.35));
          }
          50% {
            transform: scale(1.028);
            filter: drop-shadow(0 0 28px rgba(99, 102, 241, 0.65));
          }
        }

        @keyframes tlShieldScanBar_${uid} {
          0% {
            transform: translateY(216px);
            opacity: 0;
          }
          10% {
            opacity: 0.9;
          }
          85% {
            opacity: 0.9;
          }
          95%, 100% {
            transform: translateY(312px);
            opacity: 0;
          }
        }

        @keyframes tlPacketFlowIn1_${uid} {
          0% {
            stroke-dashoffset: 240;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes tlPacketFlowIn2_${uid} {
          0% {
            stroke-dashoffset: 320;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes tlPacketFlowOut1_${uid} {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -260;
          }
        }

        @keyframes tlNodePulseNormal_${uid} {
          0%, 100% {
            transform: scale(1);
            opacity: 0.85;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
        }

        /* 16-Second Cyclic Threat Detection & Containment Sequence */
        @keyframes tlThreatCycle_${uid} {
          0%, 18% {
            /* Nominal surveillance state */
            opacity: 0;
            stroke-dashoffset: 260;
            stroke: var(--tl-accent-primary, #6366F1);
          }
          20% {
            /* Anomaly signal triggers at perimeter node */
            opacity: 1;
            stroke: var(--tl-sev-critical, #EF4444);
            stroke-dashoffset: 260;
          }
          40% {
            /* Threat packet travels along vector to central core */
            opacity: 1;
            stroke: var(--tl-sev-critical, #EF4444);
            stroke-dashoffset: 0;
          }
          48% {
            /* Reaches central shield - core deflects */
            opacity: 1;
            stroke: var(--tl-accent-hover, #818CF8);
          }
          55%, 72% {
            /* Contained state - emerald neutralization */
            opacity: 0.85;
            stroke: var(--tl-sev-low, #10B981);
            stroke-dashoffset: 0;
          }
          80%, 100% {
            /* Reset to nominal */
            opacity: 0;
            stroke-dashoffset: -260;
          }
        }

        @keyframes tlThreatNodePing_${uid} {
          0%, 18% {
            r: 5;
            opacity: 0;
            stroke: var(--tl-sev-critical, #EF4444);
          }
          22% {
            r: 7;
            opacity: 0.95;
            stroke: var(--tl-sev-critical, #EF4444);
          }
          28% {
            r: 22;
            opacity: 0;
            stroke: var(--tl-sev-critical, #EF4444);
          }
          30%, 100% {
            r: 5;
            opacity: 0;
          }
        }

        @keyframes tlCoreDeflectWave_${uid} {
          0%, 40% {
            r: 45;
            opacity: 0;
            stroke: var(--tl-accent-hover, #818CF8);
          }
          45% {
            r: 50;
            opacity: 0.9;
            stroke: var(--tl-accent-hover, #818CF8);
          }
          55% {
            r: 105;
            opacity: 0;
            stroke: var(--tl-sev-low, #10B981);
          }
          60%, 100% {
            r: 45;
            opacity: 0;
          }
        }

        @keyframes tlContainmentBadge_${uid} {
          0%, 45% {
            opacity: 0;
            transform: translateY(4px);
          }
          50%, 75% {
            opacity: 1;
            transform: translateY(0);
          }
          85%, 100% {
            opacity: 0;
            transform: translateY(-4px);
          }
        }

        @keyframes tlOrbitRingSlow_${uid} {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* --- Element Styles --- */
        .tl-radar-beam-${uid} {
          transform-origin: 320px 260px;
          animation: tlRadarSweep_${uid} 14s linear infinite;
        }

        .tl-core-group-${uid} {
          transform-origin: 320px 260px;
          animation: tlCoreBreathe_${uid} 4.2s ease-in-out infinite;
        }

        .tl-shield-scan-${uid} {
          animation: tlShieldScanBar_${uid} 3.6s ease-in-out infinite;
        }

        .tl-stream-in-1-${uid} {
          animation: tlPacketFlowIn1_${uid} 3.2s linear infinite;
        }

        .tl-stream-in-2-${uid} {
          animation: tlPacketFlowIn2_${uid} 4.6s linear infinite;
        }

        .tl-stream-out-1-${uid} {
          animation: tlPacketFlowOut1_${uid} 3.8s linear infinite;
        }

        .tl-threat-packet-${uid} {
          animation: tlThreatCycle_${uid} 16s ease-in-out infinite;
        }

        .tl-threat-ping-${uid} {
          animation: tlThreatNodePing_${uid} 16s ease-out infinite;
        }

        .tl-deflect-wave-${uid} {
          animation: tlCoreDeflectWave_${uid} 16s ease-out infinite;
        }

        .tl-contain-badge-${uid} {
          animation: tlContainmentBadge_${uid} 16s ease-in-out infinite;
        }

        .tl-orbit-caliper-${uid} {
          transform-origin: 320px 260px;
          animation: tlOrbitRingSlow_${uid} 48s linear infinite;
        }

        /* --- Reduced Motion Safeguard --- */
        @media (prefers-reduced-motion: reduce) {
          .tl-radar-beam-${uid},
          .tl-core-group-${uid},
          .tl-shield-scan-${uid},
          .tl-stream-in-1-${uid},
          .tl-stream-in-2-${uid},
          .tl-stream-out-1-${uid},
          .tl-threat-packet-${uid},
          .tl-threat-ping-${uid},
          .tl-deflect-wave-${uid},
          .tl-contain-badge-${uid},
          .tl-orbit-caliper-${uid} {
            animation: none !important;
            transform: none !important;
          }
          .tl-threat-packet-${uid} {
            opacity: 0.6;
            stroke-dashoffset: 0;
            stroke: var(--tl-accent-primary, #6366F1);
          }
          .tl-radar-beam-${uid} {
            transform: rotate(45deg);
            opacity: 0.15;
          }
        }
      `}</style>

      <svg
        viewBox="0 0 640 520"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '480px',
          overflow: 'visible'
        }}
      >
        <defs>
          {/* Radial glow around the central security core */}
          <radialGradient id={`shieldGlow_${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--tl-accent-primary, #6366F1)" stopOpacity="0.45" />
            <stop offset="55%" stopColor="var(--tl-accent-primary, #6366F1)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--tl-accent-primary, #6366F1)" stopOpacity="0" />
          </radialGradient>

          {/* Central shield face gradient */}
          <linearGradient id={`shieldFace_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--tl-bg-surface-elev, #1A1F26)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--tl-bg-surface, #13171D)" stopOpacity="0.98" />
          </linearGradient>

          {/* High-tech shield bevel contour gradient */}
          <linearGradient id={`shieldBorder_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="50%" stopColor="var(--tl-accent-primary, #6366F1)" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>

          {/* Radar sweep conical gradient */}
          <linearGradient id={`radarBeam_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--tl-accent-primary, #6366F1)" stopOpacity="0.30" />
            <stop offset="70%" stopColor="var(--tl-accent-primary, #6366F1)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--tl-accent-primary, #6366F1)" stopOpacity="0" />
          </linearGradient>

          {/* Horizontal scan line gradient */}
          <linearGradient id={`scanLineGrad_${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--tl-accent-hover, #818CF8)" stopOpacity="0" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--tl-accent-hover, #818CF8)" stopOpacity="0" />
          </linearGradient>

          {/* Subtle node glow */}
          <filter id={`nodeGlow_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ============================================================
            LAYER E: RADAR SCANNER & BACKGROUND DEFENSE PERIMETERS
            ============================================================ */}
        <g id="layer-radar" opacity="0.85">
          {/* Hexagonal coordinate grid dots */}
          <g opacity="0.15" fill="var(--tl-text-muted, #78889B)">
            <circle cx="120" cy="80" r="1.5" />
            <circle cx="220" cy="80" r="1.5" />
            <circle cx="420" cy="80" r="1.5" />
            <circle cx="520" cy="80" r="1.5" />
            <circle cx="80" cy="180" r="1.5" />
            <circle cx="560" cy="180" r="1.5" />
            <circle cx="80" cy="340" r="1.5" />
            <circle cx="560" cy="340" r="1.5" />
            <circle cx="120" cy="440" r="1.5" />
            <circle cx="220" cy="440" r="1.5" />
            <circle cx="420" cy="440" r="1.5" />
            <circle cx="520" cy="440" r="1.5" />
          </g>

          {/* Concentric Defense Perimeter Rings */}
          <circle
            cx="320"
            cy="260"
            r="82"
            stroke="var(--tl-border-subtle, #1E232B)"
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.6"
          />
          <circle
            cx="320"
            cy="260"
            r="156"
            stroke="var(--tl-border-default, #282E38)"
            strokeWidth="1"
            strokeDasharray="4 6"
            opacity="0.5"
          />
          <circle
            cx="320"
            cy="260"
            r="224"
            stroke="var(--tl-border-subtle, #1E232B)"
            strokeWidth="1"
            opacity="0.35"
          />
          <circle
            cx="320"
            cy="260"
            r="262"
            stroke="var(--tl-border-subtle, #1E232B)"
            strokeWidth="1"
            strokeDasharray="2 8"
            opacity="0.25"
          />

          {/* Polar Axis Guides */}
          <line
            x1="320"
            y1="25"
            x2="320"
            y2="495"
            stroke="var(--tl-border-subtle, #1E232B)"
            strokeWidth="1"
            strokeDasharray="3 6"
            opacity="0.3"
          />
          <line
            x1="70"
            y1="260"
            x2="570"
            y2="260"
            stroke="var(--tl-border-subtle, #1E232B)"
            strokeWidth="1"
            strokeDasharray="3 6"
            opacity="0.3"
          />

          {/* Caliper Cardinal Compass Ticks */}
          <path
            d="M320,10 L320,22 M320,498 L320,510 M55,260 L67,260 M573,260 L585,260"
            stroke="var(--tl-accent-primary, #6366F1)"
            strokeWidth="1.5"
            opacity="0.5"
          />

          {/* Orbiting Segmented Technical Caliper Ring */}
          <g className={`tl-orbit-caliper-${uid}`}>
            <circle
              cx="320"
              cy="260"
              r="190"
              stroke="var(--tl-accent-primary, #6366F1)"
              strokeWidth="1"
              strokeDasharray="16 80 8 40"
              opacity="0.28"
            />
          </g>

          {/* Rotating Radar Sweep Cone & Line */}
          <g className={`tl-radar-beam-${uid}`}>
            {/* 35-degree sweep wedge */}
            <path
              d="M320,260 L570,260 A250,250 0 0,0 545,150 Z"
              fill={`url(#radarBeam_${uid})`}
            />
            {/* Leading sweep vector */}
            <line
              x1="320"
              y1="260"
              x2="570"
              y2="260"
              stroke="var(--tl-accent-hover, #818CF8)"
              strokeWidth="1.5"
              opacity="0.75"
            />
          </g>
        </g>

        {/* ============================================================
            LAYER B: NETWORK TOPOLOGY (VECTOR PATHS)
            ============================================================ */}
        <g id="layer-paths">
          {/* Base Connection Vectors */}
          {/* Vector 1: Endpoint Agent -> Proxy Shield -> Core */}
          <path
            d="M110,260 L225,205 L320,260"
            stroke="var(--tl-border-default, #282E38)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.45"
          />
          {/* Vector 2: Ingestion Gateway -> Proxy Shield -> Core */}
          <path
            d="M160,110 L225,205 L320,260"
            stroke="var(--tl-border-default, #282E38)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.45"
          />
          {/* Vector 3: Cloud Telemetry -> Core */}
          <path
            d="M320,75 L320,260"
            stroke="var(--tl-border-default, #282E38)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.45"
          />
          {/* Vector 4: Correlation Cluster -> Hub -> Core */}
          <path
            d="M480,110 L415,205 L320,260"
            stroke="var(--tl-border-default, #282E38)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.45"
          />
          {/* Vector 5: Threat Intel Feed -> Hub -> Core */}
          <path
            d="M530,260 L415,205 L320,260"
            stroke="var(--tl-border-default, #282E38)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.45"
          />
          {/* Vector 6: Anomaly Engine -> Dispatcher -> Core */}
          <path
            d="M470,410 L320,360 L320,260"
            stroke="var(--tl-border-default, #282E38)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.45"
          />
          {/* Vector 7: Log Storage Lake -> Dispatcher -> Core */}
          <path
            d="M320,445 L320,360 L320,260"
            stroke="var(--tl-border-default, #282E38)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.45"
          />
          {/* Vector 8: Forensic Audit Store -> Dispatcher -> Core */}
          <path
            d="M170,410 L320,360 L320,260"
            stroke="var(--tl-border-default, #282E38)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.45"
          />

          {/* Cross-Perimeter Mesh Connections */}
          <path
            d="M160,110 L320,75 L480,110 M110,260 L170,410 M530,260 L470,410 M170,410 L320,445 L470,410"
            stroke="var(--tl-border-subtle, #1E232B)"
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.35"
          />
        </g>

        {/* ============================================================
            LAYER C: CONTINUOUS DATA PACKET STREAMS
            ============================================================ */}
        <g id="layer-packets">
          {/* Inward Stream 1: Ingestion -> Core */}
          <path
            className={`tl-stream-in-1-${uid}`}
            d="M160,110 L225,205 L320,260"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="8 120"
            opacity="0.85"
          />

          {/* Inward Stream 2: Cloud Telemetry -> Core */}
          <path
            className={`tl-stream-in-2-${uid}`}
            d="M320,75 L320,260"
            stroke="#818CF8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="6 90"
            opacity="0.8"
          />

          {/* Inward Stream 3: Threat Intel Feed -> Core */}
          <path
            className={`tl-stream-in-1-${uid}`}
            d="M530,260 L415,205 L320,260"
            stroke="#6366F1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="8 140"
            opacity="0.85"
          />

          {/* Outward Stream 4: Core -> Forensic Audit Store */}
          <path
            className={`tl-stream-out-1-${uid}`}
            d="M320,260 L320,360 L170,410"
            stroke="#10B981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="6 110"
            opacity="0.75"
          />

          {/* Inward Stream 5: Correlation Cluster -> Core */}
          <path
            className={`tl-stream-in-2-${uid}`}
            d="M480,110 L415,205 L320,260"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="6 100"
            opacity="0.8"
          />
        </g>

        {/* ============================================================
            LAYER D: THREAT DETECTION & ACTIVE CONTAINMENT SEQUENCE
            ============================================================ */}
        <g id="layer-threat-sequence">
          {/* Anomaly Ping Ripple at Endpoint Node (110, 260) */}
          <circle
            className={`tl-threat-ping-${uid}`}
            cx="110"
            cy="260"
            r="6"
            fill="none"
            strokeWidth="2"
          />

          {/* Threat Vector Packet moving from Endpoint (110, 260) -> Proxy (225, 205) -> Core (320, 260) */}
          <path
            className={`tl-threat-packet-${uid}`}
            d="M110,260 L225,205 L320,260"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="18 240"
          />

          {/* Core Deflection Shockwave Pulse */}
          <circle
            className={`tl-deflect-wave-${uid}`}
            cx="320"
            cy="260"
            r="45"
            fill="none"
            strokeWidth="2.5"
          />
        </g>

        {/* ============================================================
            LAYER B (NODES): TOPOLOGY SENSOR & ROUTING NODES
            ============================================================ */}
        <g id="layer-nodes">
          {/* Node 1: Ingestion Gateway (160, 110) */}
          <g>
            <circle cx="160" cy="110" r="10" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke="#38BDF8" strokeWidth="1.5" />
            <circle cx="160" cy="110" r="4" fill="#38BDF8" />
            <text x="145" y="92" fill="var(--tl-text-muted, #78889B)" fontSize="8" fontFamily="var(--font-mono, monospace)" fontWeight="600">INGEST-01</text>
          </g>

          {/* Node 2: Cloud Telemetry (320, 75) */}
          <g>
            <circle cx="320" cy="75" r="9" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke="#818CF8" strokeWidth="1.5" />
            <circle cx="320" cy="75" r="3.5" fill="#818CF8" />
            <text x="320" y="58" textAnchor="middle" fill="var(--tl-text-muted, #78889B)" fontSize="8" fontFamily="var(--font-mono, monospace)" fontWeight="600">CLOUD-TELEMETRY</text>
          </g>

          {/* Node 3: Correlation Cluster (480, 110) */}
          <g>
            <circle cx="480" cy="110" r="10" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke="#6366F1" strokeWidth="1.5" />
            <circle cx="480" cy="110" r="4" fill="#6366F1" />
            <text x="495" y="92" fill="var(--tl-text-muted, #78889B)" fontSize="8" fontFamily="var(--font-mono, monospace)" fontWeight="600">CORRELATION</text>
          </g>

          {/* Node 4: Threat Intel Feed (530, 260) */}
          <g>
            <circle cx="530" cy="260" r="11" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke="#818CF8" strokeWidth="1.5" />
            <circle cx="530" cy="260" r="4.5" fill="#818CF8" />
            <text x="548" y="263" fill="var(--tl-text-muted, #78889B)" fontSize="8" fontFamily="var(--font-mono, monospace)" fontWeight="600">INTEL-FEED</text>
          </g>

          {/* Node 5: Anomaly Engine (470, 410) */}
          <g>
            <circle cx="470" cy="410" r="10" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke="#6366F1" strokeWidth="1.5" />
            <circle cx="470" cy="410" r="4" fill="#6366F1" />
            <text x="485" y="428" fill="var(--tl-text-muted, #78889B)" fontSize="8" fontFamily="var(--font-mono, monospace)" fontWeight="600">ANOMALY-ENG</text>
          </g>

          {/* Node 6: Log Storage Lake (320, 445) */}
          <g>
            <circle cx="320" cy="445" r="9" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke="#10B981" strokeWidth="1.5" />
            <circle cx="320" cy="445" r="3.5" fill="#10B981" />
            <text x="320" y="468" textAnchor="middle" fill="var(--tl-text-muted, #78889B)" fontSize="8" fontFamily="var(--font-mono, monospace)" fontWeight="600">LOG-LAKE</text>
          </g>

          {/* Node 7: Forensic Audit Store (170, 410) */}
          <g>
            <circle cx="170" cy="410" r="10" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke="#10B981" strokeWidth="1.5" />
            <circle cx="170" cy="410" r="4" fill="#10B981" />
            <text x="118" y="428" fill="var(--tl-text-muted, #78889B)" fontSize="8" fontFamily="var(--font-mono, monospace)" fontWeight="600">AUDIT-STORE</text>
          </g>

          {/* Node 8: Endpoint Fleet (110, 260) */}
          <g>
            <circle cx="110" cy="260" r="11" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke="#38BDF8" strokeWidth="1.5" />
            <circle cx="110" cy="260" r="4.5" fill="#38BDF8" />
            <text x="46" y="263" fill="var(--tl-text-muted, #78889B)" fontSize="8" fontFamily="var(--font-mono, monospace)" fontWeight="600">ENDPOINTS</text>
          </g>

          {/* Sub-Node 9: Proxy Shield (225, 205) */}
          <circle cx="225" cy="205" r="6" fill="var(--tl-bg-surface, #13171D)" stroke="#818CF8" strokeWidth="1.2" />
          <circle cx="225" cy="205" r="2.5" fill="#818CF8" />

          {/* Sub-Node 10: Security Hub (415, 205) */}
          <circle cx="415" cy="205" r="6" fill="var(--tl-bg-surface, #13171D)" stroke="#818CF8" strokeWidth="1.2" />
          <circle cx="415" cy="205" r="2.5" fill="#818CF8" />

          {/* Sub-Node 11: Dispatcher Hub (320, 360) */}
          <circle cx="320" cy="360" r="6" fill="var(--tl-bg-surface, #13171D)" stroke="#10B981" strokeWidth="1.2" />
          <circle cx="320" cy="360" r="2.5" fill="#10B981" />
        </g>

        {/* ============================================================
            LAYER A: CENTRAL SECURITY CORE & PROTECTIVE SHIELD
            ============================================================ */}
        <g id="layer-security-core" className={`tl-core-group-${uid}`}>
          {/* Outer Ambient Glow Disc */}
          <circle cx="320" cy="260" r="90" fill={`url(#shieldGlow_${uid})`} />

          {/* Defensive Hexagonal Caliper Halo */}
          <polygon
            points="320,186 376,218 376,302 320,334 264,302 264,218"
            fill="none"
            stroke="var(--tl-accent-primary, #6366F1)"
            strokeWidth="1.2"
            strokeDasharray="6 12"
            opacity="0.45"
          />

          {/* Layered Outer Shield Border */}
          <path
            d="M320,208 L360,224 L360,268 C360,296 342,316 320,326 C298,316 280,296 280,268 L280,224 Z"
            fill="none"
            stroke="var(--tl-border-subtle, #1E232B)"
            strokeWidth="1"
            opacity="0.6"
          />

          {/* Main Shield Body */}
          <path
            d="M320,214 L354,228 L354,266 C354,291 338,310 320,320 C302,310 286,291 286,266 L286,228 Z"
            fill={`url(#shieldFace_${uid})`}
            stroke={`url(#shieldBorder_${uid})`}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Inner Accent Inset Border */}
          <path
            d="M320,222 L346,233 L346,264 C346,284 333,299 320,308 C307,299 294,284 294,264 L294,233 Z"
            fill="none"
            stroke="var(--tl-accent-hover, #818CF8)"
            strokeWidth="1"
            strokeDasharray="4 2"
            opacity="0.75"
          />

          {/* Central Emblem: High-Precision Padlock & Circuit Reticle */}
          <g transform="translate(320, 264)" textAnchor="middle">
            {/* Shackle */}
            <path
              d="M-7,-5 V-13 C-7,-17 7,-17 7,-13 V-5"
              fill="none"
              stroke="#E0E7FF"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Padlock Body */}
            <rect
              x="-11"
              y="-5"
              width="22"
              height="18"
              rx="3"
              fill="var(--tl-accent-primary, #6366F1)"
              stroke="#818CF8"
              strokeWidth="1.2"
            />
            {/* Keyhole */}
            <circle cx="0" cy="2" r="2" fill="#FFFFFF" />
            <path d="M0,4 L0,7" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </g>

          {/* Shield Scanning Highlight Beam */}
          <g clipPath={`url(#shieldClip_${uid})`}>
            <clipPath id={`shieldClip_${uid}`}>
              <path d="M320,214 L354,228 L354,266 C354,291 338,310 320,320 C302,310 286,291 286,266 L286,228 Z" />
            </clipPath>
            <rect
              className={`tl-shield-scan-${uid}`}
              x="280"
              y="0"
              width="80"
              height="6"
              fill={`url(#scanLineGrad_${uid})`}
            />
          </g>
        </g>

        {/* Dynamic Threat Containment Banner Badge */}
        <g className={`tl-contain-badge-${uid}`} transform="translate(320, 342)">
          <rect
            x="-74"
            y="-10"
            width="148"
            height="20"
            rx="4"
            fill="var(--tl-bg-surface-elev, #1A1F26)"
            stroke="var(--tl-sev-low, #10B981)"
            strokeWidth="1"
          />
          <circle cx="-58" cy="0" r="3" fill="var(--tl-sev-low, #10B981)" />
          <text
            x="-48"
            y="3.5"
            fill="var(--tl-sev-low, #10B981)"
            fontSize="8"
            fontFamily="var(--font-mono, monospace)"
            fontWeight="700"
            letterSpacing="0.06em"
          >
            STATUS: CONTAINED
          </text>
        </g>

        {/* ============================================================
            LAYER F: PRECISION SOC TELEMETRY READOUTS & HUD CORNERS
            (Decorative Schematics — Illustrative Security Visualization)
            ============================================================ */}
        <g id="layer-hud" fontSize="8" fontFamily="var(--font-mono, monospace)">
          {/* Top-Left Telemetry Card */}
          <g transform="translate(24, 28)">
            <circle cx="4" cy="4" r="3" fill="var(--tl-sev-low, #10B981)" />
            <text x="14" y="7" fill="var(--tl-text-primary, #F1F5F9)" fontWeight="600" letterSpacing="0.05em">
              DEFENSE MATRIX // SCHEMATIC
            </text>
            <text x="14" y="18" fill="var(--tl-text-muted, #78889B)" fontSize="7">
              TOPOLOGY: SCHEMATIC (9 NODES)
            </text>
          </g>

          {/* Top-Right Telemetry Card */}
          <g transform="translate(480, 28)" textAnchor="start">
            <circle cx="4" cy="4" r="3" fill="var(--tl-accent-primary, #6366F1)" />
            <text x="14" y="7" fill="var(--tl-text-primary, #F1F5F9)" fontWeight="600" letterSpacing="0.05em">
              CORRELATION // SCHEMATIC
            </text>
            <text x="14" y="18" fill="var(--tl-text-muted, #78889B)" fontSize="7">
              SIMULATED TELEMETRY STREAM
            </text>
          </g>

          {/* Bottom-Left Telemetry Card */}
          <g transform="translate(24, 480)">
            <text x="0" y="7" fill="var(--tl-text-muted, #78889B)" fontSize="7.5" letterSpacing="0.04em">
              ENCRYPTION PROTOCOL: SCHEMATIC
            </text>
            <text x="0" y="18" fill="var(--tl-text-secondary, #94A3B8)" fontSize="7">
              PIPELINE ARCHITECTURE MODEL
            </text>
          </g>

          {/* Bottom-Right Telemetry Card */}
          <g transform="translate(616, 480)" textAnchor="end">
            <text x="0" y="7" fill="var(--tl-text-secondary, #94A3B8)" fontSize="7.5" fontWeight="600" letterSpacing="0.05em">
              CYBER THREAT INTELLIGENCE
            </text>
            <text x="0" y="18" fill="var(--tl-accent-primary, #6366F1)" fontSize="7.5" fontWeight="700" letterSpacing="0.06em">
              ILLUSTRATIVE SECURITY VISUALIZATION
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}

