import React, { useEffect, useMemo, useState } from 'react';
import { Joyride, EVENTS, STATUS, type EventData, type Step } from 'react-joyride';
import { supabase } from '@/lib/supabaseClient';

type Lang = 'de' | 'en';
type Section = 'home' | 'marketing' | 'teamAcademy' | 'finance' | 'customerSupport' | 'account' | 'admin';

interface TourStep {
  id: string;
  target: string;
  placement?: Step['placement'];
  section?: Section;
  title: { de: string; en: string };
  body: { de: string; en: string };
}

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: 'body',
    placement: 'center',
    title: {
      de: 'Willkommen im Business OS',
      en: 'Welcome to Business OS',
    },
    body: {
      de: 'Das interne Betriebssystem für unsere 6 Brands. In 8 kurzen Schritten zeigen wir dir alles Wichtige — du kannst die Tour jederzeit im Account-View neu starten.',
      en: 'The internal OS for our 6 brands. In 8 short steps we\'ll show you everything — you can restart the tour any time from the Account view.',
    },
  },
  {
    id: 'brandSwitcher',
    target: '[data-tour="brand-switcher"]',
    placement: 'bottom',
    title: { de: 'Brand-Filter', en: 'Brand Filter' },
    body: {
      de: 'Oben rechts wählst du eine Brand aus — alle Daten (Kampagnen, Orders, Finance) werden dann auf diese Brand gefiltert. "Alle" zeigt Cross-Brand-Ansicht.',
      en: 'Pick a brand in the top right — all data (campaigns, orders, finance) filters to that brand. "All" shows cross-brand view.',
    },
  },
  {
    id: 'home',
    target: '[data-tour="section-home"]',
    placement: 'bottom',
    section: 'home',
    title: { de: 'Home — Executive Summary', en: 'Home — Executive Summary' },
    body: {
      de: 'Dein Tageseinstieg: KPI-Übersicht, Daily Briefing, offene Tasks und Emma-Planner. Alles was heute wichtig ist in einer Ansicht.',
      en: 'Your daily entry point: KPI overview, daily briefing, open tasks and Emma planner. Everything that matters today in one view.',
    },
  },
  {
    id: 'marketing',
    target: '[data-tour="section-marketing"]',
    placement: 'bottom',
    section: 'marketing',
    title: { de: 'Marketing Hub', en: 'Marketing Hub' },
    body: {
      de: 'Alle Kampagnen, Briefs und Content-Kalender. Cockpit zeigt Charts über alle Brands, Campaigns bietet Kanban + Detail-Drawer mit Brief, Comments, Assets, Performance.',
      en: 'All campaigns, briefs and content calendar. Cockpit shows cross-brand charts; Campaigns has a Kanban + detail drawer with brief, comments, assets, performance.',
    },
  },
  {
    id: 'finance',
    target: '[data-tour="section-finance"]',
    placement: 'bottom',
    section: 'finance',
    title: { de: 'Finance', en: 'Finance' },
    body: {
      de: 'OPOS-Liste, Mahnungen, Disputes, Payment-Pipeline und Mail-Inbox. Hier läuft alles zahlungsbezogene zusammen — cross-brand konsolidiert.',
      en: 'Outstanding invoices, dunning, disputes, payment pipeline and mail inbox. All payment-related workflows aggregated cross-brand.',
    },
  },
  {
    id: 'teamAcademy',
    target: '[data-tour="section-teamAcademy"]',
    placement: 'bottom',
    section: 'teamAcademy',
    title: { de: 'Team & Academy', en: 'Team & Academy' },
    body: {
      de: 'Team-Management, Bewerbungen (Applications, Kanban), Intern-Academy (Phasen, Buddy-Programm, Assignments) und Performance-Review.',
      en: 'Team management, applications (Kanban), Intern Academy (phases, buddy program, assignments) and performance reviews.',
    },
  },
  {
    id: 'jarvis',
    target: '[data-tour="jarvis-fab"]',
    placement: 'left',
    section: 'home',
    title: { de: 'Jarvis Chat', en: 'Jarvis Chat' },
    body: {
      de: 'Der Chat-Button unten rechts öffnet Jarvis — frag nach KPIs, lass dir Briefs erklären oder Entscheidungen vorbereiten. Context-aware per Section.',
      en: 'The chat button bottom-right opens Jarvis — ask about KPIs, explain briefs, prep decisions. Context-aware per section.',
    },
  },
  {
    id: 'done',
    target: 'body',
    placement: 'center',
    title: { de: 'Fertig! 🎉', en: 'Done! 🎉' },
    body: {
      de: 'Das war die Tour. Bei Fragen Jarvis fragen oder im Account-View die Tour neu starten. Viel Erfolg!',
      en: 'That was the tour. Ask Jarvis for help or restart the tour from the Account view. Good luck!',
    },
  },
];

interface Props {
  userEmail?: string;
  onSectionChange: (section: Section) => void;
  forceRun?: boolean;
  onFinish?: () => void;
}

export const OnboardingTour: React.FC<Props> = ({ userEmail, onSectionChange, forceRun, onFinish }) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [lang, setLangLocal] = useState<Lang>(() => (localStorage.getItem('app_lang') as Lang) ?? 'de');

  useEffect(() => {
    if (forceRun) {
      setStepIndex(0);
      setRun(true);
      return;
    }
    if (!userEmail) return;
    supabase
      .from('team_members')
      .select('onboarding_state, preferred_language')
      .eq('email', userEmail)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.preferred_language) {
          setLangLocal(data.preferred_language as Lang);
          localStorage.setItem('app_lang', data.preferred_language);
        }
        const state = data.onboarding_state as
          | { completed?: boolean; last_step?: number }
          | null;
        if (!state?.completed) {
          setStepIndex(state?.last_step ?? 0);
          setRun(true);
        }
      });
  }, [userEmail, forceRun]);

  const steps: Step[] = useMemo(
    () =>
      STEPS.map((s) => ({
        target: s.target,
        content: (
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-1.5">{s.title[lang]}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{s.body[lang]}</p>
          </div>
        ),
        placement: s.placement ?? 'auto',
      })),
    [lang],
  );

  const persistState = (completed: boolean, lastStep: number) => {
    if (!userEmail) return;
    supabase
      .from('team_members')
      .update({
        onboarding_state: {
          completed,
          last_step: lastStep,
          completed_sections: STEPS.slice(0, lastStep)
            .map((s) => s.section)
            .filter(Boolean),
          completed_at: completed ? new Date().toISOString() : null,
        },
      })
      .eq('email', userEmail)
      .then(() => {});
  };

  const handleEvent = (data: EventData) => {
    const { type, status, action, index } = data;

    if (type === EVENTS.STEP_BEFORE) {
      const section = STEPS[index]?.section;
      if (section) onSectionChange(section);
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === 'prev' ? -1 : 1);
      setStepIndex(nextIndex);
      persistState(false, nextIndex);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      persistState(true, STEPS.length);
      onFinish?.();
    }
  };

  if (!run) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        buttons: ['back', 'primary', 'skip'],
        showProgress: true,
        overlayClickAction: false,
        skipBeacon: true,
        primaryColor: '#4f46e5',
        textColor: '#0f172a',
        backgroundColor: '#ffffff',
        arrowColor: '#ffffff',
        overlayColor: 'rgba(15, 23, 42, 0.5)',
        zIndex: 10000,
      }}
      locale={{
        back: lang === 'de' ? 'Zurück' : 'Back',
        close: lang === 'de' ? 'Schließen' : 'Close',
        last: lang === 'de' ? 'Fertig' : 'Done',
        next: lang === 'de' ? 'Weiter' : 'Next',
        skip: lang === 'de' ? 'Überspringen' : 'Skip',
        open: lang === 'de' ? 'Öffnen' : 'Open',
      }}
      styles={{
        tooltip: { borderRadius: 12, padding: 16, fontFamily: 'inherit' },
        tooltipTitle: { fontSize: 15 },
        tooltipContent: { padding: 0 },
        buttonPrimary: { borderRadius: 8, fontSize: 13, padding: '8px 14px', fontWeight: 600 },
        buttonBack: { color: '#64748b', fontSize: 13, marginRight: 8 },
        buttonSkip: { color: '#94a3b8', fontSize: 13 },
      }}
    />
  );
};

export default OnboardingTour;
