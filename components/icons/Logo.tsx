import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = 'h-10' }) => {
  return (
    <svg
      viewBox="0 0 180 40"
      className={className}
      aria-label="Take A Shot Logo"
    >
      <rect width="180" height="40" rx="8" fill="black" />
      <text
        x="50%"
        y="50%"
        dy=".1em" // Vertically center
        textAnchor="middle"
        fill="white"
        fontSize="14"
        fontFamily="sans-serif"
        fontWeight="bold"
        letterSpacing="0.1em"
      >
        TAKE A SHOT
      </text>
    </svg>
  );
};

export default Logo;
