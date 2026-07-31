<template>
  <div class="max-w-4xl mx-auto bg-red-200 p-8 rounded-2xl shadow-lg border">
    <h2 class="text-2xl font-bold mb-8 text-gray-800 border-b pb-4">
      Thông tin sản phẩm mới
    </h2>

    <div class="grid grid-cols-2 gap-6 mb-6">
      <div class="col-span-2">
        <label class="block text-sm font-bold mb-2">Tên sản phẩm *</label>
        <input
          v-model="name"
          type="text"
          class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Mô tả ngắn *</label>
        <input
          v-model="shortDescription"
          type="text"
          placeholder="Tóm tắt đặc điểm nổi bật (vd: Chất vải thoáng mát, form rộng)"
          class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Mô tả chi tiết</label>
        <textarea
          v-model="description"
          rows="5"
          placeholder="Nhập thông tin chi tiết về sản phẩm, hướng dẫn bảo quản..."
          class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
        ></textarea>
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Giá niêm yết (đ) *</label>
        <input
          v-model.number="price"
          type="number"
          class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label class="block text-sm font-bold mb-2">Giảm giá (%)</label>
        <input
          v-model.number="discount"
          type="number"
          class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div class="col-span-2">
        <label class="block text-sm font-bold mb-2"
          >Tags (cách nhau bằng dấu phẩy)</label
        >
        <input
          type="text"
          placeholder="vd: Hot, Sale, New"
          @input="
            (e) => (tags = e.target.value.split(',').map((t) => t.trim()))
          "
          class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <div class="flex gap-2 mt-2">
          <span
            v-for="t in tags"
            :key="t"
            class="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-xs font-bold border border-emerald-100"
            >#{{ t }}</span
          >
        </div>
      </div>
    </div>

    <div
      class="mb-8 p-4 bg-emerald-50/30 rounded-xl border border-dashed border-emerald-200"
    >
      <label class="block text-sm font-bold mb-2 text-emerald-800"
        >Ảnh đại diện (Thumbnail) *</label
      >
      <div v-if="mainImagePreview" class="mb-3">
        <img
          :src="mainImagePreview"
          class="w-32 h-32 object-cover rounded-lg shadow-md border-2 border-white"
        />
      </div>
      <input
        type="file"
        @change="handleMainFileChange"
        class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200"
      />
    </div>

    <div class="bg-gray-50 p-6 rounded-xl border mb-8">
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-bold text-gray-700 text-lg">
          Biến thể (Theo Nhóm Màu)
        </h3>
        <button
          @click="addColorGroup"
          class="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 shadow-sm transition"
        >
          + Thêm màu mới
        </button>
      </div>

      <div
        v-for="(colorGroup, cIndex) in colorVariants"
        :key="cIndex"
        class="bg-red-200 p-5 rounded-xl border mb-6 shadow-sm relative group"
      >
        <div class="grid grid-cols-6 gap-6 items-start mb-4 border-b pb-5">
          <div class="text-center col-span-1">
            <label
              class="block text-[10px] font-bold text-gray-400 uppercase mb-2"
              >Ảnh màu</label
            >
            <div class="relative w-20 h-20 mx-auto">
              <img
                :src="
                  colorGroup.imagePreview || colorGroup.images[0] ||
                  'https://via.placeholder.com/150?text=No+Img'
                "
                class="w-20 h-20 object-cover rounded-lg border shadow-inner"
              />
              <input
                type="file"
                :id="'color-img-' + cIndex"
                class="hidden"
                @change="(e) => handleVariantImageUpload(e, cIndex)"
              />
              <label
                :for="'color-img-' + cIndex"
                class="absolute inset-0 bg-black/50 text-white text-[9px] font-bold flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition rounded-lg"
              >
                ĐỔI ẢNH
              </label>
            </div>
          </div>

          <div class="col-span-4">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2"
              >Tên màu sắc *</label
            >
            <input
              v-model="colorGroup.color"
              placeholder="Ví dụ: Xanh Navy, Đỏ Đô..."
              class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div class="col-span-1 text-right pt-7">
            <button
              @click="colorVariants.splice(cIndex, 1)"
              class="text-red-400 hover:text-red-600 font-bold text-xs uppercase transition"
            >
              Xóa màu
            </button>
          </div>
        </div>

        <div class="space-y-4 pl-6 border-l-4 border-emerald-500/20">
          <div class="flex items-center justify-between">
            <h4
              class="text-xs font-bold text-gray-400 uppercase tracking-wider"
            >
              Bảng kích thước & Tồn kho
            </h4>
            <button
              @click="addSizeToColor(cIndex)"
              class="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full hover:bg-emerald-100"
            >
              + Thêm size cho màu này
            </button>
          </div>

          <div
            v-for="(s, sIndex) in colorGroup.sizes"
            :key="sIndex"
            class="flex gap-4 items-center bg-gray-50/50 p-2 rounded-lg border border-transparent hover:border-emerald-200 transition"
          >
            <div class="flex-1">
              <input
                v-model="s.size"
                placeholder="Size (M, L, XL, 40...)"
                class="w-full border p-2 rounded text-sm outline-none focus:bg-white"
              />
            </div>
            <div class="flex-1">
              <input
                v-model.number="s.stock"
                type="number"
                placeholder="Số lượng kho"
                class="w-full border p-2 rounded text-sm outline-none focus:bg-white"
              />
            </div>
            <button
              v-if="colorGroup.sizes.length > 1"
              @click="colorGroup.sizes.splice(sIndex, 1)"
              class="text-gray-400 hover:text-red-500 transition px-2"
            >
              <i class="text-xl">&times;</i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-end gap-4 pt-8 border-t">
      <button
        @click="router.push({ name: 'products' })"
        class="px-8 py-3 border-2 rounded-xl font-bold text-gray-400 hover:bg-gray-50 transition"
      >
        Hủy
      </button>
      <button
        @click="submitForm"
        class="px-12 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 transform hover:-translate-y-0.5 transition uppercase"
      >
        Lưu sản phẩm
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

// 1. DATA FORM FIELDS
const name = ref('')
const shortDescription = ref('')
const description = ref('')
const price = ref(0)
const discount = ref(0)
const tags = ref([])
const thumbnailFile = ref(null)
const mainImagePreview = ref(null)
// 1.1. Color variant structure, size and inventory
const colorVariants = ref([
  {
    color: '',
    images: [],
    sizes: [{ size: '', stock: 0 }],
    imageFile: null,
    imagePreview: null
  }
])

// 2. Helper functions to add variants
// 2.1. Add new color group
const addColorGroup = () => {
  colorVariants.value.push({
    color: '',
    images: [],
    sizes: [{ size: '', stock: 0 }],
    imageFile: null,
    imagePreview: null
  })
}
// 2.2. Add size to color group
const addSizeToColor = (cIndex) => {
  colorVariants.value[cIndex].sizes.push({ size: '', stock: 0 })
}

// 3. PROCESS AVATAR IMAGE, SAVE TEMPORARILY TO PREVIEW FOR DISPLAY
const handleMainFileChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    thumbnailFile.value = file
    mainImagePreview.value = URL.createObjectURL(file)
  }
}

// 4. TEMPORARILY SAVE IMAGE FOR EACH COLOR GROUP ON RAM
const handleVariantImageUpload = (event, index) => {
  // 4.1. Get file from input
  const file = event.target.files[0]
  if (!file) return
  
  // 4.2. Save binary file to variant to prepare sending it once
  colorVariants.value[index].imageFile = file
  // 4.3. Create mock URL to display preview immediately
  colorVariants.value[index].imagePreview = URL.createObjectURL(file)
}

// 5. SUBMIT FORM
const submitForm = async () => {
  // 1. BASIC FIELD VALIDATION

  // 1.1. Check Product name
  if (!name.value || name.value.trim() === '') {
    return alert('Tên sản phẩm không được để trống!')
  }

  // 1.2. Check Short description (Required for nice display on Flutter App)
  if (!shortDescription.value || shortDescription.value.trim() === '') {
    return alert('Vui lòng nhập mô tả ngắn cho sản phẩm!')
  }

  // 1.3. Check Original price: Not empty and > 0
  if (price.value === null || price.value === undefined || price.value <= 0) {
    return alert('Giá gốc không được để trống và phải lớn hơn 0!')
  }

  // 1.4. Check Discount: Maximum 50%, default 0 if empty
  let finalDiscount = discount.value
  if (
    finalDiscount === null ||
    finalDiscount === undefined ||
    finalDiscount === ''
  ) {
    finalDiscount = 0
  } else if (finalDiscount < 0 || finalDiscount > 50) {
    return alert('Giảm giá không được nhỏ hơn 0 và không được vượt quá 50%!')
  }

  // 1.5. Check Avatar image (Thumbnail)
  if (!thumbnailFile.value) {
    return alert('Vui lòng chọn ảnh đại diện (Thumbnail) cho sản phẩm!')
  }

  // 2. VARIANT AND INVENTORY VALIDATION INCLUDING COLOR, SIZE, INVENTORY
  // 2.1. Create check variable
  const isVariantsValid = colorVariants.value.every((c) => {
    const isColorOk = c.color && c.color.trim() !== ''
    const isSizesOk = c.sizes.every((s) => {
      const isSizeNameOk = s.size && s.size.trim() !== ''
      const isStockOk =
        s.stock !== null && s.stock !== undefined && s.stock >= 0
      return isSizeNameOk && isStockOk
    })
    return isColorOk && isSizesOk
  })
  // 2.2. Check result
  if (!isVariantsValid) {
    return alert(
      'Vui lòng nhập đủ Màu sắc, Size và Tồn kho (không được âm) cho tất cả biến thể!'
    )
  }

  // 3. CREATE FORM DATA AND SEND TO SERVER
  const formData = new FormData()
  // 3.1. Add basic info fields
  formData.append('name', name.value)
  formData.append('shortDescription', shortDescription.value)
  formData.append('description', description.value)
  formData.append('price', price.value)
  formData.append('discount', discount.value)
  
  // 3.2. Process variant image and create payload
  let imageUploadIndex = 0;
  const variantsPayload = colorVariants.value.map((variant) => {
    const v = { ...variant }
    // If there is new image file, attach it to common formData
    if (v.imageFile) {
      formData.append('images', v.imageFile)
      v.imageUploadIndex = imageUploadIndex++
    }
    // Clean up redundant data before stringify
    delete v.imageFile
    delete v.imagePreview
    return v
  })

  // 3.3. Add tags and variants array (convert to JSON string)
  formData.append('tags', JSON.stringify(tags.value))
  formData.append('colorVariants', JSON.stringify(variantsPayload))
  // 3.4. Add avatar image as file
  formData.append('thumbnail', thumbnailFile.value)

  // 4. SEND TO SERVER USING AXIOS AND HANDLE RESULT
  try {
    const res = await axios.post('/api/admin/products/add', formData)
    if (res.data.success) {
      alert('Thành công!')
      resetForm()
    }
  } catch (error) {
    alert('Lỗi: ' + error.message)
  }
}

// 6. CLEAN UP FORM AFTER SUCCESSFUL ADDITION
const resetForm = () => {
  // 1. Reset basic variables to default values
  name.value = ''
  shortDescription.value = ''
  description.value = ''
  price.value = 0
  discount.value = 0
  tags.value = []

  // 2. Delete image data and preview
  thumbnailFile.value = null
  mainImagePreview.value = null

  // 3. Reinitialize variant structure (1 color, 1 empty size)
  colorVariants.value = [
    {
      color: '',
      images: [],
      sizes: [{ size: '', stock: 0 }],
      imageFile: null,
      imagePreview: null
    }
  ]

  // (Optional) Clear file trace on HTML input to allow re-selecting the same image file
  const fileInputs = document.querySelectorAll('input[type="file"]')
  fileInputs.forEach((input) => (input.value = ''))

  console.log('Form đã được dọn dẹp sạch sẽ!')
}
</script>
