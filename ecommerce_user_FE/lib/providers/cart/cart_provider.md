# Cart Provider Riverpod Documentation

Tài liệu này mô tả chi tiết logic quản lý giỏ hàng (Cart) sử dụng Riverpod trong ứng dụng Ecommerce, bao gồm cơ chế Optimistic Update, Đồng bộ hóa dữ liệu (Sync) và Xử lý Checkout.

## 1. Cấu trúc State (CartState)

Giỏ hàng được quản lý bởi `CartState` với các thành phần chính:

-   **`cartAPI` (CartData?)**: Dữ liệu giỏ hàng chính thức được tải từ MongoDB (Server).
-   **`cartUpdate` (List<CartItem>)**: Dữ liệu thay đổi tạm thời tại Local (Chưa đồng bộ lên server). Lưu trữ trong `SharedPreferences`.
-   **`selectedKeys` (Set<String>)**: Danh sách các `uniqueKey` của item được người dùng chọn để thanh toán.
-   **`isCheckoutPaused` (bool)**: Biến cờ dùng để tạm dừng tiến trình đồng bộ tự động 15s khi người đang thực hiện checkout.

### Định danh Item (Unique Key)
Mỗi sản phẩm trong giỏ hàng được định danh duy nhất bằng khóa:
`uniqueKey = "${productId}_${color}_${size}"`

---

## 2. Logic Hiển thị (cartUI - Merged Data)

Dữ liệu hiển thị trên UI (`cartUI`) là sự kết hợp giữa `cartAPI` và `cartUpdate` theo quy tắc sau:

1.  **Ưu tiên `cartUpdate`**: Nếu một item tồn tại ở cả 2 nơi, giá trị trong `cartUpdate` (số lượng mới) sẽ đè lên `cartAPI`.
2.  **Thêm mới**: Các item có trong `cartUpdate` nhưng chưa có trong `cartAPI` sẽ được thêm vào danh sách.
3.  **Lọc bỏ**: Các item có `quantity <= 0` hoặc item bị đánh dấu xóa sẽ không hiển thị trên UI.
4.  **Hết hàng**: Các item được đánh dấu `isOutOfStock` sẽ được xử lý riêng trên UI (hiển thị nhưng không cho phép chọn thanh toán).

---

## 3. Các Luồng Nghiệp vụ Chính

### Trường hợp 1: Cập nhật & Đồng bộ tự động (Background Sync)

-   **Hành động**: Khi User nhấn "Thêm vào giỏ", "Tăng/Giảm số lượng" hoặc "Xóa item".
-   **Logic Local**:
    1.  Cập nhật ngay lập tức vào biến `cartUpdate`.
    2.  Lưu `cartUpdate` vào `LocalStorage` (SharedPreferences) để tránh mất dữ liệu khi tắt app.
    3.  **Khởi động/Reset Timer 15s**: Mỗi khi có thay đổi local, bộ đếm 15s sẽ được bắt đầu lại.
-   **Logic Sync (hàm `syncCartToServer`)**:
    -   Sau 15s không có tác động mới, nếu `cartUpdate != null`:
        1.  Gọi API `updateCart` gửi toàn bộ mảng `items` từ `cartUpdate` lên MongoDB.
        2.  **Kết quả thành công**:
            -   Trả về `true`.
            -   Xóa dữ liệu `cartUpdate` trong `LocalStorage`.
            -   Set `cartUpdate = []` (null).
            -   Gọi lại API `getCart` để cập nhật `cartAPI` mới nhất từ Server.
            -   Lúc này `cartUI` sẽ khớp hoàn toàn với `cartAPI`.
        3.  **Kết quả thất bại**: Trả về `false` và giữ nguyên `cartUpdate` để thử lại lần sau.

### Trường hợp 2: Xóa Item & Thanh toán (Checkout)

Khi người dùng thực hiện xóa item hoặc hoàn tất thanh toán, logic dọn dẹp được thực hiện như sau:

-   **Xóa Item (Manual/Checkout)**:
    -   Nếu Item chỉ có trong **`cartUpdate`**: Xóa trực tiếp khỏi danh sách `cartUpdate` và LocalStorage.
    -   Nếu Item có trong **`cartAPI`**: Set `quantity = 0` và lưu vào `cartUpdate`. Khi Sync chạy, server sẽ nhận được `quantity = 0` và xóa item này khỏi database.
    -   Nếu tồn tại ở cả 2: Thực hiện cả 2 thao tác trên.

-   **Trong quá trình Checkout**:
    1.  **Dừng đồng bộ**: Set `isCheckoutPaused = true` và cancel Timer 15s. Điều này tránh việc dữ liệu bị ghi đè lên server trong khi đơn hàng đang được xử lý.
    2.  **Sau khi Checkout thành công**:
        > [!IMPORTANT]
        > Chỉ thực hiện dọn dẹp khi đơn hàng đã được xác nhận thanh toán thành công.
        -   Cập nhật lại `cartAPI` (load data mới từ server).
        -   Cập nhật `cartUpdate` (loại bỏ các item đã mua hoặc set quantity = 0 nếu cần).
        -   **Kích hoạt lại Sync**: Set `isCheckoutPaused = false` và chạy lại Timer nếu còn item cần update.
    3.  **Nếu Checkout thất bại**:
        -   Giữ nguyên trạng thái `isCheckoutPaused = false` để Timer có thể tiếp tục làm việc (nếu cần).
        -   Không xóa bất kỳ item nào để User không bị mất dữ liệu giỏ hàng.

---

## 4. Đặc tả hàm `update` (Sync Logic)

Hàm `update` (hoặc `syncCartToServer`) đóng vai trò là "chốt chặn" đồng bộ:

```dart
Future<bool> syncCartToServer() async {
  // 1. Kiểm tra điều kiện (isPaused, cartUpdate empty)
  // 2. Map dữ liệu cartUpdate sang payload API
  // 3. Thực hiện call CartService.updateCart
  // 4. Nếu thành công: Clear local, update state, loadCart()
  // 5. Trả về kết quả Thành công/Thất bại
}
```

## 5. Phân tích các trường hợp biên (Edge Cases)

| Trường hợp | Xử lý |
| :--- | :--- |
| Mất mạng khi đang đợi 15s | Dữ liệu vẫn nằm trong `cartUpdate` (Local Storage). Khi mở lại app hoặc mạng phục hồi, Timer sẽ tự kích hoạt lại. |
| User xóa app / Clear cache | Do lưu ở LocalStorage, dữ liệu chưa sync sẽ bị mất. Tuy nhiên `cartAPI` vẫn còn trên server. |
| Thay đổi số lượng liên tục | Timer 15s liên tục bị reset (Debounce), chỉ gọi API 1 lần duy nhất sau khi user dừng thao tác 15s. |
| Checkout item đang hết hàng | Hệ thống chặn không cho phép chọn (`selectedKeys`) các item có `isOutOfStock`. |
