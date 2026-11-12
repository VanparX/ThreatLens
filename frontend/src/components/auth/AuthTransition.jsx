import React, { useEffect, useState, useRef, useId } from 'react';
import { Shield, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, Power } from 'lucide-react';
import './AuthTransition.css';

/**
 * Stage configuration for Login and Logout transitions.
 */
const LOGIN_STAGES = [
  {
    stage: 1,
    title: 'AUTHENTICATION VERIFIED',
    subtitle: 'Identity confirmed // Session credentials validated',
    badgeClass: 'status-verified',
    icon: 'check'
  },
  {
    stage: 2,
    title: 'SECURE NETWORK INITIALIZATION',
    subtitle: 'Connecting distributed telemetry nodes & sensor links',
    badgeClass: 'status-verified',
    icon: 'shield'
  },
  {
    stage: 3,
    title: 'SECURE SESSION ESTABLISHED',
    subtitle: 'Cryptographic context active // SOC radar sweep calibrated',
    badgeClass: 'status-established',
    icon: 'shieldCheck'
  },
  {
    stage: 4,
    title: 'INITIALIZING SOC WORKSPACE',
    subtitle: 'Loading security monitors, active alerts & command console',
    badgeClass: 'status-established',
    icon: 'shieldCheck'
  }
];

const LOGOUT_STAGES = [
  {
    stage: 1,
    title: 'TERMINATING SECURE SESSION',
    subtitle: 'Revoking active session credentials // Purging local tokens',
    badgeClass: 'status-terminating',
    icon: 'alert'
  },
  {
    stage: 2,
    title: 'CLOSING TELEMETRY CONNECTIONS',
    subtitle: 'Disconnecting real-time sensor streams & log listeners',
    badgeClass: 'status-terminating',
    icon: 'alert'
  },
  {
    stage: 3,
    title: 'SECURITY CORE SHUTDOWN',
    subtitle: 'Powering down security core // Sanitizing memory state',
    badgeClass: 'status-closed',
    icon: 'power'
  },
  {
    stage: 4,
    title: 'SESSION CLOSED',
    subtitle: 'Session successfully invalidated // Returning to login gateway',
    badgeClass: 'status-closed',
    icon: 'power'
  }
];

/**
 * AuthTransition — Coordinated authentication transition experience for ThreatLens.
 *
 * Implements 5-stage login progression and 4-stage logout shutdown matching
 * the Concept A: Precision SOC Console visual identity.
 *
 * @param {'login'|'logout'} mode - Transition mode.
 * @param {Function} onComplete - Callback executed when final stage completes.
 * @param {boolean} [isReducedMotion] - Optional override for reduced motion.
 */
export default function AuthTransition({
  mode = 'login',
  onComplete,
  isReducedMotion: propReducedMotion
}) {
  const uid = useId().replace(/:/g, '');
  const mountedRef = useRef(true);
  const completedRef = useRef(false);

  // Check user prefers-reduced-motion setting
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (propReducedMotion !== undefined) return propReducedMotion;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const stages = mode === 'login' ? LOGIN_STAGES : LOGOUT_STAGES;
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  const activeStage = stages[currentStageIndex] || stages[0];

  useEffect(() => {
    mountedRef.current = true;
    completedRef.current = false;

    // Reduced motion shortcut: Minimal transition without continuous animation
    if (reducedMotion) {
      const timer = setTimeout(() => {
        if (mountedRef.current && !completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      }, 350);
      return () => {
        mountedRef.current = false;
        clearTimeout(timer);
      };
    }

    // Coordinated stage transitions
    const timeouts = [];

    if (mode === 'login') {
      // Stage 1: 0ms - 400ms (Authentication Verified)
      // Stage 2: 400ms - 850ms (Secure Network Initialization)
      timeouts.push(setTimeout(() => {
        if (mountedRef.current) setCurrentStageIndex(1);
      }, 400));

      // Stage 3: 850ms - 1350ms (Secure Session Established)
      timeouts.push(setTimeout(() => {
        if (mountedRef.current) setCurrentStageIndex(2);
      }, 850));

      // Stage 4: 1350ms - 1800ms (Initializing SOC Workspace)
      timeouts.push(setTimeout(() => {
        if (mountedRef.current) setCurrentStageIndex(3);
      }, 1350));

      // Stage 5: 1800ms (Navigation)
      timeouts.push(setTimeout(() => {
        if (mountedRef.current && !completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      }, 1800));
    } else {
      // Logout Sequence (~1.5s total)
      // Stage 1: 0ms - 350ms (Terminating Secure Session)
      // Stage 2: 350ms - 750ms (Closing Telemetry Connections)
      timeouts.push(setTimeout(() => {
        if (mountedRef.current) setCurrentStageIndex(1);
      }, 350));

      // Stage 3: 750ms - 1150ms (Security Core Shutdown)
      timeouts.push(setTimeout(() => {
        if (mountedRef.current) setCurrentStageIndex(2);
      }, 750));

      // Stage 4: 1150ms - 1500ms (Session Closed)
      timeouts.push(setTimeout(() => {
        if (mountedRef.current) setCurrentStageIndex(3);
      }, 1150));

      // Completion Navigation: 1500ms
      timeouts.push(setTimeout(() => {
        if (mountedRef.current && !completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      }, 1500));
    }

    return () => {
      mountedRef.current = false;
      timeouts.forEach(clearTimeout);
    };
  }, [mode, onComplete, reducedMotion]);

  // Dynamic visual states based on stage
  const stageNum = activeStage.stage;

  // Visual state flags
  const isNodesVisible = mode === 'login' ? stageNum >= 2 : stageNum <= 2;
  const isPacketsFlowing = mode === 'login' ? stageNum >= 2 : stageNum === 1;
  const isCoreIlluminated = mode === 'login' ? stageNum >= 1 : stageNum <= 2;
  const isCoreFullPower = mode === 'login' ? stageNum >= 3 : stageNum === 1;
  const isRadarActive = mode === 'login' ? stageNum >= 3 : stageNum === 1;

  // Colors
  const coreAccent = mode === 'login'
    ? (stageNum >= 3 ? '#10B981' : 'var(--tl-accent-primary, #6366F1)')
    : (stageNum >= 3 ? 'var(--tl-text-muted, #78889B)' : '#F59E0B');

  const shieldGlowOpacity = isCoreFullPower ? 0.6 : (isCoreIlluminated ? 0.28 : 0.05);

  return (
    <div
      className={`tl-auth-transition-overlay mode-${mode}`}
      role="status"
      aria-live="polite"
      aria-label={`${mode === 'login' ? 'Logging in' : 'Logging out'}: ${activeStage.title}`}
    >
      <style>{`
        @keyframes tlAuthRadarSweep_${uid} {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes tlAuthPulse_${uid} {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px ${coreAccent}40); }
          50% { transform: scale(1.025); filter: drop-shadow(0 0 24px ${coreAccent}80); }
        }
        @keyframes tlAuthScan_${uid} {
          0% { transform: translateY(165px); opacity: 0; }
          15% { opacity: 0.9; }
          85% { opacity: 0.9; }
          100% { transform: translateY(280px); opacity: 0; }
        }
        @keyframes tlAuthFlowIn_${uid} {
          0% { stroke-dashoffset: 180; }
          100% { stroke-dashoffset: 0; }
        }

        .tl-auth-radar-${uid} {
          transform-origin: 320px 220px;
          animation: ${isRadarActive && !reducedMotion ? `tlAuthRadarSweep_${uid} 6s linear infinite` : 'none'};
        }
        .tl-auth-core-${uid} {
          transform-origin: 320px 220px;
          animation: ${isCoreIlluminated && !reducedMotion ? `tlAuthPulse_${uid} 3s ease-in-out infinite` : 'none'};
          transition: all 0.4s ease;
        }
        .tl-auth-scanner-${uid} {
          animation: ${isCoreIlluminated && !reducedMotion ? `tlAuthScan_${uid} 2.2s ease-in-out infinite` : 'none'};
        }
        .tl-auth-packet-${uid} {
          animation: ${isPacketsFlowing && !reducedMotion ? `tlAuthFlowIn_${uid} 2s linear infinite` : 'none'};
        }
      `}</style>

      <div className="tl-auth-transition-content">
        {/* Brand & Mode Tag */}
        <div className="tl-auth-transition-header">
          <Shield size={16} style={{ color: coreAccent }} />
          <span className="tl-auth-transition-brand">
            THREATLENS // {mode === 'login' ? 'AUTHENTICATION PROTOCOL' : 'SESSION TERMINATION'}
          </span>
        </div>

        {/* Central Visualization Vector Canvas */}
        <div className="tl-auth-transition-canvas">
          <svg
            viewBox="0 0 640 440"
            width="100%"
            height="100%"
            style={{ maxWidth: '580px', maxHeight: '340px' }}
            aria-hidden="true"
          >
            <defs>
              <radialGradient id={`coreGlow_${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={coreAccent} stopOpacity={shieldGlowOpacity} />
                <stop offset="65%" stopColor={coreAccent} stopOpacity={shieldGlowOpacity * 0.4} />
                <stop offset="100%" stopColor={coreAccent} stopOpacity="0" />
              </radialGradient>

              <linearGradient id={`shieldFace_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--tl-bg-surface-elev, #1A1F26)" />
                <stop offset="100%" stopColor="var(--tl-bg-canvas, #0B0D10)" />
              </linearGradient>

              <linearGradient id={`radarGrad_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={coreAccent} stopOpacity="0.3" />
                <stop offset="100%" stopColor={coreAccent} stopOpacity="0" />
              </linearGradient>

              <linearGradient id={`scanGrad_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={coreAccent} stopOpacity="0" />
                <stop offset="50%" stopColor={coreAccent} stopOpacity="0.85" />
                <stop offset="100%" stopColor={coreAccent} stopOpacity="0" />
              </linearGradient>

              <clipPath id={`shieldClip_${uid}`}>
                <path d="M320,165 L360,182 L360,226 C360,256 338,278 320,290 C302,278 280,256 280,226 L280,182 Z" />
              </clipPath>
            </defs>

            {/* Radar Perimeters & Sweeper */}
            <g id="radar-layer" opacity={isRadarActive ? 0.8 : (isCoreIlluminated ? 0.35 : 0.15)} style={{ transition: 'opacity 0.4s ease' }}>
              <circle cx="320" cy="220" r="70" fill="none" stroke="var(--tl-border-subtle, #1E232B)" strokeWidth="1" strokeDasharray="3 4" />
              <circle cx="320" cy="220" r="135" fill="none" stroke="var(--tl-border-subtle, #1E232B)" strokeWidth="1" strokeDasharray="4 6" />
              <circle cx="320" cy="220" r="195" fill="none" stroke="var(--tl-border-subtle, #1E232B)" strokeWidth="1" strokeDasharray="2 6" />

              {/* Polar Crosshairs */}
              <line x1="320" y1="20" x2="320" y2="420" stroke="var(--tl-border-subtle, #1E232B)" strokeWidth="1" strokeDasharray="2 6" opacity="0.4" />
              <line x1="120" y1="220" x2="520" y2="220" stroke="var(--tl-border-subtle, #1E232B)" strokeWidth="1" strokeDasharray="2 6" opacity="0.4" />

              {/* Rotating Radar Cone */}
              {isRadarActive && (
                <g className={`tl-auth-radar-${uid}`}>
                  <path d="M320,220 L515,220 A195,195 0 0,0 485,115 Z" fill={`url(#radarGrad_${uid})`} />
                  <line x1="320" y1="220" x2="515" y2="220" stroke={coreAccent} strokeWidth="1.5" opacity="0.75" />
                </g>
              )}
            </g>

            {/* Network Vector Paths */}
            <g id="topology-paths" opacity={isNodesVisible ? 0.65 : 0.15} style={{ transition: 'opacity 0.5s ease' }}>
              <path d="M150,110 L225,175 L320,220" stroke="var(--tl-border-default, #282E38)" strokeWidth="1.5" fill="none" />
              <path d="M320,75 L320,220" stroke="var(--tl-border-default, #282E38)" strokeWidth="1.5" fill="none" />
              <path d="M490,110 L415,175 L320,220" stroke="var(--tl-border-default, #282E38)" strokeWidth="1.5" fill="none" />
              <path d="M530,220 L320,220" stroke="var(--tl-border-default, #282E38)" strokeWidth="1.5" fill="none" />
              <path d="M490,330 L415,265 L320,220" stroke="var(--tl-border-default, #282E38)" strokeWidth="1.5" fill="none" />
              <path d="M320,365 L320,220" stroke="var(--tl-border-default, #282E38)" strokeWidth="1.5" fill="none" />
              <path d="M150,330 L225,265 L320,220" stroke="var(--tl-border-default, #282E38)" strokeWidth="1.5" fill="none" />
              <path d="M110,220 L320,220" stroke="var(--tl-border-default, #282E38)" strokeWidth="1.5" fill="none" />
            </g>

            {/* Traveling Data Packets */}
            {isPacketsFlowing && (
              <g id="packet-streams">
                <path
                  className={`tl-auth-packet-${uid}`}
                  d="M150,110 L225,175 L320,220"
                  stroke={coreAccent}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="10 120"
                  fill="none"
                />
                <path
                  className={`tl-auth-packet-${uid}`}
                  d="M490,110 L415,175 L320,220"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="10 120"
                  fill="none"
                />
                <path
                  className={`tl-auth-packet-${uid}`}
                  d="M530,220 L320,220"
                  stroke={coreAccent}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="12 140"
                  fill="none"
                />
                <path
                  className={`tl-auth-packet-${uid}`}
                  d="M150,330 L225,265 L320,220"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="10 120"
                  fill="none"
                />
              </g>
            )}

            {/* Perimeter Topology Nodes */}
            <g id="topology-nodes" opacity={isNodesVisible ? 1 : 0.25} style={{ transition: 'opacity 0.4s ease' }}>
              {/* Ingest Node 1 */}
              <circle cx="150" cy="110" r="8" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke={isNodesVisible ? '#38BDF8' : 'var(--tl-border-subtle, #1E232B)'} strokeWidth="1.5" />
              <circle cx="150" cy="110" r="3" fill={isNodesVisible ? '#38BDF8' : 'none'} />

              {/* Cloud Node 2 */}
              <circle cx="320" cy="75" r="8" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke={isNodesVisible ? coreAccent : 'var(--tl-border-subtle, #1E232B)'} strokeWidth="1.5" />
              <circle cx="320" cy="75" r="3" fill={isNodesVisible ? coreAccent : 'none'} />

              {/* Correlation Node 3 */}
              <circle cx="490" cy="110" r="8" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke={isNodesVisible ? coreAccent : 'var(--tl-border-subtle, #1E232B)'} strokeWidth="1.5" />
              <circle cx="490" cy="110" r="3" fill={isNodesVisible ? coreAccent : 'none'} />

              {/* Intel Node 4 */}
              <circle cx="530" cy="220" r="9" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke={isNodesVisible ? '#818CF8' : 'var(--tl-border-subtle, #1E232B)'} strokeWidth="1.5" />
              <circle cx="530" cy="220" r="3.5" fill={isNodesVisible ? '#818CF8' : 'none'} />

              {/* Anomaly Node 5 */}
              <circle cx="490" cy="330" r="8" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke={isNodesVisible ? coreAccent : 'var(--tl-border-subtle, #1E232B)'} strokeWidth="1.5" />
              <circle cx="490" cy="330" r="3" fill={isNodesVisible ? coreAccent : 'none'} />

              {/* Log Lake Node 6 */}
              <circle cx="320" cy="365" r="8" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke={isNodesVisible ? '#10B981' : 'var(--tl-border-subtle, #1E232B)'} strokeWidth="1.5" />
              <circle cx="320" cy="365" r="3" fill={isNodesVisible ? '#10B981' : 'none'} />

              {/* Audit Store Node 7 */}
              <circle cx="150" cy="330" r="8" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke={isNodesVisible ? '#10B981' : 'var(--tl-border-subtle, #1E232B)'} strokeWidth="1.5" />
              <circle cx="150" cy="330" r="3" fill={isNodesVisible ? '#10B981' : 'none'} />

              {/* Endpoints Node 8 */}
              <circle cx="110" cy="220" r="9" fill="var(--tl-bg-surface-elev, #1A1F26)" stroke={isNodesVisible ? '#38BDF8' : 'var(--tl-border-subtle, #1E232B)'} strokeWidth="1.5" />
              <circle cx="110" cy="220" r="3.5" fill={isNodesVisible ? '#38BDF8' : 'none'} />
            </g>

            {/* Central Security Core */}
            <g id="security-core" className={`tl-auth-core-${uid}`}>
              {/* Core Ambient Glow */}
              <circle cx="320" cy="220" r="88" fill={`url(#coreGlow_${uid})`} />

              {/* Outer Hexagonal Shield Ring */}
              <polygon
                points="320,148 376,180 376,260 320,292 264,260 264,180"
                fill="none"
                stroke={coreAccent}
                strokeWidth="1.2"
                strokeDasharray="4 8"
                opacity={isCoreIlluminated ? 0.6 : 0.2}
              />

              {/* Outer Shield Shell */}
              <path
                d="M320,158 L366,176 L366,226 C366,260 342,284 320,296 C298,284 274,260 274,226 L274,176 Z"
                fill="none"
                stroke="var(--tl-border-subtle, #1E232B)"
                strokeWidth="1"
                opacity="0.6"
              />

              {/* Main Protective Shield Face */}
              <path
                d="M320,165 L360,182 L360,226 C360,256 338,278 320,290 C302,278 280,256 280,226 L280,182 Z"
                fill={`url(#shieldFace_${uid})`}
                stroke={coreAccent}
                strokeWidth="2.2"
                strokeLinejoin="round"
                style={{ transition: 'stroke 0.4s ease' }}
              />

              {/* Inner Accent Trace */}
              <path
                d="M320,174 L350,188 L350,224 C350,248 333,266 320,276 C307,266 290,248 290,224 L290,188 Z"
                fill="none"
                stroke={coreAccent}
                strokeWidth="1"
                strokeDasharray="3 2"
                opacity={isCoreIlluminated ? 0.8 : 0.3}
              />

              {/* Central Padlock / Reticle Emblem */}
              <g transform="translate(320, 226)">
                {/* Padlock Shackle */}
                <path
                  d="M-7,-4 V-11 C-7,-15 7,-15 7,-11 V-4"
                  fill="none"
                  stroke={isCoreIlluminated ? '#FFFFFF' : 'var(--tl-text-muted, #78889B)'}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Padlock Body */}
                <rect
                  x="-10"
                  y="-4"
                  width="20"
                  height="16"
                  rx="3"
                  fill={isCoreIlluminated ? coreAccent : 'var(--tl-bg-surface, #13171D)'}
                  stroke={coreAccent}
                  strokeWidth="1"
                />
                {/* Padlock Keyhole */}
                <circle cx="0" cy="2" r="1.8" fill="#FFFFFF" />
                <path d="M0,3.8 L0,6.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
              </g>

              {/* Shield Scanning Beam */}
              {isCoreIlluminated && (
                <g clipPath={`url(#shieldClip_${uid})`}>
                  <rect
                    className={`tl-auth-scanner-${uid}`}
                    x="270"
                    y="0"
                    width="100"
                    height="6"
                    fill={`url(#scanGrad_${uid})`}
                  />
                </g>
              )}
            </g>
          </svg>
        </div>

        {/* Status Stage HUD */}
        <div className="tl-auth-transition-hud">
          <div className={`tl-auth-stage-badge ${activeStage.badgeClass}`}>
            {activeStage.icon === 'check' && <CheckCircle2 size={13} />}
            {activeStage.icon === 'shield' && <Shield size={13} />}
            {activeStage.icon === 'shieldCheck' && <ShieldCheck size={13} />}
            {activeStage.icon === 'alert' && <AlertTriangle size={13} />}
            {activeStage.icon === 'power' && <Power size={13} />}
            <span>{activeStage.title}</span>
          </div>
          <p className="tl-auth-stage-subtitle">{activeStage.subtitle}</p>

          {/* Progressive Stage Steps Bar */}
          <div className="tl-auth-progress-steps" aria-hidden="true">
            {stages.map((stg, idx) => {
              const isActive = idx === currentStageIndex;
              const isPast = idx < currentStageIndex;
              return (
                <span
                  key={stg.stage}
                  className={`tl-auth-step-dot ${isActive ? `active ${mode === 'logout' ? 'logout-step' : ''}` : ''} ${isPast ? 'completed' : ''}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

