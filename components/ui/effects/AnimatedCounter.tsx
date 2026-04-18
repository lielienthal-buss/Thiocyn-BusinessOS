import React, { useEffect, useRef, useState } from 'react';

// ─── AnimatedCounter ────────────────────────────────────────────────────────
// Counts up from 0 to target value on mount. No external dependencies.
//
// Usage:
//   <AnimatedCounter value={42806} format="currency" />
//   <AnimatedCounter value={12.4} format="percent" suffix="%" />

interface Props {
  value: number;
  duration?: number; // ms, default 1200
  format?: 'number' | 'currency' | 'percent';
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

const easeOutExpo = (t: number): number =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

export function AnimatedCounter({
  value,
  duration = 1200,
  format = 'number',
  prefix = '',
  suffix = '',
  decimals,
  className = '',
}: Props) {
  const [display, setDisplay] = useState('0');
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (value == null || isNaN(value)) {
      setDisplay('—');
      return;
    }

    const d = decimals ?? (format === 'percent' ? 1 : format === 'currency' ? 0 : 0);

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = eased * value;

      let formatted: string;
      if (format === 'currency') {
        formatted = new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: d,
        }).format(current);
      } else {
        formatted = new Intl.NumberFormat('de-DE', {
          maximumFractionDigits: d,
        }).format(current);
      }

      setDisplay(formatted);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    startRef.current = 0;
    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration, format, decimals]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

export default AnimatedCounter;
