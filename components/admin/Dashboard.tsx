import React, { useState, useEffect, lazy, Suspense } from 'react';
import SettingsView from './SettingsView';
import ApplicationListView from './ApplicationListView';
import ApplicantDetailView from './ApplicantDetailView';
import InsightsView from './InsightsView';
import EmailTemplateManager from './EmailTemplateManager';
import KanbanBoard from './KanbanBoard'; // Import the Kanban board
import ProjectAreaManager from './ProjectAreaManager';
import TaskManager from './TaskManager';
import OnboardingView from './OnboardingView';
import AcademyView from './AcademyView';
import CustomerSupportView from './CustomerSupportView';
import PostsTrackerView from './PostsTrackerView';
import AgentChatDrawer from './AgentChatDrawer';
import NotificationBell from './NotificationBell';
import AccountView from './AccountView';
import TeamManagementView from './TeamManagementView';
import TeamTasksView from './TeamTasksView';
import PerformanceView from './PerformanceView';
import HomeView from './HomeView';
import FinanceView from './FinanceView';
import ToolStackView from './ToolStackView';
import EcommerceView from './EcommerceView';
import AnalyticsView from './AnalyticsView';
import WorkspaceView from './WorkspaceView';
import { QUICK_ACTIONS, DEFAULT_QUICK_ACTIONS } from '@/lib/agentQuickActions';
import { getApplicant } from '@/lib/actions'; // Import getApplicant
import type { Application } from '@/types'; // Import Application
import Spinner from '@/components/ui/Spinner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { useLang } from '@/lib/i18n';
import { translations } from '@/lib/translations';
import { LanguageProvider, useLang as useWorkspaceLang } from '@/lib/language';
import BrandSwitcher from '@/components/ui/BrandSwitcher';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
// Lazy import with auto-reload on chunk load failure (stale deploy)
function lazyLoad<T extends React.ComponentType>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch((err) => {
      if (err?.name === 'ChunkLoadError' || String(err).includes('Failed to fetch')) {
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    })
  );
}

const DailyBriefingView = lazyLoad(() => import('./DailyBriefingView'));
const ISOComplianceView = lazyLoad(() => import('./ISOComplianceView'));
const CreatorView = lazyLoad(() => import('./CreatorView'));
const KnowledgeBaseView = lazyLoad(() => import('./KnowledgeBaseView'));
const BrandConfigView = lazyLoad(() => import('./BrandConfigView'));
const ProcessExecutionView = lazyLoad(() => import('./ProcessExecutionView'));
const NotificationFeedView = lazyLoad(() => import('./NotificationFeedView'));
const VideoGenerationView = lazyLoad(() => import('./VideoGenerationView'));
const BriefingGeneratorView = lazyLoad(() => import('./BriefingGeneratorView'));
const CreativeFactoryView = lazyLoad(() => import('./CreativeFactoryView'));
const ContentMachineView = lazyLoad(() => import('./ContentMachineView'));

type Tab = 'briefing' | 'home' | 'teamTasks' | 'emmaPlanner' | 'creatorPipeline' | 'creativeFactory' | 'contentMachine' | 'videoGeneration' | 'postsTracker' | 'briefingGenerator' | 'ecomOverview' | 'ecomOrders' | 'analyticsKpis' | 'analyticsAds' | 'applications' | 'kanban' | 'projectAreas' | 'taskManager' | 'onboarding' | 'academy' | 'emailTemplates' | 'financeOverview' | 'financePipeline' | 'financeDisputesTab' | 'financeMails' | 'customerSupportOverview' | 'teamManagement' | 'performance' | 'brandConfig' | 'toolStack' | 'knowledgeBase' | 'processExecution' | 'isoCompliance' | 'settings' | 'insights' | 'notificationFeed' | 'accountProfile' | 'workspace';
type Section = 'command' | 'creative' | 'revenue' | 'hiring' | 'finance' | 'support' | 'admin' | 'account' | 'workspace';
type UserRole = 'owner' | 'admin' | 'staff' | 'intern_lead' | 'viewer';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL ?? '';

// Role hierarchy: owner > admin > staff > intern_lead > viewer
const ROLE_LEVEL: Record<UserRole, number> = { owner: 4, admin: 3, staff: 2, intern_lead: 1, viewer: 0 };
const hasRole = (userRole: string, minRole: UserRole) =>
  (ROLE_LEVEL[userRole as UserRole] ?? 0) >= ROLE_LEVEL[minRole];

const SECTIONS: { id: Section; label: string; emoji: string; minRole?: UserRole; tabs: { id: Tab; label: string }[] }[] = [
  {
    id: 'command',
    label: 'Command Center',
    emoji: '🎯',
    tabs: [
      { id: 'briefing', label: 'Daily Briefing' },
      { id: 'home', label: 'Overview' },
      { id: 'teamTasks', label: 'Tasks' },
      { id: 'emmaPlanner', label: 'Planner' },
    ],
  },
  {
    id: 'creative',
    label: 'Creative Studio',
    emoji: '🎨',
    tabs: [
      { id: 'creatorPipeline', label: 'Creators' },
      { id: 'creativeFactory', label: 'Creative Factory' },
      { id: 'contentMachine', label: 'Content Machine' },
      { id: 'videoGeneration', label: 'Video Gen' },
      { id: 'postsTracker', label: 'Posts' },
      { id: 'briefingGenerator', label: 'Briefings' },
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue & Analytics',
    emoji: '📊',
    minRole: 'staff',
    tabs: [
      { id: 'ecomOverview', label: 'Overview' },
      { id: 'ecomOrders', label: 'Orders' },
      { id: 'analyticsKpis', label: 'Brand KPIs' },
      { id: 'analyticsAds', label: 'Ad Performance' },
    ],
  },
  {
    id: 'hiring',
    label: 'Hiring & Academy',
    emoji: '🎓',
    tabs: [
      { id: 'applications', label: 'Applications' },
      { id: 'kanban', label: 'Kanban Board' },
      { id: 'projectAreas', label: 'Project Areas' },
      { id: 'taskManager', label: 'Aufgaben' },
      { id: 'onboarding', label: 'Onboarding' },
      { id: 'academy', label: 'Academy' },
      { id: 'insights', label: 'Insights' },
      { id: 'emailTemplates', label: 'Email Templates' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    emoji: '💰',
    minRole: 'admin',
    tabs: [
      { id: 'financeOverview', label: 'Overview' },
      { id: 'financePipeline', label: 'Pipeline' },
      { id: 'financeDisputesTab', label: 'Disputes' },
      { id: 'financeMails', label: 'Finance Mails' },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    emoji: '💬',
    tabs: [
      { id: 'customerSupportOverview', label: 'Overview' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    emoji: '⚙️',
    minRole: 'admin',
    tabs: [
      { id: 'teamManagement', label: 'Team' },
      { id: 'performance', label: 'Performance' },
      { id: 'brandConfig', label: 'Brand Config' },
      { id: 'toolStack', label: 'Tool Stack' },
      { id: 'knowledgeBase', label: 'Knowledge Base' },
      { id: 'processExecution', label: 'SOPs' },
      { id: 'isoCompliance', label: 'Risk & ISO' },
      { id: 'settings', label: 'Settings' },
    ],
  },
  {
    id: 'workspace' as Section,
    label: 'Workspace',
    emoji: '🗂️',
    tabs: [
      { id: 'workspace', label: 'My Workspace' },
    ],
  },
  {
    id: 'account' as Section,
    label: 'Account',
    emoji: '👤',
    tabs: [
      { id: 'accountProfile', label: 'My Profile' },
    ],
  },
];

function LangToggle() {
  const { lang, setLang } = useWorkspaceLang();
  return (
    <button
      onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-400 bg-surface-700 border border-white/[0.08] rounded-lg hover:bg-surface-600 hover:text-slate-200 transition-colors"
      title={lang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
    >
      {lang === 'de' ? '🇬🇧 EN' : '🇩🇪 DE'}
    </button>
  );
}

const Dashboard: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    const handleDemo = () => { setIsDemoMode(true); setAuthReady(true); };
    window.addEventListener('start-demo-mode', handleDemo);
    return () => { subscription.unsubscribe(); window.removeEventListener('start-demo-mode', handleDemo); };
  }, []);
  const { lang, setLang } = useLang();
  const t = translations[lang];

  const [section, setSection] = useState<Section>('command');
  const [userRole, setUserRole] = useState<UserRole>('viewer');
  const [tab, setTab] = useState<Tab>('home');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedApplicationData, setSelectedApplicationData] =
    useState<Application | null>(null); // New state for fetched applicant data
  const [loadingApplicant, setLoadingApplicant] = useState(false); // New state for loading applicant details
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>();
  const [companyName, setCompanyName] = useState<string>('Business OS');

  useEffect(() => {
    supabase
      .from('recruiter_settings')
      .select('company_name')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.company_name) setCompanyName(data.company_name);
      });
  }, []);

  useEffect(() => {
    if (!session?.user?.email) return;
    // Check team_members first (staff/admin)
    supabase
      .from('team_members')
      .select('role, status')
      .eq('email', session.user.email)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.role) { setUserRole(data.role as UserRole); return; }
        // Fallback: check intern_accounts for intern_lead
        supabase
          .from('intern_accounts')
          .select('id, department')
          .eq('auth_user_id', session.user.id)
          .maybeSingle()
          .then(({ data: intern }) => {
            if (!intern) return;
            if (intern.department === 'lead') {
              setUserRole('intern_lead');
            } else if (intern.department !== 'recruiting') {
              navigate('/intern/' + intern.id);
            }
          });
      });
  }, [session, navigate]);

  const isAdmin = isDemoMode || userRole === 'owner' || userRole === 'admin' || session?.user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!authReady) return;
    if (!session && !isDemoMode) navigate('/admin');
  }, [session, isDemoMode, navigate, authReady]);

  const handleLogout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      navigate('/admin');
    } else {
      await supabase.auth.signOut();
      navigate('/admin');
    }
  };

  // Effect to fetch selected applicant data when selectedAppId changes
  useEffect(() => {
    const fetchApplicant = async () => {
      if (selectedAppId) {
        setLoadingApplicant(true);
        const applicant = await getApplicant(selectedAppId);
        
        // --- START: Frontend-only data adaptation ---
        let adaptedApplicant: Application | null = null;
        if (applicant) {
          adaptedApplicant = {
            ...applicant,
            // Prefer preferred_project_areas (new RPC), fallback to project_interest (legacy)
            preferred_project_areas: applicant.preferred_project_areas || (applicant as any).project_interest || null,
            // Map DB 'status' to frontend 'stage'
            stage: (applicant as any).status || applicant.stage,
            // Ensure aiScore is present if it comes from the DB
            aiScore: (applicant as any).aiScore || undefined,
          };
        }
        // --- END: Frontend-only data adaptation ---

        setSelectedApplicationData(adaptedApplicant);
        setLoadingApplicant(false);
          } else {
        setSelectedApplicationData(null); // Clear data if no applicant is selected
      }
    };
    fetchApplicant();
  }, [selectedAppId]);

  const renderContent = () => {
    if (tab === 'briefing') {
      return <React.Suspense fallback={<div>Loading...</div>}><DailyBriefingView /></React.Suspense>;
    }

    if (tab === 'home') {
      return <HomeView />;
    }

    if (tab === 'teamTasks') {
      return <TeamTasksView userEmail={session?.user?.email} />;
    }

    if (tab === 'financeOverview' || tab === 'financePipeline' || tab === 'financeDisputesTab' || tab === 'financeMails' || tab === 'emmaPlanner') {
      const financeTabMap: Record<string, string> = {
        financeDisputesTab: 'disputes',
        financeOverview: 'overview',
        financePipeline: 'pipeline',
        financeMails: 'financeMails',
        emmaPlanner: 'emmaPlanner',
      };
      return <FinanceView activeTab={financeTabMap[tab] as any} />;
    }

    if (tab === 'toolStack') {
      return <ToolStackView isAdmin={isAdmin} />;
    }

    if (tab === 'ecomOverview' || tab === 'ecomOrders') {
      return <EcommerceView />;
    }

    if (tab === 'analyticsKpis' || tab === 'analyticsAds') {
      return <AnalyticsView />;
    }

    if (tab === 'workspace') {
      return <WorkspaceView />;
    }

    if (tab === 'settings') {
      return <SettingsView isDemoMode={isDemoMode} />;
    }

    if (tab === 'insights') {
      return <InsightsView />;
    }

    if (tab === 'kanban') {
      return <KanbanBoard />;
    }

    if (tab === 'projectAreas') {
      return <ProjectAreaManager />;
    }

    if (tab === 'taskManager') {
      return <TaskManager />;
    }

    if (tab === 'applications') {
      if (selectedAppId) {
        if (loadingApplicant) {
          return (
            <div className="flex justify-center py-20">
              <Spinner className="w-10 h-10 text-primary-600" />
            </div>
          );
        }
        return (
          <ApplicantDetailView
            application={selectedApplicationData} // Pass the fetched application data
            onReturn={() => setSelectedAppId(null)}
          />
        );
      }
      return <ApplicationListView onSelectApplicant={setSelectedAppId} />;
    }

    if (tab === 'emailTemplates') {
      return <EmailTemplateManager />;
    }

    if (tab === 'onboarding') {
      return <OnboardingView />;
    }

    if (tab === 'academy') {
      return <AcademyView />;
    }

    if (tab === 'customerSupportOverview') {
      return <CustomerSupportView isAdmin={isAdmin} />;
    }


    if (tab === 'postsTracker') {
      return <PostsTrackerView />;
    }

    if (tab === 'creatorPipeline') {
      return <React.Suspense fallback={<div>Loading...</div>}><CreatorView /></React.Suspense>;
    }

    if (tab === 'videoGeneration') {
      return <React.Suspense fallback={<div>Loading...</div>}><VideoGenerationView /></React.Suspense>;
    }

    if (tab === 'briefingGenerator') {
      return <React.Suspense fallback={<div>Loading...</div>}><BriefingGeneratorView /></React.Suspense>;
    }

    if (tab === 'creativeFactory') {
      return <React.Suspense fallback={<div>Loading...</div>}><CreativeFactoryView /></React.Suspense>;
    }

    if (tab === 'contentMachine') {
      return <React.Suspense fallback={<div>Loading...</div>}><ContentMachineView /></React.Suspense>;
    }

    if (tab === 'teamManagement') {
      return <TeamManagementView />;
    }

    if (tab === 'performance') {
      return <PerformanceView />;
    }

    if (tab === 'accountProfile') {
      return <AccountView session={session} />;
    }

    if (tab === 'isoCompliance') {
      return <ISOComplianceView />;
    }

    if (tab === 'knowledgeBase') {
      return <KnowledgeBaseView />;
    }

    if (tab === 'brandConfig') {
      return <BrandConfigView />;
    }

    if (tab === 'processExecution') {
      return <ProcessExecutionView />;
    }

    if (tab === 'notificationFeed') {
      return <NotificationFeedView />;
    }

    return null;
  };

  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);
  const effectiveRole: UserRole = previewRole ?? (isDemoMode ? 'owner' : userRole);
  const visibleSections = SECTIONS.filter(s => !s.minRole || hasRole(effectiveRole, s.minRole));
  const activeSection = SECTIONS.find(s => s.id === section) ?? SECTIONS[0];
  const activeTabs = activeSection.tabs;

  const handleSectionChange = (s: Section) => {
    setSection(s);
    const first = SECTIONS.find(x => x.id === s)?.tabs[0];
    if (first) setTab(first.id);
    setSelectedAppId(null);
  };

  return (
    <LanguageProvider>
    <div className="animate-[fadeIn_0.5s_ease-out] ambient-bg bg-surface-950 min-h-screen pb-20 md:pb-0">
      {/* Dot grid texture */}
      <div className="fixed inset-0 dot-grid pointer-events-none z-0 opacity-100" />
      {/* Header */}
      <header className="relative z-20 sticky top-0 bg-surface-900/80 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between border-b border-white/[0.06] py-3 md:py-4 px-4 md:px-8 gap-2 md:gap-4">
        <div>
          <h1 className="text-lg md:text-2xl font-black text-white tracking-tighter">
            {companyName} <span className="hidden md:inline text-slate-400 font-medium">— {t.dashboard.title}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isDemoMode ? (
              <span className="inline-flex items-center px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/20 animate-pulse">
                {t.dashboard.demoMode}
              </span>
            ) : (
              <>{t.dashboard.loggedInAs} <span className="text-amber-400 font-bold">{session?.user.email}</span></>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Brand Switcher — visible when in a brand-aware section */}
          {section !== 'account' && section !== 'command' && <BrandSwitcher compact />}
          {/* Notification Bell — visible to all logged-in users */}
          {(session || isDemoMode) && <NotificationBell userId={session?.user?.id} />}
          <div className="flex items-center gap-0.5 bg-surface-700 rounded-full p-0.5 border border-white/[0.06]">
            <button
              onClick={() => setLang('de')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${lang === 'de' ? 'bg-surface-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              DE
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${lang === 'en' ? 'bg-surface-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              EN
            </button>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              {previewRole && (
                <span className="text-[9px] font-black text-orange-600 uppercase tracking-wider bg-orange-50 px-2 py-1 rounded-full border border-orange-200">
                  Preview: {previewRole}
                </span>
              )}
              <select
                value={previewRole ?? '__real__'}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '__real__') { setPreviewRole(null); }
                  else {
                    setPreviewRole(v as UserRole);
                    const first = visibleSections[0];
                    if (first) handleSectionChange(first.id);
                  }
                }}
                className="text-[10px] font-black uppercase tracking-wider bg-surface-700 border border-white/[0.08] rounded-lg px-3 py-2 text-slate-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="__real__">View as: Owner</option>
                <option value="admin">View as: Admin</option>
                <option value="staff">View as: Staff</option>
                <option value="intern_lead">View as: Intern Lead</option>
                <option value="viewer">View as: Viewer</option>
              </select>
            </div>
          )}
          <button onClick={handleLogout} className="px-4 py-2 bg-surface-700 text-slate-400 hover:bg-red-500/15 hover:text-red-400 text-xs font-bold rounded-lg transition-colors border border-white/[0.06]">
            {t.dashboard.logout}
          </button>
        </div>
      </header>

      {/* Top Section Nav — desktop only */}
      <nav className="relative z-10 hidden md:flex items-center gap-1 border-b border-white/[0.06] px-4 md:px-8 overflow-x-auto bg-surface-900/60">
        {visibleSections.map(s => (
          <button
            key={s.id}
            onClick={() => handleSectionChange(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all rounded-lg mx-0.5 ${
              section === s.id
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
            } ${s.tabs.length === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
            disabled={s.tabs.length === 0}
            title={s.tabs.length === 0 ? t.dashboard.comingSoon : undefined}
          >
            <span>{s.emoji}</span>
            {t.sections[s.id] ?? s.label}
          </button>
        ))}
      </nav>

      {/* Quick Actions Bar */}
      <div className="relative z-10 flex items-center gap-2 py-2.5 px-4 md:px-8 overflow-x-auto border-b border-white/[0.04] bg-surface-950/40">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/70 whitespace-nowrap">✦ Jarvis</span>
        {(QUICK_ACTIONS[section] ?? DEFAULT_QUICK_ACTIONS).map(action => (
          <button
            key={action.label}
            onClick={() => { setChatInitialPrompt(action.prompt); setChatOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-amber-500/10 hover:text-amber-300 text-slate-400 text-xs font-semibold rounded-full whitespace-nowrap transition-all border border-white/[0.06] hover:border-amber-500/25"
          >
            <span>{action.emoji}</span> {action.label}
          </button>
        ))}
      </div>

      {/* Body: Sidebar + Content */}
      <div className="relative z-10 flex flex-col md:flex-row gap-0 mt-0 px-4 md:px-8 pt-4">
        {/* Left Sidebar (desktop) / Horizontal pill-nav (mobile) */}
        {activeTabs.length > 0 && (
          <>
            {/* Mobile: horizontal scrollable pill row */}
            <nav className="flex md:hidden flex-row overflow-x-auto gap-1 py-2 px-1 border-b border-white/[0.06]">
              {activeTabs.map(tabItem => (
                <button
                  key={tabItem.id}
                  onClick={() => { setTab(tabItem.id); setSelectedAppId(null); }}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    tab === tabItem.id
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {t.tabs[tabItem.id] ?? tabItem.label}
                </button>
              ))}
            </nav>

            {/* Desktop: left sidebar */}
            <aside className="hidden md:block md:w-48 md:shrink-0 md:border-r md:border-white/[0.06] pt-6 pr-4">
              <nav className="flex flex-col gap-0.5">
                {activeTabs.map(tabItem => (
                  <button
                    key={tabItem.id}
                    onClick={() => { setTab(tabItem.id); setSelectedAppId(null); }}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      tab === tabItem.id
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] border border-transparent'
                    }`}
                  >
                    {t.tabs[tabItem.id] ?? tabItem.label}
                  </button>
                ))}
              </nav>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 pt-6 md:pl-6 min-w-0">
          {activeTabs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-4xl mb-4">{activeSection.emoji}</p>
              <p className="text-slate-400 font-semibold">{t.sections[activeSection.id] ?? activeSection.label} — {t.dashboard.comingSoon}</p>
              <p className="text-slate-600 text-sm mt-1">{t.dashboard.comingSoonDesc}</p>
            </div>
          ) : (
            <ErrorBoundary key={tab}>
              <Suspense fallback={<div className="text-center py-12 text-slate-500 text-sm">Loading...</div>}>
                <div className="animate-[fadeIn_0.2s_ease-out]">
                  {renderContent()}
                </div>
              </Suspense>
            </ErrorBoundary>
          )}
        </main>
      </div>
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-900/90 backdrop-blur-xl border-t border-white/[0.06] flex items-center justify-around px-2 py-2 safe-area-pb">
        {[
          { id: 'command' as Section, emoji: '🎯', label: 'Home' },
          { id: 'creative' as Section, emoji: '🎨', label: 'Creative' },
          { id: 'revenue' as Section, emoji: '📊', label: 'Revenue' },
          { id: 'hiring' as Section, emoji: '🎓', label: 'Hiring' },
          { id: 'admin' as Section, emoji: '⚙️', label: 'Admin' },
        ].filter(s => visibleSections.find(vs => vs.id === s.id)).map(s => (
          <button
            key={s.id}
            onClick={() => handleSectionChange(s.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[3.5rem] ${
              section === s.id
                ? 'bg-amber-500/10 text-amber-400'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            <span className="text-xl leading-none">{s.emoji}</span>
            <span className="text-[10px] font-semibold">{s.label}</span>
          </button>
        ))}
        <button
          onClick={() => setChatOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[3.5rem] text-slate-500 hover:text-amber-400"
        >
          <span className="text-xl leading-none">✨</span>
          <span className="text-[10px] font-semibold">Jarvis</span>
        </button>
      </nav>

      <AgentChatDrawer
        activeSection={section}
        isOpen={chatOpen}
        onOpen={() => setChatOpen(true)}
        onClose={() => { setChatOpen(false); setChatInitialPrompt(undefined); }}
        initialPrompt={chatInitialPrompt}
      />
    </div>
    </LanguageProvider>
  );
};

export default Dashboard;
