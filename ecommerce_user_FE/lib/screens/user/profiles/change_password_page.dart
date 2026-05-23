import 'package:flutter/material.dart';
import '../../../services/user_service.dart';

/// 🔒 Change Password Page - Trang đổi mật khẩu
class ChangePasswordPage extends StatefulWidget {
  const ChangePasswordPage({super.key});

  @override
  State<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends State<ChangePasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isLoading = false;
  bool _obscureCurrentPassword = true;
  bool _obscureNewPassword = true;
  bool _obscureConfirmPassword = true;

  String? _currentPasswordError;
  String? _newPasswordError;
  String? _confirmPasswordError;

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  /// Validate form trước khi submit
  bool _validateForm() {
    setState(() {
      _currentPasswordError = null;
      _newPasswordError = null;
      _confirmPasswordError = null;
    });

    bool isValid = true;

    // Validate current password
    if (_currentPasswordController.text.isEmpty) {
      setState(() => _currentPasswordError = 'Vui lòng nhập mật khẩu hiện tại');
      isValid = false;
    }

    // Validate new password
    if (_newPasswordController.text.isEmpty) {
      setState(() => _newPasswordError = 'Vui lòng nhập mật khẩu mới');
      isValid = false;
    } else if (_newPasswordController.text.length < 6) {
      setState(() => _newPasswordError = 'Mật khẩu phải có ít nhất 6 ký tự');
      isValid = false;
    } else if (_newPasswordController.text == _currentPasswordController.text) {
      setState(() => _newPasswordError = 'Mật khẩu mới không được trùng với mật khẩu cũ');
      isValid = false;
    }

    // Validate confirm password
    if (_confirmPasswordController.text.isEmpty) {
      setState(() => _confirmPasswordError = 'Vui lòng xác nhận mật khẩu mới');
      isValid = false;
    } else if (_confirmPasswordController.text != _newPasswordController.text) {
      setState(() => _confirmPasswordError = 'Mật khẩu xác nhận không khớp');
      isValid = false;
    }

    return isValid;
  }

  /// Handle change password
  Future<void> _handleChangePassword() async {
    // Clear previous errors
    setState(() {
      _currentPasswordError = null;
      _newPasswordError = null;
      _confirmPasswordError = null;
    });

    // Validate form
    if (!_validateForm()) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      final success = await UserService.changePassword(
        currentPassword: _currentPasswordController.text,
        newPassword: _newPasswordController.text,
      );

      if (!mounted) return;

      if (success) {
        // Show success dialog
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green, size: 28),
                SizedBox(width: 12),
                Text('Thành công'),
              ],
            ),
            content: const Text(
              'Mật khẩu đã được thay đổi thành công!\n\nVui lòng đăng nhập lại với mật khẩu mới.',
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context); // Close dialog
                  Navigator.pop(context); // Close change password page
                },
                child: const Text('Đóng'),
              ),
            ],
          ),
        );
      } else {
        // Show generic error
        setState(() {
          _currentPasswordError = 'Đổi mật khẩu thất bại. Vui lòng thử lại.';
        });
      }
    } catch (e) {
      if (!mounted) return;

      // Parse error message
      String errorMessage = e.toString();

      if (errorMessage.contains('Sai mật khẩu') ||
          errorMessage.contains('Wrong password') ||
          errorMessage.contains('Incorrect password') ||
          errorMessage.contains('400')) {
        setState(() {
          _currentPasswordError = 'Mật khẩu hiện tại không đúng';
        });
      } else if (errorMessage.contains('401') || errorMessage.contains('Unauthorized')) {
        setState(() {
          _currentPasswordError = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
        });
      } else if (errorMessage.contains('Network') || errorMessage.contains('Connection')) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Lỗi kết nối mạng. Vui lòng kiểm tra internet.'),
            backgroundColor: Colors.red,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Lỗi: $errorMessage'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Đổi mật khẩu',
          style: TextStyle(
            color: Colors.black87,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 8),

                // Info card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.blue[50],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.blue[200]!),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, color: Colors.blue[700], size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Mật khẩu phải có ít nhất 6 ký tự và không được trùng với mật khẩu cũ.',
                          style: TextStyle(
                            color: Colors.blue[900],
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Current password field
                _buildPasswordField(
                  controller: _currentPasswordController,
                  label: 'Mật khẩu hiện tại',
                  obscureText: _obscureCurrentPassword,
                  onToggleVisibility: () {
                    setState(() => _obscureCurrentPassword = !_obscureCurrentPassword);
                  },
                  errorText: _currentPasswordError,
                  icon: Icons.lock_outline,
                ),

                const SizedBox(height: 20),

                // New password field
                _buildPasswordField(
                  controller: _newPasswordController,
                  label: 'Mật khẩu mới',
                  obscureText: _obscureNewPassword,
                  onToggleVisibility: () {
                    setState(() => _obscureNewPassword = !_obscureNewPassword);
                  },
                  errorText: _newPasswordError,
                  icon: Icons.lock_reset,
                  onChanged: (value) {
                    // Real-time validation
                    if (_currentPasswordError != null || _newPasswordError != null) {
                      _validateForm();
                    }
                  },
                ),

                const SizedBox(height: 20),

                // Confirm password field
                _buildPasswordField(
                  controller: _confirmPasswordController,
                  label: 'Xác nhận mật khẩu mới',
                  obscureText: _obscureConfirmPassword,
                  onToggleVisibility: () {
                    setState(() => _obscureConfirmPassword = !_obscureConfirmPassword);
                  },
                  errorText: _confirmPasswordError,
                  icon: Icons.verified_user,
                  onChanged: (value) {
                    // Real-time validation
                    if (_confirmPasswordError != null) {
                      _validateForm();
                    }
                  },
                ),

                const SizedBox(height: 32),

                // Change password button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _handleChangePassword,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFF6B35),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Text(
                            'Đổi mật khẩu',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),

                const SizedBox(height: 16),

                // Security tips
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[200]!),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.security, color: Colors.grey[700], size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'Gợi ý bảo mật',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey[800],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildSecurityTip('Sử dụng mật khẩu mạnh, khó đoán'),
                      _buildSecurityTip('Kết hợp chữ hoa, chữ thường và số'),
                      _buildSecurityTip('Không chia sẻ mật khẩu cho người khác'),
                      _buildSecurityTip('Thay đổi mật khẩu định kỳ'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPasswordField({
    required TextEditingController controller,
    required String label,
    required bool obscureText,
    required VoidCallback onToggleVisibility,
    String? errorText,
    required IconData icon,
    ValueChanged<String>? onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: obscureText,
          onChanged: onChanged,
          decoration: InputDecoration(
            hintText: 'Nhập $label',
            prefixIcon: Icon(icon, color: const Color(0xFFFF6B35)),
            suffixIcon: IconButton(
              icon: Icon(
                obscureText ? Icons.visibility_off : Icons.visibility,
                color: Colors.grey,
              ),
              onPressed: onToggleVisibility,
            ),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: errorText != null ? Colors.red : Colors.grey[300]!,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: errorText != null ? Colors.red : const Color(0xFFFF6B35),
                width: 2,
              ),
            ),
            errorText: errorText,
            errorMaxLines: 2,
          ),
        ),
      ],
    );
  }

  Widget _buildSecurityTip(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.check_circle, color: Colors.green[600], size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey[700],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

