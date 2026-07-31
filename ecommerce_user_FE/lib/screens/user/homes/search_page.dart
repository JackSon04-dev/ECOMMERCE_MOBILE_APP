import 'dart:async';
import 'package:flutter/material.dart';
import '../../../models/product_model.dart';
import '../../../widgets/product_card_widget.dart';
import '../../../widgets/common_widgets.dart';
import '../../../widgets/add_to_cart_bottom_sheet.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../providers/product_provider.dart';
import '../../../utils/scroll_pagination_mixin.dart';

/// 🔍 Search Page
class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> with ScrollPaginationMixin<SearchPage> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  final List<String> _popularSearches = ['Áo thun', 'Giày', 'Quần jean', 'Áo sơ mi'];
  Timer? _debounce;
  
  String _debouncedQuery = ''; // Used for Autocomplete (while typing)
  String _submittedQuery = ''; // Used for Fetch 20 items (on Enter/Click suggestion)

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      setState(() {}); // Update UI on focus change
    });
    _focusNode.requestFocus();
  }

  @override
  void onScrollThresholdReached() {
    if (_submittedQuery.isNotEmpty) {
      ref.read(paginatedProductsProvider((
        tag: null,
        sortBy: null,
        search: _submittedQuery,
      )).notifier).loadMore();
    }
  }

  void _onSearch(String query) {
    if (query.trim().isEmpty) return;
    _debounce?.cancel();
    ref.read(searchHistoryProvider.notifier).addSearch(query.trim());
    setState(() {
      _searchController.text = query.trim();
      _debouncedQuery = query.trim();
      _submittedQuery = query.trim();
    });
    _focusNode.unfocus(); // Close keyboard on submit
  }

  void _goToProductDetail(Product product) {
    Navigator.pushNamed(context, '/product-detail', arguments: product.id);
  }

  @override
  Widget build(BuildContext context) {
    final history = ref.watch(searchHistoryProvider);
    
    // Upon submit -> Show paginated results
    final isShowingResults = _submittedQuery.isNotEmpty;
    
    // Get data by current state
    final searchResultsAsync = isShowingResults
        ? ref.watch(paginatedProductsProvider((tag: null, sortBy: null, search: _submittedQuery)))
        : null;
        
    final autocompleteAsync = (!isShowingResults && _debouncedQuery.length >= 2)
        ? ref.watch(autocompleteProvider(_debouncedQuery))
        : null;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: Container(
          height: 40,
          decoration: BoxDecoration(
            color: Colors.grey[100],
            borderRadius: BorderRadius.circular(20),
          ),
          child: TextField(
            controller: _searchController,
            focusNode: _focusNode,
            onChanged: (value) {
              if (_debounce?.isActive ?? false) _debounce!.cancel();
              _debounce = Timer(const Duration(milliseconds: 300), () {
                setState(() {
                  _debouncedQuery = value.trim();
                  _submittedQuery = ''; // Reset submit to return to Autocomplete mode
                });
              });
            },
            onSubmitted: _onSearch,
            style: const TextStyle(fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Tìm kiếm sản phẩm...',
              hintStyle: TextStyle(color: Colors.grey[500], fontSize: 14),
              prefixIcon: Icon(Icons.search, color: Colors.grey[500], size: 20),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        _debounce?.cancel();
                        setState(() {
                          _debouncedQuery = '';
                          _submittedQuery = '';
                        });
                        _focusNode.requestFocus();
                      },
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
            ),
          ),
        ),
        actions: [
          if (_focusNode.hasFocus)
            IconButton(
              icon: const Icon(Icons.search, color: Colors.orange, size: 28),
              onPressed: () {
                if (_searchController.text.trim().isNotEmpty) {
                  _onSearch(_searchController.text);
                }
              },
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: isShowingResults
          ? _buildPaginatedResults(searchResultsAsync)
          : _debouncedQuery.isEmpty
              ? _buildHistoryAndPopular(history)
              : _buildAutocompleteList(autocompleteAsync),
    );
  }

  Widget _buildAutocompleteList(AsyncValue<List<Map<String, dynamic>>>? autocompleteAsync) {
    if (autocompleteAsync == null) return const SizedBox.shrink();

    return autocompleteAsync.when(
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(20.0),
          child: CircularProgressIndicator(color: Color(0xFFFF6B35)),
        ),
      ),
      error: (err, stack) => Center(child: Text('Lỗi: $err')),
      data: (suggestions) {
        if (suggestions.isEmpty) {
          return const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text('Không có gợi ý nào.', style: TextStyle(color: Colors.grey)),
          );
        }

        return ListView.separated(
          padding: EdgeInsets.zero,
          itemCount: suggestions.length,
          separatorBuilder: (context, index) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final suggestion = suggestions[index];
            return ListTile(
              leading: const Icon(Icons.search, color: Colors.grey),
              title: Text(suggestion['name'] ?? ''),
              onTap: () {
                // When clicking a suggestion -> Submit that keyword immediately
                _onSearch(suggestion['name']);
              },
            );
          },
        );
      },
    );
  }

  Widget _buildPaginatedResults(AsyncValue<List<Product>>? searchResultsAsync) {
    if (searchResultsAsync == null) return const SizedBox.shrink();

    return searchResultsAsync.when(
      loading: () => const LoadingWidget(),
      error: (err, stack) => ErrorDisplayWidget(
        message: 'Lỗi tải kết quả',
        onRetry: () => setState(() {}),
      ),
      data: (products) {
        if (products.isEmpty) {
          return const EmptyStateWidget(
            icon: Icons.search_off,
            title: 'Không tìm thấy sản phẩm',
            subtitle: 'Thử tìm kiếm với từ khóa khác',
          );
        }
        final isFetchingMore = searchResultsAsync.isLoading && searchResultsAsync.value != null;
        
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Tìm thấy ${products.length} sản phẩm',
                style: TextStyle(color: Colors.grey[600], fontSize: 14),
              ),
            ),
            Expanded(
              child: CustomScrollView(
                controller: scrollController,
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.55,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final product = products[index];
                          return ProductCard(
                            product: product,
                            onTap: () => _goToProductDetail(product),
                            onAddToCart: () => AddToCartBottomSheet.show(context, product),
                          );
                        },
                        childCount: products.length,
                      ),
                    ),
                  ),
                  if (isFetchingMore)
                    const SliverToBoxAdapter(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                          child: CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFFF6B35)),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildHistoryAndPopular(List<String> history) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Recent searches
          if (history.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Tìm kiếm gần đây',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
            ),
                TextButton(
                  onPressed: () {
                    ref.read(searchHistoryProvider.notifier).clearHistory();
                  },
                  child: const Text(
                    'Xóa',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: history.map((search) {
                return GestureDetector(
                  onTap: () {
                    _onSearch(search);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.grey[300]!),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.history, size: 16, color: Colors.grey),
                        const SizedBox(width: 6),
                        Text(search, style: const TextStyle(fontSize: 13)),
                        const SizedBox(width: 4),
                        GestureDetector(
                          onTap: () {
                            ref.read(searchHistoryProvider.notifier).removeSearch(search);
                          },
                          child: const Icon(Icons.close, size: 14, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
          ],

          // Popular searches
          const Text(
            'Tìm kiếm phổ biến',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _popularSearches.map((search) {
              return GestureDetector(
                onTap: () {
                  _onSearch(search);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF6B35).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.trending_up, size: 16, color: Color(0xFFFF6B35)),
                      const SizedBox(width: 6),
                      Text(
                        search,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFFFF6B35),
                        ),
                      ),
                    ],
                  ),
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
    _focusNode.dispose();
    _debounce?.cancel();
    super.dispose();
  }
}
