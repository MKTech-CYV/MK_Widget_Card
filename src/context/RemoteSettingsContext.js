import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  DEFAULT_REMOTE_SETTINGS,
  fetchRemoteAppSettings,
  getCachedRemoteSettings,
} from '../services/AppSettingsService';

const RemoteSettingsContext = createContext(null);

export const RemoteSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_REMOTE_SETTINGS);
  const [isReady, setIsReady] = useState(false);
  const settingsRef = useRef(DEFAULT_REMOTE_SETTINGS);

  const applySettings = useCallback((nextSettings) => {
    const normalizedSettings = {
      ...DEFAULT_REMOTE_SETTINGS,
      ...(nextSettings || {}),
    };

    settingsRef.current = normalizedSettings;
    setSettings(normalizedSettings);
    return normalizedSettings;
  }, []);

  const refreshRemoteSettings = useCallback(async () => {
    try {
      const remoteSettings = await fetchRemoteAppSettings();
      const nextSettings = applySettings(remoteSettings || DEFAULT_REMOTE_SETTINGS);
      setIsReady(true);
      return nextSettings;
    } catch {
      const cached = await getCachedRemoteSettings().catch(() => null);
      const fallbackSettings = applySettings(cached || settingsRef.current || DEFAULT_REMOTE_SETTINGS);
      setIsReady(true);
      return fallbackSettings;
    }
  }, [applySettings]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const cached = await getCachedRemoteSettings().catch(() => null);
      if (mounted && cached) {
        applySettings(cached);
      }

      try {
        const remoteSettings = await fetchRemoteAppSettings();
        if (mounted) {
          applySettings(remoteSettings || DEFAULT_REMOTE_SETTINGS);
        }
      } catch {
        if (mounted) {
          applySettings(cached || settingsRef.current || DEFAULT_REMOTE_SETTINGS);
        }
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    };

    load();

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshRemoteSettings().catch(() => null);
      }
    });

    return () => {
      mounted = false;
      appStateSubscription?.remove?.();
    };
  }, [applySettings, refreshRemoteSettings]);

  const value = useMemo(() => ({
    ...settings,
    isReady,
    refreshRemoteSettings,
  }), [isReady, refreshRemoteSettings, settings]);

  return (
    <RemoteSettingsContext.Provider value={value}>
      {children}
    </RemoteSettingsContext.Provider>
  );
};

export const useRemoteSettings = () => {
  const context = useContext(RemoteSettingsContext);
  if (!context) {
    throw new Error('useRemoteSettings must be used within RemoteSettingsProvider');
  }
  return context;
};
