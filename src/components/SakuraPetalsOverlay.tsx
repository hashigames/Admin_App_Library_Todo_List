import React from 'react';

interface SakuraPetalsOverlayProps {
  enabled?: boolean;
}

export const SakuraPetalsOverlay: React.FC<SakuraPetalsOverlayProps> = ({ enabled = true }) => {
  if (!enabled) return null;

  // 12 gently drifting petals distributed across viewport
  const petals = [
    { left: '4%', delay: '0s', duration: '13s', size: 16, rotate: 15 },
    { left: '12%', delay: '4s', duration: '17s', size: 14, rotate: 45 },
    { left: '22%', delay: '1.5s', duration: '15s', size: 18, rotate: -20 },
    { left: '35%', delay: '6s', duration: '19s', size: 13, rotate: 70 },
    { left: '48%', delay: '2.5s', duration: '14s', size: 17, rotate: -35 },
    { left: '58%', delay: '8s', duration: '16s', size: 15, rotate: 30 },
    { left: '68%', delay: '3.5s', duration: '18s', size: 19, rotate: -50 },
    { left: '79%', delay: '7s', duration: '13.5s', size: 14, rotate: 60 },
    { left: '88%', delay: '1s', duration: '16.5s', size: 16, rotate: -15 },
    { left: '94%', delay: '5s', duration: '20s', size: 12, rotate: 85 },
  ];

  return (
    <div
      className="fixed inset-0 pointer-events-none z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      {petals.map((petal, i) => (
        <div
          key={i}
          className="absolute -top-10 animate-sakura-fall"
          style={{
            left: petal.left,
            animationDelay: petal.delay,
            animationDuration: petal.duration,
          }}
        >
          <svg
            width={petal.size}
            height={petal.size * 1.3}
            viewBox="0 0 30 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ transform: `rotate(${petal.rotate}deg)` }}
            className="drop-shadow-[0_1px_2px_rgba(232,99,124,0.15)]"
          >
            {/* Elegant Sakura Petal path with slight heart notch */}
            <path
              d="M15 0 C22 8, 30 18, 28 28 C26 36, 19 40, 15 40 C11 40, 4 36, 2 28 C0 18, 8 8, 15 0 Z"
              fill="url(#sakura-grad)"
              opacity="0.8"
            />
            {/* Delicate petal vein */}
            <path
              d="M15 10 C15 20, 15 28, 15 35"
              stroke="#E8637C"
              strokeWidth="0.8"
              strokeOpacity="0.4"
            />
            <defs>
              <linearGradient id="sakura-grad" x1="0" y1="0" x2="30" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFF0F3" />
                <stop offset="0.6" stopColor="#FBCFE8" />
                <stop offset="1" stopColor="#E8637C" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      ))}
    </div>
  );
};
