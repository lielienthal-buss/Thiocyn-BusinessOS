import React, { useState, useEffect, lazy, Suspense } from 'react';
import SettingsView from './SettingsView';
import ApplicationListView from './ApplicationListView';
import ApplicantDetailView from './ApplicantDetailView';
import InsightsView from './InsightsView';
import EmailTemplateManager from './EmailTemplateManager';
import KanbanBoard from './KanbanBoard'; // Import the Kanban board
import ProjectAreaManager from './ProjectAreaManager'; // Import the new ProjectAreaManager
import OnboardingView from './OnboardingView';
import AcademyView from './AcademyView';
import CustomerSupportView from './CustomerSupportView';
import MarketingView from './MarketingView';
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
import BrandSwitcher from '@/components/ui/BrandSwitcher';
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

const ISOComplianceView = lazyLoad(() => import('./ISOComplianceView'));
const CreatorView = lazyLoad(() => import('./CreatorView'));
const KnowledgeBaseView = lazyLoad(() => import('./KnowledgeBaseView'));
const BrandConfigView = lazyLoad(() => import('./BrandConfigView'));
const ProcessExecutionView = lazyLoad(() => import('./ProcessExecutionView'));
const NotificationFeedView = lazyLoad(() => import('./NotificationFeedView'));
const VideoGenerationView = lazyLoad(() => import('./VideoGenerationView'));
const BriefingGeneratorView = lazyLoad(() => import('./BriefingGeneratorView'));

type Tab = 'applications' | 'kanban' | 'projectAreas' | 'insights' | 'settings' | 'emailTemplates' | 'onboarding' | 'academy' | 'customerSupportOverview' | 'marketingBrands' | 'marketingResources' | 'marketingSOPTracker' | 'marketingContentPlaybook' | 'postsTracker' | 'teamManagement' | 'accountProfile' | 'home' | 'teamTasks' | 'financeOverview' | 'financeDisputesTab' | 'toolStack' | 'ecomOverview' | 'ecomOrders' | 'analyticsKpis' | 'analyticsAds' | 'performance' | 'isoCompliance' | 'knowledgeBase' | 'brandConfig' | 'processExecution' | 'notificationFeed' | 'creatorPipeline' | 'videoGeneration' | 'briefingGenerator' | 'financeMails' | 'emmaPlanner' | 'workspace';
type Section = 'home' | 'hiring' | 'marketing' | 'support' | 'ecommerce' | 'finance' | 'analytics' | 'admin' | 'account' | 'compliance' | 'workspace';
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
      { id: 'home', label: 'Overview' },
      { id: 'teamTasks', label: 'Tasks' },
    ],
  },
  {
    id: 'hiring',
    label: 'Hiring',
    emoji: '🎯',
    tabs: [
      { id: 'applications', label: 'Applications' },
      { id: 'kanban', label: 'Kanban Board' },
      { id: 'projectAreas', label: 'Project Areas' },
      { id: 'onboarding', label: 'Onboarding' },
      { id: 'emailTemplates', label: 'Email Templates' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    emoji: '📣',
    minRole: 'staff',
    tabs: [
      { id: 'marketingBrands', label: 'Brand Status' },
      { id: 'marketingSOPTracker', label: 'Ads SOP Tracker' },
      { id: 'marketingContentPlaybook', label: 'Content Playbook' },
      { id: 'postsTracker', label: 'Posts Tracker' },
      { id: 'marketingResources', label: 'Resources' },
      { id: 'creatorPipeline', label: '🤳 Creators' },
      { id: 'videoGeneration', label: '🎬 Video Gen' },
      { id: 'briefingGenerator', label: '⚡ Briefings' },
    ],
  },
  {
    id: 'support',
    label: 'Customer Support',
    emoji: '💬',
    tabs: [
      { id: 'customerSupportOverview', label: 'Overview' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    emoji: '💰',
    minRole: 'admin',
    tabs: [
      { id: 'financeOverview', label: 'Overview' },
      { id: 'financeDisputesTab', label: 'Disputes' },
      { id: 'toolStack', label: '🔧 Tool Stack' },
      { id: 'financeMails', label: '📬 Finance Mails' },
      { id: 'emmaPlanner', label: '🗓 Emma · Plan' },
    ],
  },
  {
    id: 'ecommerce',
    label: 'E-Commerce',
    emoji: '🛒',
    minRole: 'staff',
    tabs: [
      { id: 'ecomOverview', label: 'Overview' },
      { id: 'ecomOrders', label: 'Orders' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    emoji: '📊',
    minRole: 'staff',
    tabs: [
      { id: 'analyticsKpis', label: 'Brand KPIs' },
      { id: 'analyticsAds', label: 'Ad Performance' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    emoji: '⚙️',
    minRole: 'admin',
    tabs: [
      { id: 'teamManagement', label: 'Team' },
      { id: 'performance', label: '📈 Performance' },
      { id: 'academy', label: '🎓 Academy' },
      { id: 'insights', label: 'Insights' },
      { id: 'brandConfig', label: '🏷️ Brand Config' },
      { id: 'settings', label: 'Settings' },
    ],
  },
  {
    id: 'compliance' as Section,
    label: 'Compliance',
    emoji: '🛡️',
    minRole: 'admin',
    tabs: [
      { id: 'isoCompliance', label: '⚠️ Risk & ISO' },
      { id: 'knowledgeBase', label: '📚 Knowledge Base' },
      { id: 'processExecution', label: '▶ SOPs' },
      { id: 'notificationFeed', label: '🔔 Feed' },
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

  const [section, setSection] = useState<Section>('home');
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
            // Map DB 'project_interest' to frontend 'preferred_project_areas'
            preferred_project_areas: (applicant as any).project_interest || null,
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
    if (tab === 'home') {
      return <HomeView />;
    }

    if (tab === 'teamTasks') {
      return <TeamTasksView userEmail={session?.user?.email} />;
    }

    if (tab === 'financeOverview' || tab === 'financeDisputesTab' || tab === 'financeMails' || tab === 'emmaPlanner') {
      const financeTabMap: Record<string, string> = {
        financeDisputesTab: 'disputes',
        financeOverview: 'overview',
        financeMails: 'financeMails',
        emmaPlanner: 'emmaPlanner',
      };
      return <FinanceView activeTab={financeTabMap[tab] as any} />;
    }

    if (tab === 'toolStack') {
      return <ToolStackView isAdmin={isAdmin} />;
    }

    if (tab === 'ecomOverview' || tab === 'ecomOrders') {
      return <EcommerceView activeTab={tab === 'ecomOrders' ? 'orders' : 'overview'} />;
    }

    if (tab === 'analyticsKpis' || tab === 'analyticsAds') {
      return <AnalyticsView activeTab={tab === 'analyticsAds' ? 'ads' : 'kpis'} />;
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

    if (tab === 'marketingBrands' || tab === 'marketingResources' || tab === 'marketingSOPTracker' || tab === 'marketingContentPlaybook') {
      return <MarketingView activeTab={tab} isAdmin={isAdmin} />;
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
    <div className="animate-[fadeIn_0.5s_ease-out] bg-gradient-to-br from-slate-50 via-white to-amber-50/30 min-h-screen pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200/60 py-3 md:py-4 px-4 md:px-8 gap-2 md:gap-4">
        <div>
          <h1 className="text-lg md:text-2xl font-black text-gray-900 tracking-tighter">
            {companyName} <span className="hidden md:inline">— {t.dashboard.title}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isDemoMode ? (
              <span className="inline-flex items-center px-3 py-1 bg-orange-500/10 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-500/20 animate-pulse">
                {t.dashboard.demoMode}
              </span>
            ) : (
              <>{t.dashboard.loggedInAs} <span className="text-primary-600 font-bold">{session?.user.email}</span></>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Brand Switcher — visible when in a brand-aware section */}
          {section !== 'account' && section !== 'home' && <BrandSwitcher />}
          {/* Notification Bell — visible to all logged-in users */}
          {(session || isDemoMode) && <NotificationBell userId={session?.user?.id} />}
          {/* Language Toggle */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5">
            <button
              onClick={() => setLang('de')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${lang === 'de' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              DE
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${lang === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
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
                className="text-[10px] font-black uppercase tracking-wider bg-gray-100 border-0 rounded-lg px-3 py-2 text-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="__real__">View as: Owner</option>
                <option value="admin">View as: Admin</option>
                <option value="staff">View as: Staff</option>
                <option value="intern_lead">View as: Intern Lead</option>
                <option value="viewer">View as: Viewer</option>
              </select>
            </div>
          )}
          <button onClick={handleLogout} className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 text-xs font-bold rounded-lg transition-colors">
            {t.dashboard.logout}
          </button>
        </div>
      </header>

      {/* Top Section Nav — desktop only */}
      <nav className="hidden md:flex items-center gap-1 border-b border-gray-200 px-4 md:px-8 overflow-x-auto">
        {visibleSections.map(s => (
          <button
            key={s.id}
            onClick={() => handleSectionChange(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all rounded-lg mx-0.5 ${
              section === s.id
                ? 'bg-gradient-to-r from-primary-500/15 to-amber-400/10 text-primary-700 shadow-sm'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100/70'
            } ${s.tabs.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
            disabled={s.tabs.length === 0}
            title={s.tabs.length === 0 ? t.dashboard.comingSoon : undefined}
          >
            <span>{s.emoji}</span>
            {t.sections[s.id] ?? s.label}
          </button>
        ))}
      </nav>

      {/* Quick Actions Bar */}
      <div className="flex items-center gap-2 py-3 px-4 md:px-8 overflow-x-auto border-b border-gray-100 mb-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Jarvis:</span>
        {(QUICK_ACTIONS[section] ?? DEFAULT_QUICK_ACTIONS).map(action => (
          <button
            key={action.label}
            onClick={() => { setChatInitialPrompt(action.prompt); setChatOpen(true); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 text-gray-600 text-xs font-semibold rounded-full whitespace-nowrap transition-all"
          >
            <span>{action.emoji}</span> {action.label}
          </button>
        ))}
      </div>

      {/* Body: Sidebar + Content */}
      <div className="flex flex-col md:flex-row gap-0 mt-0 px-4 md:px-8 pt-4">
        {/* Left Sidebar (desktop) / Horizontal pill-nav (mobile) */}
        {activeTabs.length > 0 && (
          <>
            {/* Mobile: horizontal scrollable pill row */}
            <nav className="flex md:hidden flex-row overflow-x-auto gap-1 py-2 px-1 border-b border-gray-100">
              {activeTabs.map(tabItem => (
                <button
                  key={tabItem.id}
                  onClick={() => { setTab(tabItem.id); setSelectedAppId(null); }}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    tab === tabItem.id
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  {t.tabs[tabItem.id] ?? tabItem.label}
                </button>
              ))}
            </nav>

            {/* Desktop: left sidebar */}
            <aside className="hidden md:block md:w-48 md:shrink-0 md:border-r md:border-gray-100 pt-6 pr-4">
              <nav className="flex flex-col gap-1">
                {activeTabs.map(tabItem => (
                  <button
                    key={tabItem.id}
                    onClick={() => { setTab(tabItem.id); setSelectedAppId(null); }}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      tab === tabItem.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
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
              <p className="text-gray-500 font-semibold">{t.sections[activeSection.id] ?? activeSection.label} — {t.dashboard.comingSoon}</p>
              <p className="text-gray-400 text-sm mt-1">{t.dashboard.comingSoonDesc}</p>
            </div>
          ) : (
            <Suspense fallback={<div className="text-center py-12 text-gray-400 text-sm">Loading...</div>}>
              <div key={tab} className="animate-[fadeIn_0.2s_ease-out]">
                {renderContent()}
              </div>
            </Suspense>
          )}
        </main>
      </div>
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-gray-200/60 flex items-center justify-around px-2 py-2 safe-area-pb">
        {[
          { id: 'home' as Section, emoji: '🏠', label: 'Home' },
          { id: 'hiring' as Section, emoji: '🎯', label: 'Hiring' },
          { id: 'marketing' as Section, emoji: '📣', label: 'Marketing' },
          { id: 'finance' as Section, emoji: '💰', label: 'Finance' },
          { id: 'admin' as Section, emoji: '⚙️', label: 'Admin' },
        ].filter(s => visibleSections.find(vs => vs.id === s.id)).map(s => (
          <button
            key={s.id}
            onClick={() => handleSectionChange(s.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[3.5rem] ${
              section === s.id
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <span className="text-xl leading-none">{s.emoji}</span>
            <span className="text-[10px] font-semibold">{s.label}</span>
          </button>
        ))}
        <button
          onClick={() => setChatOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[3.5rem] text-gray-400 hover:text-primary-700"
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
  );
};

export default Dashboard;
