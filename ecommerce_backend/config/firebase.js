import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Môi trường Production (Render): Đọc từ biến môi trường
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Môi trường Dev (Local): Đọc từ file JSON
  const localPath = new URL('./firebase-adminsdk.json', import.meta.url);
  if (existsSync(localPath)) {
    serviceAccount = JSON.parse(readFileSync(localPath, 'utf8'));
  } else {
    console.warn('⚠️ Firebase credentials not found! Missing FIREBASE_SERVICE_ACCOUNT env var or local file.');
  }
}

// Khởi tạo Firebase Admin SDK
if (serviceAccount && admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Export messaging instance để gửi Push Notification
export const messaging = admin.messaging()
export default admin
