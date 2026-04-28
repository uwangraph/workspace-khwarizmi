import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

const serviceAccountPath = join(process.cwd(), 'khwarizmi-attendance-firebase-adminsdk-fbsvc-cb2e13b255.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export const fcmAdmin = admin.messaging();

export async function sendPushNotification(tokens: string[], title: string, body: string, data?: any) {
  if (tokens.length === 0) return;

  const message = {
    notification: { title, body },
    data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {},
    tokens
  };

  try {
    const response = await fcmAdmin.sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} messages; ${response.failureCount} messages failed.`);
    
    if (response.failureCount > 0) {
      // Logic to handle failed tokens (e.g., remove invalid ones from DB)
      // For now, just log them
    }
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}
