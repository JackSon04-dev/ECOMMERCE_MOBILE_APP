/**
 * Middleware validate dữ liệu tập trung dùng Joi
 * @param {import('joi').ObjectSchema} schema - Schema định nghĩa cấu trúc của req (body, query, params)
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const dataToValidate = {};

    if (schema.$_terms.keys.some(k => k.key === 'body')) {
      dataToValidate.body = req.body;
    }
    if (schema.$_terms.keys.some(k => k.key === 'query')) {
      dataToValidate.query = req.query;
    }
    if (schema.$_terms.keys.some(k => k.key === 'params')) {
      dataToValidate.params = req.params;
    }

    // Nếu schema không định nghĩa rõ các lớp này, mặc định validate tất cả những gì truyền lên
    if (Object.keys(dataToValidate).length === 0) {
      dataToValidate.body = req.body;
      dataToValidate.query = req.query;
      dataToValidate.params = req.params;
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Lấy toàn bộ lỗi thay vì dừng ở lỗi đầu tiên
      allowUnknown: true, // Cho phép các trường không được định nghĩa khác đi qua (tránh strict quá mức ở các tầng khác)
      stripUnknown: false // Giữ nguyên các trường không khai báo để đi tiếp vào controller
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đầu vào không hợp lệ.',
        errors: errorMessages
      });
    }

    // Cập nhật lại dữ liệu đã được validate (trong trường hợp Joi tự động convert kiểu dữ liệu như string sang number)
    if (value.body) req.body = value.body;
    if (value.query) req.query = value.query;
    if (value.params) req.params = value.params;

    next();
  };
};
