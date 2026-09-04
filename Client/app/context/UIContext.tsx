'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Lang } from '~/lib/i18n';
import { STORAGE_KEYS } from '~/lib/constants';

export type Theme = 'light' | 'dark';

interface UIContextType {
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  theme: Theme;
  lang: Lang;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  closeSidebarMobile: () => void;
  setTheme: (theme: Theme) => void;
  setLang: (lang: Lang) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>('light');
  const [lang, setLangState] = useState<Lang>('fa');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
      const savedLang = localStorage.getItem(STORAGE_KEYS.language);
      const savedSidebar = localStorage.getItem(STORAGE_KEYS.sidebar);

      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      }
      if (savedLang === 'fa' || savedLang === 'en') {
        setLangState(savedLang);
      }
      if (savedSidebar === 'false' || savedSidebar === 'true') {
        setSidebarOpen(savedSidebar === 'true');
      }
    } catch {
      // localStorage can be unavailable in private browsing contexts.
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.theme, theme);
    }
  }, [isHydrated, theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.language, lang);
    }
  }, [isHydrated, lang]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.sidebar, String(sidebarOpen));
    }
  }, [isHydrated, sidebarOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileSidebarOpen((open) => !open);
      return;
    }
    setSidebarOpen((open) => !open);
  };

  const toggleMobileSidebar = () => setMobileSidebarOpen((open) => !open);
  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  return (
    <UIContext.Provider
      value={{
        sidebarOpen,
        mobileSidebarOpen,
        theme,
        lang,
        toggleSidebar,
        toggleMobileSidebar,
        closeMobileSidebar,
        closeSidebarMobile: closeMobileSidebar,
        setTheme: setThemeState,
        setLang: setLangState,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
