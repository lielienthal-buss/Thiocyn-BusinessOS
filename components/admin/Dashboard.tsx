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
import HomeView from './HomeView';
import FinanceView from './FinanceView';
import EcommerceView from './EcommerceView';
import AnalyticsView from './AnalyticsView';
import { QUICK_ACTIONS, DEFAULT_QUICK_ACTIONS } from '../../lib/agentQuickActions';
import { getApplicant } from '../../lib/actions'; // Import getApplicant
import type { Application } from '../../types'; // Import Application
import Spinner from '../ui/Spinner';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { useLang } from '../../lib/i18n';
import { translations } from '../../lib/translations';

type Tab = 'applications' | 'kanban' | 'projectAreas' | 'insights' | 'settings' | 'emailTemplates' | 'onboarding' | 'academy' | 'customerSupportOverview' | 'marketingBrands' | 'marketingResources' | 'marketingSOPTracker' | 'marketingContentPlaybook' | 'postsTracker' | 'teamManagement' | 'accountProfile' | 'home' | 'teamTasks' | 'financeOverview' | 'financeDisputesTab' | 'ecomOverview' | 'ecomOrders' | 'analyticsKpis' | 'analyticsAds';
type Section = 'home' | 'hiring' | 'marketing' | 'support' | 'ecommerce' | 'finance' | 'analytics' | 'admin' | 'account';

interface OutletContext {
  session: Session | null;
  isDemoMode: boolean;
  setIsDemoMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const ADMIN_EMAIL = 'luis@mail.hartlimesgmbh.de';

const SECTIONS: { id: Section; label: string; emoji: string; adminOnly?: boolean; tabs: { id: Tab; label: string }[] }[] = [
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
    tabs: [
      { id: 'marketingBrands', label: 'Brand Status' },
      { id: 'marketingSOPTracker', label: 'Ads SOP Tracker' },
      { id: 'marketingContentPlaybook', label: 'Content Playbook' },
      { id: 'postsTracker', label: 'Posts Tracker' },
      { id: 'marketingResources', label: 'Resources' },
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
    tabs: [
      { id: 'financeOverview', label: 'Overview' },
      { id: 'financeDisputesTab', label: 'Disputes' },
    ],
  },
  {
    id: 'ecommerce',
    label: 'E-Commerce',
    emoji: '🛒',
    tabs: [
      { id: 'ecomOverview', label: 'Overview' },
      { id: 'ecomOrders', label: 'Orders' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    emoji: '📊',
    tabs: [
      { id: 'analyticsKpis', label: 'Brand KPIs' },
      { id: 'analyticsAds', label: 'Ad Performance' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    emoji: '⚙️',
    adminOnly: true,
    tabs: [
      { id: 'teamManagement', label: 'Team' },
      { id: 'academy', label: '🎓 Academy' },
      { id: 'insights', label: 'Insights' },
      { id: 'settings', label: 'Settings' },
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
  const { session, isDemoMode, setIsDemoMode } =
    useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const { lang, setLang } = useLang();
  const t = translations[lang];

  const [section, setSection] = useState<Section>('home');
  const [userRole, setUserRole] = useState<string>('viewer');
  const [tab, setTab] = useState<Tab>('home');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedApplicationData, setSelectedApplicationData] =
    useState<Application | null>(null); // New state for fetched applicant data
  const [loadingApplicant, setLoadingApplicant] = useState(false); // New state for loading applicant details
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>();

  useEffect(() => {
    if (session?.user?.email) {
      supabase
        .from('team_members')
        .select('role, allowed_sections, status')
        .eq('email', session.user.email)
        .eq('status', 'active')
        .maybeSingle()
        .then(({ data }) => {
          if (data) setUserRole(data.role);
        });
    }
  }, [session]);

  const isAdmin = isDemoMode || userRole === 'owner' || userRole === 'admin' || session?.user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!session && !isDemoMode) {
      navigate('/admin');
      return;
    }
    // Non-recruiting interns get redirected to their portal
    if (session) {
      supabase
        .from('intern_accounts')
        .select('id, department')
        .eq('auth_user_id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data && data.department !== 'recruiting') {
            navigate('/intern/' + data.id);
          }
        });
    }
  }, [session, isDemoMode, navigate]);

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

    if (tab === 'financeOverview' || tab === 'financeDisputesTab') {
      return <FinanceView activeTab={tab === 'financeDisputesTab' ? 'disputes' : 'overview'} />;
    }

    if (tab === 'ecomOverview' || tab === 'ecomOrders') {
      return <EcommerceView activeTab={tab === 'ecomOrders' ? 'orders' : 'overview'} />;
    }

    if (tab === 'analyticsKpis' || tab === 'analyticsAds') {
      return <AnalyticsView activeTab={tab === 'analyticsAds' ? 'ads' : 'kpis'} />;
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

    if (tab === 'teamManagement') {
      return <TeamManagementView />;
    }

    if (tab === 'accountProfile') {
      return <AccountView session={session} />;
    }

    return null;
  };

  const visibleSections = SECTIONS.filter(s => !s.adminOnly || isAdmin);
  const activeSection = SECTIONS.find(s => s.id === section) ?? SECTIONS[0];
  const activeTabs = activeSection.tabs;

  const handleSectionChange = (s: Section) => {
    setSection(s);
    const first = SECTIONS.find(x => x.id === s)?.tabs[0];
    if (first) setTab(first.id);
    setSelectedAppId(null);
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 pb-6 mb-0 relative z-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">
            {t.dashboard.title}
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
            <span className="text-[10px] font-black text-primary-600 uppercase tracking-[0.3em] bg-primary-50 px-4 py-2 rounded-full border border-primary-100">
              {t.dashboard.adminBadge}
            </span>
          )}
          <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg">
            {t.dashboard.logout}
          </button>
        </div>
      </header>

      {/* Top Section Nav */}
      <nav className="flex items-center gap-1 border-b border-gray-200 mt-0 mb-0 overflow-x-auto">
        {visibleSections.map(s => (
          <button
            key={s.id}
            onClick={() => handleSectionChange(s.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${
              section === s.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
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
      <div className="flex items-center gap-2 py-3 overflow-x-auto border-b border-gray-100 mb-0">
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
      <div className="flex flex-col md:flex-row gap-0 mt-0">
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
            renderContent()
          )}
        </main>
      </div>
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
