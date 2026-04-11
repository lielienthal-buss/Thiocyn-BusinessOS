import React, { useEffect } from 'react';

// ─── SlideOver Panel ──────────────────────────────────────────────────────────
// Apple/Notion-style right-side slide-over for detail views.
// Click outside or ESC to dismiss. Body scroll lock while open.

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
}

const WIDTH_CLASS: Record<NonNullable<Props['width']>, string> = {
  sm: 'lt-slideover-sm',
  md: 'lt-slideover-md',
  lg: 'lt-slideover-lg',
};

export function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 'md',
  footer,
}: Props) {
  // ESC key handler + body scroll lock
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="lt-slideover-overlay" onClick={onClose}>
      <div
        className={`lt-slideover-panel ${WIDTH_CLASS[width]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="lt-slideover-header">
          <div className="flex-1 min-w-0">
            <h2 className="lt-text-h1">{title}</h2>
            {subtitle && <p className="lt-text-meta mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="lt-slideover-close" aria-label="Schließen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="lt-slideover-body">{children}</div>

        {/* Footer (optional) */}
        {footer && <div className="lt-slideover-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default SlideOver;
