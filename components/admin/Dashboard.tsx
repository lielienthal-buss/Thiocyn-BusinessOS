import React, { useState, useEffect, lazy, Suspense } from 'react';
import SettingsView from './SettingsView';
import ApplicationListView from './ApplicationListView';
import ApplicantDetailView from './ApplicantDetailView';
import InsightsView from './InsightsView';
import EvalDashboardView from './EvalDashboardView';
import EmailTemplateManager from './EmailTemplateManager';
import KanbanBoard from './KanbanBoard'; // Import the Kanban board
import ProjectAreaManager from './ProjectAreaManager';
import TaskManager from './TaskManager';
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
const MarketingCockpit = lazyLoad(() => import('./marketing/MarketingCockpit'));
const CampaignKanban = lazyLoad(() => import('./marketing/CampaignKanban'));
const CampaignDrawer = lazyLoad(() => import('./marketing/CampaignDrawer'));
const ContentCalendarView = lazyLoad(() => import('./marketing/ContentCalendarView'));
const BriefsHubView = lazyLoad(() => import('./marketing/BriefsHubView'));

type Tab =
  | 'briefing' | 'home' | 'teamTasks' | 'emmaPlanner'
  | 'creatorPipeline' | 'creativeFactory' | 'contentMachine' | 'videoGeneration' | 'postsTracker' | 'briefingGenerator'
  | 'marketingCockpit' | 'marketingCampaigns' | 'marketingContentCalendar' | 'marketingBriefs'
  | 'ecomOverview' | 'ecomOrders' | 'analyticsKpis' | 'analyticsAds'
  | 'applications' | 'kanban' | 'projectAreas' | 'taskManager' | 'onboarding' | 'academy' | 'emailTemplates' | 'evalDashboard'
  | 'financeOverview' | 'financePipeline' | 'financeDisputesTab' | 'financeMails'
  | 'customerSupportOverview'
  | 'teamManagement' | 'performance' | 'brandConfig' | 'toolStack' | 'knowledgeBase' | 'processExecution' | 'isoCompliance' | 'settings'
  | 'insights' | 'notificationFeed' | 'accountProfile' | 'workspace';
type Section = 'home' | 'marketing' | 'teamAcademy' | 'finance' | 'customerSupport' | 'account' | 'admin';
type UserRole = 'owner' | 'admin' | 'staff' | 'intern_lead' | 'viewer';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL ?? '';

// Role hierarchy: owner > admin > staff > intern_lead > viewer
const ROLE_LEVEL: Record<UserRole, number> = { owner: 4, admin: 3, staff: 2, intern_lead: 1, viewer: 0 };
const hasRole = (userRole: string, minRole: UserRole) =>
  (ROLE_LEVEL[userRole as UserRole] ?? 0) >= ROLE_LEVEL[minRole];

const SECTIONS: { id: Section; label: string; emoji: string; minRole?: UserRole; tabs: { id: Tab; label: string }[] }[] = [
  {
    id: 'home',
    label: 'Home',
    emoji: '🏠',
    tabs: [
      { id: 'briefing', label: 'Daily Briefing' },
      { id: 'home', label: 'Overview' },
      { id: 'teamTasks', label: 'Tasks' },
      { id: 'emmaPlanner', label: 'Planner' },
      { id: 'workspace', label: 'My Workspace' },
      { id: 'notificationFeed', label: 'Notifications' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    emoji: '📣',
    tabs: [
      { id: 'marketingCockpit', label: 'Cockpit' },
      { id: 'marketingCampaigns', label: 'Campaigns' },
      { id: 'analyticsAds', label: 'Ad Performance' },
      { id: 'ecomOverview', label: 'E-Com Overview' },
      { id: 'ecomOrders', label: 'E-Com Orders' },
      { id: 'analyticsKpis', label: 'Ad Analytics' },
      { id: 'marketingContentCalendar', label: 'Content Calendar' },
      { id: 'creatorPipeline', label: 'Creators' },
      { id: 'marketingBriefs', label: 'Briefs' },
    ],
  },
  {
    id: 'teamAcademy',
    label: 'Team & Academy',
    emoji: '🎓',
    tabs: [
      { id: 'applications', label: 'Applications' },
      { id: 'kanban', label: 'Kanban Board' },
      { id: 'projectAreas', label: 'Project Areas' },
      { id: 'taskManager', label: 'Aufgaben' },
      { id: 'academy', label: 'Academy' },
      { id: 'evalDashboard', label: 'Eval Dashboard' },
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
    id: 'customerSupport',
    label: 'Customer Support',
    emoji: '💬',
    tabs: [
      { id: 'customerSupportOverview', label: 'Overview' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    emoji: '👤',
    tabs: [
      { id: 'accountProfile', label: 'My Profile' },
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
];

function LangToggle() {
  const { lang, setLang } = useWorkspaceLang();
  return (
    <button
      onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#515154] bg-white/80 border border-black/[0.08] rounded-lg hover:bg-surface-600 hover:text-[#1d1d1f] transition-colors"
      title={lang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
    >
      {lang === 'de' ? '🇬🇧 EN' : '🇩🇪 DE'}
    </button>
  );
}

const Dashboard: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(() => sessionStorage.getItem('demo-mode') === '1');
  const [authReady, setAuthReady] = useState(() => sessionStorage.getItem('demo-mode') === '1');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    const handleDemo = () => { setIsDemoMode(true); setAuthReady(true); sessionStorage.setItem('demo-mode', '1'); };
    window.addEventListener('start-demo-mode', handleDemo);
    return () => { subscription.unsubscribe(); window.removeEventListener('start-demo-mode', handleDemo); };
  }, []);
  const { lang, setLang } = useLang();
  const t = translations[lang];

  const [section, setSection] = useState<Section>('home');
  const [userRole, setUserRole] = useState<UserRole>('viewer');
  const [tab, setTab] = useState<Tab>('home');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedApplicationData, setSelectedApplicationData] =
    useState<Application | null>(null); // New state for fetched applicant data
  const [loadingApplicant, setLoadingApplicant] = useState(false); // New state for loading applicant details
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>();
  const [campaignDrawerId, setCampaignDrawerId] = useState<string | null>(null);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);
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
      sessionStorage.removeItem('demo-mode');
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
      return <HomeView userRole={effectiveRole} />;
    }

    if (tab === 'marketingCockpit') {
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <MarketingCockpit role={effectiveRole} />
        </React.Suspense>
      );
    }

    if (tab === 'marketingCampaigns') {
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-black text-[#1d1d1f]">Campaigns</h3>
              <p className="text-xs text-[#6e6e73] mt-0.5">
                Plan, brief and approve campaigns across brands + agencies. Drag to change status.
              </p>
            </div>
            <CampaignKanban onCardClick={setCampaignDrawerId} />
            <CampaignDrawer campaignId={campaignDrawerId} onClose={() => setCampaignDrawerId(null)} />
          </div>
        </React.Suspense>
      );
    }

    if (tab === 'marketingContentCalendar') {
      return <React.Suspense fallback={<div>Loading...</div>}><ContentCalendarView /></React.Suspense>;
    }

    if (tab === 'marketingBriefs') {
      return <React.Suspense fallback={<div>Loading...</div>}><BriefsHubView /></React.Suspense>;
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

    if (tab === 'evalDashboard') {
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
            application={selectedApplicationData}
            onReturn={() => setSelectedAppId(null)}
          />
        );
      }
      return <EvalDashboardView onSelectApplicant={setSelectedAppId} />;
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
    <div className="animate-[fadeIn_0.5s_ease-out] min-h-screen pb-20 md:pb-0" style={{
      backgroundColor: '#f0f0f5',
      backgroundImage: 'radial-gradient(ellipse at 20% 20%, rgba(224, 155, 55, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 10%, rgba(51, 79, 180, 0.06) 0%, transparent 40%), radial-gradient(ellipse at 60% 80%, rgba(224, 155, 55, 0.05) 0%, transparent 45%)',
      backgroundAttachment: 'fixed',
      color: '#1d1d1f',
    }}>
      {/* Header */}
      <header className="relative z-20 sticky top-0 flex flex-col md:flex-row md:items-center justify-between py-3 md:py-4 px-4 md:px-8 gap-2 md:gap-4" style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div>
          <h1 className="text-lg md:text-2xl font-black tracking-tighter" style={{ color: '#1d1d1f' }}>
            {companyName} <span className="hidden md:inline font-medium" style={{ color: '#6e6e73' }}>— {t.dashboard.title}</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6e6e73' }}>
            {isDemoMode ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse" style={{ background: 'rgba(224,155,55,0.12)', color: '#E09B37', border: '1px solid rgba(224,155,55,0.25)' }}>
                {t.dashboard.demoMode}
              </span>
            ) : (
              <>{t.dashboard.loggedInAs} <span className="font-bold" style={{ color: '#E09B37' }}>{session?.user.email}</span></>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Brand Switcher — visible when in a brand-aware section */}
          {section !== 'account' && section !== 'command' && <BrandSwitcher compact />}
          {/* Notification Bell — visible to all logged-in users */}
          {(session || isDemoMode) && <NotificationBell userId={session?.user?.id} />}
          <div className="flex items-center gap-0.5 rounded-full p-0.5" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <button
              onClick={() => setLang('de')}
              className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all"
              style={{ background: lang === 'de' ? '#E09B37' : 'transparent', color: lang === 'de' ? '#fff' : '#6e6e73' }}
            >
              DE
            </button>
            <button
              onClick={() => setLang('en')}
              className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all"
              style={{ background: lang === 'en' ? '#E09B37' : 'transparent', color: lang === 'en' ? '#fff' : '#6e6e73' }}
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
                className="text-[10px] font-black uppercase tracking-wider bg-white/80 border border-black/[0.08] rounded-lg px-3 py-2 text-[#1d1d1f] cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="__real__">View as: Owner</option>
                <option value="admin">View as: Admin</option>
                <option value="staff">View as: Staff</option>
                <option value="intern_lead">View as: Intern Lead</option>
                <option value="viewer">View as: Viewer</option>
              </select>
            </div>
          )}
          <button onClick={handleLogout} className="px-4 py-2 bg-white/80 text-[#515154] hover:bg-red-500/15 hover:text-red-400 text-xs font-bold rounded-lg transition-colors border border-black/[0.06]">
            {t.dashboard.logout}
          </button>
        </div>
      </header>

      {/* Top Section Nav — desktop only */}
      <nav className="relative z-10 hidden md:flex items-center gap-1 border-b border-black/[0.06] px-4 md:px-8 overflow-x-auto" style={{ background: 'rgba(255,255,255,0.5)' }}>
        {visibleSections.map(s => (
          <button
            key={s.id}
            onClick={() => handleSectionChange(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all rounded-lg mx-0.5 ${
              section === s.id
                ? 'bg-[#E09B37] text-white border border-[#b8801f] shadow-sm'
                : 'text-[#515154] hover:text-[#1d1d1f] hover:bg-black/[0.03]'
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
      <div className="relative z-10 flex items-center gap-2 py-2.5 px-4 md:px-8 overflow-x-auto border-b border-black/[0.04]" style={{ background: 'rgba(255,255,255,0.4)' }}>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap" style={{ color: '#E09B37' }}>✦ Jarvis</span>
        {(QUICK_ACTIONS[section] ?? DEFAULT_QUICK_ACTIONS).map(action => (
          <button
            key={action.label}
            onClick={() => { setChatInitialPrompt(action.prompt); setChatOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#E09B37]/10 hover:text-[#E09B37] text-[#515154] text-xs font-semibold rounded-full whitespace-nowrap transition-all border border-black/[0.06] hover:border-[#E09B37]/25"
            style={{ background: 'rgba(0,0,0,0.03)' }}
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
            <nav className="flex md:hidden flex-row overflow-x-auto gap-1 py-2 px-1 border-b border-black/[0.06]">
              {activeTabs.map(tabItem => (
                <button
                  key={tabItem.id}
                  onClick={() => { setTab(tabItem.id); setSelectedAppId(null); }}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    tab === tabItem.id
                      ? 'bg-[#E09B37]/15 text-[#E09B37] border border-amber-500/25'
                      : 'text-[#515154] hover:text-[#1d1d1f] hover:bg-black/[0.03] border border-transparent'
                  }`}
                >
                  {t.tabs[tabItem.id] ?? tabItem.label}
                </button>
              ))}
            </nav>

            {/* Desktop: left sidebar */}
            <aside className="hidden md:block md:w-48 md:shrink-0 md:border-r md:border-black/[0.06] pt-6 pr-4">
              <nav className="flex flex-col gap-0.5">
                {activeTabs.map(tabItem => (
                  <button
                    key={tabItem.id}
                    onClick={() => { setTab(tabItem.id); setSelectedAppId(null); }}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      tab === tabItem.id
                        ? 'bg-[#E09B37] text-white border border-[#b8801f]'
                        : 'text-[#515154] hover:text-[#1d1d1f] hover:bg-black/[0.03] border border-transparent'
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
              <p className="text-[#515154] font-semibold">{t.sections[activeSection.id] ?? activeSection.label} — {t.dashboard.comingSoon}</p>
              <p className="text-slate-600 text-sm mt-1">{t.dashboard.comingSoonDesc}</p>
            </div>
          ) : (
            <ErrorBoundary key={tab}>
              <Suspense fallback={<div className="text-center py-12 text-[#515154] text-sm">Loading...</div>}>
                <div className="animate-[fadeIn_0.2s_ease-out]">
                  {renderContent()}
                </div>
              </Suspense>
            </ErrorBoundary>
          )}
        </main>
      </div>
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl border-t border-black/[0.06] flex items-center justify-around px-2 py-2 safe-area-pb" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px) saturate(1.8)', WebkitBackdropFilter: 'blur(20px) saturate(1.8)' }}>
        {[
          { id: 'home' as Section, emoji: '🏠', label: 'Home' },
          { id: 'marketing' as Section, emoji: '📣', label: 'Marketing' },
          { id: 'teamAcademy' as Section, emoji: '🎓', label: 'Team' },
          { id: 'finance' as Section, emoji: '💰', label: 'Finance' },
          { id: 'admin' as Section, emoji: '⚙️', label: 'Admin' },
        ].filter(s => visibleSections.find(vs => vs.id === s.id)).map(s => (
          <button
            key={s.id}
            onClick={() => handleSectionChange(s.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[3.5rem] ${
              section === s.id
                ? 'bg-[#E09B37]/15 text-[#E09B37]'
                : 'text-[#515154] hover:text-[#1d1d1f]'
            }`}
          >
            <span className="text-xl leading-none">{s.emoji}</span>
            <span className="text-[10px] font-semibold">{s.label}</span>
          </button>
        ))}
        <button
          onClick={() => setChatOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[3.5rem] text-[#515154] hover:text-amber-400"
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
