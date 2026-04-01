import React from 'react';
import { useBrand } from '@/lib/BrandContext';
import type { Brand } from '@/lib/BrandContext';

interface BrandSwitcherProps {
  showAllOption?: boolean;    // default: true
  showPaused?: boolean;       // default: false
  size?: 'sm' | 'md';        // default: 'sm'
  compact?: boolean;          // icon-only mode for tight spaces (default: false)
  className?: string;
}

const BrandSwitcher: React.FC<BrandSwitcherProps> = ({
  showAllOption = true,
  showPaused = false,
  size = 'sm',
  compact = false,
  className = '',
}) => {
  const { brands, activeBrand, setActiveBrand } = useBrand();

  const visibleBrands = showPaused ? brands : brands.filter(b => b.status === 'active');

  const pillBase =
    size === 'sm'
      ? 'px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer select-none'
      : 'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer select-none';

  const inactiveCls = 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] border border-white/[0.08]';
  const activeCls   = 'text-white shadow-sm border border-white/[0.15]';

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {showAllOption && (
        <button
          onClick={() => setActiveBrand(null)}
          className={`${pillBase} ${
            activeBrand === null
              ? 'bg-white/[0.15] text-white border border-white/[0.20]'
              : inactiveCls
          }`}
        >
          {compact ? '✦' : 'All Brands'}
        </button>
      )}

      {visibleBrands.map((brand: Brand) => {
        const isActive = activeBrand?.slug === brand.slug;
        return (
          <button
            key={brand.slug}
            onClick={() => setActiveBrand(isActive ? null : brand)}
            className={`${pillBase} ${isActive ? activeCls : inactiveCls} ${brand.status === 'paused' ? 'opacity-60' : ''}`}
            style={isActive ? { backgroundColor: brand.color } : {}}
            title={`${brand.name}${brand.status === 'paused' ? ' (paused)' : ''}`}
          >
            <span>{brand.emoji}</span>
            {!compact && <span className="ml-1">{brand.name}</span>}
            {!compact && brand.status === 'paused' && (
              <span className="ml-1 text-[10px] opacity-70">⏸</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default BrandSwitcher;
