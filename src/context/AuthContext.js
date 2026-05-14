import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';

const AuthContext = createContext(null);
const AUTH_CALLBACK_PATH = 'auth/callback';

export const authRedirectUrl = ExpoLinking.createURL(AUTH_CALLBACK_PATH);

const parseParamString = (value = '') => (
  value
    .split('&')
    .filter(Boolean)
    .reduce((params, pair) => {
      const [rawKey, ...rawValueParts] = pair.split('=');
      const key = decodeURIComponent(rawKey || '');
      const rawValue = rawValueParts.join('=');

      if (key) {
        params[key] = decodeURIComponent((rawValue || '').replace(/\+/g, ' '));
      }

      return params;
    }, {})
);

const getUrlParams = (url = '') => {
  const [, hash = ''] = url.split('#');
  const query = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
  return {
    ...parseParamString(query),
    ...parseParamString(hash),
  };
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const refreshSession = async () => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setIsAuthReady(true);
      return null;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    setSession(data.session || null);
    setUser(data.session?.user || null);
    setIsAuthReady(true);

    return data.session || null;
  };

  const handleAuthCallback = async (url) => {
    if (!url || !isSupabaseConfigured) return;

    const params = getUrlParams(url);
    if (params.error || params.error_description) {
      throw new Error(params.error_description || params.error);
    }

    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) throw error;
      return;
    }

    if (params.access_token && params.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (error) throw error;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      if (!isSupabaseConfigured) {
        if (isMounted) {
          setIsAuthReady(true);
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      setSession(data.session || null);
      setUser(data.session?.user || null);
      setIsAuthReady(true);
    };

    const authSubscription = isSupabaseConfigured
      ? supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession || null);
        setUser(nextSession?.user || null);
      }).data.subscription
      : null;

    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthCallback(url).catch(() => {});
    });

    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          return handleAuthCallback(url);
        }
        return null;
      })
      .catch(() => {})
      .finally(loadSession);

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe?.();
      urlSubscription?.remove?.();
    };
  }, []);

  const signInWithPassword = async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: `${email || ''}`.trim(),
      password,
    });

    if (error) throw error;
  };

  const signUpWithPassword = async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: `${email || ''}`.trim(),
      password,
    });

    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: authRedirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error('Google OAuth URL was not returned.');

    await Linking.openURL(data.url);
    return { type: 'opened' };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = useMemo(() => ({
    session,
    user,
    isAuthReady,
    isSupabaseConfigured,
    authRedirectUrl,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    refreshSession,
    signOut,
  }), [session, user, isAuthReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
