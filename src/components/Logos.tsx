import React from "react";

/**
 * High-fidelity logo for Kementerian Perumahan dan Kerajaan Tempatan (KPKT)
 */
export const LogoKPKT: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      referrerPolicy="no-referrer"
    >
      {/* Outer shield outline */}
      <path
        d="M50 8C65 8 82 12 82 28C82 58 65 85 50 92C35 85 18 58 18 28C18 12 35 8 50 8Z"
        fill="url(#kpktGrad)"
        stroke="#EAB308"
        strokeWidth="1.5"
      />
      
      {/* Crown / Star Arch */}
      <circle cx="50" cy="24" r="10" fill="#EAB308" opacity="0.15" />
      <g stroke="#EAB308" strokeWidth="1" strokeLinecap="round">
        <path d="M50 14V22M45 15L48 21M55 15L52 21M41 18L46 22M59 18L54 22" />
        <circle cx="50" cy="14" r="1.5" fill="#EAB308" />
        <circle cx="45" cy="15" r="1" fill="#EAB308" />
        <circle cx="55" cy="15" r="1" fill="#EAB308" />
        <circle cx="41" cy="18" r="1" fill="#EAB308" />
        <circle cx="59" cy="18" r="1" fill="#EAB308" />
      </g>

      {/* Crescent moon representation of Malaysia */}
      <path
        d="M44 38C40 43 40 50 44 54C47 57 51 57 54 55C51 55 47 52 47 47C47 42 50 39 53 38C50 37 46 37 44 38Z"
        fill="#EAB308"
      />

      {/* Twin Towers / Modern Infrastructure Pillars in the middle */}
      <g fill="#F8FAFC" opacity="0.9">
        <rect x="44" y="44" width="4" height="24" rx="0.5" />
        <rect x="52" y="44" width="4" height="24" rx="0.5" />
        {/* Skybridge */}
        <rect x="46" y="50" width="8" height="2" />
        {/* Foundation curves */}
        <path d="M34 68C44 70 56 70 66 68L64 74C56 75 44 75 36 74L34 68Z" fill="#EF4444" />
      </g>

      {/* National star */}
      <polygon
        points="50,28 51,31 54,31 52,33 53,36 50,34 47,36 48,33 46,31 49,31"
        fill="#EAB308"
      />

      {/* Typography Badge */}
      <text
        x="50"
        y="83"
        fill="#FFFFFF"
        fontWeight="bold"
        fontSize="8"
        textAnchor="middle"
        fontFamily="sans-serif"
        letterSpacing="0.5"
      >
        KPKT
      </text>

      <defs>
        <linearGradient id="kpktGrad" x1="50" y1="8" x2="50" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E3A8A" />
          <stop offset="0.6" stopColor="#0F172A" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
      </defs>
    </svg>
  );
};

/**
 * PLANMalaysia Department Shield Logo
 */
export const LogoPLANMalaysia: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      referrerPolicy="no-referrer"
    >
      {/* Circular Emblem */}
      <circle cx="50" cy="50" r="44" fill="#020617" stroke="#3B82F6" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="41" stroke="#EAB308" strokeWidth="1" />
      
      {/* Globe longitude/latitude grids (Symbolizing planning of the space) */}
      <path
        d="M50 9A41 41 0 0 0 50 91"
        stroke="#3B82F6"
        strokeWidth="0.75"
        strokeDasharray="2 2"
        opacity="0.6"
      />
      <path
        d="M19 50A31 31 0 0 0 81 50"
        stroke="#3B82F6"
        strokeWidth="0.75"
        strokeDasharray="2 2"
        opacity="0.6"
      />
      <ellipse
        cx="50"
        cy="50"
        rx="22"
        ry="41"
        stroke="#1E40AF"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
      <ellipse
        cx="50"
        cy="50"
        rx="41"
        ry="15"
        stroke="#1E40AF"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />

      {/* Elegant Golden Compass Star in middle (Planning direction) */}
      <g transform="translate(50, 50)">
        {/* Core circle */}
        <circle cx="0" cy="0" r="6" fill="#EAB308" />
        
        {/* Compass points */}
        <polygon points="0,-24 5,-6 0,-2 5,-2" fill="#F59E0B" />
        <polygon points="0,-24 -5,-6 0,-2 -5,-2" fill="#D97706" />
        
        <polygon points="0,24 5,6 0,2 5,2" fill="#D97706" />
        <polygon points="0,24 -5,6 0,2 -5,2" fill="#F59E0B" />
        
        <polygon points="24,0 6,5 2,0 2,5" fill="#F59E0B" />
        <polygon points="24,0 6,-5 2,0 2,-5" fill="#D97706" />
        
        <polygon points="-24,0 -6,5 -2,0 -2,5" fill="#D97706" />
        <polygon points="-24,0 -6,-5 -2,0 -2,-5" fill="#F59E0B" />
      </g>

      {/* Inner modern layout blocks (Symbolizing urban design blueprint) */}
      <path
        d="M34 68H45V58H34V68ZM55 68H66V58H55V68ZM34 42H45V32H34V42ZM55 42H66V32H55V42Z"
        fill="#60A5FA"
        opacity="0.45"
      />

      {/* Text ring representing PLANMalaysia */}
      <path id="planPath" d="M 18,50 A 32,32 0 1,1 82,50" fill="none" />
      <text fill="#FFFFFF" fontSize="6.5" fontWeight="900" letterSpacing="0.8">
        <textPath href="#planPath" startOffset="50%" textAnchor="middle">
          PLANMALAYSIA • JABATAN PERANCANGAN BANDAR & DESA
        </textPath>
      </text>

      {/* Secondary text path (bottom) */}
      <path id="planBottomPath" d="M 82,50 A 32,32 0 0,1 18,50" fill="none" />
      <text fill="#FEF08A" fontSize="5.5" fontWeight="bold" letterSpacing="0.4">
        <textPath href="#planBottomPath" startOffset="50%" textAnchor="middle">
          KEMENTERIAN PERUMAHAN & KERAJAAN TEMPATAN
        </textPath>
      </text>
    </svg>
  );
};

/**
 * Pejabat Projek Zon Utara (PPZU) Branch Specifier Emblem
 */
export const LogoPPZU: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      referrerPolicy="no-referrer"
    >
      {/* Emerald base symbolizing North State Forestry and Coastal Area */}
      <rect x="8" y="8" width="84" height="84" rx="20" fill="url(#ppzuGrad)" stroke="#10B981" strokeWidth="1.5" />
      {/* Blueprint Grid Lines on background */}
      <g stroke="#10B981" strokeWidth="0.5" opacity="0.3">
        <line x1="8" y1="28" x2="92" y2="28" />
        <line x1="8" y1="48" x2="92" y2="48" />
        <line x1="8" y1="68" x2="92" y2="68" />
        <line x1="28" y1="8" x2="28" y2="92" />
        <line x1="48" y1="8" x2="48" y2="92" />
        <line x1="68" y1="8" x2="68" y2="92" />
      </g>

      {/* Northern Pointer stylized compass arrow pointing North-West to target Kedah, Perlis, Perak, Penang */}
      <g transform="translate(50, 46) rotate(-45)">
        <polygon points="0,-22 8,2 0,-3 -8,2" fill="#EAB308" stroke="#F59E0B" strokeWidth="1" />
        <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
      </g>

      {/* Dynamic Northern Region map contour lines or grid dots */}
      <circle cx="28" cy="28" r="2" fill="#10B981" /> {/* Perlis */}
      <circle cx="34" cy="40" r="2" fill="#10B981" /> {/* Kedah */}
      <circle cx="28" cy="52" r="2" fill="#10B981" /> {/* Penang */}
      <circle cx="44" cy="68" r="2" fill="#10B981" /> {/* Perak */}

      {/* Dotted border loop */}
      <rect x="14" y="14" width="72" height="72" rx="14" stroke="#6EE7B7" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />

      {/* Monogram PPZU and text */}
      <text
        x="50"
        y="75"
        fill="#FFFFFF"
        fontWeight="900"
        fontSize="12"
        textAnchor="middle"
        fontFamily="monospace"
        letterSpacing="1"
      >
        PPZU
      </text>
      <text
        x="50"
        y="84"
        fill="#6EE7B7"
        fontWeight="bold"
        fontSize="5.5"
        textAnchor="middle"
        fontFamily="sans-serif"
        letterSpacing="0.2"
      >
        ZON UTARA
      </text>

      <defs>
        <linearGradient id="ppzuGrad" x1="8" y1="8" x2="92" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#064E3B" />
          <stop offset="0.7" stopColor="#061F12" />
          <stop offset="1" stopColor="#022C22" />
        </linearGradient>
      </defs>
    </svg>
  );
};
