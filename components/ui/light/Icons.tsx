import React from 'react';

// ─── Icons ────────────────────────────────────────────────────────────────────
// Heroicons / Phosphor / Stripe-style stroke icons.
// All use currentColor so they inherit text color. Default size 20px.

interface IconProps {
  className?: string;
  size?: number;
}

const baseProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const IconAlert = ({ className = '', size = 20 }: IconProps) => (
  <svg className={className} {...baseProps(size)}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const IconFlame = ({ className = '', size = 20 }: IconProps) => (
  <svg className={className} {...baseProps(size)}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

export const IconCheck = ({ className = '', size = 14 }: IconProps) => (
  <svg className={className} {...baseProps(size)} strokeWidth={3}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const IconPlus = ({ className = '', size = 16 }: IconProps) => (
  <svg className={className} {...baseProps(size)} strokeWidth={2.5}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const IconClose = ({ className = '', size = 20 }: IconProps) => (
  <svg className={className} {...baseProps(size)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const IconChevronRight = ({ className = '', size = 16 }: IconProps) => (
  <svg className={className} {...baseProps(size)}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const IconChevronDown = ({ className = '', size = 16 }: IconProps) => (
  <svg className={className} {...baseProps(size)}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const IconExternalLink = ({ className = '', size = 14 }: IconProps) => (
  <svg className={className} {...baseProps(size)}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

export const IconCalendar = ({ className = '', size = 16 }: IconProps) => (
  <svg className={className} {...baseProps(size)}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const IconCash = ({ className = '', size = 18 }: IconProps) => (
  <svg className={className} {...baseProps(size)}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

export const IconClock = ({ className = '', size = 16 }: IconProps) => (
  <svg className={className} {...baseProps(size)}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const IconBuilding = ({ className = '', size = 16 }: IconProps) => (
  <svg className={className} {...baseProps(size)}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="9" x2="9" y2="9" />
    <line x1="9" y1="15" x2="9" y2="15" />
    <line x1="15" y1="9" x2="15" y2="9" />
    <line x1="15" y1="15" x2="15" y2="15" />
  </svg>
);

export const IconDocument = ({ className = '', size = 16 }: IconProps) => (
  <svg className={className} {...baseProps(size)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

export const IconTrash = ({ className = '', size = 16 }: IconProps) => (
  <svg className={className} {...baseProps(size)}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
