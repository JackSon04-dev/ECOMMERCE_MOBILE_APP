import 'package:flutter/material.dart';

/// 📜 Shared Mixin helping to simplify initialization, freeing ScrollController
/// and auto detect when scroll reaches 90% threshold to trigger pagination (load more).
mixin ScrollPaginationMixin<T extends StatefulWidget> on State<T> {
  late final ScrollController scrollController;

  /// This callback method is triggered when user scrolls to 90% threshold
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
