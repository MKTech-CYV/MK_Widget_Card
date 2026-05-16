import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

  const refreshRemoteSettings = useCallback(async () => {
    try {
      const remoteSettings = await fetchRemoteAppSettings();
      const nextSettings = remoteSettings || DEFAULT_REMOTE_SETTINGS;
      setSettings(nextSettings);
      setIsReady(true);
      return nextSettings;
    } catch {
      setSettings(DEFAULT_REMOTE_SETTINGS);
      setIsReady(true);
      return DEFAULT_REMOTE_SETTINGS;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const cached = await getCachedRemoteSettings();
      if (mounted && cached?.paymentEnabled === false) {
        setSettings({
          ...DEFAULT_REMOTE_SETTINGS,
          ...cached,
        });
      }

      try {
        const remoteSettings = await fetchRemoteAppSettings();
        if (mounted) {
          setSettings(remoteSettings || DEFAULT_REMOTE_SETTINGS);
        }
      } catch {
        if (mounted) {
          setSettings(DEFAULT_REMOTE_SETTINGS);
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
  }, [refreshRemoteSettings]);

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
