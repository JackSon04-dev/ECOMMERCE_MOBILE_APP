import { messaging } from '../config/firebase.js'
import User from '../models/userModel.js'

/**
 * Send Push Notification to one or more devices
 * @param {string[]} tokens - Array of devices' FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Attached data (for App to handle on notification click)
 */
export const sendPushNotification = async (tokens, title, body, data = {}, imageUrl = null) => {
  // If no tokens, skip
  if (!tokens || tokens.length === 0) {
    console.log('⚠️ FCM: Không có device token nào để gửi thông báo')
    return null
  }

  // Convert all values in data to string (strict FCM requirement)
  const stringData = {}
  for (const key in data) {
    stringData[key] = String(data[key])
  }

  const message = {
    notification: {
      title,
      body,
      ...(imageUrl && { image: imageUrl })
    },
    android: {
      notification: {
        channelId: "order_updates",
        sound: "notification_sound",
        ...(imageUrl && { imageUrl: imageUrl })
      }
    },
    data: stringData,
    tokens
  }

  try {
    const response = await messaging.sendEachForMulticast(message)
    console.log(`✅ FCM: Gửi thành công ${response.successCount}/${tokens.length} thiết bị`)

    // Handle invalid tokens (device uninstalled app or token expired)
    if (response.failureCount > 0) {
      const failedTokens = []
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx])
        }
      })

      // Auto cleanup invalid tokens from Database
      if (failedTokens.length > 0) {
        await User.updateMany(
          { 'fcmTokens.token': { $in: failedTokens } },
          { $pull: { fcmTokens: { token: { $in: failedTokens } } } }
        )
        console.log(`🧹 FCM: Đã dọn dẹp tự động ${failedTokens.length} token lỗi khỏi Database.`)
      }

      return { successCount: response.successCount, failedTokens }
    }

    return { successCount: response.successCount, failedTokens: [] }
  } catch (error) {
    console.error('❌ FCM: Lỗi gửi thông báo -', error.message)
    return null
  }
}
