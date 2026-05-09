import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, getDocs, orderBy, Timestamp, getDocFromServer, serverTimestamp, FieldValue } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); 
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Auth Provider for popup
googleProvider.setCustomParameters({
  prompt: 'select_account', // Force account selection even if one account is already logged in
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Parse Firebase Auth errors and provide user-friendly messages
 */
export function parseAuthError(error: any): {
  userMessage: string;
  technicalMessage: string;
  errorCode: string;
  suggestions: string[];
} {
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';

  // Popup closed by user (non-fatal)
  if (errorCode === 'auth/popup-closed-by-user') {
    return {
      errorCode,
      userMessage: 'Login popup was closed. Please try again.',
      technicalMessage: 'User closed the authentication popup.',
      suggestions: ['Try logging in again'],
    };
  }

  // Popup blocked
  if (
    errorCode === 'auth/popup-blocked' ||
    errorMessage.includes('popup') ||
    errorMessage.includes('blocked')
  ) {
    return {
      errorCode: 'auth/popup-blocked',
      userMessage: '🔒 Popup Blocked: Your browser is blocking the login popup. Please enable popups for this site.',
      technicalMessage: 'Browser popup blocker prevented authentication popup.',
      suggestions: [
        'Disable popup blocker for this domain',
        'Check browser security settings',
        'Try a different browser',
        'Allow popups in your browser permissions',
      ],
    };
  }

  // Network/CORS error (common with network IP domains)
  if (
    errorCode === 'auth/network-request-failed' ||
    errorMessage.includes('network') ||
    errorMessage.includes('CORS') ||
    errorMessage.includes('fetch')
  ) {
    return {
      errorCode: 'auth/network-error',
      userMessage: '🌐 Network Error: Could not connect to Google authentication. Check your connection and domain configuration.',
      technicalMessage: 'Network request failed during authentication.',
      suggestions: [
        'Check your internet connection',
        'Ensure your domain is authorized in Firebase Console',
        'Add your network IP domain to Firebase authorized domains',
        'Try using localhost:3000 instead of network IP',
        'Check for firewall restrictions',
      ],
    };
  }

  // Operation not supported (often with network IPs not authorized)
  if (
    errorCode === 'auth/operation-not-supported-in-this-environment' ||
    errorMessage.includes('not supported')
  ) {
    return {
      errorCode: 'auth/not-supported',
      userMessage: '⚠️ Domain Not Authorized: Your network domain is not configured for Google Sign-In.',
      technicalMessage: 'Authentication operation not supported for this domain.',
      suggestions: [
        'Add your domain to Firebase Console → Authentication → Settings → Authorized Domains',
        'If using IP address: add it as "192.168.x.x:3000" format',
        'Alternatively, add "localhost:3000" and access via localhost',
        'Wait 2-3 minutes for Firebase changes to propagate',
      ],
    };
  }

  // Invalid config
  if (
    errorCode === 'auth/invalid-api-key' ||
    errorCode === 'auth/invalid-app-id' ||
    errorMessage.includes('invalid')
  ) {
    return {
      errorCode: 'auth/invalid-config',
      userMessage: '⚙️ Configuration Error: Firebase configuration is invalid.',
      technicalMessage: 'Firebase authentication configuration is incorrect.',
      suggestions: [
        'Verify firebase-applet-config.json is correct',
        'Check Firebase project ID matches GCP project',
        'Regenerate Firebase config from Firebase Console',
      ],
    };
  }

  // Cancelled popup request
  if (errorCode === 'auth/cancelled-popup-request') {
    return {
      errorCode,
      userMessage: 'Login request was cancelled. Please try again.',
      technicalMessage: 'Popup request was cancelled.',
      suggestions: ['Retry authentication'],
    };
  }

  // Generic error
  return {
    errorCode,
    userMessage: `❌ Login Failed: ${errorMessage || 'Unknown authentication error'}`,
    technicalMessage: errorMessage,
    suggestions: [
      'Check browser console for more details',
      'Verify your internet connection',
      'Clear browser cache and cookies',
      'Try in an incognito/private window',
      'Check Firebase Console for domain authorization',
    ],
  };
}

// Test connection strictly as requested
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  getDocs,
  orderBy,
  Timestamp,
  serverTimestamp,
  FieldValue
};
export type { FirebaseUser };
