import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

let fcmAdmin: admin.messaging.Messaging | null = null;

function initFirebaseAdmin() {
  try {
    if (admin.apps.length) {
      fcmAdmin = admin.messaging();
      return;
    }

    // Priority 1: env var (production-friendly)
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      fcmAdmin = admin.messaging();
      return;
    }

    // Priority 2: file-based (local dev)
    const serviceAccountPath = join(process.cwd(), 'khwarizmi-attendance-firebase-adminsdk-fbsvc-cb2e13b255.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    fcmAdmin = admin.messaging();
  } catch (error) {
    console.warn(
      '[FCM] Firebase Admin SDK not initialized — push notifications will be skipped.',
      error instanceof Error ? error.message : String(error)
    );
    fcmAdmin = null;
  }
}

initFirebaseAdmin();

export { fcmAdmin };

export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (!fcmAdmin) {
    console.warn('[FCM] Not available, skipping push notification.');
    return;
  }
  if (tokens.length === 0) return;

  const safeData = data
    ? Object.fromEntries(
        Object.entries(data)
          .filter(([, v]) => v !== null && v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    : {};

  try {
    const response = await fcmAdmin.sendEachForMulticast({ notification: { title, body }, data: safeData, tokens });
    console.log(`[FCM] OK=${response.successCount} FAIL=${response.failureCount}`);
    return response;
  } catch (error) {
    console.error('[FCM] Error sending push notification:', error);
  }
}
