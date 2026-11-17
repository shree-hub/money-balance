import React from 'react';

interface ReadinessGaugeProps {
  percentage: number;
  label: string;
  sublabel: string;
}

export const ReadinessGauge: React.FC<ReadinessGaugeProps> = ({
  percentage,
  label,
  sublabel,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  // Semi-circle arc radius = 44, circumference of half circle = pi * 44 ≈ 138.23
  const radius = 44;
  const halfCircumference = Math.PI * radius;
  const dashOffset = halfCircumference - (clamped / 100) * halfCircumference;

  // Needle angle: -90deg (0%) to +90deg (100%)
  const angleDeg = -90 + (clamped / 100) * 180;

  return (
    <div className="bg-[#1B1E24] border border-white/[0.08] rounded-2xl px-4 py-3.5 flex flex-col items-center justify-center min-w-[164px]">
      <p className="font-mono-num text-xl font-bold text-white leading-none">
        {clamped}%
      </p>
      <p className="text-[11px] text-zinc-400 mt-1 mb-2">{label}</p>

      <div className="relative w-28 h-16 flex items-end justify-center overflow-hidden">
        <svg viewBox="0 0 110 62" className="w-full h-full">
          <defs>
            <linearGradient id="emiGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0EA5E9" />
              <stop offset="55%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
          </defs>

          {/* Background track arc */}
          <path
            d="M 11 54 A 44 44 0 0 1 99 54"
            fill="none"
            stroke="#2A2F3A"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Progress arc */}
          <path
            d="M 11 54 A 44 44 0 0 1 99 54"
            fill="none"
            stroke="url(#emiGaugeGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={halfCircumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 350ms ease' }}
          />

          {/* Needle */}
          <g transform={`translate(55, 54) rotate(${angleDeg})`}>
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="-30"
              stroke="#E2E8F0"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="0" cy="0" r="3.5" fill="#38BDF8" />
          </g>
        </svg>
      </div>

      <p className="text-[11px] font-medium text-sky-400 mt-1 text-center">
        {sublabel}
      </p>
    </div>
  );
};
