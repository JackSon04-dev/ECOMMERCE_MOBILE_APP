/**
 * Centralized data validation middleware using Joi
 * @param {import('joi').ObjectSchema} schema - Schema defining req structure (body, query, params)
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

    // If schema doesn't explicitly define these layers, default to validating everything passed
    if (Object.keys(dataToValidate).length === 0) {
      dataToValidate.body = req.body;
      dataToValidate.query = req.query;
      dataToValidate.params = req.params;
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Get all errors instead of stopping at the first one
      allowUnknown: true, // Allow undefined fields to pass through (avoid over-strictness in other layers)
      stripUnknown: false // Keep undeclared fields as is to pass to the controller
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đầu vào không hợp lệ.',
        errors: errorMessages
      });
    }

    // Update validated data (in case Joi auto-converts types like string to number)
    if (value.body) req.body = value.body;
    if (value.query) req.query = value.query;
    if (value.params) req.params = value.params;

    next();
  };
};
