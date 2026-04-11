import React from 'react';

// ─── Table ────────────────────────────────────────────────────────────────────
// Light glass table wrapper. Use with native <thead><tbody><tr><td>.
// Use lt-td-vendor / lt-td-meta / lt-td-amount / lt-td-action helper classes
// on cells for semantic styling.

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: Props) {
  return (
    <div className={`lt-table-wrapper ${className}`}>
      <div className="overflow-x-auto">
        <table className="lt-table">{children}</table>
      </div>
    </div>
  );
}

export default Table;
