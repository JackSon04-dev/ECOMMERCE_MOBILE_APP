import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../config/routes.dart';
import '../../../models/product_model.dart';
import '../../../widgets/custom_app_bar.dart';
import '../../../widgets/product_card_widget.dart';
import '../../../widgets/common_widgets.dart';
import '../../../providers/cart_provider.dart';
import '../../../widgets/add_to_cart_bottom_sheet.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../providers/product_provider.dart';

/// 🏠 Home Page - Trang chủ
class HomePage extends ConsumerStatefulWidget {
  final void Function({String? tag})? onNavigateToProducts;

  const HomePage({super.key, this.onNavigateToProducts});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  bool _isLoading = true;
  List<Product> _products = [];
  List<Product> _featuredProducts = [];
  String? _error;

  // Flash Sale countdown timer
  Timer? _flashSaleTimer;
  // 20 phút = 1200 giây (từ 2:45:30 về 2:25:30)
  static const int _flashSaleDuration = 20 * 60; // 1200 giây
  int _flashSaleRemainingSeconds = _flashSaleDuration;

  // Demo banners
  final List<Map<String, dynamic>> _banners = [
    {
      'image': 'https://res.cloudinary.com/dp0gbdemq/image/upload/v1769500103/ecommerce_app/b7ud3eyfqe3ailehsog6.webp',
      'title': 'Giảm giá mùa xuân',
      'subtitle': 'Ưu đãi lên đến 50%',
    },
    {
      'image': 'https://res.cloudinary.com/dp0gbdemq/image/upload/v1769503229/ecommerce_app/wq91mciyjetflwvvakuh.webp',
      'title': 'Sản phẩm mới',
      'subtitle': 'Khám phá ngay',
    },
  ];

  // Demo categories
  final List<Map<String, dynamic>> _categories = [
    {'icon': '👕', 'name': 'Áo thun', 'tag': 'aothun'},
    {'icon': '👔', 'name': 'Áo sơ mi', 'tag': 'aosomi'},
    {'icon': '👖', 'name': 'Quần', 'tag': 'quan'},
    {'icon': '👟', 'name': 'Giày', 'tag': 'giay'},
  ];

  @override
  void initState() {
    super.initState();
    _startFlashSaleTimer();
  }

  @override
  void dispose() {
    _flashSaleTimer?.cancel();
    super.dispose();
  }

  Future<void> _onRefresh() async {
    // Refresh cả 2 provider
    ref.invalidate(productsProvider);
    ref.invalidate(featuredProductsProvider);
  }

  void _startFlashSaleTimer() {
    _flashSaleTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          if (_flashSaleRemainingSeconds > 0) {
            _flashSaleRemainingSeconds--;
          } else {
            _flashSaleRemainingSeconds = _flashSaleDuration;
          }
        });
      }
    });
  }

  String _getFlashSaleCountdown() {
    const int baseSeconds = 2 * 3600 + 25 * 60 + 30;
    final int totalSeconds = baseSeconds + _flashSaleRemainingSeconds;
    final int hours = totalSeconds ~/ 3600;
    final int minutes = (totalSeconds % 3600) ~/ 60;
    final int seconds = totalSeconds % 60;
    return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  List<Product> _getDemoProducts() {
    return [
      Product(
        id: '1',
        name: 'Áo thun Goodthing Cao Cấp GDT',
        shortDescription: 'Áo thun Goodthing đẹp phù hợp mọi lứa tuổi',
        description: 'Áo thun Goodthing đẹp phù hợp mọi lứa tuổi. Vải thoáng khí mát vào mùa hè.',
        thumbnail: 'https://res.cloudinary.com/dp0gbdemq/image/upload/v1769500103/ecommerce_app/b7ud3eyfqe3ailehsog6.webp',
        price: 250000,
        discount: 30,
        finalPrice: 175000,
        colorVariants: [],
        tags: ['aothun'],
        averageRating: 4.5,
        reviewCount: 120,
        soldCount: 500,
      ),
      Product(
        id: '2',
        name: 'Giày thể thao Camle JS',
        shortDescription: 'Giày thể thao năng động',
        description: 'Giày thể thao Camle JS thiết kế hiện đại, đế êm.',
        thumbnail: 'https://res.cloudinary.com/dp0gbdemq/image/upload/v1769503229/ecommerce_app/wq91mciyjetflwvvakuh.webp',
        price: 450000,
        discount: 30,
        finalPrice: 315000,
        colorVariants: [],
        tags: ['giay'],
        averageRating: 4.8,
        reviewCount: 85,
        soldCount: 320,
      ),
      Product(
        id: '3',
        name: 'Áo sơ mi nam công sở',
        shortDescription: 'Áo sơ mi thanh lịch',
        description: 'Áo sơ mi nam phong cách công sở, chất liệu cao cấp.',
        thumbnail: 'https://res.cloudinary.com/dp0gbdemq/image/upload/v1769501728/ecommerce_app/svlwqi35u1zp6oktg1r5.webp',
        price: 350000,
        discount: 20,
        finalPrice: 280000,
        colorVariants: [],
        tags: ['aothun'],
        averageRating: 4.3,
        reviewCount: 65,
        soldCount: 200,
      ),
      Product(
        id: '4',
        name: 'Quần jean slim fit',
        shortDescription: 'Quần jean thời trang',
        description: 'Quần jean nam form slim fit hiện đại.',
        thumbnail: 'https://res.cloudinary.com/dp0gbdemq/image/upload/v1769503334/ecommerce_app/holqvqwkif07rcdkmz65.webp',
        price: 400000,
        discount: 15,
        finalPrice: 340000,
        colorVariants: [],
        tags: ['quan'],
        averageRating: 4.6,
        reviewCount: 90,
        soldCount: 280,
      ),
    ];
  }

  String _formatCurrency(double amount) {
    final formatter = NumberFormat.currency(
      locale: 'vi_VN',
      symbol: '₫',
      decimalDigits: 0,
    );
    return formatter.format(amount);
  }

  void _goToCart() {
    Navigator.pushNamed(context, AppRoutes.cart);
  }

  void _goToSearch() {
    Navigator.pushNamed(context, AppRoutes.search);
  }

  void _goToProductDetail(Product product) {
    // Chỉ truyền productId để force ProductDetailPage gọi API
    Navigator.pushNamed(context, AppRoutes.productDetail, arguments: product.id);
  }

  void _goToCategory(String tag) {
    if (widget.onNavigateToProducts != null) {
      widget.onNavigateToProducts!(tag: tag);
    } else {
      Navigator.pushNamed(context, AppRoutes.products, arguments: {'tag': tag});
    }
  }

  /// Chuyển sang tab Products (giữ bottom nav bar)
  void _goToProducts() {
    if (widget.onNavigateToProducts != null) {
      widget.onNavigateToProducts!();
    } else {
      Navigator.pushNamed(context, AppRoutes.products);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartState = ref.watch(cartProvider);
    final productsAsync = ref.watch(productsProvider);
    final featuredAsync = ref.watch(featuredProductsProvider);
    
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: CustomAppBar(
        showSearch: true,
        onSearchTap: _goToSearch,
        showCart: true,
        cartItemCount: cartState.itemCount,
        onCartTap: _goToCart,
      ),
      body: productsAsync.when(
        loading: () => const LoadingWidget(message: 'Đang tải...'),
        error: (err, stack) => ErrorDisplayWidget(message: err.toString(), onRetry: _onRefresh),
        data: (productsList) {
          final products = productsList.isNotEmpty ? productsList : _getDemoProducts();
          
          return featuredAsync.when(
            loading: () => const LoadingWidget(message: 'Đang tải...'),
            error: (err, stack) => ErrorDisplayWidget(message: err.toString(), onRetry: _onRefresh),
            data: (featuredList) {
              final featuredProducts = featuredList.isNotEmpty ? featuredList : products.take(5).toList();
              
              return RefreshIndicator(
                onRefresh: _onRefresh,
                color: const Color(0xFFFF6B35),
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Banners
                      _buildBannerSlider(),
                      const SizedBox(height: 16),

                      // Categories
                      _buildCategories(),
                      const SizedBox(height: 20),

                      // Flash Sale
                      _buildFlashSale(featuredProducts),
                      const SizedBox(height: 20),

                      // Featured Products
                      _buildSectionTitle('Sản phẩm nổi bật', onViewAll: _goToProducts),
                      _buildFeaturedProducts(featuredProducts),
                      const SizedBox(height: 20),

                      // All Products
                      _buildSectionTitle('Gợi ý cho bạn', onViewAll: _goToProducts),
                      _buildProductGrid(products),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  // Update helper methods to take data as arguments
  Widget _buildFlashSale(List<Product> featuredProducts) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFF6B35), Color(0xFFFF8F65)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: const [
                  Icon(Icons.flash_on, color: Colors.yellow, size: 24),
                  SizedBox(width: 8),
                  Text(
                    'Flash Sale',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _getFlashSaleCountdown(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 140,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: featuredProducts.length,
              itemBuilder: (context, index) {
                final product = featuredProducts[index];
                return GestureDetector(
                  onTap: () => _goToProductDetail(product),
                  child: Container(
                    width: 100,
                    margin: const EdgeInsets.only(right: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                          child: Image.network(
                            product.thumbnail,
                            height: 80,
                            width: double.infinity,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                height: 80,
                                color: Colors.grey[200],
                                child: const Icon(Icons.image, color: Colors.grey),
                              );
                            },
                          ),
                        ),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.all(6),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  _formatCurrency(product.finalPrice),
                                  style: const TextStyle(
                                    color: Color(0xFFFF6B35),
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (product.discount > 0)
                                  Text(
                                    '-${product.discount}%',
                                    style: const TextStyle(
                                      color: Colors.red,
                                      fontSize: 9,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBannerSlider() {
    return SizedBox(
      height: 200,
      child: PageView.builder(
        itemCount: _banners.length,
        itemBuilder: (context, index) {
          final banner = _banners[index];
          return Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              image: DecorationImage(
                image: NetworkImage(banner['image']),
                fit: BoxFit.cover,
              ),
            ),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    Colors.black.withValues(alpha: 0.6),
                    Colors.transparent,
                  ],
                ),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    banner['title'],
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    banner['subtitle'],
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 10),
                  ElevatedButton(
                    onPressed: () => _goToProducts(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFF6B35),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text(
                      'Mua ngay',
                      style: TextStyle(fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildCategories() {
    return SizedBox(
      height: 100,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: List.generate(
            _categories.length,
            (index) {
              final category = _categories[index];
              return Expanded(
                child: GestureDetector(
                  onTap: () => _goToCategory(category['tag']),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFF6B35).withValues(alpha: 0.4),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Center(
                          child: Text(
                            category['icon'],
                            style: const TextStyle(fontSize: 28),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        category['name'],
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, {VoidCallback? onViewAll}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (onViewAll != null)
            TextButton(
              onPressed: onViewAll,
              child: const Text(
                'Xem tất cả',
                style: TextStyle(
                  color: Color(0xFFFF6B35),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildFeaturedProducts(List<Product> featuredProducts) {
    return SizedBox(
      height: 240,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: featuredProducts.length,
        itemBuilder: (context, index) {
          final product = featuredProducts[index];
          return Container(
            width: 150,
            margin: const EdgeInsets.symmetric(horizontal: 4),
            child: ProductCard(
              product: product,
              onTap: () => _goToProductDetail(product),
              showAddToCart: false,
            ),
          );
        },
      ),
    );
  }

  Widget _buildProductGrid(List<Product> products) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.55,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];
        return ProductCard(
          product: product,
          onTap: () => _goToProductDetail(product),
          onAddToCart: () {
            AddToCartBottomSheet.show(context, product);
          },
        );
      },
    );
  }
}

