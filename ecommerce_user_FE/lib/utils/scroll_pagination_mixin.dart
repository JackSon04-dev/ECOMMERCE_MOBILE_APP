import 'package:flutter/material.dart';

/// 📜 Mixin dùng chung giúp tối giản hóa việc khởi tạo, giải phóng ScrollController
/// và tự động phát hiện khi cuộn trang đạt tới ngưỡng 90% để kích hoạt phân trang (load more).
mixin ScrollPaginationMixin<T extends StatefulWidget> on State<T> {
  late final ScrollController scrollController;

  /// Phương thức callback này sẽ được kích hoạt khi người dùng cuộn đạt ngưỡng 90%
  void onScrollThresholdReached();

  @override
  void initState() {
    super.initState();
    scrollController = ScrollController();
    scrollController.addListener(_scrollListener);
  }

  void _scrollListener() {
    if (scrollController.position.pixels >= scrollController.position.maxScrollExtent * 0.9) {
      onScrollThresholdReached();
    }
  }

  @override
  void dispose() {
    scrollController.dispose();
    super.dispose();
  }
}
