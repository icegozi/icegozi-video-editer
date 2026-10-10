# Code Review: `master` → `master` — Gemini API key format

**Phạm vi:** validation key, form Google/Gemini, regression tests và cập nhật portable hiện có. Giữ nguyên dữ liệu/kết nối thật và các thay đổi song song.
**Tóm tắt:** regex cũ `^[A-Za-z0-9_-]+$` cấm dấu chấm nên từ chối authorization key dạng `AQ.…` trước khi gọi Google. Quy tắc chung mới cho phép dấu chấm ở cả form và backend, đồng thời báo lỗi key/budget cụ thể và lấy chuỗi key từ dấu nháy hoặc một dòng header. Không lấy hoặc gửi key thật của người dùng để thử nghiệm.
**Nguồn:** [mã Google nhận diện key AQ](https://github.com/google-gemini/gemini-skills/blob/main/skills/gemini-omni-flash-api/scripts/video/generate_video.py), [Google API key modes](https://ai.google.dev/gemini-api/docs/api-key).

## 1. Critical issues

Không còn phát hiện trong patch. Tiếp tục chặn ký tự điều khiển/whitespace, giới hạn độ dài và gửi key bằng header ở backend, không đưa vào URL/tool outputs/logs. Format được chấp nhận không chứng minh quyền API/quota.

## 2. Important issues

- I1 — FIXED: frontend/backend regex không nhận `AQ.`. Shared pattern cho phép `[A-Za-z0-9_.-]`, schema lưu trữ cũng nhận dấu chấm để đọc lại credentials sau restart.
- I2 — FIXED: lỗi cấu hình chung khiến người dùng không biết key hay budget bị sai. Form báo lỗi ngay tại ô key, không gửi invalid input; backend trả thông báo cụ thể mà không echo secret. Cấu hình hiện hành không bị thay đổi khi validation thất bại.

## 3. Minor improvements

Dán một dòng `X-goog-api-key` hoặc key kèm dấu nháy được chuẩn hóa. Không thực thi hoặc nhận nguyên lệnh curl, không sửa nội dung bên trong token và không đổi cách xác thực OAuth.

## 4. Test cases cần thêm

Đã thực hiện:

- 16 unit cases: `AIza`/`AQ.`, dấu nháy/header, placeholder, ký tự ẩn, CRLF, full curl và độ dài.
- 9 integration cases: cấu hình/đọc lại/lưu mã hóa/version, lỗi không lộ key, OAuth/AQ headers và bounded image result; không gọi Google thật.
- UI: lưu key AQ, invalid key không tạo configure request, xử lý paste header, xóa/thay key, OAuth và các luồng tạo cảnh hiện hành — PASS.
- TypeScript và build production — PASS.
- Portable `ICEGOZI-Video-win32-x64-1791641924764`: checker exit 0, gồm configure key AQ fixture qua bridge production, lưu/đọc lại bằng Windows DPAPI thật, không có key trong public status; native tools, UI và render MP4 cũng PASS. Log: `build/review/scene-generation/packaged-aq-key-check.log`.

## 5. Patch tối thiểu

Patches đã áp dụng trong `src/shared/geminiApiKey.ts`, `googleOAuth.ts` và `GoogleConnectionDialog.tsx`; giữ endpoints, DPAPI, budgets và generation approval hiện hành. Portable dùng lại runtime/dependencies đã kiểm chứng, cập nhật frontend/backend/source tương ứng. Checker dùng key AQ fixture trong thư mục tạm riêng để kiểm tra DPAPI, không ghi đè kết nối của người dùng.
