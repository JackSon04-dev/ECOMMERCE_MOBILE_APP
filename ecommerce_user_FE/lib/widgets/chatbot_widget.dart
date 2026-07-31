import 'package:flutter/material.dart';
import '../utils/currency_helper.dart';
import '../services/chatbot_service.dart';
import '../screens/user/products/product_detail_page.dart';

class ChatbotWidget extends StatefulWidget {
  const ChatbotWidget({super.key});

  @override
  State<ChatbotWidget> createState() => _ChatbotWidgetState();
}

class _ChatbotWidgetState extends State<ChatbotWidget> {
  final TextEditingController _controller = TextEditingController();
  final List<ChatMessage> _messages = [];
  bool _isLoading = false;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    // First greeting
    _messages.add(
      ChatMessage(
        text: 'Chào bạn! Shop em sẵn sàng tìm kiếm sản phẩm theo ý bạn (VD: "Áo thun đen giảm 30% giá dưới 200k"). Bạn cần tìm gì ạ?',
        isUser: false,
      ),
    );
  }

  void _sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    bool isFirstChat = _messages.length == 1; // Only greeting exists

    setState(() {
      _messages.add(ChatMessage(text: text, isUser: true));
      _isLoading = true;
    });
    _controller.clear();
    
    if (!isFirstChat) {
      _scrollToBottom();
    }

    final response = await ChatbotService.sendMessage(text);

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (response != null) {
          _messages.add(
            ChatMessage(
              text: response.reply,
              isUser: false,
              products: response.products,
              sessionId: response.sessionId,
              queryMessage: text,
              page: response.page,
              hasMore: response.hasMore,
            ),
          );
        } else {
          _messages.add(
            ChatMessage(
              text: 'Dạ, hệ thống đang bận hoặc chưa tìm thấy sản phẩm phù hợp. Bạn thử mô tả chi tiết hơn nhé!',
              isUser: false,
            ),
          );
        }
      });
    }
  }

  void _loadMore(int messageIndex) async {
    final msg = _messages[messageIndex];
    if (msg.sessionId == null || msg.isLoadingMore) return;

    setState(() {
      _messages[messageIndex] = msg.copyWith(isLoadingMore: true);
    });

    final nextPage = msg.page + 1;
    final response = await ChatbotService.loadMore(
      sessionId: msg.sessionId!,
      page: nextPage,
      queryMessage: msg.queryMessage,
    );

    if (mounted) {
      setState(() {
        if (response != null && response.products.isNotEmpty) {
          final updatedProducts = List<ChatProduct>.from(msg.products)..addAll(response.products);
          _messages[messageIndex] = msg.copyWith(
            products: updatedProducts,
            page: response.page,
            hasMore: response.hasMore,
            isLoadingMore: false,
          );
        } else {
          _messages[messageIndex] = msg.copyWith(
            hasMore: false,
            isLoadingMore: false,
          );
        }
      });
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(color: Colors.greenAccent, shape: BoxShape.circle),
                ),
                const SizedBox(width: 10),
                const Text('S-Shop AI Assistant', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white),
                  onPressed: () => Navigator.pop(context),
                )
              ],
            ),
          ),
          // Message list
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length + (_isLoading ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == _messages.length) {
                  return const Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: EdgeInsets.all(8.0),
                      child: CircularProgressIndicator(),
                    ),
                  );
                }

                final msg = _messages[index];
                if (index == 0 && !msg.isUser) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildMessageBubble(msg, index),
                      _buildQuickReplies(),
                      const SizedBox(height: 12),
                    ],
                  );
                }
                return _buildMessageBubble(msg, index);
              },
            ),
          ),
          // Text input box
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Colors.grey[200]!))),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: 'Nhập yêu cầu (VD: Áo thun đen sale 30%)...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide(color: Colors.grey[300]!)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                    onSubmitted: _sendMessage,
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: Theme.of(context).primaryColor,
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white, size: 20),
                    onPressed: () => _sendMessage(_controller.text),
                  ),
                )
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage msg, int msgIndex) {
    if (msg.isUser) {
      return Align(
        alignment: Alignment.centerRight,
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: Theme.of(context).primaryColor,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(16),
              topRight: Radius.circular(16),
              bottomLeft: Radius.circular(16),
            ),
          ),
          child: Text(msg.text, style: const TextStyle(color: Colors.white)),
        ),
      );
    }

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        width: MediaQuery.of(context).size.width * 0.85,
        margin: const EdgeInsets.only(bottom: 12, right: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
              ),
              child: Text(msg.text, style: const TextStyle(color: Colors.black87)),
            ),
            if (msg.products.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(top: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                        childAspectRatio: 0.68,
                      ),
                      itemCount: msg.products.length,
                      itemBuilder: (context, idx) {
                        final product = msg.products[idx];
                        return GestureDetector(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => ProductDetailPage(productId: product.id),
                              ),
                            );
                          },
                          child: Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey[300]!),
                              borderRadius: BorderRadius.circular(8),
                              color: Colors.white,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Stack(
                                  children: [
                                    ClipRRect(
                                      borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                                      child: Image.network(
                                        product.thumbnail.isNotEmpty ? product.thumbnail : 'https://via.placeholder.com/150',
                                        height: 120,
                                        width: double.infinity,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => const Icon(Icons.image, size: 100, color: Colors.grey),
                                      ),
                                    ),
                                    if (product.discount > 0)
                                      Positioned(
                                        top: 4,
                                        left: 4,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: Colors.red,
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            '-${product.discount.toInt()}%',
                                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(6.0),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        product.name,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, height: 1.2),
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          const Icon(Icons.star, size: 12, color: Colors.amber),
                                          const SizedBox(width: 2),
                                          Text(
                                            product.averageRating.toStringAsFixed(1),
                                            style: const TextStyle(fontSize: 10, color: Colors.grey),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        product.finalPrice.toVND(),
                                        style: const TextStyle(fontSize: 12, color: Color(0xFFFF6B35), fontWeight: FontWeight.bold),
                                      ),
                                      if (product.discount > 0)
                                        Text(
                                          product.price.toVND(),
                                          style: const TextStyle(fontSize: 10, color: Colors.grey, decoration: TextDecoration.lineThrough),
                                        ),
                                    ],
                                  ),
                                )
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 12),
                    if (msg.hasMore)
                      if (msg.page >= 5)
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.orange.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.orange.shade200),
                          ),
                          child: Column(
                            children: [
                              const Text(
                                '💡 Bạn đã xem khá nhiều rồi. Hãy thử mô tả chi tiết hơn (màu sắc, khoảng giá...) để shop lọc chuẩn hơn nhé!',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 12, color: Colors.black87),
                              ),
                              const SizedBox(height: 8),
                              SizedBox(
                                width: double.infinity,
                                child: OutlinedButton(
                                  onPressed: msg.isLoadingMore ? null : () => _loadMore(msgIndex),
                                  style: OutlinedButton.styleFrom(
                                    side: BorderSide(color: Theme.of(context).primaryColor),
                                    foregroundColor: Theme.of(context).primaryColor,
                                  ),
                                  child: msg.isLoadingMore 
                                      ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2)) 
                                      : const Text('Vẫn tải thêm sản phẩm'),
                                ),
                              )
                            ],
                          ),
                        )
                      else
                        Center(
                          child: TextButton.icon(
                            onPressed: msg.isLoadingMore ? null : () => _loadMore(msgIndex),
                            icon: msg.isLoadingMore 
                                ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                : Icon(Icons.keyboard_arrow_down, color: Theme.of(context).primaryColor),
                            label: Text(
                              'Xem thêm sản phẩm',
                              style: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold),
                            ),
                          ),
                        )
                    else
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8.0),
                          child: Text(
                            'Đã hiển thị toàn bộ sản phẩm phù hợp',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontStyle: FontStyle.italic),
                          ),
                        ),
                      )
                  ],
                ),
              )
          ],
        ),
      ),
    );
  }

  Widget _buildQuickReplies() {
    return Padding(
      padding: const EdgeInsets.only(left: 16, top: 4, bottom: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: ['Áo thun đen dưới 200k', 'Áo sơ mi nam sale', 'Quần jean chất lượng'].map((text) => 
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ActionChip(
                label: Text(text, style: const TextStyle(fontSize: 12)),
                onPressed: () => _sendMessage(text),
                backgroundColor: Colors.white,
                side: BorderSide(color: Theme.of(context).primaryColor, width: 0.8),
                labelStyle: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                visualDensity: VisualDensity.compact,
              ),
            )
          ).toList(),
        ),
      ),
    );
  }
}
