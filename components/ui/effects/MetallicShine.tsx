import React, { useRef, useState, useCallback } from 'react';

// ─── MetallicShine ──────────────────────────────────────────────────────────
// Interactive metallic shine effect on hover. Renders a light reflection
// that follows the cursor across the surface.
//
// Usage: Wrap any card or container.
//   <MetallicShine>
//     <Card>...</Card>
//   </MetallicShine>

interface Props {
  children: React.ReactNode;
  className?: string;
  intensity?: number; // 0-1, default 0.15
  color?: 'amber' | 'white' | 'indigo';
  borderRadius?: string;
}

const SHINE_COLOR: Record<NonNullable<Props['color']>, string> = {
  amber: '245, 158, 11',
  white: '255, 255, 255',
  indigo: '99, 102, 241',
};

export function MetallicShine({
  children,
  className = '',
  intensity = 0.15,
  color = 'white',
  borderRadius = '1.25rem',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [shine, setShine] = useState({ x: 50, y: 50, active: false });

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setShine({ x, y, active: true });
    },
    [],
  );

  const handleLeave = useCallback(() => {
    setShine((s) => ({ ...s, active: false }));
  }, []);

  const rgb = SHINE_COLOR[color];

  return (
    <div
      ref={ref}
      className={`metallic-shine-wrap ${className}`}
      style={{ position: 'relative', borderRadius, overflow: 'hidden' }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
      <div
        className="metallic-shine-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          borderRadius,
          opacity: shine.active ? 1 : 0,
          background: `radial-gradient(circle 280px at ${shine.x}% ${shine.y}%, rgba(${rgb}, ${intensity}) 0%, transparent 70%)`,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  );
}

export default MetallicShine;
