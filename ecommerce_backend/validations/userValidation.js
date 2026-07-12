import Joi from 'joi';

// Custom validator cho MongoDB ObjectId
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('ID không đúng định dạng Hex 24 ký tự.');

// Các trạng thái đơn hàng hợp lệ
const orderStatusArray = ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Thành công', 'Đã hủy'];

// Custom validator cho query status (hỗ trợ phân tách bằng dấu phẩy)
const validateStatusQuery = (value, helpers) => {
  const parts = value.split(',');
  for (const part of parts) {
    if (!orderStatusArray.includes(part.trim())) {
      return helpers.message(`Trạng thái đơn hàng "${part}" không hợp lệ. Các giá trị hợp lệ là: ${orderStatusArray.join(', ')}`);
    }
  }
  return value;
};

// Custom validator cho mảng ID (phân tách bằng dấu phẩy)
const validateObjectIdString = (value, helpers) => {
  const parts = value.split(',');
  for (const part of parts) {
    if (!/^[0-9a-fA-F]{24}$/.test(part.trim())) {
      return helpers.message('Một hoặc nhiều ID không đúng định dạng Hex 24 ký tự.');
    }
  }
  return value;
};

// ==========================================
// 🛒 GIỎ HÀNG (CART) SCHEMAS
// ==========================================
export const updateCartSchema = Joi.object({
  body: Joi.object({
    productId: objectId,
    color: Joi.string(),
    size: Joi.string(),
    quantity: Joi.number().integer().min(0),
    items: Joi.array().items(
      Joi.object({
        productId: objectId.required(),
        color: Joi.string().required(),
        size: Joi.string().required(),
        quantity: Joi.number().integer().min(0).required()
      })
    )
  }).xor('productId', 'items') // Bắt buộc có một trong hai (hoặc productId lẻ hoặc mảng items)
    .with('productId', ['color', 'size', 'quantity']) // Nếu truyền productId thì phải truyền kèm color, size, quantity
});

// ==========================================
// 🔔 THÔNG BÁO (NOTIFICATION) SCHEMAS
// ==========================================
export const getNotificationsSchema = Joi.object({
  query: Joi.object({
    type: Joi.string().valid('PROMOTION', 'ORDER', 'SYSTEM').insensitive()
  })
});

export const deleteNotificationSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().custom(validateObjectIdString).required()
  })
});

// ==========================================
// 🎫 VOUCHER SCHEMAS
// ==========================================
export const applyVoucherSchema = Joi.object({
  body: Joi.object({
    voucherCode: Joi.string().trim().required().messages({
      'any.required': 'Vui lòng nhập mã giảm giá.',
      'string.empty': 'Mã giảm giá không được để trống.'
    }),
    orderTotal: Joi.number().positive().required().messages({
      'any.required': 'Tổng đơn hàng là bắt buộc.',
      'number.positive': 'Tổng đơn hàng phải lớn hơn 0.'
    })
  })
});

// ==========================================
// 🛍️ SẢN PHẨM (PRODUCT) SCHEMAS
// ==========================================
export const getAllProductsSchema = Joi.object({
  query: Joi.object({
    tag: Joi.string().allow('', null),
    sortBy: Joi.string().valid('newest', 'price_asc', 'price-asc', 'price_desc', 'price-desc', 'best_selling', 'best-selling').allow('', null),
    search: Joi.string().allow('', null),
    lastId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow('', null),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
});

export const getProductByIdSchema = Joi.object({
  params: Joi.object({
    id: objectId.required()
  })
});

// ==========================================
// 🌟 ĐÁNH GIÁ (REVIEW) SCHEMAS
// ==========================================
export const getReviewsByProductSchema = Joi.object({
  params: Joi.object({
    productId: objectId.required()
  })
});

export const getReviewsByOrderSchema = Joi.object({
  params: Joi.object({
    orderId: objectId.required()
  })
});

export const createReviewSchema = Joi.object({
  body: Joi.object({
    product: objectId.required().messages({
      'any.required': 'ID sản phẩm là bắt buộc.'
    }),
    rating: Joi.number().integer().min(1).max(5).required().messages({
      'any.required': 'Đánh giá số sao là bắt buộc.',
      'number.min': 'Đánh giá phải từ 1 đến 5 sao.',
      'number.max': 'Đánh giá phải từ 1 đến 5 sao.'
    }),
    comment: Joi.string().trim().required().messages({
      'any.required': 'Nội dung đánh giá là bắt buộc.',
      'string.empty': 'Nội dung đánh giá không được để trống.'
    }),
    images: Joi.array().items(Joi.string()).allow(null),
    orderId: objectId.required().messages({
      'any.required': 'ID đơn hàng là bắt buộc.'
    })
  })
});

// ==========================================
// 📦 ĐƠN HÀNG (ORDER) SCHEMAS
// ==========================================
export const getMyOrdersSchema = Joi.object({
  query: Joi.object({
    status: Joi.string().custom(validateStatusQuery).allow('', null),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).default(10)
  })
});

export const getOrderByIdSchema = Joi.object({
  params: Joi.object({
    id: objectId.required()
  })
});

export const createOrderSchema = Joi.object({
  body: Joi.object({
    orderItems: Joi.array().items(
      Joi.object({
        productId: objectId.required().messages({
          'any.required': 'ID sản phẩm là bắt buộc.'
        }),
        color: Joi.string().required().messages({
          'any.required': 'Màu sắc là bắt buộc.'
        }),
        size: Joi.string().required().messages({
          'any.required': 'Kích cỡ là bắt buộc.'
        }),
        quantity: Joi.number().integer().min(1).required().messages({
          'any.required': 'Số lượng là bắt buộc.'
        })
      })
    ).min(1).required().messages({
      'array.min': 'Đơn hàng phải có ít nhất 1 sản phẩm.'
    }),
    paymentMethod: Joi.string().valid('COD', 'VNPay', 'ZaloPay', 'PayOS').required().messages({
      'any.only': 'Phương thức thanh toán không hợp lệ.'
    }),
    userInfo: Joi.object({
      username: Joi.string().trim().required().messages({
        'any.required': 'Tên người nhận là bắt buộc.'
      }),
      phoneNumber: Joi.string().trim().required().messages({
        'any.required': 'Số điện thoại nhận hàng là bắt buộc.'
      }),
      address: Joi.string().trim().required().messages({
        'any.required': 'Địa chỉ giao hàng là bắt buộc.'
      })
    }).required(),
    voucherCode: Joi.string().trim().allow('', null)
  })
});

export const orderActionSchema = Joi.object({
  params: Joi.object({
    id: objectId.required()
  })
});

// ==========================================
// 💳 THANH TOÁN (PAYMENT) SCHEMAS
// ==========================================
export const paymentStatusSchema = Joi.object({
  params: Joi.object({
    orderId: objectId.required()
  })
});

export const createPaymentUrlSchema = Joi.object({
  body: Joi.object({
    orderId: objectId.required().messages({
      'any.required': 'ID đơn hàng là bắt buộc.'
    }),
    baseUrl: Joi.string().uri().allow('', null)
  })
});

export const zalopayPaymentUrlSchema = Joi.object({
  body: Joi.object({
    orderId: objectId.required().messages({
      'any.required': 'ID đơn hàng là bắt buộc.'
    })
  })
});

export const payosPaymentUrlSchema = Joi.object({
  body: Joi.object({
    orderId: objectId.required().messages({
      'any.required': 'ID đơn hàng là bắt buộc.'
    })
  })
});
