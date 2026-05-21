import admin from 'firebase-admin'
import { readFileSync } from 'fs'

// Đọc file Service Account Key để xác thực với Google Cloud
const serviceAccount = JSON.parse(
  readFileSync(new URL('./firebase-adminsdk.json', import.meta.url))
)

// Khởi tạo Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

// Export messaging instance để gửi Push Notification
export const messaging = admin.messaging()
export default admin
