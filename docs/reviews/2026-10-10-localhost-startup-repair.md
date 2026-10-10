# Code Review: `master` → `master` — localhost startup repair

**Phạm vi:** `scripts/dev.ts`, `tests/unit/dev-server.test.ts`, memory và khôi phục tiến trình local. Các thay đổi tính năng/tài liệu đang có được giữ nguyên.
**Tóm tắt:** cổng 3200 thuộc tiến trình Vite của đúng repository, nhưng chỉ HTML/API hoạt động. `/@vite/client`, `/@react-refresh`, `/src/editor/main.tsx` trả `504 Outdated Request`, tương ứng `ERR_CLOSED_SERVER` trong Vite. Điều kiện chỉ kiểm tra HTML khiến launcher nhận nhầm server này là khỏe. Chưa xác định tác nhân đầu tiên khiến Vite đóng môi trường transform; không suy đoán đó là lỗi API key.
**Kết luận:** READY TO MERGE cho patch kiểm tra startup trong phạm vi này.

## 1. Critical issues

Không còn issue phát hiện trong patch. Trang trắng của tiến trình local đã được khôi phục.

## 2. Important issues

I1 — FIXED: `existingDevServer` trước đây trả URL ngay khi HTML có fingerprint hợp lệ, dù JavaScript đang lỗi 504. Nay kiểm tra thêm Vite client và editor entry: HTTP thành công, MIME JavaScript và body không rỗng. Server không khỏe được báo cần restart; launcher không tự kill tiến trình hoặc đổi port.

## 3. Minor improvements

Không phát hiện trong phạm vi patch.

## 4. Test cases cần thêm

Đã thêm hai regression cases cho từng JavaScript endpoint trả `504 Outdated Request` trong khi HTML vẫn 200 và đúng fingerprint. Fixture healthy trả JavaScript thật theo MIME, không bỏ kiểm tra foreign-project/cold-start/port validation đang có.

- `tests/unit/dev-server.test.ts`: 14 passed.
- `npm run typecheck`: PASS.
- Browser trên cổng 3200: editor và scene panel hiển thị; không page errors, failed requests hoặc HTTP lỗi. Một status poll đang chờ tại thời điểm chụp là request định kỳ của app.
- `npm run dev`: reuse đúng server đã khôi phục, exit 0.
- `git diff --check`: PASS.

## 5. Patch tối thiểu

Patch đã áp dụng: kiểm tra hai module trước khi reuse và thông báo riêng cho server đúng repository nhưng JavaScript không hoạt động. Memory ghi nhận HTML 200 không đủ làm health check.

Chỉ dừng PID đã xác minh command line thuộc dev server của repository và không có child worker đang chạy, rồi khởi động lại trên cổng 3200. Không sửa database, project, assets hoặc credentials. Có các bản ghi render `rendering` cũ trong database nhưng không có child worker tương ứng; không sửa chúng ngoài phạm vi yêu cầu này.

Evidence: `build/evidence/scene-generation/localhost-3200-investigation.png`, `localhost-3200-fixed.png`; startup logs dưới `build/review/localhost-startup/`.
