/**
 * 🛠️ ApiError - Custom error class
 * Allows passing HTTP Status Code and detailed error list
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
 * 🔄 asyncHandler - Auto error catching helper for async controllers
 * Eliminates repetitive try-catch blocks in Controller files.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 🛡️ Global Error Handler Middleware - Centralized system error handler
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Lỗi server nội bộ';
  let errors = err.errors || [];

  // Log detailed errors to server console for easier debugging
  console.error(`❌ [Error] Path: ${req.originalUrl} | Method: ${req.method}`);
  console.error(err);

  // 1. Handle Multer file upload error
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Tên trường upload file không đúng (Phải là thumbnail hoặc images)';
  }

  // 2. Handle MongoDB duplicate data error (Unique Key - Code 11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = field === 'email' ? 'Email đã tồn tại' : 'Dữ liệu đăng ký đã tồn tại';
  }

  // 3. Handle MongoDB invalid ID format error (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `ID không hợp lệ: Giá trị '${err.value}' không đúng định dạng ObjectId.`;
  }

  // 4. Handle Mongoose data validation error (Schema Validation)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Dữ liệu gửi lên không hợp lệ';
    errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message
    }));
  }

  // 5. Handle JWT verification error
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token xác thực không hợp lệ. Vui lòng đăng nhập lại.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token xác thực đã hết hạn. Vui lòng lấy mã mới.';
  }

  // Standardized JSON format response for Client (Flutter / Vue)
  res.status(statusCode).json({
    success: false,
    message,
    msg: message, // Backward compatibility for older clients reading .msg variable
    errors,
    // Only show stack trace in development environment for security
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
