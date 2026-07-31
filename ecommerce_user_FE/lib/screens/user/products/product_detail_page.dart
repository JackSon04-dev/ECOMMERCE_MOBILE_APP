import 'package:flutter/material.dart';
import '../../../utils/currency_helper.dart';
import '../../../models/product_model.dart';
import '../../../models/review_model.dart';
import '../../../services/product_service.dart';
import '../../../services/review_service.dart';
import '../../../providers/cart_provider.dart';
import '../../../utils/auth_guard.dart';
import '../../../utils/date_helper.dart';
import '../../../widgets/common_widgets.dart';
import '../../../widgets/size_guide_sheet.dart';
import '../../../widgets/product_card_widget.dart';
import '../../../widgets/add_to_cart_bottom_sheet.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../utils/scroll_pagination_mixin.dart';

/// 📦 Product Detail Page
class ProductDetailPage extends ConsumerStatefulWidget {
  final String? productId;

  const ProductDetailPage({super.key, this.productId});

  @override
  ConsumerState<ProductDetailPage> createState() => _ProductDetailPageState();
}

class _ProductDetailPageState extends ConsumerState<ProductDetailPage> with ScrollPaginationMixin<ProductDetailPage> {
  Product? _product;
  List<ReviewModel> _reviews = [];
  bool _isLoading = true;
  int _currentImageIndex = 0;
  String? _selectedColor;
  String? _selectedSize;
  int _quantity = 1;
  PageController? _pageController;
  bool _showAllReviews = false;
  List<Product> _allProducts = [];

  // Recommended products pagination fields
  bool _hasMoreProducts = true;
  bool _isLoadingMore = false;
  String? _lastProductId;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _loadProduct();
  }

  @override
  void onScrollThresholdReached() {
    _loadMoreProducts();
  }

  @override
  void dispose() {
    _pageController?.dispose();
    super.dispose();
  }

  Future<void> _loadProduct() async {
    setState(() => _isLoading = true);

    try {
      Product? product;
      if (widget.productId != null) {
        product = await ProductService.getProductById(widget.productId!);
      }

      // Load products for the bottom list based on the same tag
      String? filterTag;
      if (product != null && product.tags.isNotEmpty) {
        filterTag = product.tags.first; // Get first tag as category (e.g., 'T-shirt', 'Pants')
      }
      final allProducts = await ProductService.getAllProducts(tag: filterTag, limit: 20);
      
      final bool hasMore = allProducts.length >= 20;

      // Exclude current product itself from suggestions
      if (product != null) {
        allProducts.removeWhere((p) => p.id == product!.id);
      }

      if (product != null) {
        final reviews = await ReviewService.getReviewsByProduct(product.id);

        setState(() {
          _product = product;
          _reviews = reviews; // Don't use demo, use API reviews
          _selectedColor = product!.colorVariants.isNotEmpty
              ? product.colorVariants.first.color
              : null;
          _selectedSize = _selectedColor != null &&
                  product.colorVariants.first.sizes.isNotEmpty
              ? product.colorVariants.first.sizes.first.size
              : null;
          _allProducts = allProducts;
          _hasMoreProducts = hasMore;
          if (allProducts.isNotEmpty) {
            _lastProductId = allProducts.last.id;
          }
          _isLoading = false;
        });
      } else {
        setState(() {
          _product = _getDemoProduct();
          _reviews = []; // Don't use demo reviews
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _product = _getDemoProduct();
        _reviews = []; // Don't use demo reviews
        _isLoading = false;
      });
    }
  }

  Future<void> _loadMoreProducts() async {
    if (_isLoadingMore || !_hasMoreProducts || _lastProductId == null) return;

    setState(() => _isLoadingMore = true);

    try {
      String? filterTag;
      if (_product != null && _product!.tags.isNotEmpty) {
        filterTag = _product!.tags.first;
      }
      final newProducts = await ProductService.getAllProducts(
        tag: filterTag,
        lastId: _lastProductId,
        limit: 20,
      );

      final bool hasMore = newProducts.length >= 20;

      // Exclude current product itself from suggestions
      if (_product != null) {
        newProducts.removeWhere((p) => p.id == _product!.id);
      }

      setState(() {
        _allProducts.addAll(newProducts);
        _hasMoreProducts = hasMore;
        if (newProducts.isNotEmpty) {
          _lastProductId = newProducts.last.id;
        }
        _isLoadingMore = false;
      });
    } catch (e) {
      print('❌ [ProductDetail] Load more recommendations error: $e');
      setState(() => _isLoadingMore = false);
    }
  }

  Product _getDemoProduct() {
    return Product(
      id: '1',
      name: 'Áo thun Goodthing Cao Cấp GDT',
      shortDescription: 'Áo thun Goodthing đẹp phù hợp mọi lứa tuổi',
      description:
          'Áo thun Goodthing đẹp phù hợp mọi lứa tuổi. Vải thoáng khí mát vào mùa hè, ấm vào mùa đông. Chất liệu cotton 100% cao cấp, không xù lông, không phai màu sau nhiều lần giặt.',
      thumbnail:
          'https://res.cloudinary.com/dp0gbdemq/image/upload/v1769500103/ecommerce_app/b7ud3eyfqe3ailehsog6.webp',
      price: 250000,
      discount: 30,
      finalPrice: 175000,
      colorVariants: [
        ColorVariant(
          id: '1',
          color: 'Đen',
          images: [
            'https://res.cloudinary.com/dp0gbdemq/image/upload/v1769499940/ecommerce_app/m369qwmfokoezzu4aqpd.webp'
          ],
          sizes: [
            SizeVariant(id: '1', size: 'M', stock: 9),
            SizeVariant(id: '2', size: 'L', stock: 10),
          ],
        ),
        ColorVariant(
          id: '2',
          color: 'Trắng',
          images: [
            'https://res.cloudinary.com/dp0gbdemq/image/upload/v1769500006/ecommerce_app/eehk91smzzfimlofc79n.webp'
          ],
          sizes: [
            SizeVariant(id: '3', size: 'L', stock: 10),
            SizeVariant(id: '4', size: 'XL', stock: 9),
          ],
        ),
      ],
      tags: ['aothun'],
      averageRating: 4.5,
      reviewCount: 120,
      soldCount: 500,
    );
  }


  // Map to store color info of each image
  final Map<String, String> _imageColorMap = {};

  List<String> get _currentImages {
    if (_product == null) return [];

    // Clear map first
    _imageColorMap.clear();

    // Create image list: main image + all variant images
    final List<String> allImages = [];

    // Add main image (thumbnail)
    if (_product!.thumbnail.isNotEmpty) {
      allImages.add(_product!.thumbnail);
      _imageColorMap[_product!.thumbnail] = ''; // Main image does not belong to specific color
    }

    // Add all images from color variants
    for (var colorVariant in _product!.colorVariants) {
      for (var image in colorVariant.images) {
        // Avoid duplication
        if (!allImages.contains(image)) {
          allImages.add(image);
          _imageColorMap[image] = colorVariant.color; // Save color of this image
        }
      }
    }

    return allImages.isNotEmpty ? allImages : [_product!.thumbnail];
  }

  // Get index of first image of selected color
  int _getFirstImageIndexOfColor(String color) {
    final images = _currentImages;
    for (int i = 0; i < images.length; i++) {
      if (_imageColorMap[images[i]] == color) {
        return i;
      }
    }
    return 0; // If not found, return first image
  }

  List<String> get _availableSizes {
    if (_product == null || _selectedColor == null) return [];
    return _product!.getAvailableSizes(_selectedColor!);
  }

  int get _currentStock {
    if (_product == null || _selectedColor == null || _selectedSize == null) {
      return 0;
    }
    return _product!.getStockByVariant(_selectedColor!, _selectedSize!);
  }

  /// Return list of color names (other than selected) in stock with [size]
  List<String> _getColorsWithSize(String size) {
    if (_product == null) return [];
    return _product!.colorVariants
        .where((v) =>
            v.color != _selectedColor &&
            v.sizes.any((s) => s.size == size && s.stock > 0))
        .map((v) => v.color)
        .toList();
  }

  void _addToCart() {
    if (_product == null) return;

    final success = ref.read(cartProvider.notifier).addItem(
      _product!,
      _selectedColor ?? '',
      _selectedSize ?? '',
      quantity: _quantity,
    );

    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Không đủ hàng trong kho. Còn lại: $_currentStock'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Use nice dialog animation
    AddToCartAnimation.showDialog(
      context,
      productName: _product!.name,
      imageUrl: _product!.thumbnail,
      quantity: _quantity,
    );
  }

  Future<void> _buyNow() async {
    if (_product == null) return;

    // Check login before purchase
    final isAuth = await AuthGuard.requireAuth(context, ref);
    if (!isAuth || !mounted) return;

    if (_selectedColor == null || _selectedSize == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng chọn màu và size'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final stock = _currentStock;
    if (_quantity > stock) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Không đủ hàng trong kho. Còn lại: $stock'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Pass product directly to checkout, do not add to cart
    Navigator.pushNamed(context, '/checkout', arguments: {
      'mode': 'buyNow',
      'items': [
        {
          'product': _product!,
          'color': _selectedColor!,
          'size': _selectedSize!,
          'quantity': _quantity,
        }
      ],
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: _isLoading
          ? const LoadingWidget()
          : _product == null
              ? const ErrorDisplayWidget(message: 'Không tìm thấy sản phẩm')
              : CustomScrollView(
                  controller: scrollController,
                  slivers: [
                    // App Bar with image
                    _buildSliverAppBar(),

                    // Product info
                    SliverToBoxAdapter(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildProductInfo(),
                          if (_currentImages.length > 1) _buildImageThumbnails(),
                          _buildColorSelector(),
                          _buildSizeSelector(),
                          _buildQuantitySelector(),
                          _buildDescription(),
                          _buildReviews(),
                          const SizedBox(height: 20),
                          _buildAllProductsGrid(),
                          if (_isLoadingMore)
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 16),
                              child: Center(
                                child: CircularProgressIndicator(
                                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFFF6B35)),
                                ),
                              ),
                            ),
                          const SizedBox(height: 100),
                        ],
                      ),
                    ),
                  ],
                ),
      bottomNavigationBar: _product != null ? _buildBottomBar() : null,
    );
  }

  Widget _buildSliverAppBar() {
    return SliverAppBar(
      expandedHeight: 350,
      pinned: true,
      backgroundColor: Colors.white,
      leading: Container(
        margin: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.9),
          shape: BoxShape.circle,
        ),
        child: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      actions: [
        Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.9),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            icon: const Icon(Icons.share_outlined, size: 20),
            onPressed: () {},
          ),
        ),
        Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.9),
            shape: BoxShape.circle,
          ),
          child: Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart_outlined, size: 20),
                onPressed: () => Navigator.pushNamed(context, '/cart'),
              ),
              if (ref.watch(cartProvider).itemCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: TweenAnimationBuilder<double>(
                    duration: const Duration(milliseconds: 300),
                    tween: Tween(begin: 0.0, end: 1.0),
                    key: ValueKey(ref.watch(cartProvider).itemCount),
                    builder: (context, value, child) {
                      return Transform.scale(
                        scale: 0.5 + (value * 0.5),
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Color(0xFFFF6B35),
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            '${ref.watch(cartProvider).itemCount}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          children: [
            PageView.builder(
              controller: _pageController,
              onPageChanged: (index) {
                setState(() => _currentImageIndex = index);
              },
              itemCount: _currentImages.length,
              itemBuilder: (context, index) {
                return Image.network(
                  _currentImages[index],
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: Colors.grey[200],
                      child: const Icon(Icons.image, size: 100, color: Colors.grey),
                    );
                  },
                );
              },
            ),

            // Image counter (top right)
            if (_currentImages.length > 1)
              Positioned(
                top: 100,
                right: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${_currentImageIndex + 1}/${_currentImages.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),

            // Image indicators (dots)
            if (_currentImages.length > 1)
              Positioned(
                bottom: 16,
                left: 0,
                right: 0,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(_currentImages.length, (index) {
                    return Container(
                      width: 8,
                      height: 8,
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _currentImageIndex == index
                            ? const Color(0xFFFF6B35)
                            : Colors.white.withOpacity(0.5),
                      ),
                    );
                  }),
                ),
              ),

            // Discount badge
            if (_product!.discount > 0)
              Positioned(
                top: 100,
                left: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '-${_product!.discount}%',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductInfo() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Price
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _product!.finalPrice.toVND(),
                style: const TextStyle(
                  color: Color(0xFFFF6B35),
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (_product!.discount > 0) ...[
                const SizedBox(width: 12),
                Text(
                  _product!.price.toVND(),
                  style: const TextStyle(
                    color: Colors.grey,
                    fontSize: 16,
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
              ],
            ],
          ),

          const SizedBox(height: 12),

          // Name
          Text(
            _product!.name,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),

          const SizedBox(height: 12),

          // Rating & sold
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                // Rating section
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.star, color: Colors.amber, size: 16),
                    const SizedBox(width: 4),
                    Text(
                      _product!.averageRating.toStringAsFixed(1),
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    Text(
                      ' (${_product!.reviewCount})',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 8),
                  width: 1,
                  height: 14,
                  color: Colors.grey[300],
                ),
                // Sold section
                Text(
                  'Bán ${_product!.soldCount}',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 12,
                  ),
                ),
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 8),
                  width: 1,
                  height: 14,
                  color: Colors.grey[300],
                ),
                // Stock section
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.inventory_2_outlined,
                      size: 14,
                      color: (_selectedColor != null && _selectedSize != null
                              ? _currentStock
                              : _product!.totalStock) >
                          0
                          ? Colors.green
                          : Colors.red,
                    ),
                    const SizedBox(width: 3),
                    Text(
                      _selectedColor != null && _selectedSize != null
                          ? (_currentStock > 0
                              ? 'Còn $_currentStock'
                              : 'Hết hàng')
                          : (_product!.totalStock > 0
                              ? 'Còn ${_product!.totalStock}'
                              : 'Hết hàng'),
                      style: TextStyle(
                        color: (_selectedColor != null && _selectedSize != null
                                ? _currentStock
                                : _product!.totalStock) >
                            0
                            ? Colors.green[700]
                            : Colors.red,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageThumbnails() {
    return Container(
      height: 65,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _currentImages.length,
        itemBuilder: (context, index) {
          final isSelected = _currentImageIndex == index;

          return GestureDetector(
            onTap: () {
              setState(() => _currentImageIndex = index);
              _pageController?.animateToPage(
                index,
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
              );
            },
            child: Container(
              width: 60,
              height: 60,
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                border: Border.all(
                  color: isSelected
                      ? const Color(0xFFFF6B35)
                      : Colors.grey[300]!,
                  width: isSelected ? 2 : 1,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.network(
                  _currentImages[index],
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: Colors.grey[200],
                      child: Icon(Icons.image, size: 24, color: Colors.grey[400]),
                    );
                  },
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildColorSelector() {
    if (_product!.colorVariants.isEmpty) return const SizedBox();

    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Màu sắc',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: _product!.colorVariants.map((variant) {
              final isSelected = _selectedColor == variant.color;
              return GestureDetector(
                onTap: () {
                  final prevSize = _selectedSize;
                  // Keep old size if new color has that size (even if out of stock)
                  // -> if out of stock, suggestion card will auto show because _currentStock == 0
                  final hasPrevSize = prevSize != null &&
                      variant.sizes.any((s) => s.size == prevSize);
                  final newSize = hasPrevSize
                      ? prevSize
                      : (variant.sizes.isNotEmpty
                          ? variant.sizes.first.size
                          : null);
                  final newStock = newSize != null
                      ? _product!.getStockByVariant(variant.color, newSize)
                      : 0;
                  setState(() {
                    _selectedColor = variant.color;
                    _selectedSize = newSize;
                    if (newStock > 0 && _quantity > newStock) {
                      _quantity = newStock;
                    } else if (newStock == 0) {
                      _quantity = 1;
                    }
                  });

                  // Auto scroll to image of selected color
                  final targetIndex = _getFirstImageIndexOfColor(variant.color);
                  _pageController?.animateToPage(
                    targetIndex,
                    duration: const Duration(milliseconds: 400),
                    curve: Curves.easeInOut,
                  );

                  setState(() {
                    _currentImageIndex = targetIndex;
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: isSelected
                          ? const Color(0xFFFF6B35)
                          : Colors.grey[300]!,
                      width: isSelected ? 2 : 1,
                    ),
                    borderRadius: BorderRadius.circular(8),
                    color: isSelected
                        ? const Color(0xFFFF6B35).withOpacity(0.05)
                        : null,
                  ),
                  child: Text(
                    variant.color,
                    style: TextStyle(
                      color: isSelected
                          ? const Color(0xFFFF6B35)
                          : Colors.black87,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildSizeSelector() {
    if (_availableSizes.isEmpty) return const SizedBox();

    // Get all sizes of selected color (including out of stock)
    final colorVariant = _selectedColor != null
        ? _product!.colorVariants
            .where((v) => v.color == _selectedColor)
            .firstOrNull
        : null;

    // Use all sizes from variant (including stock = 0)
    final allSizesOfColor = colorVariant?.sizes ?? [];

    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Kích thước',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              TextButton(
                onPressed: () {
                  final isShoe = _availableSizes.any(
                      (s) => RegExp(r'^\d{2}$').hasMatch(s));
                  SizeGuideSheet.show(
                    context,
                    initialCategory: isShoe
                        ? SizeCategory.shoes
                        : SizeCategory.clothes,
                  );
                },
                child: const Text(
                  'Hướng dẫn chọn size',
                  style: TextStyle(color: Color(0xFFFF6B35)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: allSizesOfColor.map((sizeVariant) {
              final isSelected = _selectedSize == sizeVariant.size;
              final isOutOfStock = sizeVariant.stock <= 0;

              return GestureDetector(
                // Both out of stock and in stock chips use _selectedSize
                // When _selectedSize != null && _currentStock == 0 -> suggestion card auto shows
                onTap: () {
                  final newStock = _product!.getStockByVariant(
                      _selectedColor!, sizeVariant.size);
                  setState(() {
                    _selectedSize = sizeVariant.size;
                    if (newStock > 0 && _quantity > newStock) _quantity = newStock;
                    if (newStock == 0) _quantity = 1;
                  });
                },
                child: Stack(
                  children: [
                    Container(
                      constraints: const BoxConstraints(minWidth: 50),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: isOutOfStock
                              ? Colors.grey[300]!
                              : isSelected
                                  ? const Color(0xFFFF6B35)
                                  : Colors.grey[400]!,
                          width: isSelected ? 2 : 1,
                        ),
                        borderRadius: BorderRadius.circular(8),
                        color: isOutOfStock
                            ? Colors.grey[100]
                            : isSelected
                                ? const Color(0xFFFF6B35).withValues(alpha: 0.05)
                                : null,
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            sizeVariant.size,
                            style: TextStyle(
                              color: isOutOfStock
                                  ? Colors.grey[400]
                                  : isSelected
                                      ? const Color(0xFFFF6B35)
                                      : Colors.black87,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.normal,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            isOutOfStock ? 'Hết' : 'Còn ${sizeVariant.stock}',
                            style: TextStyle(
                              fontSize: 10,
                              color: isOutOfStock
                                  ? Colors.red[300]
                                  : Colors.grey[500],
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Slash line when out of stock
                    if (isOutOfStock)
                      Positioned.fill(
                        child: CustomPaint(
                          painter: _StrikethroughPainter(),
                        ),
                      ),
                  ],
                ),
              );
            }).toList(),
          ),

          // ── Suggest other colors when selected size is out of stock ────────────────
          AnimatedSize(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOutCubic,
            child: (_selectedSize != null && _currentStock == 0)
                ? _buildSizeSuggestionCard(_selectedSize!)
                : const SizedBox.shrink(),
          ),

          // Stock badge for selected variant
          if (_selectedColor != null && _selectedSize != null) ...[            const SizedBox(height: 10),
            Row(
              children: [
                Icon(
                  Icons.inventory_2_outlined,
                  size: 14,
                  color: _currentStock > 10
                      ? Colors.green
                      : _currentStock > 0
                          ? Colors.orange
                          : Colors.red,
                ),
                const SizedBox(width: 6),
                Text(
                  _currentStock > 10
                      ? 'Còn nhiều hàng ($_currentStock)'
                      : _currentStock > 0
                          ? 'Còn $_currentStock sản phẩm (sắp hết)'
                          : 'Hết hàng cho size này',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: _currentStock > 10
                        ? Colors.green[700]
                        : _currentStock > 0
                            ? Colors.orange[800]
                            : Colors.red,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildQuantitySelector() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          const Text(
            'Số lượng',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const Spacer(),
          QuantitySelector(
            quantity: _quantity,
            maxStock: _currentStock,
            large: true,
            snackBarContext: context,
            onChanged: (newQty) => setState(() => _quantity = newQty),
          ),
        ],
      ),
    );
  }

  Widget _buildDescription() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Mô tả sản phẩm',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _product!.description,
            style: TextStyle(
              color: Colors.grey[700],
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviews() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Đánh giá sản phẩm',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),

          // If no review, show message
          if (_reviews.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              alignment: Alignment.center,
              child: Column(
                children: [
                  Icon(Icons.rate_review_outlined, size: 48, color: Colors.grey[400]),
                  const SizedBox(height: 8),
                  Text(
                    'Sản phẩm chưa có đánh giá',
                    style: TextStyle(color: Colors.grey[600], fontSize: 14),
                  ),
                ],
              ),
            )
          else ...[
            // Show reviews (2 or all depending on _showAllReviews)
            ...(_showAllReviews ? _reviews : _reviews.take(2))
                .map((review) => _buildReviewItem(review)),

            const SizedBox(height: 8),

            // "See all" or "Collapse" button
            if (_reviews.length > 2)
              Center(
                child: TextButton.icon(
                  onPressed: () {
                    setState(() {
                      _showAllReviews = !_showAllReviews;
                    });
                  },
                  icon: Icon(
                    _showAllReviews ? Icons.expand_less : Icons.expand_more,
                    size: 20,
                  ),
                  label: Text(
                    _showAllReviews
                        ? 'Thu gọn'
                        : 'Xem tất cả ${_reviews.length} đánh giá',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFFFF6B35),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildReviewItem(ReviewModel review) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Avatar, name, rating, date
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: const Color(0xFFFF6B35).withOpacity(0.1),
                child: Text(
                  (review.userName ?? 'U')[0].toUpperCase(),
                  style: const TextStyle(
                    color: Color(0xFFFF6B35),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      review.userName ?? 'Người dùng',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    Row(
                      children: List.generate(5, (index) {
                        return Icon(
                          index < review.rating ? Icons.star : Icons.star_border,
                          color: Colors.amber,
                          size: 14,
                        );
                      }),
                    ),
                  ],
                ),
              ),
              Text(
                _formatDate(review.createdAt),
                style: TextStyle(
                  color: Colors.grey[500],
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Comment
          Text(
            review.comment,
            style: TextStyle(
              color: Colors.grey[700],
              height: 1.4,
            ),
          ),

          // Images (if any)
          if (review.images.isNotEmpty) ...[
            const SizedBox(height: 12),
            _buildReviewImages(review.images),
          ],
        ],
      ),
    );
  }

  Widget _buildReviewImages(List<String> images) {
    // Show up to 4 images
    final displayImages = images.take(4).toList();
    final remainingCount = images.length - 4;

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: displayImages.asMap().entries.map((entry) {
        final index = entry.key;
        final imageUrl = entry.value;
        final isLast = index == 3 && remainingCount > 0;

        return GestureDetector(
          onTap: () => _showImageGallery(images, index),
          child: Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  imageUrl,
                  width: 70,
                  height: 70,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      width: 70,
                      height: 70,
                      color: Colors.grey[300],
                      child: Icon(Icons.broken_image, color: Colors.grey[500]),
                    );
                  },
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return Container(
                      width: 70,
                      height: 70,
                      color: Colors.grey[200],
                      child: Center(
                        child: CircularProgressIndicator(
                          value: loadingProgress.expectedTotalBytes != null
                              ? loadingProgress.cumulativeBytesLoaded /
                                  loadingProgress.expectedTotalBytes!
                              : null,
                          strokeWidth: 2,
                        ),
                      ),
                    );
                  },
                ),
              ),
              if (isLast)
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: Text(
                        '+${remainingCount}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      }).toList(),
    );
  }

  void _showImageGallery(List<String> images, int initialIndex) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.black,
        child: Stack(
          children: [
            PageView.builder(
              itemCount: images.length,
              controller: PageController(initialPage: initialIndex),
              itemBuilder: (context, index) {
                return Center(
                  child: InteractiveViewer(
                    panEnabled: true,
                    minScale: 0.5,
                    maxScale: 4.0,
                    child: Image.network(
                      images[index],
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) {
                        return const Center(
                          child: Icon(
                            Icons.broken_image,
                            color: Colors.white,
                            size: 64,
                          ),
                        );
                      },
                    ),
                  ),
                );
              },
            ),
            Positioned(
              top: 16,
              right: 16,
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white, size: 30),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime? date) {
    return DateHelper.formatDate(date);
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.2),
            spreadRadius: 1,
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Chat button
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFFFF6B35)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: IconButton(
                icon: const Icon(
                  Icons.chat_bubble_outline,
                  color: Color(0xFFFF6B35),
                ),
                onPressed: () {},
              ),
            ),
            const SizedBox(width: 12),
            // Add to cart button
            Expanded(
              child: OutlinedButton(
                onPressed: _addToCart,
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFFF6B35),
                  side: const BorderSide(color: Color(0xFFFF6B35)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Thêm vào giỏ',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Buy now button
            Expanded(
              child: ElevatedButton(
                onPressed: _buyNow,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF6B35),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  'Mua ngay',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
  /// Suggestion card for other colors when [size] is out of stock in current color
  Widget _buildSizeSuggestionCard(String size) {
    final availableColors = _getColorsWithSize(size);

    // ── No color has this size -> notify completely out of stock ──────────
    if (availableColors.isEmpty) {
      return Container(
        margin: const EdgeInsets.only(top: 12),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.red[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.red[200]!),
        ),
        child: Row(
          children: [
            Icon(Icons.sentiment_dissatisfied_rounded,
                color: Colors.red[400], size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Size $size đã hết hàng ở tất cả màu sắc.',
                style: TextStyle(
                  color: Colors.red[700],
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      );
    }

    // ── Other colors in stock -> suggest changing color ───────────────────
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF3EE),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFFFF6B35).withValues(alpha: 0.35),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title
          Row(
            children: [
              const Icon(Icons.info_outline_rounded,
                  color: Color(0xFFFF6B35), size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: RichText(
                  text: TextSpan(
                    style: const TextStyle(
                        fontSize: 13, color: Colors.black87),
                    children: [
                      TextSpan(
                        text: 'Size $size',
                        style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFFF6B35)),
                      ),
                      TextSpan(
                        text:
                            ' hết hàng ở màu "$_selectedColor".\nCòn hàng ở:',
                      ),
                    ],
                  ),
                ),
              ),
              // Close button — deselect size
              GestureDetector(
                onTap: () => setState(() => _selectedSize = null),
                child: const Icon(Icons.close_rounded,
                    size: 16, color: Colors.grey),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Suggested color chips
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: availableColors.map((color) {
              return GestureDetector(
                onTap: () {
                  final stock = _product!.getStockByVariant(color, size);
                  setState(() {
                    _selectedColor = color;
                    _selectedSize = size;
                    if (_quantity > stock && stock > 0) _quantity = stock;
                    if (_quantity < 1) _quantity = 1;
                    // Scroll image to new color
                    final targetIdx =
                        _getFirstImageIndexOfColor(color);
                    _currentImageIndex = targetIdx;
                    _pageController?.animateToPage(
                      targetIdx,
                      duration: const Duration(milliseconds: 400),
                      curve: Curves.easeInOut,
                    );
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF6B35),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFFF6B35)
                            .withValues(alpha: 0.3),
                        blurRadius: 6,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.check_circle_outline_rounded,
                          size: 13, color: Colors.white),
                      const SizedBox(width: 5),
                      Text(
                        color,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 4),
          Text(
            'Bấm vào màu để chuyển ngay',
            style: TextStyle(
                fontSize: 11,
                color: Colors.grey[500],
                fontStyle: FontStyle.italic),
          ),
        ],
      ),
    );
  }
}

/// CustomPainter draws slash line for out of stock size
class _StrikethroughPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.grey[400]!
      ..strokeWidth = 1.2
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(size.width * 0.1, size.height * 0.9),
      Offset(size.width * 0.9, size.height * 0.1),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

extension _ProductDetailPageExtensions on _ProductDetailPageState {
  Widget _buildAllProductsGrid() {
    if (_allProducts.isEmpty) return const SizedBox();

    // Filter out current product
    final otherProducts =
        _allProducts.where((p) => p.id != _product?.id).toList();

    if (otherProducts.isEmpty) return const SizedBox();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            'Có thể bạn cũng thích',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 0.55,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemCount: otherProducts.length,
          itemBuilder: (context, index) {
            final product = otherProducts[index];
            return ProductCard(
              product: product,
              onTap: () {
                // Navigate to same page with new product
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(
                    builder: (context) => ProductDetailPage(productId: product.id),
                  ),
                );
              },
              onAddToCart: () {
                AddToCartBottomSheet.show(context, product);
              },
            );
          },
        ),
      ],
    );
  }
}
