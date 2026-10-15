import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { FirebaseConfigState } from '../types';
import appletConfig from '../../firebase-applet-config.json';

const STORAGE_KEY = 'lighthouse_hashi_firebase_config';

// Load configured keys from auto-provisioned json, env, or localStorage
export function getStoredFirebaseConfig(): FirebaseConfigState {
  const baseConfig: FirebaseConfigState = {
    apiKey: appletConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: appletConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: appletConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: appletConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: appletConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: appletConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: appletConfig.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
    firestoreDatabaseId: (appletConfig as any).firestoreDatabaseId || '',
    isConfigured: Boolean(appletConfig.apiKey && appletConfig.projectId),
    useLocalStorageFallback: true,
  };

  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      return {
        ...baseConfig,
        ...parsed,
        isConfigured: Boolean(parsed.apiKey && parsed.projectId) || baseConfig.isConfigured,
      };
    }
  } catch (e) {
    console.warn('Failed to parse local Firebase config', e);
  }

  return baseConfig;
}

export function saveStoredFirebaseConfig(config: Partial<FirebaseConfigState>) {
  try {
    const current = getStoredFirebaseConfig();
    const updated = {
      ...current,
      ...config,
      isConfigured: Boolean(config.apiKey && config.projectId),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save Firebase config to localStorage', e);
    return null;
  }
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAuth: Auth | null = null;
let firebaseStorageInstance: FirebaseStorage | null = null;

export function initFirebase() {
  const config = getStoredFirebaseConfig();
  if (!config.apiKey || !config.projectId || config.apiKey === 'MY_FIREBASE_API_KEY') {
    return {
      app: null,
      db: null,
      auth: null,
      storage: null,
      isLive: false,
    };
  }

  try {
    if (!getApps().length) {
      firebaseApp = initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
        projectId: config.projectId,
        storageBucket: config.storageBucket || `${config.projectId}.firebasestorage.app`,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
        measurementId: config.measurementId,
      });
    } else {
      firebaseApp = getApp();
    }

    // Connect to specific database if provided, or default
    firestoreDb = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
      ? getFirestore(firebaseApp, config.firestoreDatabaseId)
      : getFirestore(firebaseApp);

    firebaseAuth = getAuth(firebaseApp);
    firebaseStorageInstance = getStorage(firebaseApp);

    return {
      app: firebaseApp,
      db: firestoreDb,
      auth: firebaseAuth,
      storage: firebaseStorageInstance,
      isLive: true,
    };
  } catch (error) {
    console.warn('Firebase initialization error, defaulting to local persistence fallback:', error);
    return {
      app: null,
      db: null,
      auth: null,
      storage: null,
      isLive: false,
    };
  }
}

export const { app, db, auth, storage } = initFirebase();

export { GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged };
export type { FirebaseUser };
