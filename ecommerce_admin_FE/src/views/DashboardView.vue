<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold text-gray-800">📊 Báo cáo Tổng quan</h2>
      <div class="text-sm text-gray-500">
        Cập nhật lúc: <span class="font-medium">{{ currentTime }}</span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-96">
      <div class="text-center">
        <svg
          class="animate-spin h-12 w-12 mx-auto text-emerald-500 mb-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p class="text-gray-500">Đang tải dữ liệu dashboard...</p>
      </div>
    </div>

    <template v-else>
      <!-- Financial Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Today Revenue -->
        <div
          class="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl shadow-lg text-white"
        >
          <div class="flex items-center justify-between mb-3">
            <div
              class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"
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
            <div
              :class="getChangeClass(getRevenueData('today')?.changePercent)"
              class="text-xs font-bold px-2 py-1 rounded-full bg-white/20"
            >
              {{ formatChange(getRevenueData('today')?.changePercent) }}
            </div>
          </div>
          <p class="text-white/80 text-sm mb-1">Doanh thu hôm nay</p>
          <p class="text-2xl font-bold">
            {{ formatCurrency(getRevenueData('today')?.value || 0) }}
          </p>
          <p class="text-xs text-white/60 mt-2">So với hôm qua</p>
        </div>

        <!-- This Week Revenue -->
        <div
          class="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl shadow-lg text-white"
        >
          <div class="flex items-center justify-between mb-3">
            <div
              class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div
              :class="getChangeClass(getRevenueData('thisWeek')?.changePercent)"
              class="text-xs font-bold px-2 py-1 rounded-full bg-white/20"
            >
              {{ formatChange(getRevenueData('thisWeek')?.changePercent) }}
            </div>
          </div>
          <p class="text-white/80 text-sm mb-1">Doanh thu tuần này</p>
          <p class="text-2xl font-bold">
            {{ formatCurrency(getRevenueData('thisWeek')?.value || 0) }}
          </p>
          <p class="text-xs text-white/60 mt-2">So với tuần trước</p>
        </div>

        <!-- This Month Revenue -->
        <div
          class="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-2xl shadow-lg text-white"
        >
          <div class="flex items-center justify-between mb-3">
            <div
              class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div
              :class="
                getChangeClass(getRevenueData('thisMonth')?.changePercent)
              "
              class="text-xs font-bold px-2 py-1 rounded-full bg-white/20"
            >
              {{ formatChange(getRevenueData('thisMonth')?.changePercent) }}
            </div>
          </div>
          <p class="text-white/80 text-sm mb-1">Doanh thu tháng này</p>
          <p class="text-2xl font-bold">
            {{ formatCurrency(getRevenueData('thisMonth')?.value || 0) }}
          </p>
          <p class="text-xs text-white/60 mt-2">So với tháng trước</p>
        </div>

        <!-- Average Order Value -->
        <div
          class="bg-gradient-to-br from-orange-500 to-orange-600 p-5 rounded-2xl shadow-lg text-white"
        >
          <div class="flex items-center justify-between mb-3">
            <div
              class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"
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
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <div class="text-xs font-bold px-2 py-1 rounded-full bg-white/20">
              AOV
            </div>
          </div>
          <p class="text-white/80 text-sm mb-1">Giá trị đơn TB</p>
          <p class="text-2xl font-bold">
            {{ formatCurrency(financialData.averageOrderValue || 0) }}
          </p>
          <p class="text-xs text-white/60 mt-2">Trung bình/đơn hàng</p>
        </div>
      </div>

      <!-- Pending Orders Alert -->
      <div
        v-if="pendingOrders.length > 0"
        class="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-5"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 class="font-bold text-amber-800">⚠️ Đơn hàng chờ xác nhận</h3>
              <p class="text-sm text-amber-600">
                Có {{ pendingOrders.length }} đơn hàng đang chờ bạn xử lý
              </p>
            </div>
          </div>
          <button
            @click="$router.push({ name: 'orders' })"
            class="bg-amber-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-amber-600 transition text-sm"
          >
            Xem tất cả →
          </button>
        </div>

        <!-- Recent Pending Orders Preview -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            v-for="order in pendingOrders.slice(0, 3)"
            :key="order.id"
            class="bg-white p-3 rounded-xl border border-amber-100"
          >
            <div class="flex justify-between items-start">
              <div>
                <p class="text-xs text-gray-400">
                  #{{ order.id?.slice(-6).toUpperCase() }}
                </p>
                <p class="font-medium text-gray-800 text-sm">
                  {{ order.user?.username || 'Khách hàng' }}
                </p>
              </div>
              <p class="font-bold text-amber-600 text-sm">
                {{ formatCurrency(order.totalPrice) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Revenue Chart by Month -->
        <div
          class="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 rounded-2xl shadow-lg border border-blue-100"
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="font-bold text-gray-800 flex items-center gap-2">
              <div
                class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <span class="text-lg">Doanh thu theo tháng</span>
            </h3>
            <div
              class="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border"
            >
              {{ revenueChart.length }} tháng
            </div>
          </div>

          <div v-if="revenueChart.length > 0" class="space-y-4">
            <!-- Chart Area with Scrollbar -->
            <div class="bg-white rounded-xl p-4 shadow-inner overflow-visible">
              <div class="relative h-96 pb-8">
                <!-- Y-axis labels (Fixed position) -->
                <div
                  class="absolute left-0 top-0 bottom-12 w-16 flex flex-col justify-between text-[10px] text-gray-500 text-right pr-2 font-medium z-10 bg-white"
                >
                  <span
                    v-for="(label, idx) in yAxisLabels"
                    :key="idx"
                    class="leading-none"
                  >
                    {{ formatYAxisCurrency(label) }}
                  </span>
                </div>

                <!-- Scrollable Chart Container -->
                <div
                  ref="chartScrollContainer"
                  class="ml-16 h-full overflow-x-auto overflow-y-visible scrollbar-custom"
                >
                  <div
                    class="relative h-full"
                    :style="{ minWidth: getChartWidth() }"
                  >
                    <!-- Grid lines -->
                    <div
                      class="absolute left-0 right-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none"
                    >
                      <div
                        v-for="n in yAxisLabels.length"
                        :key="n"
                        class="border-t border-dashed border-gray-200"
                      ></div>
                    </div>

                    <!-- Line Chart SVG -->
                    <svg
                      class="absolute inset-0 w-full overflow-visible"
                      :style="{ height: 'calc(100% - 2rem)' }"
                      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
                      preserveAspectRatio="none"
                    >
                      <!-- Gradient fill under line -->
                      <defs>
                        <linearGradient
                          id="areaGradient"
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            stop-color="#818cf8"
                            stop-opacity="0.4"
                          />
                          <stop
                            offset="50%"
                            stop-color="#818cf8"
                            stop-opacity="0.2"
                          />
                          <stop
                            offset="100%"
                            stop-color="#818cf8"
                            stop-opacity="0.05"
                          />
                        </linearGradient>
                        <linearGradient
                          id="lineGradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stop-color="#3b82f6" />
                          <stop offset="50%" stop-color="#6366f1" />
                          <stop offset="100%" stop-color="#8b5cf6" />
                        </linearGradient>
                        <filter id="glow">
                          <feGaussianBlur
                            stdDeviation="2"
                            result="coloredBlur"
                          />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      <!-- Area fill -->
                      <path
                        :d="getAreaPath()"
                        fill="url(#areaGradient)"
                        class="transition-all duration-500"
                      />

                      <!-- Main line connecting points -->
                      <path
                        :d="getLinePath()"
                        fill="none"
                        stroke="url(#lineGradient)"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        filter="url(#glow)"
                        class="transition-all duration-500"
                      />
                    </svg>

                    <!-- Data Points & Labels -->
                    <div
                      class="absolute inset-0 overflow-visible"
                      :style="{ height: 'calc(100% - 2rem)' }"
                    >
                      <div
                        v-for="(item, index) in revenueChart"
                        :key="index"
                        class="absolute group cursor-pointer z-20"
                        :style="getPointStyle(index)"
                      >
                        <!-- Outer glow ring -->
                        <div
                          class="absolute -inset-3 bg-indigo-400/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"
                        ></div>

                        <!-- Main point -->
                        <div
                          class="relative w-4 h-4 bg-white border-[3px] border-indigo-500 rounded-full shadow-lg group-hover:border-indigo-600 group-hover:scale-125 transition-all duration-300 z-10"
                        >
                          <div
                            class="absolute inset-1 bg-indigo-500 rounded-full group-hover:bg-indigo-600"
                          ></div>
                        </div>

                        <!-- Value badge (always visible) -->
                        <div
                          class="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold text-indigo-600 whitespace-nowrap bg-white px-1.5 py-0.5 rounded shadow-sm border border-indigo-100 z-30"
                          :class="{
                            'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0':
                              index === revenueChart.length - 1
                          }"
                        >
                          {{ formatShortCurrency(item.revenue) }}
                        </div>

                        <!-- Change indicator -->
                        <div
                          v-if="index > 0"
                          class="absolute -top-12 left-1/2 -translate-x-1/2 text-[9px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-30"
                          :class="getChangeIndicatorClass(index)"
                        >
                          {{ getRevenueChange(index) }}
                        </div>

                        <!-- Tooltip Card (smart positioning) -->
                        <div
                          class="absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-40 pointer-events-none"
                          :class="{
                            '-top-28 group-hover:-translate-y-2':
                              getChartHeight(item.revenue) > 50,
                            'top-8 group-hover:translate-y-2':
                              getChartHeight(item.revenue) <= 50
                          }"
                        >
                          <div
                            class="bg-gradient-to-br from-gray-900 to-gray-800 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-gray-700 whitespace-nowrap"
                          >
                            <div class="flex items-center gap-2 mb-1">
                              <div
                                class="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"
                              ></div>
                              <p class="font-bold text-sm">
                                {{ formatCurrency(item.revenue) }}
                              </p>
                            </div>
                            <p
                              class="text-gray-300 text-[10px] flex items-center gap-1"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                />
                              </svg>
                              {{ item.orderCount }} đơn hàng
                            </p>
                            <p
                              class="text-indigo-300 text-[10px] mt-1 font-medium"
                            >
                              📅 {{ item.label }}
                            </p>
                            <!-- Arrow pointer (conditional direction) -->
                            <div
                              v-if="getChartHeight(item.revenue) > 50"
                              class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-r border-b border-gray-700"
                            ></div>
                            <div
                              v-else
                              class="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-l border-t border-gray-700"
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- X-axis labels -->
                    <div class="absolute bottom-0 left-0 right-0 h-8 flex">
                      <div
                        v-for="(item, index) in revenueChart"
                        :key="'label-' + index"
                        class="flex-1 flex items-center justify-center"
                      >
                        <span
                          class="text-[10px] text-gray-500 font-medium px-1 py-0.5 rounded hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-default"
                        >
                          {{ item.label }}
                        </span>
                      </div>
                    </div>

                    <!-- X-axis line -->
                    <div
                      class="absolute bottom-8 left-0 right-0 border-b-2 border-gray-200"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Summary Stats -->
            <div class="grid grid-cols-3 gap-3">
              <div class="bg-white p-3 rounded-xl shadow-sm border text-center">
                <p class="text-xs text-gray-500 mb-1">Tổng doanh thu</p>
                <p class="text-sm font-bold text-blue-600">
                  {{ formatCurrency(totalRevenue) }}
                </p>
              </div>
              <div class="bg-white p-3 rounded-xl shadow-sm border text-center">
                <p class="text-xs text-gray-500 mb-1">TB/tháng</p>
                <p class="text-sm font-bold text-purple-600">
                  {{ formatCurrency(averageMonthlyRevenue) }}
                </p>
              </div>
              <div class="bg-white p-3 rounded-xl shadow-sm border text-center">
                <p class="text-xs text-gray-500 mb-1">Tháng cao nhất</p>
                <p class="text-sm font-bold text-indigo-600">
                  {{ formatCurrency(maxRevenue) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-else
            class="h-80 flex items-center justify-center text-gray-400 bg-white rounded-xl"
          >
            <div class="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-16 w-16 mx-auto mb-3 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p class="font-medium">Chưa có dữ liệu doanh thu</p>
            </div>
          </div>
        </div>

        <!-- Top Products -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Top 7 Sản phẩm bán chạy
          </h3>

          <div v-if="topProducts.length > 0" class="space-y-3">
            <div
              v-for="(product, index) in topProducts"
              :key="product.id"
              class="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition"
            >
              <!-- Rank Badge -->
              <div
                :class="getRankClass(index)"
                class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              >
                {{ index + 1 }}
              </div>

              <!-- Product Image -->
              <img
                :src="product.thumbnail || '/placeholder.png'"
                :alt="product.productName"
                class="w-12 h-12 rounded-lg object-cover bg-gray-100"
              />

              <!-- Product Info -->
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-800 text-sm truncate">
                  {{ product.productName }}
                </p>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>Đã bán: {{ product.totalSold }}</span>
                  <span>•</span>
                  <span class="text-emerald-600 font-medium">
                    {{ formatCurrency(product.revenue) }}
                  </span>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                  :style="{
                    width: getProductSoldPercent(product.totalSold) + '%'
                  }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-else
            class="h-64 flex items-center justify-center text-gray-400"
          >
            <p>Chưa có dữ liệu sản phẩm</p>
          </div>
        </div>
      </div>

      <!-- Second Row: Customers & Vouchers -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top Customers -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-purple-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Top Khách hàng VIP
          </h3>

          <div v-if="topCustomers.length > 0" class="space-y-3">
            <div
              v-for="(customer, index) in topCustomers"
              :key="customer.id"
              class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition"
            >
              <!-- Rank & Avatar -->
              <div class="relative">
                <div
                  class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold"
                >
                  {{ customer.username?.charAt(0).toUpperCase() || '?' }}
                </div>
                <div
                  v-if="index < 3"
                  class="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                >
                  {{ index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉' }}
                </div>
              </div>

              <!-- Customer Info -->
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-800 text-sm truncate">
                  {{ customer.username || 'Khách hàng' }}
                </p>
                <p class="text-xs text-gray-500 truncate">
                  {{ customer.email }}
                </p>
              </div>

              <!-- Stats -->
              <div class="text-right">
                <p class="font-bold text-purple-600 text-sm">
                  {{ formatCurrency(customer.totalSpent) }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ customer.orderCount }} đơn hàng
                </p>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-else
            class="h-64 flex items-center justify-center text-gray-400"
          >
            <p>Chưa có dữ liệu khách hàng</p>
          </div>
        </div>

        <!-- Top Vouchers -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-rose-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            Voucher được dùng nhiều nhất
          </h3>

          <div v-if="topVouchers.length > 0" class="space-y-3">
            <div
              v-for="(voucher, index) in topVouchers"
              :key="voucher.id"
              class="relative overflow-hidden"
            >
              <div
                class="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed"
                :class="getVoucherBorderClass(index)"
              >
                <!-- Voucher Icon -->
                <div
                  :class="getVoucherBgClass(index)"
                  class="w-14 h-14 rounded-xl flex items-center justify-center"
                >
                  <span class="text-2xl">🎫</span>
                </div>

                <!-- Voucher Info -->
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <p class="font-bold text-gray-800">
                      {{ voucher.voucherCode }}
                    </p>
                    <span
                      class="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 font-medium"
                    >
                      {{ voucher.usageCount }} lần dùng
                    </span>
                  </div>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ voucher.voucherName || 'Mã giảm giá' }}
                  </p>
                </div>

                <!-- Total Discount -->
                <div class="text-right">
                  <p class="text-xs text-gray-500">Tổng giảm</p>
                  <p class="font-bold text-rose-600">
                    {{ formatCurrency(voucher.totalDiscount) }}
                  </p>
                </div>

                <!-- Decorative circles -->
                <div
                  class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gray-100"
                ></div>
                <div
                  class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-gray-100"
                ></div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-else
            class="h-64 flex items-center justify-center text-gray-400"
          >
            <div class="text-center">
              <span class="text-4xl block mb-2">🎫</span>
              <p>Chưa có voucher nào được sử dụng</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats Summary -->
      <div
        class="bg-gradient-to-r from-gray-800 to-gray-900 p-6 rounded-2xl shadow-lg text-white"
      >
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div class="text-center">
            <p class="text-3xl font-bold">{{ topProducts.length }}</p>
            <p class="text-gray-400 text-sm">Sản phẩm bán chạy</p>
          </div>
          <div class="text-center">
            <p class="text-3xl font-bold">{{ topCustomers.length }}</p>
            <p class="text-gray-400 text-sm">Khách hàng VIP</p>
          </div>
          <div class="text-center">
            <p class="text-3xl font-bold">{{ pendingOrders.length }}</p>
            <p class="text-gray-400 text-sm">Đơn chờ xử lý</p>
          </div>
          <div class="text-center">
            <p class="text-3xl font-bold">{{ revenueChart.length }}</p>
            <p class="text-gray-400 text-sm">Tháng có doanh thu</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import axios from 'axios'

// State
const loading = ref(true)
const financialData = ref({})
const pendingOrders = ref([])
const topProducts = ref([])
const topCustomers = ref([])
const topVouchers = ref([])
const revenueChart = ref([])
const chartScrollContainer = ref(null)

// Current time
const currentTime = computed(() => {
  return new Date().toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

// Get max revenue for chart scaling
const maxRevenue = computed(() => {
  if (revenueChart.value.length === 0) return 0
  return Math.max(...revenueChart.value.map((item) => item.revenue))
})

// Get min revenue for chart scaling (to show proper difference)
const minRevenue = computed(() => {
  if (revenueChart.value.length === 0) return 0
  return Math.min(...revenueChart.value.map((item) => item.revenue))
})

// Y-axis max based on max revenue * 1.8 for tooltip padding
const yAxisMax = computed(() => {
  if (maxRevenue.value === 0) return 1800000 // 1.8 * 1M
  return maxRevenue.value * 1.8
})

// Y-axis labels based on max revenue divided by 10
const yAxisLabels = computed(() => {
  if (maxRevenue.value === 0) {
    const defaultInterval = 1000000 / 10
    const labels = []
    for (let i = 18; i >= 0; i--) {
      labels.push(i * defaultInterval)
    }
    return labels
  }

  const interval = maxRevenue.value / 10
  const labels = []

  // Create labels up to 1.8x the max revenue (18 intervals)
  for (let i = 18; i >= 0; i--) {
    labels.push(Math.round(i * interval))
  }

  return labels
})

// Total revenue
const totalRevenue = computed(() => {
  return revenueChart.value.reduce((sum, item) => sum + item.revenue, 0)
})

// Average monthly revenue
const averageMonthlyRevenue = computed(() => {
  if (revenueChart.value.length === 0) return 0
  return totalRevenue.value / revenueChart.value.length
})

// Get max sold for product chart
const maxSold = computed(() => {
  if (topProducts.value.length === 0) return 0
  return Math.max(...topProducts.value.map((p) => p.totalSold))
})

// Format currency
const formatCurrency = (value) => {
  if (!value) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value)
}

// Format short currency (for chart labels)
const formatShortCurrency = (value) => {
  if (!value) return '0'
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(1) + 'B'
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M'
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(0) + 'K'
  }
  return value.toString()
}

// Format Y-axis currency
const formatYAxisCurrency = (value) => {
  if (!value) return '0đ'
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1).replace('.0', '') + 'M'
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(0) + 'K'
  }
  return value.toString() + 'đ'
}

// Format change percentage
const formatChange = (percent) => {
  if (percent === undefined || percent === null) return '0%'
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent}%`
}

// Get change class
const getChangeClass = (percent) => {
  if (percent > 0) return 'text-green-300'
  if (percent < 0) return 'text-red-300'
  return 'text-white/80'
}

// Get revenue data by period
const getRevenueData = (period) => {
  return financialData.value.revenue?.find((r) => r.period === period)
}

// SVG dimensions for viewBox
const svgWidth = 1000
const svgHeight = 200

// Get chart height percentage based on yAxisMax
const getChartHeight = (revenue) => {
  const max = yAxisMax.value
  if (max === 0) return 0
  // Direct proportion to yAxisMax (0-100%)
  return (revenue / max) * 100
}

// Get chart width based on number of months (7 months visible at once)
const getChartWidth = () => {
  const totalMonths = revenueChart.value.length
  if (totalMonths <= 7) return '100%'
  return `${(totalMonths / 7) * 100}%`
}

// Get X position for a data point (percentage)
const getXPosition = (index) => {
  const total = revenueChart.value.length
  if (total <= 1) return 50
  return (index / (total - 1)) * 100
}

// Get Y position for a data point (percentage from top)
const getYPosition = (revenue) => {
  return 100 - getChartHeight(revenue)
}

// Get point style for positioning
const getPointStyle = (index) => {
  const item = revenueChart.value[index]
  const total = revenueChart.value.length
  // Evenly distribute points across width with padding
  const padding = 5 // 5% padding on each side
  const xPercent =
    total <= 1 ? 50 : padding + (index / (total - 1)) * (100 - 2 * padding)
  const yPercent = 100 - getChartHeight(item.revenue)
  return {
    left: `calc(${xPercent}% - 8px)`,
    top: `calc(${yPercent}% - 8px)`
  }
}

// Get SVG line path (using actual SVG coordinates)
const getLinePath = () => {
  if (revenueChart.value.length === 0) return ''
  const total = revenueChart.value.length
  const padding = 50 // padding in SVG units

  const points = revenueChart.value.map((item, index) => {
    const x =
      total <= 1
        ? svgWidth / 2
        : padding + (index / (total - 1)) * (svgWidth - 2 * padding)
    const y = svgHeight - (getChartHeight(item.revenue) / 100) * svgHeight
    return { x, y }
  })

  return 'M ' + points.map((p) => `${p.x},${p.y}`).join(' L ')
}

// Get SVG area path (for gradient fill)
const getAreaPath = () => {
  if (revenueChart.value.length === 0) return ''
  const total = revenueChart.value.length
  const padding = 50

  const points = revenueChart.value.map((item, index) => {
    const x =
      total <= 1
        ? svgWidth / 2
        : padding + (index / (total - 1)) * (svgWidth - 2 * padding)
    const y = svgHeight - (getChartHeight(item.revenue) / 100) * svgHeight
    return { x, y }
  })

  const firstX = total <= 1 ? svgWidth / 2 : padding
  const lastX = total <= 1 ? svgWidth / 2 : svgWidth - padding

  return `M ${firstX},${svgHeight} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${lastX},${svgHeight} Z`
}

// Get revenue change compared to previous month
const getRevenueChange = (index) => {
  if (index === 0) return ''
  const current = revenueChart.value[index].revenue
  const previous = revenueChart.value[index - 1].revenue
  if (previous === 0) return current > 0 ? '+∞' : '0%'
  const change = ((current - previous) / previous) * 100
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(0)}%`
}

// Get change indicator class
const getChangeIndicatorClass = (index) => {
  if (index === 0) return ''
  const current = revenueChart.value[index].revenue
  const previous = revenueChart.value[index - 1].revenue
  if (current > previous) return 'bg-emerald-100 text-emerald-600'
  if (current < previous) return 'bg-red-100 text-red-600'
  return 'bg-gray-100 text-gray-600'
}

// Scroll chart to right (latest month)
const scrollChartToRight = () => {
  nextTick(() => {
    if (chartScrollContainer.value) {
      chartScrollContainer.value.scrollLeft =
        chartScrollContainer.value.scrollWidth
    }
  })
}

// Watch for revenue chart data changes to scroll right
watch(revenueChart, () => {
  if (revenueChart.value.length > 7) {
    scrollChartToRight()
  }
})

// Get product sold percentage
const getProductSoldPercent = (sold) => {
  if (maxSold.value === 0) return 0
  return (sold / maxSold.value) * 100
}

// Get rank class
const getRankClass = (index) => {
  const classes = [
    'bg-yellow-100 text-yellow-700',
    'bg-gray-100 text-gray-600',
    'bg-orange-100 text-orange-700',
    'bg-blue-50 text-blue-600',
    'bg-blue-50 text-blue-600',
    'bg-blue-50 text-blue-600',
    'bg-blue-50 text-blue-600'
  ]
  return classes[index] || 'bg-gray-50 text-gray-500'
}

// Get voucher border class
const getVoucherBorderClass = (index) => {
  const classes = [
    'border-rose-300 bg-rose-50/50',
    'border-pink-300 bg-pink-50/50',
    'border-orange-300 bg-orange-50/50',
    'border-amber-300 bg-amber-50/50',
    'border-yellow-300 bg-yellow-50/50'
  ]
  return classes[index] || 'border-gray-200 bg-gray-50/50'
}

// Get voucher bg class
const getVoucherBgClass = (index) => {
  const classes = [
    'bg-rose-100',
    'bg-pink-100',
    'bg-orange-100',
    'bg-amber-100',
    'bg-yellow-100'
  ]
  return classes[index] || 'bg-gray-100'
}

// Fetch financial overview
const fetchFinancialOverview = async () => {
  try {
    const res = await axios.get('/api/admin/dashboard/financial-overview')
    financialData.value = res.data.data
  } catch (error) {
    console.error('Lỗi lấy tổng quan tài chính:', error)
  }
}

// Fetch pending orders
const fetchPendingOrders = async () => {
  try {
    const res = await axios.get('/api/admin/dashboard/pending-orders')
    pendingOrders.value = res.data.data
  } catch (error) {
    console.error('Lỗi lấy đơn hàng chờ:', error)
  }
}

// Fetch top products
const fetchTopProducts = async () => {
  try {
    const res = await axios.get('/api/admin/dashboard/top-products')
    topProducts.value = res.data.data
  } catch (error) {
    console.error('Lỗi lấy sản phẩm bán chạy:', error)
  }
}

// Fetch top customers
const fetchTopCustomers = async () => {
  try {
    const res = await axios.get('/api/admin/dashboard/top-customers')
    topCustomers.value = res.data.data
  } catch (error) {
    console.error('Lỗi lấy khách hàng VIP:', error)
  }
}

// Fetch top vouchers
const fetchTopVouchers = async () => {
  try {
    const res = await axios.get('/api/admin/dashboard/top-vouchers')
    topVouchers.value = res.data.data
  } catch (error) {
    console.error('Lỗi lấy voucher:', error)
  }
}

// Fetch revenue chart
const fetchRevenueChart = async () => {
  try {
    const res = await axios.get('/api/admin/dashboard/revenue-chart')
    revenueChart.value = res.data.data
  } catch (error) {
    console.error('Lỗi lấy biểu đồ doanh thu:', error)
  }
}

// Fetch all data
const fetchAllData = async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchFinancialOverview(),
      fetchPendingOrders(),
      fetchTopProducts(),
      fetchTopCustomers(),
      fetchTopVouchers(),
      fetchRevenueChart()
    ])
  } catch (error) {
    console.error('Lỗi tải dữ liệu dashboard:', error)
  } finally {
    loading.value = false
  }
}

// On mount
onMounted(() => {
  fetchAllData()
})
</script>

<style scoped>
/* Custom Scrollbar Styling */
.scrollbar-custom::-webkit-scrollbar {
  height: 8px;
}

.scrollbar-custom::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}

.scrollbar-custom::-webkit-scrollbar-thumb {
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 10px;
}

.scrollbar-custom::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(90deg, #2563eb, #7c3aed);
}

/* Firefox */
.scrollbar-custom {
  scrollbar-width: thin;
  scrollbar-color: #8b5cf6 #f1f5f9;
}
</style>
