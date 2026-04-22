import React from 'react';

// HSB — House of Sustainable Brands. Inline SVG = no CDN dependency.
const Logo: React.FC<{ className?: string }> = ({ className = 'h-10' }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 200 56"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="HSB — House of Sustainable Brands"
      role="img"
    >
      <defs>
        <linearGradient id="hsbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"  stopColor="#0F766E" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <rect x="2" y="6" width="44" height="44" rx="10" fill="url(#hsbGrad)" />
      <text
        x="24" y="38"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontWeight="800"
        fontSize="22"
        fill="#FFFFFF"
        letterSpacing="-1"
      >HSB</text>
      <text
        x="58" y="32"
        fontFamily="Inter, sans-serif"
        fontWeight="700"
        fontSize="18"
        fill="currentColor"
        letterSpacing="-0.5"
      >House of</text>
      <text
        x="58" y="48"
        fontFamily="Inter, sans-serif"
        fontWeight="500"
        fontSize="11"
        fill="currentColor"
        opacity="0.7"
        letterSpacing="0.6"
      >SUSTAINABLE BRANDS</text>
    </svg>
  );
};

export default Logo;
