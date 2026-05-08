import 'dart:async';
import 'package:flutter/material.dart';
import '../../models/product_model.dart';
import '../../services/product_service.dart';
import '../../widgets/custom_app_bar.dart';
import '../../widgets/product_card_widget.dart';
import '../../widgets/common_widgets.dart';
import '../../providers/cart_provider.dart';
import '../../widgets/add_to_cart_animation.dart';
import '../../widgets/add_to_cart_bottom_sheet.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/product_provider.dart';

/// 🛍️ Products Page - Trang danh sách sản phẩm
class ProductsPage extends ConsumerStatefulWidget {
  final String? initialTag;

  const ProductsPage({super.key, this.initialTag});

  @override
  ConsumerState<ProductsPage> createState() => ProductsPageState();
}

class ProductsPageState extends ConsumerState<ProductsPage> {
  bool _isLoading = true;
  List<Product> _products = [];
  String? _selectedTag;
  String _sortBy = 'newest';
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  String _debouncedSearch = '';

  final List<Map<String, String>> _tags = [
    {'value': '', 'label': 'Tất cả'},
    {'value': 'aothun', 'label': 'Áo thun'},
    {'value': 'aosomi', 'label': 'Áo sơ mi'},
    {'value': 'quan', 'label': 'Quần'},
    {'value': 'giay', 'label': 'Giày'},
  ];

  final List<Map<String, String>> _sortOptions = [
    {'value': 'newest', 'label': 'Mới nhất'},
    {'value': 'price-asc', 'label': 'Giá thấp đến cao'},
    {'value': 'price-desc', 'label': 'Giá cao đến thấp'},
    {'value': 'best-selling', 'label': 'Bán chạy'},
  ];

  @override
  void initState() {
    super.initState();
    _selectedTag = widget.initialTag ?? '';
    // Không gọi _loadProducts() ở đây nữa, build() sẽ tự động watch provider
  }

  /// Cho phép MainScreen gọi từ bên ngoài để thay đổi tag filter
  void filterByTag(String? tag) {
    setState(() {
      _selectedTag = tag ?? '';
    });
  }

  void _refresh() {
    if (_isDefaultFilter) {
      ref.invalidate(productsProvider);
    } else {
      ref.invalidate(filteredProductsProvider((tag: _selectedTag, sortBy: _sortBy, search: _debouncedSearch)));
    }
  }

  bool get _isDefaultFilter => 
      (_selectedTag == null || _selectedTag!.isEmpty) && 
      _sortBy == 'newest' && 
      _debouncedSearch.isEmpty;

  Map<String, String?> get _currentParams => {
    'tag': _selectedTag,
    'sortBy': _sortBy,
    'search': _debouncedSearch,
  };


  void _goToProductDetail(Product product) {
    Navigator.pushNamed(context, '/product-detail', arguments: product.id);
  }

  void _goToCart() {
    Navigator.pushNamed(context, '/cart');
  }

  @override
  Widget build(BuildContext context) {
    // Luồng dữ liệu: Nếu filter mặc định thì dùng productsProvider (đã load ở Home)
    // Nếu có filter thì dùng filteredProductsProvider (load mới)
    final productsAsync = _isDefaultFilter 
        ? ref.watch(productsProvider)
        : ref.watch(filteredProductsProvider((tag: _selectedTag, sortBy: _sortBy, search: _debouncedSearch)));

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: CustomAppBar(
        showSearch: true,
        searchController: _searchController,
        onSearchChanged: (val) {
          if (_debounce?.isActive ?? false) _debounce!.cancel();
          _debounce = Timer(const Duration(milliseconds: 1000), () {
            setState(() {
              _debouncedSearch = val.trim();
            });
          });
        },
        showCart: true,
        cartItemCount: ref.watch(cartProvider).itemCount,
        onCartTap: _goToCart,
      ),
      body: Column(
        children: [
          _buildFilterChips(),
          _buildSortDropdown(),
          Expanded(
            child: productsAsync.when(
              loading: () => const LoadingWidget(),
              error: (err, stack) => ErrorDisplayWidget(
                message: err.toString(), 
                onRetry: _refresh,
              ),
              data: (products) {
                if (products.isEmpty) {
                  return const EmptyStateWidget(
                    icon: Icons.shopping_bag_outlined,
                    title: 'Không tìm thấy sản phẩm',
                    subtitle: 'Thử tìm kiếm với từ khóa khác',
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => _refresh(),
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
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
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips() {
    return Container(
      height: 50,
      color: Colors.white,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        itemCount: _tags.length,
        itemBuilder: (context, index) {
          final tag = _tags[index];
          final isSelected = _selectedTag == tag['value'];

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: ChoiceChip(
              label: Text(tag['label']!),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  _selectedTag = selected ? tag['value'] : '';
                });
              },
              selectedColor: const Color(0xFFFF6B35),
              backgroundColor: Colors.grey[100],
              labelStyle: TextStyle(
                color: isSelected ? Colors.white : Colors.black87,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSortDropdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Colors.white,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '${_products.length} sản phẩm',
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 14,
            ),
          ),
          DropdownButton<String>(
            value: _sortBy,
            icon: const Icon(Icons.sort),
            underline: const SizedBox(),
            onChanged: (value) {
              if (value != null) {
                setState(() => _sortBy = value);
              }
            },
            items: _sortOptions.map((option) {
              return DropdownMenuItem(
                value: option['value'],
                child: Text(
                  option['label']!,
                  style: const TextStyle(fontSize: 14),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }
}

