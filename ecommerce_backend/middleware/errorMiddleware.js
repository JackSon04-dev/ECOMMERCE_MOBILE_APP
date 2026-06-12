/**
 * 🛠️ ApiError - Class tạo lỗi tùy biến
 * Cho phép truyền mã HTTP Status Code và danh sách chi tiết các lỗi kèm theo
 */
export class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 🔄 asyncHandler - Helper tự động bắt lỗi cho các controller async
 * Giúp loại bỏ khối try-catch lặp đi lặp lại trong các file Controller.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 🛡️ Global Error Handler Middleware - Bộ xử lý lỗi tập trung của hệ thống
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Lỗi server nội bộ';
  let errors = err.errors || [];

  // Log lỗi chi tiết ra console trên server để lập trình viên dễ debug
  console.error(`❌ [Error] Path: ${req.originalUrl} | Method: ${req.method}`);
  console.error(err);

  // 1. Xử lý lỗi upload file của Multer
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Tên trường upload file không đúng (Phải là thumbnail hoặc images)';
  }

  // 2. Xử lý lỗi trùng lặp dữ liệu của MongoDB (Unique Key - Code 11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = field === 'email' ? 'Email đã tồn tại' : 'Dữ liệu đăng ký đã tồn tại';
  }

  // 3. Xử lý lỗi sai định dạng ID của MongoDB (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `ID không hợp lệ: Giá trị '${err.value}' không đúng định dạng ObjectId.`;
  }

  // 4. Xử lý lỗi validation dữ liệu của Mongoose (Schema Validation)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Dữ liệu gửi lên không hợp lệ';
    errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message
    }));
  }

  // 5. Xử lý lỗi xác thực JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token xác thực không hợp lệ. Vui lòng đăng nhập lại.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token xác thực đã hết hạn. Vui lòng lấy mã mới.';
  }

  // Phản hồi định dạng JSON chuẩn hóa cho Client (Flutter / Vue)
  res.status(statusCode).json({
    success: false,
    message,
    msg: message, // Tương thích ngược với các client cũ đang đọc biến .msg
    errors,
    // Chỉ hiển thị stack trace ở môi trường development để bảo mật
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
