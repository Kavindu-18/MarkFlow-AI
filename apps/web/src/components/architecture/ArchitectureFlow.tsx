'use client';

/**
 * Critical-path architecture diagram showing the three ingestion flows:
 *  1. Teacher Mobile (OpenCV.js) → deskewed images → API Gateway
 *  2. School ADF Scanner → multi-page PDFs → API Gateway
 *  3. LMS Systems → LTI 1.3 SSO → LTI Service
 *
 * All arrows animate with a flowing dash pattern.
 */

export function ArchitectureFlow() {
  return (
    <div className="relative w-full overflow-hidden">
      {/* SVG Diagram */}
      <svg
        viewBox="0 0 960 520"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
      >
        <defs>
          {/* Animated dash for arrows */}
          <style>{`
            .flow-arrow {
              stroke-dasharray: 8 6;
              animation: flowDash 1.2s linear infinite;
            }
            @keyframes flowDash {
              to { stroke-dashoffset: -14; }
            }
            .pulse-ring {
              animation: pulseRing 2.5s ease-in-out infinite;
            }
            @keyframes pulseRing {
              0%, 100% { opacity: 0.15; r: 38; }
              50%      { opacity: 0.35; r: 44; }
            }
            .node-hover { transition: filter 0.2s; }
            .node-hover:hover { filter: brightness(1.2); }
          `}</style>

          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient for arrows */}
          <linearGradient id="arrowGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="arrowGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="arrowGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0.5" />
          </linearGradient>

          {/* Card gradient */}
          <linearGradient id="cardFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.06" />
            <stop offset="100%" stopColor="white" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* ─── CONNECTION ARROWS ──────────────────────── */}

        {/* Arrow 1: Mobile → API Gateway */}
        <path
          d="M 200 130 C 280 130, 380 200, 440 215"
          stroke="url(#arrowGrad1)"
          strokeWidth="2"
          className="flow-arrow"
          fill="none"
        />
        {/* Arrow label */}
        <text x="280" y="152" fill="#a78bfa" fontSize="9" fontWeight="600" fontFamily="Inter, system-ui, sans-serif" opacity="0.7">
          Deskewed images
        </text>

        {/* Arrow 2: ADF Scanner → API Gateway */}
        <path
          d="M 200 265 L 440 250"
          stroke="url(#arrowGrad2)"
          strokeWidth="2"
          className="flow-arrow"
          fill="none"
        />
        <text x="280" y="245" fill="#38bdf8" fontSize="9" fontWeight="600" fontFamily="Inter, system-ui, sans-serif" opacity="0.7">
          Multi-page PDFs
        </text>

        {/* Arrow 3: LMS → LTI Service */}
        <path
          d="M 200 400 C 280 400, 380 380, 440 370"
          stroke="url(#arrowGrad3)"
          strokeWidth="2"
          className="flow-arrow"
          fill="none"
        />
        <text x="280" y="378" fill="#fb923c" fontSize="9" fontWeight="600" fontFamily="Inter, system-ui, sans-serif" opacity="0.7">
          LTI 1.3 SSO
        </text>

        {/* Arrow: API Gateway → Pipeline */}
        <path
          d="M 600 230 L 720 230"
          stroke="url(#arrowGrad1)"
          strokeWidth="2"
          className="flow-arrow"
          fill="none"
        />
        <text x="628" y="220" fill="#a78bfa" fontSize="8" fontWeight="500" fontFamily="Inter, system-ui, sans-serif" opacity="0.5">
          Event Hub
        </text>

        {/* Arrow: LTI Service → Pipeline */}
        <path
          d="M 600 370 C 660 370, 700 300, 720 270"
          stroke="url(#arrowGrad3)"
          strokeWidth="2"
          className="flow-arrow"
          fill="none"
        />

        {/* ─── LEFT COLUMN: SOURCES ────────────────────── */}

        {/* 1. Teacher Mobile Device */}
        <g className="node-hover" style={{ cursor: 'default' }}>
          {/* Pulse ring */}
          <circle cx="110" cy="130" fill="#a78bfa" opacity="0.15" className="pulse-ring" r="38" />
          {/* Card */}
          <rect x="32" y="82" width="156" height="96" rx="16" fill="url(#cardFill)" stroke="#a78bfa" strokeOpacity="0.25" strokeWidth="1" />
          {/* Smartphone icon */}
          <g transform="translate(88, 96)">
            <rect x="0" y="0" width="16" height="26" rx="3" stroke="#a78bfa" strokeWidth="1.5" fill="none" />
            <line x1="5" y1="22" x2="11" y2="22" stroke="#a78bfa" strokeWidth="1" strokeLinecap="round" />
            <rect x="3" y="4" width="10" height="13" rx="1" fill="#a78bfa" fillOpacity="0.15" />
          </g>
          {/* Label */}
          <text x="110" y="140" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
            Teacher Mobile
          </text>
          <text x="110" y="153" textAnchor="middle" fill="#a78bfa" fontSize="8" fontWeight="500" fontFamily="Inter, system-ui, sans-serif" opacity="0.7">
            React + OpenCV.js
          </text>
          <text x="110" y="165" textAnchor="middle" fill="white" fontSize="7" fontFamily="Inter, system-ui, sans-serif" opacity="0.3">
            Edge perspective correction
          </text>
        </g>

        {/* 2. School ADF Scanner */}
        <g className="node-hover" style={{ cursor: 'default' }}>
          <circle cx="110" cy="265" fill="#38bdf8" opacity="0.15" className="pulse-ring" r="38" style={{ animationDelay: '0.8s' }} />
          <rect x="32" y="217" width="156" height="96" rx="16" fill="url(#cardFill)" stroke="#38bdf8" strokeOpacity="0.25" strokeWidth="1" />
          {/* Printer/Scanner icon */}
          <g transform="translate(88, 230)">
            <rect x="0" y="8" width="20" height="12" rx="2" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
            <path d="M4 8V2h12v6" stroke="#38bdf8" strokeWidth="1.2" fill="none" />
            <path d="M4 20v4h12v-4" stroke="#38bdf8" strokeWidth="1.2" fill="none" />
            <circle cx="15" cy="13" r="1.5" fill="#38bdf8" fillOpacity="0.5" />
          </g>
          <text x="110" y="275" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
            ADF Scanner
          </text>
          <text x="110" y="288" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="500" fontFamily="Inter, system-ui, sans-serif" opacity="0.7">
            Network Scanner
          </text>
          <text x="110" y="300" textAnchor="middle" fill="white" fontSize="7" fontFamily="Inter, system-ui, sans-serif" opacity="0.3">
            Batch scan 30+ pages
          </text>
        </g>

        {/* 3. LMS Systems */}
        <g className="node-hover" style={{ cursor: 'default' }}>
          <circle cx="110" cy="400" fill="#fb923c" opacity="0.15" className="pulse-ring" r="38" style={{ animationDelay: '1.6s' }} />
          <rect x="32" y="352" width="156" height="96" rx="16" fill="url(#cardFill)" stroke="#fb923c" strokeOpacity="0.25" strokeWidth="1" />
          {/* LMS/Monitor icon */}
          <g transform="translate(88, 365)">
            <rect x="0" y="0" width="20" height="15" rx="2" stroke="#fb923c" strokeWidth="1.5" fill="none" />
            <line x1="10" y1="15" x2="10" y2="20" stroke="#fb923c" strokeWidth="1.2" />
            <line x1="5" y1="20" x2="15" y2="20" stroke="#fb923c" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="4" y1="5" x2="16" y2="5" stroke="#fb923c" strokeWidth="0.8" opacity="0.4" />
            <line x1="4" y1="8" x2="12" y2="8" stroke="#fb923c" strokeWidth="0.8" opacity="0.4" />
          </g>
          <text x="110" y="410" textAnchor="middle" fill="white" fontSize="10" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
            LMS Systems
          </text>
          <text x="110" y="423" textAnchor="middle" fill="#fb923c" fontSize="8" fontWeight="500" fontFamily="Inter, system-ui, sans-serif" opacity="0.7">
            Canvas / Moodle / BB
          </text>
          <text x="110" y="435" textAnchor="middle" fill="white" fontSize="7" fontFamily="Inter, system-ui, sans-serif" opacity="0.3">
            LTI 1.3 launch + grade passback
          </text>
        </g>

        {/* ─── MIDDLE: API GATEWAY & LTI SERVICE ──────── */}

        {/* API Gateway */}
        <g className="node-hover" style={{ cursor: 'default' }}>
          <rect x="440" y="180" width="160" height="100" rx="16" fill="url(#cardFill)" stroke="#818cf8" strokeOpacity="0.3" strokeWidth="1.5" filter="url(#glow)" />
          {/* Top highlight */}
          <line x1="456" y1="181" x2="584" y2="181" stroke="white" strokeOpacity="0.12" strokeWidth="1" />
          {/* Shield icon */}
          <g transform="translate(504, 198)">
            <path d="M8 0L0 4v6c0 5.25 3.4 10.2 8 11.5 4.6-1.3 8-6.25 8-11.5V4L8 0z" stroke="#818cf8" strokeWidth="1.5" fill="#818cf8" fillOpacity="0.1" />
            <polyline points="5 10 7.5 12.5 12 7" stroke="#818cf8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <text x="520" y="238" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
            API Gateway
          </text>
          <text x="520" y="252" textAnchor="middle" fill="#818cf8" fontSize="8" fontWeight="500" fontFamily="Inter, system-ui, sans-serif" opacity="0.7">
            Go / Chi Router
          </text>
          <text x="520" y="266" textAnchor="middle" fill="white" fontSize="7" fontFamily="Inter, system-ui, sans-serif" opacity="0.3">
            Auth + Upload + Events
          </text>
        </g>

        {/* LTI Service */}
        <g className="node-hover" style={{ cursor: 'default' }}>
          <rect x="440" y="320" width="160" height="100" rx="16" fill="url(#cardFill)" stroke="#f472b6" strokeOpacity="0.3" strokeWidth="1.5" filter="url(#glow)" />
          <line x1="456" y1="321" x2="584" y2="321" stroke="white" strokeOpacity="0.12" strokeWidth="1" />
          {/* Key icon */}
          <g transform="translate(506, 338)">
            <circle cx="6" cy="6" r="5" stroke="#f472b6" strokeWidth="1.5" fill="#f472b6" fillOpacity="0.1" />
            <line x1="11" y1="6" x2="20" y2="6" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="17" y1="3" x2="17" y2="6" stroke="#f472b6" strokeWidth="1.2" />
            <line x1="20" y1="3" x2="20" y2="6" stroke="#f472b6" strokeWidth="1.2" />
          </g>
          <text x="520" y="378" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
            LTI Service
          </text>
          <text x="520" y="392" textAnchor="middle" fill="#f472b6" fontSize="8" fontWeight="500" fontFamily="Inter, system-ui, sans-serif" opacity="0.7">
            OIDC + Deep Link + AGS
          </text>
          <text x="520" y="406" textAnchor="middle" fill="white" fontSize="7" fontFamily="Inter, system-ui, sans-serif" opacity="0.3">
            Grade passback to LMS
          </text>
        </g>

        {/* ─── RIGHT: AI PIPELINE ──────────────────────── */}

        <g className="node-hover" style={{ cursor: 'default' }}>
          <rect x="720" y="182" width="200" height="140" rx="16" fill="url(#cardFill)" stroke="#8b5cf6" strokeOpacity="0.2" strokeWidth="1.5" />
          <line x1="736" y1="183" x2="904" y2="183" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
          {/* Brain/Sparkle icon */}
          <g transform="translate(800, 200)">
            <path d="M10 1l-1.5 4.5a2 2 0 01-1.2 1.2L3 8l4.3 1.3a2 2 0 011.2 1.2L10 15l1.5-4.5a2 2 0 011.2-1.2L17 8l-4.3-1.3a2 2 0 01-1.2-1.2L10 1z" stroke="#8b5cf6" strokeWidth="1.5" fill="#8b5cf6" fillOpacity="0.15" />
          </g>
          <text x="820" y="232" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
            AI Grading Pipeline
          </text>
          <text x="820" y="248" textAnchor="middle" fill="#8b5cf6" fontSize="8" fontWeight="500" fontFamily="Inter, system-ui, sans-serif" opacity="0.7">
            Databricks + Azure AI
          </text>

          {/* Pipeline steps - mini boxes */}
          <g transform="translate(735, 262)">
            {[
              { label: 'PDF Split', color: '#a78bfa' },
              { label: 'QR Decode', color: '#818cf8' },
              { label: 'Layout', color: '#6366f1' },
              { label: 'AI Grade', color: '#8b5cf6' },
              { label: 'Aggregate', color: '#7c3aed' },
            ].map((step, i) => (
              <g key={step.label} transform={`translate(${i * 36}, 0)`}>
                <rect x="0" y="0" width="32" height="22" rx="6" fill={step.color} fillOpacity="0.12" stroke={step.color} strokeOpacity="0.3" strokeWidth="0.8" />
                <text x="16" y="14" textAnchor="middle" fill={step.color} fontSize="6" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
                  {step.label}
                </text>
              </g>
            ))}
          </g>

          {/* Arrow chain */}
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1={735 + i * 36 + 32}
              y1={273}
              x2={735 + (i + 1) * 36}
              y2={273}
              stroke="#8b5cf6"
              strokeOpacity="0.3"
              strokeWidth="1"
              markerEnd=""
            />
          ))}

          {/* Output labels */}
          <text x="820" y="302" textAnchor="middle" fill="white" fontSize="7" fontFamily="Inter, system-ui, sans-serif" opacity="0.3">
            Doc Intelligence | GPT-4o | Mathpix | Deterministic
          </text>
        </g>

        {/* ─── Arrowheads (tiny triangles at path ends) ── */}
        <polygon points="440,215 434,210 434,220" fill="#818cf8" opacity="0.6" />
        <polygon points="440,250 434,245 434,255" fill="#38bdf8" opacity="0.6" />
        <polygon points="440,370 434,365 434,375" fill="#fb923c" opacity="0.6" />
        <polygon points="720,230 714,225 714,235" fill="#818cf8" opacity="0.5" />
        <polygon points="720,270 714,265 714,275" fill="#f472b6" opacity="0.5" />

      </svg>
    </div>
  );
}
