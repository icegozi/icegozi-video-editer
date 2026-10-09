export class AssistantError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
  }
}

const messages: Record<string, string> = {
  cancelled: 'Đăng nhập hoặc tác vụ đã bị hủy.',
  callback_port_unavailable: 'Cổng callback bận. Đóng bản app khác và thử lại.',
  sign_in_required: 'Hãy đăng nhập ChatGPT để tiếp tục.',
  sharing_not_enabled: 'Đã đăng nhập nhưng chưa cấp quyền dùng gói. Quản lý kết nối trong ChatGPT rồi đăng nhập lại.',
  storage_encryption_unavailable: 'Không có kho credential an toàn. MVP cần Windows DPAPI.',
  subscription_sharing_user_not_eligible: 'Tài khoản hoặc workspace chưa đủ điều kiện dùng gói qua SIWC.',
  subscription_sharing_usage_limit_exceeded: 'Đã hết hạn mức. Xem usage trong ChatGPT rồi thử lại khi phù hợp.',
  subscription_sharing_usage_unavailable: 'Chưa kiểm tra được hạn mức. Giữ draft và thử lại sau.',
  model_not_found: 'Model chưa được phép. Tải lại danh sách hoặc chọn model khác.',
  revocation_failed: 'Đã xóa credential local; chưa xác nhận thu hồi từ xa. Ngắt kết nối app trong ChatGPT Settings.',
  invalid_id_token: 'Không xác minh được danh tính. Hãy đăng nhập lại.',
  access_denied: 'Bạn chưa đồng ý đăng nhập/cấp quyền. Có thể thử lại.',
  network_error: 'Mất kết nối OpenAI. Kiểm tra mạng rồi thử lại.',
};

export function safeAssistantError(error: unknown): { code: string; message: string; status: number } {
  if (error instanceof AssistantError) return { code: error.code, message: error.message, status: error.status };
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'assistant_error';
  return { code, message: messages[code] ?? 'Không thể hoàn tất. Kiểm tra phiên đăng nhập/runtime và thử lại; project được giữ nguyên.', status: 400 };
}
