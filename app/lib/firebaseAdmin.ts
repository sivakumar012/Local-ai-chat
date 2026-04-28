/**
 * Firebase Admin SDK singleton.
 *
 * Credential resolution order:
 *  1. Service account env vars (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)
 *  2. GOOGLE_APPLICATION_CREDENTIALS file path
 *  3. Application Default Credentials (gcloud auth application-default login)
 */

import { initializeApp, getApps, cert, applicationDefault, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

export function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "prepforexams-aabbd";

  if (clientEmail && privateKey) {
    // Explicit service account key — preferred for production and local dev
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }

  // Fall back to ADC (works with GOOGLE_APPLICATION_CREDENTIALS or gcloud)
  return initializeApp({ credential: applicationDefault(), projectId });
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

/**
 * Returns true if Admin SDK credentials are configured.
 * Used by API routes to return a helpful 503 instead of crashing.
 */
export function isAdminConfigured(): boolean {
  const hasServiceAccount =
    !!process.env.FIREBASE_CLIENT_EMAIL && !!process.env.FIREBASE_PRIVATE_KEY;
  const hasADC = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  return hasServiceAccount || hasADC;
}
