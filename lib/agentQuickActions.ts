export interface QuickAction {
  label: string;
  prompt: string;
  emoji: string;
}

export const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  home: [
    {
      emoji: '☀️',
      label: 'Daily brief',
      prompt: 'Give me a quick daily briefing: what tasks are due today, any urgent items, and key metrics.',
    },
    {
      emoji: '📋',
      label: 'Summarize status',
      prompt: 'Summarize the current status across all areas: open tasks, pending items, and what needs my attention.',
    },
  ],
  marketing: [
    {
      emoji: '🪝',
      label: 'Generate hook',
      prompt:
        'Generate 3 strong video hooks for Thiocyn targeting German-speaking audiences aged 25-45 concerned about hair loss.',
    },
    {
      emoji: '📅',
      label: 'Plan content week',
      prompt:
        'Help me plan a content week for our top 2 active brands: Thiocyn and Take A Shot. Focus on Instagram Reels.',
    },
    {
      emoji: '📊',
      label: 'Review SOP status',
      prompt:
        'Based on our Meta Ads SOP phases, what should be the next priority action for Thiocyn (currently in phase 3: script production)?',
    },
    {
      emoji: '📈',
      label: 'Revenue overview',
      prompt: 'Give me a revenue overview across all brands: MTD revenue, top performing products, and trends.',
    },
    {
      emoji: '🛒',
      label: 'Order analysis',
      prompt: 'Analyze recent order patterns: AOV trends, return rates, and any anomalies across brands.',
    },
  ],
  teamAcademy: [
    {
      emoji: '📋',
      label: 'Review pipeline',
      prompt:
        'Give me a summary of our current hiring pipeline status and what needs attention.',
    },
    {
      emoji: '✉️',
      label: 'Draft rejection email',
      prompt:
        'Help me draft a professional rejection email for a candidate that was not a fit.',
    },
    {
      emoji: '🎯',
      label: 'Interview questions',
      prompt:
        'Suggest 5 strong interview questions for a marketing intern position at Hart Limes GmbH.',
    },
  ],
  finance: [
    {
      emoji: '💰',
      label: 'Open invoices',
      prompt: 'What invoices are currently open or overdue? Prioritize by amount and deadline.',
    },
    {
      emoji: '⚠️',
      label: 'Dispute status',
      prompt: 'Summarize all active payment disputes: platform, amount, deadline, and recommended action.',
    },
  ],
  customerSupport: [
    {
      emoji: '💬',
      label: 'Draft response',
      prompt:
        'Help me draft a professional customer support response for a complaint about a delayed shipment.',
    },
    {
      emoji: '📝',
      label: 'Escalation template',
      prompt:
        'Create an escalation email template for complex customer disputes that need manager review.',
    },
    {
      emoji: '📊',
      label: 'Support summary',
      prompt:
        'What are the most common customer support issues we should be tracking and how should we prioritize them?',
    },
  ],
  admin: [
    {
      emoji: '📈',
      label: 'Insights summary',
      prompt:
        'Summarize what an ideal weekly insights review for a 6-brand ecommerce holding should cover.',
    },
    {
      emoji: '⚙️',
      label: 'Settings advice',
      prompt:
        'What are the most important configurations and access controls we should have in an internal Business OS?',
    },
  ],
};

// Fallback for sections without specific actions
export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    emoji: '💡',
    label: 'Get suggestions',
    prompt:
      'What are the most important tasks or opportunities I should focus on right now?',
  },
  {
    emoji: '📋',
    label: 'Summarize status',
    prompt:
      'Give me a brief status summary of what I should know about this area of the business.',
  },
];
