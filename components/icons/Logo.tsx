import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = 'h-10' }) => {
  return (
    <img
      src="https://thiocyn.com/cdn/shop/files/logo.svg?v=1684917460&width=120"
      alt="Thiocyn"
      className={className}
      style={{}}
    />
  );
};

export default Logo;
