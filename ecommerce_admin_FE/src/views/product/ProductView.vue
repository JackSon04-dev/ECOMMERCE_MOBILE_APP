<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold text-gray-800">Quản lý sản phẩm</h2>
      <button
        @click="router.push({ name: 'add-product' })"
        class="bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-600 shadow-lg transition"
      >
        + Thêm sản phẩm mới
      </button>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <div class="bg-white p-4 rounded-xl shadow-sm border text-center">
        <div class="text-2xl font-bold text-gray-800">
          {{ statistics.totalProducts || 0 }}
        </div>
        <div class="text-xs text-gray-500 mt-1">Tổng sản phẩm</div>
      </div>
      <div
        class="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-200 text-center"
      >
        <div class="text-2xl font-bold text-emerald-600">
          {{ statistics.activeProducts || 0 }}
        </div>
        <div class="text-xs text-emerald-600 mt-1">Đang bán</div>
      </div>
      <div
        class="bg-red-50 p-4 rounded-xl shadow-sm border border-red-200 text-center"
      >
        <div class="text-2xl font-bold text-red-600">
          {{ statistics.inactiveProducts || 0 }}
        </div>
        <div class="text-xs text-red-600 mt-1">Tạm ngưng</div>
      </div>
      <div
        class="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-200 text-center"
      >
        <div class="text-2xl font-bold text-blue-600">
          {{ statistics.totalStock || 0 }}
        </div>
        <div class="text-xs text-blue-600 mt-1">Tổng tồn kho</div>
      </div>
      <div
        class="bg-yellow-50 p-4 rounded-xl shadow-sm border border-yellow-200 text-center"
      >
        <div class="text-2xl font-bold text-yellow-600">
          {{ statistics.discountedProducts || 0 }}
        </div>
        <div class="text-xs text-yellow-600 mt-1">Đang giảm giá</div>
      </div>
    </div>

    <!-- Secondary Statistics -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        @click="filterByStock('lowStockVariants')"
        :class="
          stockFilter === 'lowStockVariants'
            ? 'ring-2 ring-orange-500 bg-orange-50'
            : 'bg-white'
        "
        class="p-3 rounded-xl shadow-sm border flex items-center gap-3 cursor-pointer hover:bg-orange-50 transition"
      >
        <div
          class="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-orange-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div>
          <div class="text-lg font-bold text-orange-600">
            {{ statistics.lowStockVariants || 0 }}
          </div>
          <div class="text-xs text-gray-500">Biến thể sắp hết</div>
        </div>
      </div>
      <div
        @click="filterByStock('outOfStockVariants')"
        :class="
          stockFilter === 'outOfStockVariants'
            ? 'ring-2 ring-red-500 bg-red-50'
            : 'bg-white'
        "
        class="p-3 rounded-xl shadow-sm border flex items-center gap-3 cursor-pointer hover:bg-red-50 transition"
      >
        <div
          class="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <div>
          <div class="text-lg font-bold text-red-600">
            {{ statistics.outOfStockVariants || 0 }}
          </div>
          <div class="text-xs text-gray-500">Biến thể hết hàng</div>
        </div>
      </div>
      <div
        @click="filterByStock('lowStockProducts')"
        :class="
          stockFilter === 'lowStockProducts'
            ? 'ring-2 ring-amber-500 bg-amber-50'
            : 'bg-white'
        "
        class="p-3 rounded-xl shadow-sm border flex items-center gap-3 cursor-pointer hover:bg-amber-50 transition"
      >
        <div
          class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <div>
          <div class="text-lg font-bold text-amber-600">
            {{ statistics.lowStockProducts || 0 }}
          </div>
          <div class="text-xs text-gray-500">SP sắp hết hàng</div>
        </div>
      </div>
      <div
        @click="filterByStock('outOfStockProducts')"
        :class="
          stockFilter === 'outOfStockProducts'
            ? 'ring-2 ring-rose-500 bg-rose-50'
            : 'bg-white'
        "
        class="p-3 rounded-xl shadow-sm border flex items-center gap-3 cursor-pointer hover:bg-rose-50 transition"
      >
        <div
          class="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-rose-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
        </div>
        <div>
          <div class="text-lg font-bold text-rose-600">
            {{ statistics.outOfStockProducts || 0 }}
          </div>
          <div class="text-xs text-gray-500">SP hết hàng</div>
        </div>
      </div>
    </div>

    <!-- Active Filter Badge -->
    <div v-if="stockFilter" class="flex items-center gap-2">
      <span class="text-sm text-gray-500">Đang lọc:</span>
      <span
        class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
        :class="{
          'bg-orange-100 text-orange-700': stockFilter === 'lowStockVariants',
          'bg-red-100 text-red-700': stockFilter === 'outOfStockVariants',
          'bg-amber-100 text-amber-700': stockFilter === 'lowStockProducts',
          'bg-rose-100 text-rose-700': stockFilter === 'outOfStockProducts'
        }"
      >
        {{ getFilterLabel(stockFilter) }}
        <button @click="clearStockFilter" class="ml-1 hover:opacity-70">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </span>
    </div>

    <!-- Average Price Card -->
    <div
      class="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 rounded-2xl shadow-sm text-white flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <div class="text-sm opacity-80">Giá trung bình sản phẩm</div>
          <div class="text-2xl font-bold">
            {{ (statistics.averagePrice || 0).toLocaleString() }}đ
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white p-4 rounded-2xl shadow-sm border flex gap-4 items-end">
      <div class="flex-1">
        <label class="block text-xs font-bold text-gray-400 uppercase mb-2"
          >Tìm kiếm tên sản phẩm</label
        >
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Nhập tên sản phẩm cần tìm..."
            class="w-full border p-2.5 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition"
            @keyup.enter="handleSearch"
          />
          <span class="absolute left-3 top-3 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
        </div>
      </div>

      <div class="w-64">
        <label class="block text-xs font-bold text-gray-400 uppercase mb-2"
          >Phân loại theo Tag</label
        >
        <select
          v-model="selectedTag"
          class="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">Tất cả sản phẩm</option>
          <option value="quan">Quần</option>
          <option value="aosomi">Áo Sơ Mi</option>
          <option value="aothun">Áo Thun</option>
          <option value="giay">Giày</option>
        </select>
      </div>

      <button
        @click="handleSearch"
        class="bg-gray-800 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-black transition flex items-center gap-2"
      >
        TÌM KIẾM
      </button>
    </div>

    <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <table class="w-full text-left">
        <thead
          class="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider"
        >
          <tr>
            <th class="px-6 py-4">Hình ảnh</th>
            <th class="px-6 py-4">Tên sản phẩm</th>
            <th class="px-6 py-4">Giá gốc</th>
            <th class="px-6 py-4">Giảm giá</th>
            <th class="px-6 py-4 font-bold text-emerald-600">Giá cuối</th>
            <th class="px-6 py-4">Trạng thái</th>
            <th class="px-6 py-4 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="product in displayProducts"
            :key="product._id"
            class="hover:bg-gray-50 transition"
          >
            <td class="px-6 py-4">
              <img
                :src="product.thumbnail"
                class="w-14 h-14 object-cover rounded-xl border"
              />
            </td>
            <td class="px-6 py-4 font-bold text-gray-800">
              {{ product.name }}
            </td>
            <td class="px-6 py-4 text-gray-400 line-through text-sm">
              {{ product.price?.toLocaleString() }}đ
            </td>
            <td class="px-6 py-4">
              <span class="text-red-500 font-bold"
                >-{{ product.discount }}%</span
              >
            </td>
            <td class="px-6 py-4 font-bold text-emerald-600">
              {{ (product.finalPrice || 0).toLocaleString() }}đ
            </td>
            <td class="px-6 py-4">
              <span
                :class="
                  product.isActive
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-red-100 text-red-600'
                "
                class="px-2 py-1 rounded-full text-[9px] font-bold"
              >
                {{ product.isActive ? 'ĐANG BÁN' : 'TẠM NGƯNG' }}
              </span>
            </td>
            <td
              class="px-6 py-4 text-center space-x-3 text-xs uppercase font-bold"
            >
              <button
                @click="
                  router.push({
                    name: 'product-detail',
                    params: { id: product._id }
                  })
                "
                class="text-emerald-600 hover:text-emerald-800 transition"
              >
                Chi tiết
              </button>
              <button
                @click="handleDelete(product._id)"
                class="text-red-400 hover:text-red-600 transition"
              >
                Xóa
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="displayProducts.length === 0"
        class="p-20 text-center text-gray-400 italic"
      >
        Không tìm thấy sản phẩm nào phù hợp với bộ lọc...
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

const allProducts = ref([]) // Chứa dữ liệu gốc từ API
const displayProducts = ref([]) // Chứa dữ liệu sau khi nhấn nút Tìm kiếm
const statistics = ref({}) // Thống kê sản phẩm

const searchQuery = ref('')
const selectedTag = ref('')
const stockFilter = ref('') // Lọc theo tồn kho

// Hàm tính tổng stock của sản phẩm
const getProductTotalStock = (product) => {
  let total = 0
  if (product.colorVariants && product.colorVariants.length > 0) {
    product.colorVariants.forEach((colorVariant) => {
      if (colorVariant.sizes && colorVariant.sizes.length > 0) {
        colorVariant.sizes.forEach((size) => {
          total += size.stock || 0
        })
      }
    })
  }
  return total
}

// Kiểm tra sản phẩm có biến thể sắp hết (stock 1-4)
const hasLowStockVariant = (product) => {
  if (product.colorVariants && product.colorVariants.length > 0) {
    for (const colorVariant of product.colorVariants) {
      if (colorVariant.sizes && colorVariant.sizes.length > 0) {
        for (const size of colorVariant.sizes) {
          const stock = size.stock || 0
          if (stock > 0 && stock < 5) {
            return true
          }
        }
      }
    }
  }
  return false
}

// Kiểm tra sản phẩm có biến thể hết hàng (stock = 0)
const hasOutOfStockVariant = (product) => {
  if (product.colorVariants && product.colorVariants.length > 0) {
    for (const colorVariant of product.colorVariants) {
      if (colorVariant.sizes && colorVariant.sizes.length > 0) {
        for (const size of colorVariant.sizes) {
          if ((size.stock || 0) === 0) {
            return true
          }
        }
      }
    }
  }
  return false
}

// Lấy label cho filter
const getFilterLabel = (filter) => {
  const labels = {
    lowStockVariants: 'Biến thể sắp hết (stock 1-4)',
    outOfStockVariants: 'Biến thể hết hàng (stock = 0)',
    lowStockProducts: 'Sản phẩm sắp hết hàng',
    outOfStockProducts: 'Sản phẩm hết hàng'
  }
  return labels[filter] || filter
}

// Lọc theo trạng thái tồn kho
const filterByStock = (filterType) => {
  // Toggle filter nếu click lại cùng filter
  if (stockFilter.value === filterType) {
    clearStockFilter()
    return
  }

  stockFilter.value = filterType

  displayProducts.value = allProducts.value.filter((product) => {
    switch (filterType) {
      case 'lowStockVariants':
        // Sản phẩm có ít nhất 1 biến thể có stock từ 1-4
        return hasLowStockVariant(product)
      case 'outOfStockVariants':
        // Sản phẩm có ít nhất 1 biến thể hết hàng (stock = 0)
        return hasOutOfStockVariant(product)
      case 'lowStockProducts':
        // Sản phẩm có tổng stock > 0 nhưng có biến thể sắp hết
        return getProductTotalStock(product) > 0 && hasLowStockVariant(product)
      case 'outOfStockProducts':
        // Sản phẩm có tổng stock = 0
        return getProductTotalStock(product) === 0
      default:
        return true
    }
  })
}

// Xóa filter tồn kho
const clearStockFilter = () => {
  stockFilter.value = ''
  displayProducts.value = allProducts.value
}

// 1. Lấy dữ liệu ban đầu
const fetchProducts = async () => {
  try {
    const res = await axios.get('/api/admin/products')
    allProducts.value = res.data.data
    displayProducts.value = res.data.data // Mặc định hiển thị tất cả
  } catch (error) {
    console.error('Lỗi lấy dữ liệu:', error)
  }
}

// Lấy thống kê sản phẩm
const fetchStatistics = async () => {
  try {
    const res = await axios.get('/api/admin/products/stats/overview')
    statistics.value = res.data.data
  } catch (error) {
    console.error('Lỗi lấy thống kê:', error)
  }
}

// 2. Hàm xử lý tìm kiếm (Chỉ thực hiện khi nhấn nút)
const handleSearch = () => {
  // Reset stock filter khi tìm kiếm
  stockFilter.value = ''

  displayProducts.value = allProducts.value.filter((p) => {
    // Kiểm tra tên (không phân biệt hoa thường)
    const matchName = p.name
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase())

    // Kiểm tra tag (Nếu không chọn tag thì mặc định là đúng)
    const matchTag =
      selectedTag.value === '' ||
      p.tags?.some((t) => t.toLowerCase() === selectedTag.value.toLowerCase())

    return matchName && matchTag
  })
}

const handleDelete = async (id) => {
  if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
    try {
      await axios.delete(`/api/admin/products/delete/${id}`)
      await fetchProducts() // Load lại toàn bộ và hiển thị lại
      await fetchStatistics() // Cập nhật lại thống kê
    } catch (err) {
      alert('Lỗi khi xóa!')
    }
  }
}

onMounted(() => {
  fetchProducts()
  fetchStatistics()
})
</script>
