import React, { createContext, useContext, useState } from 'react';

export type Lang = 'en' | 'de';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LangCtx = createContext<LangContextValue>({ lang: 'de', setLang: () => {} });

export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('de');
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
};

export const useLang = () => useContext(LangCtx);
