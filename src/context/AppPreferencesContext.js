import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StorageService } from '../services/StorageService';
import { DEFAULT_LANGUAGE } from '../constants/i18n';

const AppPreferencesContext = createContext(null);

export const AppPreferencesProvider = ({ children }) => {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [quickTourCompleted, setQuickTourCompletedState] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      StorageService.init();
      const prefs = await StorageService.getAppPreferences();
      setLanguageState(prefs?.language || DEFAULT_LANGUAGE);
      setQuickTourCompletedState(Boolean(prefs?.quickTourCompleted));
      setIsReady(true);
    };

    loadPreferences();
  }, []);

  const persist = async (nextPrefs) => {
    const currentPrefs = await StorageService.getAppPreferences();
    const merged = { ...(currentPrefs || {}), ...nextPrefs };
    await StorageService.setAppPreferences(merged);
  };

  const setLanguage = async (nextLanguage) => {
    setLanguageState(nextLanguage);
    await persist({ language: nextLanguage });
  };

  const completeQuickTour = async () => {
    setQuickTourCompletedState(true);
    await persist({ quickTourCompleted: true });
  };

  const value = useMemo(() => ({
    language,
    quickTourCompleted,
    isReady,
    setLanguage,
    completeQuickTour,
  }), [language, quickTourCompleted, isReady]);

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
};

export const useAppPreferences = () => {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error('useAppPreferences must be used within AppPreferencesProvider');
  }
  return context;
};
