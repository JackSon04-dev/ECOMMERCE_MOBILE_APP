<template>
  <div v-if="product" class="space-y-6 pb-20">
    <div class="flex items-center justify-between border-b pb-4">
      <div class="flex items-center gap-4">
        <button
          @click="router.push({ name: 'products' })"
          class="text-gray-400 hover:text-gray-600 font-bold transition"
        >
          ← QUAY LẠI
        </button>
        <h2 class="text-2xl font-bold text-gray-800">
          Cập nhật: {{ product.name }}
        </h2>
      </div>
      <div class="flex gap-3">
        <button
          @click="handleUpdate"
          class="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-emerald-700 shadow-lg transition uppercase"
        >
          Lưu tất cả thay đổi
        </button>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-8">
      <div class="col-span-2 space-y-6">
        <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h3
            class="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"
          >
            <span class="w-2 h-2 bg-emerald-500 rounded-full"></span> Thông tin
            cơ bản
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label
                class="block text-xs font-bold text-gray-500 mb-1 uppercase"
                >Tên sản phẩm</label
              >
              <input
                v-model="product.name"
                type="text"
                class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                class="block text-xs font-bold text-gray-500 mb-1 uppercase"
                >Giá gốc (đ)</label
              >
              <input
                v-model.number="product.price"
                type="number"
                class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label
                class="block text-xs font-bold text-gray-500 mb-1 uppercase"
                >Giảm giá (%)</label
              >
              <input
                v-model.number="product.discount"
                type="number"
                class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div class="col-span-2">
            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">
              Tags (cách nhau bằng dấu phẩy)
            </label>
            <input
              type="text"
              placeholder="vd: Hot, Sale, New"
              :value="product.tags ? product.tags.join(', ') : ''"
              @input="
                (e) =>
                  (product.tags = e.target.value
                    .split(',')
                    .map((t) => t.trim()))
              "
              class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div class="flex gap-2 mt-2">
              <span
                v-for="t in product.tags"
                :key="t"
                class="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold border border-emerald-100"
              >
                #{{ t }}
              </span>
            </div>
          </div>
        </div>

        <div class="bg-gray-50 p-6 rounded-2xl border space-y-4">
          <div
            class="flex justify-between items-center border-b border-gray-200 pb-3"
          >
            <h3 class="font-bold text-gray-700 flex items-center gap-2">
              <span class="w-2 h-2 bg-emerald-500 rounded-full"></span> Quản lý
              Biến thể theo Màu
            </h3>
            <button
              @click="addColorGroup"
              class="text-emerald-600 text-sm font-bold hover:underline"
            >
              + Thêm màu mới
            </button>
          </div>

          <div
            v-for="(colorGroup, cIndex) in product.colorVariants"
            :key="cIndex"
            class="bg-white p-4 rounded-xl border shadow-sm space-y-4"
          >
            <div class="flex gap-6 items-start">
              <div class="text-center">
                <div class="relative w-16 h-16 group mx-auto">
                  <img
                    :src="
                      colorGroup.images?.[0] ||
                      'https://placehold.co/150?text=No+Img'
                    "
                    class="w-16 h-16 object-cover rounded-lg border shadow-inner"
                  />
                  <input
                    type="file"
                    :id="'color-img-' + cIndex"
                    class="hidden"
                    @change="(e) => handleVariantImageUpload(e, cIndex)"
                  />
                  <label
                    :for="'color-img-' + cIndex"
                    class="absolute inset-0 bg-black/50 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition rounded-lg"
                    >ĐỔI ẢNH</label
                  >
                </div>
              </div>
              <div class="flex-1 space-y-3">
                <div class="flex justify-between">
                  <input
                    v-model="colorGroup.color"
                    placeholder="Tên màu..."
                    class="border-b focus:border-emerald-500 outline-none font-bold text-gray-700 w-full mr-4"
                  />
                  <button
                    @click="product.colorVariants.splice(cIndex, 1)"
                    class="text-red-400 hover:text-red-600 text-xs uppercase font-bold"
                  >
                    Xóa màu
                  </button>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-gray-400 uppercase"
                      >Kích thước & Kho</span
                    >
                    <button
                      @click="addSizeToColor(cIndex)"
                      class="text-[10px] text-emerald-600 font-bold"
                    >
                      + Thêm size
                    </button>
                  </div>
                  <div
                    v-for="(s, sIndex) in colorGroup.sizes"
                    :key="sIndex"
                    class="flex gap-2 items-center"
                  >
                    <input
                      v-model="s.size"
                      placeholder="Size"
                      class="border p-1 rounded text-xs w-20 outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                    <input
                      v-model.number="s.stock"
                      type="number"
                      placeholder="Kho"
                      class="border p-1 rounded text-xs w-16 text-center outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                    <button
                      v-if="colorGroup.sizes.length > 1"
                      @click="colorGroup.sizes.splice(sIndex, 1)"
                      class="text-gray-300 hover:text-red-500"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h3 class="font-bold text-gray-700 border-b pb-2">
            Hình ảnh đại diện
          </h3>
          <img
            :src="mainImagePreview || product.thumbnail"
            class="w-full h-56 object-cover rounded-xl border shadow-inner"
          />
          <input
            type="file"
            ref="mainImageInput"
            class="hidden"
            @change="prepareMainImage"
          />
          <button
            @click="$refs.mainImageInput.click()"
            class="w-full py-3 border-2 border-dashed border-emerald-100 rounded-xl text-xs text-emerald-500 hover:bg-emerald-50 font-bold uppercase transition"
          >
            Chọn ảnh đại diện mới
          </button>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h3
            class="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"
          >
            <span class="w-2 h-2 bg-emerald-500 rounded-full"></span> Trạng thái
            hiển thị
          </h3>
          <div
            class="flex items-center justify-between p-3 rounded-xl border"
            :class="
              product.isActive
                ? 'bg-emerald-50 border-emerald-100'
                : 'bg-red-50 border-red-100'
            "
          >
            <span
              class="font-bold text-sm"
              :class="product.isActive ? 'text-emerald-700' : 'text-red-700'"
            >
              {{ product.isActive ? 'ĐANG KINH DOANH' : 'TẠM NGƯNG BÁN' }}
            </span>

            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="product.isActive"
                class="sr-only peer"
              />
              <div
                class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"
              ></div>
            </label>
          </div>
          <p class="text-[10px] text-gray-400 italic">
            * Khi tạm ngưng, sản phẩm sẽ không hiển thị trên App Flutter của
            khách hàng.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

// 0. KHAI BÁO PROPS VÀ ROUTER

const router = useRouter()
const route = useRoute()

// 0.1 Lấy productId từ route params
const props = defineProps(['id'])
const productId = computed(() => props.id || route.params.id)

// 1. FORM TRƯỜNG DỮ LIỆU (Lấy từ Product hiện có)
const product = ref(null)
const newMainImageFile = ref(null) // Lưu file ảnh đại diện mới nếu có thay đổi
const mainImagePreview = ref(null) // Lưu link ảnh tạm để xem trước khi sửa

// 2. LẤY DỮ LIỆU CHI TIẾT TỪ SERVER KHI VÀO TRANG
const fetchProductDetail = async () => {
  try {
    // ✅ Chỉ lấy 1 sản phẩm cụ thể
    const res = await axios.get(`/api/admin/products/${productId.value}`)
    product.value = res.data.data
  } catch (err) {
    console.error('Lỗi:', err)
  }
}

// 3. CÁC HÀM HỖ TRỢ QUẢN LÝ BIẾN THỂ (Thêm màu, Thêm size)
// 3.1. Thêm nhóm màu mới vào sản phẩm hiện tại
const addColorGroup = () => {
  product.value.colorVariants.push({
    color: '',
    images: [],
    sizes: [{ size: '', stock: 0 }]
  })
}

// 3.2. Thêm size mới vào một nhóm màu cụ thể
const addSizeToColor = (cIndex) => {
  product.value.colorVariants[cIndex].sizes.push({ size: '', stock: 0 })
}

// 4. XỬ LÝ HÌNH ẢNH
// 4.1. Chuẩn bị ảnh đại diện mới (Thumbnail)
const prepareMainImage = (e) => {
  const file = e.target.files[0]
  if (file) {
    newMainImageFile.value = file
    mainImagePreview.value = URL.createObjectURL(file) // Tạo preview tạm thời
  }
}

// 4.2. Upload ảnh biến thể cho từng màu (Gửi trực tiếp lên Cloudinary qua Server)
const handleVariantImageUpload = async (event, index) => {
  const file = event.target.files[0]
  if (!file) return

  const tempForm = new FormData()
  tempForm.append('thumbnail', file)

  try {
    const res = await axios.post('/api/admin/products/upload-single', tempForm)
    if (res.data.success) {
      // Lấy URL từ Cloudinary do server trả về và cập nhật vào biến thể
      const url = res.data.data.url
      product.value.colorVariants[index].images = [url]
      alert('Đã cập nhật ảnh màu sắc thành công!')
    }
  } catch (err) {
    alert('Lỗi upload ảnh biến thể')
  }
}

// 5. LƯU THAY ĐỔI (UPDATE PRODUCT)
const handleUpdate = async () => {
  if (!product.value) return

  // --- 5.1. VALIDATION CÁC TRƯỜNG DỮ LIỆU ---

  // Kiểm tra Tên
  if (!product.value.name || product.value.name.trim() === '') {
    return alert('Tên sản phẩm không được để trống!')
  }

  // Kiểm tra Giá gốc (> 0)
  if (
    product.value.price === null ||
    product.value.price === undefined ||
    product.value.price <= 0
  ) {
    return alert('Giá gốc không được để trống và phải lớn hơn 0!')
  }

  // Kiểm tra Giảm giá (0% - 50%)
  if (
    product.value.discount === null ||
    product.value.discount === undefined ||
    product.value.discount === ''
  ) {
    product.value.discount = 0 // Mặc định về 0 nếu người dùng xóa trống
  } else if (product.value.discount < 0 || product.value.discount > 50) {
    return alert('Giảm giá không được nhỏ hơn 0 và không được vượt quá 50%!')
  }

  // --- 5.2. VALIDATION BIẾN THỂ (MÀU, SIZE, TỒN KHO) ---
  const isVariantsValid = product.value.colorVariants.every((c) => {
    const isColorOk = c.color && c.color.trim() !== ''
    const isSizesOk = c.sizes.every((s) => {
      const isSizeNameOk = s.size && s.size.trim() !== ''
      const isStockOk =
        s.stock !== null && s.stock !== undefined && s.stock >= 0
      return isSizeNameOk && isStockOk
    })
    return isColorOk && isSizesOk
  })

  if (!isVariantsValid) {
    return alert(
      'Vui lòng nhập đủ thông tin Màu sắc, Size và Tồn kho (không được âm)!'
    )
  }

  // --- 5.3. ĐÓNG GÓI FORMDATA VÀ GỬI LÊN SERVER ---
  try {
    const formData = new FormData()
    formData.append('name', product.value.name)
    formData.append('price', product.value.price)
    formData.append('discount', product.value.discount)
    formData.append('isActive', product.value.isActive)
    formData.append('shortDescription', product.value.shortDescription || '')
    formData.append('description', product.value.description || '')

    // Chuyển mảng và object sang chuỗi JSON để gửi qua FormData
    formData.append(
      'colorVariants',
      JSON.stringify(product.value.colorVariants)
    )
    formData.append('tags', JSON.stringify(product.value.tags || []))

    // Nếu có chọn ảnh đại diện mới thì mới gửi lên
    if (newMainImageFile.value) {
      formData.append('thumbnail', newMainImageFile.value)
    }

    const res = await axios.put(
      `/api/admin/products/update/${product.value._id}`,
      formData
    )

    if (res.data.success) {
      alert('Cập nhật sản phẩm thành công!')
      newMainImageFile.value = null // Xóa file tạm sau khi lưu
      fetchProductDetail() // Tải lại dữ liệu mới nhất từ server
    }
  } catch (err) {
    alert('Lỗi: ' + (err.response?.data?.message || err.message))
  }
}

// 6. KHỞI CHẠY KHI COMPONENT ĐƯỢC GẮN VÀO GIAO DIỆN
onMounted(fetchProductDetail)
</script>
