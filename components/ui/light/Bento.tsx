import React from 'react';

// ─── Bento Grid ───────────────────────────────────────────────────────────────
// Configurable grid wrapper. Bento children should be Card or Card-like.
//
// Usage:
//   <Bento cols={{ sm: 1, md: 2, lg: 3 }} gap="md">
//     <Card colSpan={2}>Big</Card>
//     <Card>Small</Card>
//   </Bento>
//
// Items get sized via className `lt-col-span-X` (1-4).

interface ColsConfig {
  sm?: number;
  md?: number;
  lg?: number;
}

interface Props {
  children: React.ReactNode;
  cols?: ColsConfig;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const GAP_CLASS: Record<NonNullable<Props['gap']>, string> = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
};

function colsToClass(cols: ColsConfig): string {
  const classes: string[] = [];
  if (cols.sm) classes.push(`grid-cols-${cols.sm}`);
  if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
  if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
  return classes.join(' ');
}

export function Bento({
  children,
  cols = { sm: 1, md: 2, lg: 3 },
  gap = 'md',
  className = '',
}: Props) {
  return (
    <div className={`grid ${colsToClass(cols)} ${GAP_CLASS[gap]} ${className}`}>
      {children}
    </div>
  );
}

// ─── BentoItem — wraps content with col-span control ─────────────────────────

interface ItemProps {
  children: React.ReactNode;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  className?: string;
}

const COL_SPAN: Record<NonNullable<ItemProps['colSpan']>, string> = {
  1: '',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
};

const ROW_SPAN: Record<NonNullable<ItemProps['rowSpan']>, string> = {
  1: '',
  2: 'md:row-span-2',
};

export function BentoItem({ children, colSpan = 1, rowSpan = 1, className = '' }: ItemProps) {
  return <div className={`${COL_SPAN[colSpan]} ${ROW_SPAN[rowSpan]} ${className}`}>{children}</div>;
}

export default Bento;
