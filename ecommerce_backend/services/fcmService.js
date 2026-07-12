import { messaging } from '../config/firebase.js'
import User from '../models/userModel.js'

/**
 * Gửi Push Notification đến một hoặc nhiều thiết bị
 * @param {string[]} tokens - Mảng FCM tokens của các thiết bị
 * @param {string} title - Tiêu đề thông báo
 * @param {string} body - Nội dung thông báo
 * @param {object} data - Dữ liệu đính kèm (để App xử lý khi click vào thông báo)
 */
export const sendPushNotification = async (tokens, title, body, data = {}, imageUrl = null) => {
  // Nếu không có token nào thì bỏ qua
  if (!tokens || tokens.length === 0) {
    console.log('⚠️ FCM: Không có device token nào để gửi thông báo')
    return null
  }

  // Chuyển mọi giá trị trong data sang string (yêu cầu bắt buộc của FCM)
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

    // Xử lý các token không hợp lệ (thiết bị đã gỡ app hoặc token hết hạn)
    if (response.failureCount > 0) {
      const failedTokens = []
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx])
        }
      })

      // Tự động dọn dẹp các token lỗi khỏi Database
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
