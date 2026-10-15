import React from 'react';

interface LighthouseLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const LighthouseLogo: React.FC<LighthouseLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  const iconDimensions = {
    sm: { width: 36, height: 36 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Precision Vector Lighthouse Logo matching provided reference */}
      <svg
        width={iconDimensions.width}
        height={iconDimensions.height}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm"
      >
        {/* Lighthouse Tower Body with Navy and Off-white diagonal bands */}
        <g id="lighthouse-tower">
          {/* Top finial / spire */}
          <path d="M78 18L80 12L82 18H78Z" fill="#1E2A5E" />
          <circle cx="80" cy="12" r="2.5" fill="#1E2A5E" />

          {/* Lantern Dome */}
          <path
            d="M68 28C68 21.3726 73.3726 18 80 18C86.6274 18 92 21.3726 92 28H68Z"
            fill="#1E2A5E"
          />

          {/* Lantern Room / Glass Gallery */}
          <rect x="71" y="28" width="18" height="12" fill="#FAF7F0" />
          {/* Windows panes */}
          <line x1="71" y1="34" x2="89" y2="34" stroke="#1E2A5E" strokeWidth="1.5" />
          <line x1="77" y1="28" x2="77" y2="40" stroke="#1E2A5E" strokeWidth="1.5" />
          <line x1="83" y1="28" x2="83" y2="40" stroke="#1E2A5E" strokeWidth="1.5" />

          {/* Gallery Railing Balcony */}
          <rect x="66" y="40" width="28" height="4" rx="1" fill="#1E2A5E" />
          <line x1="68" y1="38" x2="92" y2="38" stroke="#1E2A5E" strokeWidth="1.5" />

          {/* Tower Section 1 (Navy) */}
          <polygon points="69,44 91,44 94,62 66,62" fill="#1E2A5E" />
          
          {/* Upper Window */}
          <path d="M77 50C77 48.5 78.5 47.5 80 47.5C81.5 47.5 83 48.5 83 50V56H77V50Z" fill="#FAF7F0" />

          {/* Tower Section 2 (White diagonal stripe) */}
          <polygon points="66,62 94,62 97,80 63,80" fill="#FAF7F0" />
          <polygon points="66,62 76,62 64,80 63,80" fill="#1E2A5E" />
          <polygon points="84,62 94,62 97,80 88,80" fill="#1E2A5E" />

          {/* Tower Section 3 (Navy band) */}
          <polygon points="63,80 97,80 101,102 59,102" fill="#1E2A5E" />

          {/* Middle Arched Window in navy band */}
          <path d="M78 86C78 84.5 79.2 83.5 80.5 83.5C81.8 83.5 83 84.5 83 86V92H78V86Z" fill="#FAF7F0" />

          {/* Lower diagonal stripe */}
          <polygon points="59,102 101,102 105,124 55,124" fill="#FAF7F0" />
          <polygon points="59,102 67,102 57,124 55,124" fill="#1E2A5E" />
          <polygon points="88,102 101,102 105,124 97,124" fill="#1E2A5E" />

          {/* Arched Entrance Doorway */}
          <path d="M75 110C75 107 77.2 105 80 105C82.8 105 85 107 85 110V124H75V110Z" fill="#1E2A5E" />
        </g>

        {/* Dual Flowing Ocean Waves in Bright Sea Cyan */}
        <g id="ocean-waves">
          {/* Wave 1 */}
          <path
            d="M20 134C35 125 55 124 75 135C95 146 115 146 135 133C142 128 148 122 152 116C145 124 136 130 126 133C104 139 88 132 72 124C52 114 36 117 20 134Z"
            fill="#0097B2"
          />
          {/* Wave 2 */}
          <path
            d="M32 144C48 136 68 136 86 145C102 153 120 152 138 140C144 136 148 131 152 126C146 133 138 138 128 141C110 147 94 142 80 135C62 126 48 129 32 144Z"
            fill="#0284C7"
          />
        </g>
      </svg>

      {/* Brand Text Stack matching LightHouse 橋 */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-bold tracking-wider text-[#1E2A5E] dark:text-[#E2E8F0] font-sans text-xl sm:text-2xl">
            LIGHTHOUSE
          </span>
          <span className="font-black text-[#DC2626] font-serif-jp text-2xl sm:text-3xl ml-0.5">
            橋
          </span>
          <span className="text-[#1E2A5E] dark:text-[#94A3B8] font-bold text-sm tracking-tight">
            i
          </span>
        </div>

        {showSubtitle && (
          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-[#1E2A5E]/75 dark:text-slate-400 font-semibold">
              PROTOTYPE SOFTWARE PIPELINE
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F5A623]"></span>
            <span className="font-serif-jp text-xs sm:text-sm font-bold text-[#1E2A5E] dark:text-amber-300">
              燈台文庫
            </span>
            <span
              className="text-[10px] sm:text-[11px] font-bold text-[#0097B2] dark:text-[#38BDF8] bg-[#0097B2]/10 dark:bg-[#0097B2]/20 border border-[#0097B2]/25 px-2 py-0.5 rounded-full font-serif-jp tracking-wider shadow-2xs"
              title="ひらがな名称: とうだいぶんこ (Japanese Market Hiragana: Toudai Bunko)"
            >
              とうだいぶんこ
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
