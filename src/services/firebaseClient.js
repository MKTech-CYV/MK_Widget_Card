import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Public client config (not a secret — restricted by Firestore/Storage security
// rules, same trust model as Supabase's anon key). From Firebase project
// mk-widget-card-84, Web app "MK Widget Card - Mobile".
const firebaseConfig = {
  apiKey: 'AIzaSyBdtF_7T4cSQQ0jNMUKAw1hhqIMc8noUSE',
  authDomain: 'mk-widget-card-84.firebaseapp.com',
  projectId: 'mk-widget-card-84',
  storageBucket: 'mk-widget-card-84.firebasestorage.app',
  messagingSenderId: '896185084209',
  appId: '1:896185084209:web:3af0be0623e31f500ba810',
};

// The OAuth "Web client" entry auto-created by Firebase alongside the
// Android/iOS clients — required by GoogleSignin.configure on both platforms.
const GOOGLE_WEB_CLIENT_ID = '896185084209-1tngo7tue8lhs1bgsen28bft7ict4rh4.apps.googleusercontent.com';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

export const isFirebaseConfigured = true;
