import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../models/order_model.dart';
import '../../../models/review_model.dart';
import '../../../services/review_service.dart';
import '../../../utils/date_helper.dart';
import '../../../widgets/common_widgets.dart';

/// ⭐ Create Review Page
class CreateReviewPage extends StatefulWidget {
  final Order order;
  /// Existing reviews: productId -> ReviewModel (passed from outside or loaded in page)
  final Map<String, ReviewModel>? existingReviews;

  const CreateReviewPage({
    super.key,
    required this.order,
    this.existingReviews,
  });

  @override
  State<CreateReviewPage> createState() => _CreateReviewPageState();
}

class _CreateReviewPageState extends State<CreateReviewPage> {
  static const int _maxImages = 3;
  static const Color _primaryColor = Color(0xFFFF6B35);
  static const Color _starActiveColor = Color(0xFFFFB800);
  static const Color _starInactiveColor = Color(0xFFE0E0E0);

  final _commentController = TextEditingController();
  final _imagePicker = ImagePicker();
  final List<File> _selectedImages = [];

  int _currentProductIndex = 0;
  bool _isSubmitting = false;
  bool _isLoadingReviews = false;

  /// Page mode (Add new review or View)
  bool get _isViewMode => widget.order.isRated;

  OrderItem get _currentItem => widget.order.orderItems[_currentProductIndex];
  int get _totalProducts => widget.order.orderItems.length;
  bool get _isLastProduct => _currentProductIndex >= _totalProducts - 1;
  
  /// User's existing reviews: productId -> ReviewModel
  late Map<String, ReviewModel> _existingReviews;

  /// Input data for unreviewed products: productId -> { rating, comment, images }
  final Map<String, Map<String, dynamic>> _reviewData = {};

  int get _currentRating =>
      (_reviewData[_currentItem.productId]?['rating'] as int?) ?? 0;

  @override
  void initState() {
    super.initState();
    _existingReviews = Map<String, ReviewModel>.from(widget.existingReviews ?? {});
    _loadExistingReviews();
  }

  /// If item has isRated=true but reviews not passed -> load from API
  Future<void> _loadExistingReviews() async {
    // Only load if order is rated
    if (!_isViewMode) {
      _loadDataForCurrentProduct();
      return;
    }
    if (_existingReviews.isNotEmpty) {
      _loadDataForCurrentProduct();
      return;
    }

    setState(() => _isLoadingReviews = true);
    
    // Load reviews for ALL items of this order using new optimized function
    final reviewList = await ReviewService.getReviewsByOrder(widget.order.id);
    
    // Convert List to Map for easy access by productId
    final reviewsMap = {for (var r in reviewList) r.productId: r};

    setState(() {
      _existingReviews = reviewsMap;
      _isLoadingReviews = false;
    });
    _loadDataForCurrentProduct();
  }

  void _loadDataForCurrentProduct() {
    if (_isViewMode) return; // View-only, no need to load form
    final data = _reviewData[_currentItem.productId];
    _commentController.text = (data?['comment'] as String?) ?? '';
    _selectedImages.clear();
    final saved = data?['images'] as List<File>?;
    if (saved != null) _selectedImages.addAll(saved);
  }

  void _saveDataForCurrentProduct() {
    if (_isViewMode) return;
    _reviewData[_currentItem.productId] = {
      'rating': _currentRating,
      'comment': _commentController.text.trim(),
      'images': List<File>.from(_selectedImages),
    };
  }

  void _setRating(int rating) {
    setState(() {
      _reviewData.putIfAbsent(_currentItem.productId, () => {});
      _reviewData[_currentItem.productId]!['rating'] = rating;
    });
  }

  // ─── NAVIGATION ────────────────────────────────────────────────────────
  void _goToNextProduct() {
    if (!_isViewMode) {
      if (_currentRating == 0) {
        _showSnack('Vui lòng chọn số sao', Colors.orange);
        return;
      }
      if (_commentController.text.trim().isEmpty) {
        _showSnack('Vui lòng nhập nhận xét', Colors.orange);
        return;
      }
    }
    _saveDataForCurrentProduct();
    setState(() {
      _currentProductIndex++;
      _loadDataForCurrentProduct();
    });
  }

  void _goToPreviousProduct() {
    _saveDataForCurrentProduct();
    setState(() {
      _currentProductIndex--;
      _loadDataForCurrentProduct();
    });
  }

  void _showSnack(String msg, Color color) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg), backgroundColor: color));
  }

  // ─── SUBMIT ────────────────────────────────────────────────────────────
  Future<void> _submitAllReviews() async {
    if (!_isViewMode) {
      if (_currentRating == 0) { _showSnack('Vui lòng chọn số sao', Colors.orange); return; }
      if (_commentController.text.trim().isEmpty) { _showSnack('Vui lòng nhập nhận xét', Colors.orange); return; }
    }
    _saveDataForCurrentProduct();

    // Filter unreviewed products (When entering review page, review all by default)
    final toSubmit = widget.order.orderItems;

    setState(() => _isSubmitting = true);

    int successCount = 0;
    int failCount = 0;
    String? lastError;

    for (final item in toSubmit) {
      final data = _reviewData[item.productId];
      if (data == null || (data['rating'] as int? ?? 0) == 0) continue;
      try {
        final images = data['images'] as List<File>?;
        await ReviewService.createReview(
          productId: item.productId,
          rating: data['rating'] as int,
          comment: (data['comment'] as String?) ?? '',
          imagePaths: images?.map((f) => f.path).toList(),
          orderId: widget.order.id,
          orderItemId: item.id,
        );
        successCount++;
        // TODO: Backend should auto update isRated for ALL items if successfully submitted?
        // Server current logic updates One by One.
      } catch (e) {
        failCount++;
        lastError = e.toString().replaceFirst('Exception: ', '');
      }
    }

    setState(() => _isSubmitting = false);
    if (!mounted) return;

    if (failCount == 0) {
      _showSuccessDialog(successCount);
    } else {
      _showSnack(
        successCount > 0
            ? 'Đã gửi $successCount đánh giá. $failCount thất bại: $lastError'
            : 'Gửi đánh giá thất bại: $lastError',
        successCount > 0 ? Colors.orange : Colors.red,
      );
      if (successCount > 0) Navigator.pop(context, true);
    }
  }

  void _showSuccessDialog(int count) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle, color: Colors.green, size: 56),
            ),
            const SizedBox(height: 20),
            const Text('Cảm ơn bạn!',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Đã gửi $count đánh giá thành công',
                style: TextStyle(color: Colors.grey[600], fontSize: 14),
                textAlign: TextAlign.center),
            const SizedBox(height: 8),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () { Navigator.pop(context); Navigator.pop(context, true); },
              style: ElevatedButton.styleFrom(
                backgroundColor: _primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              child: const Text('Hoàn tất', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }

  // ─── IMAGE PICKER ───────────────────────────────────────────────────────
  void _showImagePickerOptions() {
    if (_selectedImages.length >= _maxImages) {
      _showSnack('Tối đa $_maxImages ảnh cho mỗi sản phẩm', Colors.orange);
      return;
    }
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2)),
              ),
              const SizedBox(height: 16),
              const Text('Chọn ảnh đánh giá',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                      color: _primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.camera_alt_rounded, color: _primaryColor),
                ),
                title: const Text('Chụp ảnh',
                    style: TextStyle(fontWeight: FontWeight.w500)),
                subtitle: const Text('Mở camera để chụp ảnh mới'),
                onTap: () { Navigator.pop(context); _pickImage(ImageSource.camera); },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                      color: Colors.purple.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.photo_library_rounded, color: Colors.purple),
                ),
                title: const Text('Thư viện ảnh',
                    style: TextStyle(fontWeight: FontWeight.w500)),
                subtitle: const Text('Chọn ảnh từ thiết bị'),
                onTap: () { Navigator.pop(context); _pickImage(ImageSource.gallery); },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _imagePicker.pickImage(
        source: source, maxWidth: 1024, maxHeight: 1024, imageQuality: 85,
      );
      if (picked != null && _selectedImages.length < _maxImages) {
        setState(() => _selectedImages.add(File(picked.path)));
      }
    } catch (e) {
      if (mounted) {
        _showSnack(
          source == ImageSource.camera
              ? 'Không thể mở camera. Vui lòng kiểm tra quyền truy cập.'
              : 'Không thể truy cập thư viện ảnh.',
          Colors.red,
        );
      }
    }
  }

  void _removeImage(int index) => setState(() => _selectedImages.removeAt(index));

  // ─── BUILD ──────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    if (_isLoadingReviews) {
      return Scaffold(
        backgroundColor: Colors.grey[50],
        appBar: _buildAppBar(),
        body: const LoadingWidget(),
      );
    }

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: _buildAppBar(),
      body: SingleChildScrollView(
        child: Column(
          children: [
            if (_totalProducts > 1) _buildProgressBar(),
            _buildProductInfo(),
            const SizedBox(height: 12),
            // ── Branching: already reviewed -> view-only, not yet -> form ──
            if (_isViewMode)
              _existingReviews.containsKey(_currentItem.productId)
                  ? _buildExistingReviewCard(_existingReviews[_currentItem.productId]!)
                  : const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
            else ...[
              _buildRatingSection(),
              const SizedBox(height: 12),
              _buildCommentSection(),
              const SizedBox(height: 12),
              _buildImageSection(),
            ],
            const SizedBox(height: 100),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  AppBar _buildAppBar() {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios, color: Colors.black87),
        onPressed: () => Navigator.pop(context),
      ),
      title: Text(
        _isViewMode
            ? 'Đánh giá của bạn'
            : _totalProducts > 1
                ? 'Đánh giá (${_currentProductIndex + 1}/$_totalProducts)'
                : 'Đánh giá sản phẩm',
        style: const TextStyle(
            color: Colors.black87, fontSize: 18, fontWeight: FontWeight.w600),
      ),
    );
  }

  // ─── PROGRESS BAR ──────────────────────────────────────────────────────
  Widget _buildProgressBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Row(
        children: List.generate(_totalProducts, (i) {
          final item = widget.order.orderItems[i];
          final isReviewed = widget.order.isRated || _existingReviews.containsKey(item.productId);
          final hasNewData = (_reviewData[item.productId]?['rating'] as int? ?? 0) > 0;
          final isCurrent = i == _currentProductIndex;
          return Expanded(
            child: Container(
              margin: EdgeInsets.only(right: i < _totalProducts - 1 ? 6 : 0),
              height: 5,
              decoration: BoxDecoration(
                color: isReviewed
                    ? Colors.green
                    : isCurrent
                        ? _primaryColor
                        : hasNewData
                            ? _primaryColor.withValues(alpha: 0.5)
                            : Colors.grey[300],
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          );
        }),
      ),
    );
  }

  // ─── PRODUCT INFO ────────────────────────────────────────────────
  Widget _buildProductInfo() {
    final item = _currentItem;
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.network(
              item.variant.colorImage,
              width: 72, height: 72, fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                width: 72, height: 72,
                color: Colors.grey[200],
                child: const Icon(Icons.image, color: Colors.grey),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  maxLines: 2, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(6)),
                  child: Text(
                    '${item.variant.color} · ${item.variant.size}',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── VIEW-ONLY CARD (already reviewed) ─────────────────────────────────────────
  Widget _buildExistingReviewCard(ReviewModel review) {
    final ratingLabels = ['', 'Rất tệ', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Tuyệt vời'];
    final date = review.createdAt != null
        ? DateHelper.formatDateTime(review.createdAt)
        : '';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 0),
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ──
          Container(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.grey[100]!)),
            ),
            child: Row(
              children: [
                const Icon(Icons.star_rounded, color: _starActiveColor, size: 20),
                const SizedBox(width: 6),
                const Text('Đánh giá của bạn',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                const Spacer(),
                Text(date,
                    style: TextStyle(fontSize: 12, color: Colors.grey[500])),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Sao + label ──
                Row(
                  children: [
                    Row(
                      children: List.generate(5, (i) => Icon(
                        i < review.rating
                            ? Icons.star_rounded
                            : Icons.star_outline_rounded,
                        size: 28,
                        color: i < review.rating
                            ? _starActiveColor
                            : _starInactiveColor,
                      )),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _getRatingColor(review.rating)
                            .withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        ratingLabels[review.rating],
                        style: TextStyle(
                          color: _getRatingColor(review.rating),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // ── Comment ──
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[200]!),
                  ),
                  child: Text(
                    review.comment,
                    style: const TextStyle(fontSize: 14, height: 1.5),
                  ),
                ),

                // ── Image (if any) ──
                if (review.images.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  SizedBox(
                    height: 100,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: review.images.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (_, i) => GestureDetector(
                        onTap: () => _showFullImage(review.images[i]),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.network(
                            review.images[i],
                            width: 100, height: 100, fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              width: 100, height: 100,
                              color: Colors.grey[200],
                              child: const Icon(Icons.broken_image,
                                  color: Colors.grey),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showFullImage(String url) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        child: GestureDetector(
          onTap: () => Navigator.pop(context),
          child: InteractiveViewer(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(url, fit: BoxFit.contain),
            ),
          ),
        ),
      ),
    );
  }

  // ─── SELECT STARS ───────────────────────────────────────────────────────────
  Widget _buildRatingSection() {
    const ratingLabels = ['', 'Rất tệ', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Tuyệt vời'];
    final rating = _currentRating;
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      child: Column(
        children: [
          const Text('Bạn cảm thấy sản phẩm thế nào?',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) {
              final star = i + 1;
              return GestureDetector(
                onTap: () => _setRating(star),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: Icon(
                    star <= rating
                        ? Icons.star_rounded
                        : Icons.star_outline_rounded,
                    size: 48,
                    color: star <= rating ? _starActiveColor : _starInactiveColor,
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 12),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 200),
            child: rating > 0
                ? Container(
                    key: ValueKey(rating),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: _getRatingColor(rating).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      ratingLabels[rating],
                      style: TextStyle(
                        color: _getRatingColor(rating),
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  )
                : const SizedBox(
                    key: ValueKey(0),
                    height: 32,
                    child: Center(
                      child: Text('Chạm để đánh giá',
                          style: TextStyle(color: Colors.grey)),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Color _getRatingColor(int rating) {
    switch (rating) {
      case 1: return Colors.red;
      case 2: return Colors.deepOrange;
      case 3: return Colors.orange;
      case 4: return Colors.lightGreen;
      case 5: return Colors.green;
      default: return Colors.grey;
    }
  }

  // ─── COMMENT ───────────────────────────────────────────────────────────
  Widget _buildCommentSection() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.edit_note_rounded, size: 22, color: _primaryColor),
              SizedBox(width: 8),
              Text('Nhận xét của bạn',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _commentController,
            maxLines: 4, maxLength: 500,
            textInputAction: TextInputAction.done,
            decoration: InputDecoration(
              hintText: 'Chia sẻ trải nghiệm của bạn về sản phẩm này...',
              hintStyle: TextStyle(color: Colors.grey[400]),
              filled: true, fillColor: Colors.grey[50],
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: Colors.grey[300]!),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: Colors.grey[300]!),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: _primaryColor, width: 1.5),
              ),
              contentPadding: const EdgeInsets.all(14),
            ),
          ),
        ],
      ),
    );
  }

  // ─── SELECT IMAGE ───────────────────────────────────────────────────────────
  Widget _buildImageSection() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.camera_alt_rounded, size: 22, color: _primaryColor),
              const SizedBox(width: 8),
              const Text('Thêm hình ảnh',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const Spacer(),
              Text('${_selectedImages.length}/$_maxImages',
                  style: TextStyle(fontSize: 13, color: Colors.grey[500])),
            ],
          ),
          const SizedBox(height: 4),
          Text('Thêm ảnh thực tế giúp người mua khác tham khảo (tùy chọn)',
              style: TextStyle(fontSize: 12, color: Colors.grey[500])),
          const SizedBox(height: 14),
          SizedBox(
            height: 110,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                if (_selectedImages.length < _maxImages)
                  GestureDetector(
                    onTap: _showImagePickerOptions,
                    child: Container(
                      width: 110, height: 110,
                      margin: const EdgeInsets.only(right: 10),
                      decoration: BoxDecoration(
                        border: Border.all(
                            color: _primaryColor.withValues(alpha: 0.4),
                            width: 1.5),
                        borderRadius: BorderRadius.circular(14),
                        color: _primaryColor.withValues(alpha: 0.04),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_a_photo_rounded, size: 32,
                              color: _primaryColor.withValues(alpha: 0.7)),
                          const SizedBox(height: 6),
                          Text('Thêm ảnh',
                              style: TextStyle(
                                  fontSize: 12,
                                  color: _primaryColor.withValues(alpha: 0.8),
                                  fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ),
                  ),
                ..._selectedImages.asMap().entries.map((entry) => Container(
                  width: 110, height: 110,
                  margin: const EdgeInsets.only(right: 10),
                  child: Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.file(entry.value,
                            width: 110, height: 110, fit: BoxFit.cover),
                      ),
                      Positioned(
                        top: 4, right: 4,
                        child: GestureDetector(
                          onTap: () => _removeImage(entry.key),
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.6),
                                shape: BoxShape.circle),
                            child: const Icon(Icons.close_rounded,
                                size: 16, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                )),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── BOTTOM BAR ─────────────────────────────────────────────────────────
  Widget _buildBottomBar() {
    // If all reviewed -> only show Close button at the last product
    final allReviewed = _isViewMode;
    final bool needsNext = !_isLastProduct;

    // Any unreviewed products?
    final hasUnreviewed = !_isViewMode;

    return Container(
      padding: EdgeInsets.only(
        left: 16, right: 16, top: 12,
        bottom: MediaQuery.of(context).padding.bottom + 12,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
              color: Colors.grey.withValues(alpha: 0.15),
              blurRadius: 10,
              offset: const Offset(0, -2)),
        ],
      ),
      child: Row(
        children: [
          // Back button
          if (_currentProductIndex > 0) ...[
            Expanded(
              child: OutlinedButton(
                onPressed: _goToPreviousProduct,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.grey[700],
                  side: BorderSide(color: Colors.grey[300]!),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.arrow_back_ios_rounded, size: 16),
                    SizedBox(width: 4),
                    Text('Quay lại',
                        style: TextStyle(fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
          ],

          // Main button
          Expanded(
            child: (allReviewed && _isLastProduct)
                // At last product, all reviewed -> Close
                ? ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey[100],
                      foregroundColor: Colors.grey[700],
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Đóng',
                        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                  )
                : ElevatedButton(
                    onPressed: _isSubmitting
                        ? null
                        : needsNext
                            ? _goToNextProduct
                            : hasUnreviewed
                                ? _submitAllReviews
                                : () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: needsNext || hasUnreviewed
                          ? _primaryColor
                          : Colors.grey[100],
                      foregroundColor: needsNext || hasUnreviewed
                          ? Colors.white
                          : Colors.grey[700],
                      disabledBackgroundColor:
                          _primaryColor.withValues(alpha: 0.5),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            height: 20, width: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2.5, color: Colors.white),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                needsNext
                                    ? Icons.arrow_forward_ios_rounded
                                    : hasUnreviewed
                                        ? Icons.send_rounded
                                        : Icons.check_rounded,
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                needsNext
                                    ? 'Tiếp theo'
                                    : hasUnreviewed
                                        ? 'Gửi đánh giá'
                                        : 'Đóng',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600, fontSize: 15),
                              ),
                            ],
                          ),
                  ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }
}
