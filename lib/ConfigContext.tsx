import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export interface AppConfig {
  id: number;
  company_name: string;
  program_name: string;
  from_email: string;
  from_name: string;
  app_url: string;
  logo_url: string | null;
  calendly_url: string | null;
  ai_instruction: string | null;
  landing_config: Record<string, any> | null;
  feature_flags: Record<string, boolean>;
  funnel_owners: Record<string, string | null> | null;
}

const DEFAULTS: AppConfig = {
  id: 1,
  company_name: '',
  program_name: '',
  from_email: '',
  from_name: '',
  app_url: '',
  logo_url: null,
  calendly_url: null,
  ai_instruction: null,
  landing_config: null,
  feature_flags: { kanban: true, ai_analysis: true, onboarding: true, public_positions: true },
  funnel_owners: {},
};

interface ConfigContextType {
  config: AppConfig;
  loading: boolean;
  refresh: () => Promise<void>;
  save: (updates: Partial<AppConfig>) => Promise<boolean>;
}

const ConfigContext = createContext<ConfigContextType>({
  config: DEFAULTS,
  loading: true,
  refresh: async () => {},
  save: async () => false,
});

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('recruiter_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (data) setConfig(data as AppConfig);
    setLoading(false);
  };

  const save = async (updates: Partial<AppConfig>): Promise<boolean> => {
    const { error } = await supabase
      .from('recruiter_settings')
      .update(updates)
      .eq('id', 1);
    if (!error) {
      setConfig(prev => ({ ...prev, ...updates }));
      return true;
    }
    return false;
  };

  useEffect(() => { load(); }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, refresh: load, save }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
