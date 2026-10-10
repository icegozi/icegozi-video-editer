# Tạo cảnh bằng core ICEGOZI và ảnh Gemini

Core dựng hình, chữ và chuyển động vector tại máy rồi xuất PNG/MP4. Gemini cung cấp ảnh AI qua API key hoặc kết nối Google OAuth chính thức. LLM gọi namespace `video_editor` để lập yêu cầu; app quản lý duyệt, tác vụ, media, bản nháp và render. Không cần Runway hoặc ChatCut.

## Kết nối bằng Gemini API key

1. Tạo key mới trong [Google AI Studio](https://aistudio.google.com/apikey) cho project có quyền/quota tạo ảnh.
2. Trong ICEGOZI, mở **AI Studio → Kết nối Google / Gemini**, chọn **Gemini API key**.
3. Nhập key mới vào ô **Gemini API key**, đặt giới hạn ước tính chi phí và bấm **Lưu Gemini API key**. Ô nhập sẽ được xóa sau khi lưu; trạng thái chỉ báo đã cấu hình, chưa xác nhận quota.
4. Để thay key, mở lại hộp này, nhập key mới và lưu. Để xóa key khỏi app, bấm **Xóa Gemini API key**. Các yêu cầu đã lập bằng cấu hình cũ cần lập lại.

`YOUR_GEMINI_API_KEY` chỉ là placeholder, không phải key dùng được. App không lưu key ví dụ từ cuộc trò chuyện. Key được mã hóa bằng Windows current-user DPAPI, riêng theo profile, ngoài repository và bản đóng gói. Backend gửi header `x-goog-api-key` tới Google; không đưa key vào URL, browser localStorage hoặc tools của LLM. Không cần OAuth client/project ID riêng trong form này. [Hướng dẫn API key chính thức](https://ai.google.dev/gemini-api/docs/api-key)

Form nhận cả key cũ `AIza…` và authorization key mới `AQ.…` (giữ nguyên dấu chấm). Có thể dán key kèm dấu nháy hoặc một dòng header `X-goog-api-key`; app lấy riêng chuỗi key. Key thiếu, ký tự ẩn, khoảng trắng bên trong và giới hạn chi phí sai được báo cụ thể, không hiển thị lại key trong lỗi. Không dán cả lệnh curl. [Mã mẫu chính thức nhận diện key AQ của Google](https://github.com/google-gemini/gemini-skills/blob/main/skills/gemini-omni-flash-api/scripts/video/generate_video.py)

## Kết nối Google

1. Trong Google Cloud project của bạn, bật **Generative Language API** và cấu hình quyền/billing cần cho Gemini API.
2. Tạo OAuth consent screen, thêm tài khoản vào **Test users** nếu app đang Testing, rồi tạo OAuth client loại **Desktop app**. Tải JSON cấu hình của client.
3. Trong ICEGOZI, mở **AI Studio → Kết nối Google / Gemini**, chọn **Đăng nhập Google OAuth**. Nhập file JSON, kiểm tra project ID và giới hạn ước tính chi phí, rồi bấm **Lưu cấu hình Google**.
4. Bấm **Đăng nhập Google → Mở Google để chọn tài khoản và cấp quyền**. Hoàn tất trên trình duyệt và quay lại app.

Không nhập client secret/token vào chat. App lưu cấu hình và tokens bằng Windows current-user DPAPI ngoài repository/package. Kết nối lưu riêng theo profile AI Studio hiện hành; khi đổi profile ChatGPT, cấu hình/kết nối Google của profile cũ không tự được dùng cho profile mới.

Google đăng nhập và quyền/quota tạo ảnh là hai trạng thái riêng. OAuth dùng project Google Cloud cho Gemini API; không lấy cookie Gemini web hoặc tự dùng quyền của gói Gemini cá nhân. [Hướng dẫn OAuth chính thức](https://ai.google.dev/gemini-api/docs/oauth)

Catalog hiện dùng `gemini-3.1-flash-lite-image`, output 1K, một candidate và tối đa một ảnh tham chiếu. Model cũ `gemini-2.5-flash-image` đã được thông báo đóng ngày 02/10/2026. Quyền tài khoản/model và quota thật được xác định khi API phản hồi. [Models/pricing của Google](https://ai.google.dev/gemini-api/docs/pricing)

## Dùng tính năng

1. Bấm **Tạo cảnh**, chọn ảnh Gemini hoặc ảnh/video core ngang/dọc.
2. Với Gemini, viết mô tả và chọn ảnh tham chiếu nếu cần. Có thể **Nhập ảnh tham chiếu Gemini** dạng PNG/JPEG/WebP, tối đa 3 MiB; ảnh nhập vào thư viện, chưa thêm timeline.
3. Với core, chọn **Chữ lớn dần**, **Cáo ăn cỏ hoạt họa** hoặc dữ liệu scene JSON. LLM có thể dùng `list_scene_templates` và schema để tự mô tả hình/chuyển động mới.
4. Chọn thêm cuối timeline hoặc thay một cảnh, rồi **Lập yêu cầu tạo cảnh**. Xem cấu hình/ước tính và **Duyệt tạo cảnh**.
5. Khi media đã kiểm tra và đăng ký xong, bấm **Xem cảnh đã tạo → Tạo bản nháp cảnh → Duyệt & Áp dụng**. Một lần Apply tạo một undo entry; Ctrl+Z/Ctrl+Y dùng như các chỉnh sửa khác.
6. Xuất video qua chức năng preview/final đang có. Kết quả sinh media không tự áp dụng hoặc tự render cả dự án.

Ảnh Gemini là ảnh tĩnh. Clip core là hoạt họa vector có chuyển động; zoom một ảnh không tạo động tác của chủ thể. Core không bao gồm một model sinh video chân thực chạy local.

## Tools và bảo vệ dữ liệu

- `get_scene_generation_capabilities`, `list_scene_templates`, `list_registered_assets`.
- `plan_scene_generation`, `request_scene_generation`, `get_scene_generation_status`, `cancel_scene_generation`.
- Tools cũ `validate_project_change`, `propose_project_change`, preview/final render tiếp tục hoạt động. `list_project_assets` vẫn trả mảng keys; manifest mới có tool riêng và được bổ sung trong context.
- Kết quả native Code Mode là JSON string; workflow phải `JSON.parse` trước khi đọc fields.
- Scene graph là dữ liệu strict: nhóm, ellipse, rect, SVG path, text và keyframes. Không nhận JSX/JavaScript, URLs, external fonts hoặc commands từ LLM.
- LLM không được gọi route cấu hình API key/đăng nhập Google. OAuth dùng PKCE, state, nonce, loopback callback, kiểm tra JWT và token refresh; API key/secret/token không đưa vào tool outputs, browser persistence, URL hoặc logs.
- Assets mới có registry/grant theo profile/project, signature + probe + decode + hash và realpath containment. Server và reducer browser đều kiểm tra grant và thời lượng media.
- Apply mới dùng reserve/lease/ack: editor đổi trong lúc HTTP chờ thì giữ draft; hai tabs không cùng reserve. Endpoint consume cũ được giữ cho tương thích và không được frontend mới sử dụng.

## Chi phí, hủy và khôi phục

Core không có phí API. Gemini hiện reserve ước tính bảo thủ từ giới hạn input/output tokens, tính theo micro-USD. Đặt giới hạn từng tác vụ và tổng ước tính mỗi ngày trong cấu hình Google; kiểm tra spend/quota riêng trên Google Cloud.

Estimate là giới hạn gửi yêu cầu trong app theo bảng giá được lưu phiên bản, không phải cam kết hóa đơn hoặc spend cap của Google. Catalog giá xác minh 10/10/2026 và hết hiệu lực 10/11/2026; ảnh Gemini bị chặn lập plan khi giá cần cập nhật. [Giá Gemini API](https://ai.google.dev/gemini-api/docs/pricing)

Gemini generateContent trả ảnh trong một HTTP response, không có remote task ID để resume. Nếu mất phản hồi, app ghi `submission_unknown`/`cancellation_unknown`, giữ dấu vết và không tự gửi lại. Hủy local không xác nhận hoàn tiền hoặc ngăn provider đã nhận request tính phí.

Jobs/plans/grants lưu SQLite, tách khỏi render jobs. Khi app khởi động lại, tác vụ đang chạy chuyển interrupted/unknown và không tự phát lại. Core có nút dựng lại local; tạo lại Gemini phải là plan mới được duyệt. File đã promote mà transaction chưa hoàn tất được cách ly bằng journal và chưa được cấp grant; hiện không tự garbage-collect media nguồn hay tự nhận một orphan file là ready.

Một workspace chỉ có một backend sở hữu luồng tạo cảnh. Khóa có heartbeat được giữ cạnh SQLite để một bản app thứ hai hoặc một lần khởi động lỗi port không đánh dấu nhầm tác vụ của bản đang chạy. Dựng lại local dùng epoch hiện hành và thư mục riêng cho mỗi lần thử. Lưu token có khóa file và kiểm tra version để refresh cũ không ghi đè cấu hình/kết nối mới của một bản app khác.

## Windows portable

Chạy `Start ICEGOZI.cmd`. Backend Node, Codex/Code Mode host, Chrome, bộ scene core, skills và các binary decode/probe Remotion đi kèm. Dữ liệu ở `%LOCALAPPDATA%\icegozi-video\workspace`, kết nối ở `%LOCALAPPDATA%\icegozi-video\assistant\generation-auth`.

Local core không cần dịch vụ tạo media ngoài. Gemini cần Internet, API key hoặc OAuth client/project của bạn và quyền API. Package không chứa API key, OAuth client secret, tokens, `.env`, database hoặc lịch sử của người đóng gói. Khi mở package trên máy khác hoặc bằng Windows account khác, nhập key/cấu hình mới trong app.

Kiểm tra:

```text
npm run typecheck
npm test
npm run test:assistant-ui
npm run test:scene-ui
npm run build:app
npm run scene:check
npm run package:windows
```

Trong release:

```text
runtime\node.exe build\check-scene-generation.mjs
```

Checker dùng native Code Mode thật, core render thật, ảnh Gemini fixture và backend production, với PATH không có FFmpeg toàn cục. Fixtures không chứng minh đăng nhập Google, entitlement/quota hoặc chất lượng ảnh qua tài khoản thật. Live testing chỉ thực hiện sau khi người dùng chủ động cấu hình và duyệt request trong app.
