# Prompt triển khai Codex local với tài khoản ChatGPT riêng của user

Ngày đối chiếu repository và tài liệu OpenAI: 10/10/2026.

Bạn là kỹ sư senior TypeScript, React, Node.js, Remotion và tích hợp agent. Hãy triển khai chức năng bên dưới trong repository `icegozi_video`, từ khảo sát, thiết kế tối thiểu, viết code đến kiểm thử. Đây là yêu cầu xây dựng một tính năng hoạt động thực tế. Tuân thủ hướng dẫn hệ thống, `AGENTS.md` và các skill áp dụng trong môi trường của bạn.

## 1. Kết quả tôi muốn

Tôi muốn app chỉnh sửa video chạy local trên máy của từng user có thể:

1. Cho user đăng nhập tài khoản ChatGPT của chính họ bằng trình duyệt.
2. Xin quyền sử dụng gói ChatGPT của user qua luồng OpenAI chính thức.
3. Dùng Codex làm agent trong giao diện app: nhận yêu cầu, xem ngữ cảnh project video, đề xuất thay đổi và chạy những công cụ video được app cho phép.
4. Hiển thị phản hồi và tiến độ theo thời gian thực.
5. Áp dụng thay đổi vào editor sau khi user duyệt; undo/redo hoạt động như các thao tác chỉnh sửa hiện có.
6. Render preview bằng pipeline Remotion/FFmpeg hiện có và hiển thị kết quả thực tế.

User tự đăng ký và thanh toán gói ChatGPT phù hợp, chẳng hạn Plus/Pro, với OpenAI. App không mua gói, đăng ký gói, nhập thẻ, hoặc dùng tài khoản của nhà phát triển thay cho user. Hạn mức và quyền model phụ thuộc tài khoản, workspace và sự cho phép thực tế của OpenAI; không hứa sử dụng không giới hạn.

Phạm vi mặc định của bản này là **MVP local dùng cá nhân/nội bộ phi thương mại**. Mỗi cài đặt chạy runtime trên máy người dùng. Đây là giả định triển khai, không phải kết luận rằng mọi hình thức phát hành đều được phép.

Nếu chủ dự án xác định app được bán, vận hành như dịch vụ thương mại hoặc hosted, phải đánh giá lại quyền tích hợp trước khi bật xác thực thực tế. Việc khách hàng có Plus/Pro không tự cấp quyền cho một dịch vụ thương mại dùng luồng đăng nhập Codex trực tiếp.

## 2. Tài liệu và lựa chọn luồng đăng nhập

Đọc các tài liệu chính thức sau trước khi triển khai; kiểm tra lại nội dung hiện tại và phiên bản runtime đã chọn:

- [Codex App Server](https://learn.chatgpt.com/docs/app-server): giao thức client, vòng đời thread/turn, streaming và approvals.
- [Sign in with ChatGPT quickstart](https://developers.openai.com/siwc/quickstart): điều kiện tích hợp và sử dụng gói của user.
- [Ví dụ tích hợp vào app local](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt): luồng đăng nhập mới cho dự án cá nhân chạy local và app nguồn mở.
- [Registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in): đăng ký client, callback, xác thực danh tính và quyền được cấp.
- [Accounts and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions): tài khoản, renewal, logout và bảo vệ thông tin xác thực.
- [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference): catalog model và kết quả inference.
- [SIWC với Codex app-server](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server): dùng token đã được cấp quyền ChatGPT plan usage trong runtime Codex.
- [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations): các giới hạn của tuyến SIWC, công cụ và đầu vào.

Chọn **Sign in with ChatGPT (SIWC) + Codex app-server chạy local** làm tuyến mặc định cho tích hợp mới. App quản lý phiên SIWC; Codex vận hành vòng lặp agent. Không yêu cầu user đăng nhập Codex lần thứ hai trong tuyến này.

Tài liệu app-server hiện khuyến nghị các app local/nguồn mở chuyển sang SIWC và nêu rõ app-server authentication trực tiếp không được dùng cho dịch vụ thương mại/hosted. Vì vậy:

- Không dùng client ID của Codex hay một app khác để tự dựng OAuth.
- Không sao chép `auth.json` của Codex/IDE, lấy cookie ChatGPT, hoặc gọi các endpoint `backend-api` không thuộc luồng chính thức.
- Không chuyển sang đăng nhập managed của app-server để né việc SIWC không được cấp quyền.
- Không mặc định xây thêm hai hệ thống đăng nhập. Nếu cần tương thích với một tích hợp local cũ, mô tả thành phạm vi riêng và kiểm tra điều kiện trước.
- Nếu điều kiện của app/tài khoản chưa cho phép SIWC, phản ánh trạng thái đó trong UI và báo phần còn bị chặn. Có thể hoàn thiện bridge, UI và tests bằng fixtures, nhưng phải ghi rõ fixtures không chứng minh đăng nhập hoặc inference thật.

Các thành phần app-server và một số API còn có giới hạn/nhãn thử nghiệm. Chốt phiên bản runtime, đặt lớp adapter để thay được giao thức và ghi rõ giới hạn trong README. Không quảng cáo MVP này là một dịch vụ hosted đã sẵn sàng production.

## 3. Bối cảnh repository đã xác minh

Repository hiện dùng React 19, TypeScript strict, Vite, Remotion, FFmpeg, Zod và Vitest. Các điểm tích hợp cần khảo sát lại trước khi sửa:

| Thành phần | File hiện có | Vai trò |
| --- | --- | --- |
| Editor root | `src/editor/EditorApp.tsx` | Khởi tạo provider và project |
| Bố cục editor | `src/editor/components/shell/EditorShell.tsx` | Assets, preview, inspector, timeline |
| Thanh thao tác | `src/editor/components/shell/CommandBar.tsx` | Save, import/export, undo/redo |
| State và lịch sử | `src/editor/state/editorStore.tsx` | Project, revision, reducer, history |
| Lưu project | `src/editor/hooks/useProjectPersistence.ts` | Autosave và load |
| Storage browser | `src/infrastructure/storage/ProjectStorage.ts` | Project JSON trong localStorage, có revision |
| Local render API | `src/infrastructure/server/renderApiPlugin.ts` | Vite middleware cho render/upload/download |
| Render service | `src/application/render/renderService.ts` | Tạo và theo dõi render jobs |
| Domain video | `src/domain/video/VideoProject.ts` | Scenes, audio, subtitles, track settings |
| Validation | `src/schemas/project.schema.ts` | Parse/migrate project |
| Vite configuration | `vite.config.ts` | Đang dùng render API plugin, port 3200 |

Scripts hiện có: `npm run dev`, `npm run build:editor`, `npm run typecheck`, `npm run test`, `npm run render:preview`.

Project đang chỉnh sửa nằm trong state/browser storage. Việc agent sửa file `projects/demo/project.ts` không đồng nghĩa sửa project user đang mở. `LOAD_PROJECT` hiện xóa lịch sử undo/redo; không dùng action đó để áp dụng một thay đổi AI vào project hiện tại.

File `.env.local` có thể chứa `OPENAI_API_KEY`. Luồng tính năng này dùng đăng nhập ChatGPT và quyền gói của user; không đọc, gửi, sửa hay dùng key đó cho inference. Không thay đổi tích hợp API khác ngoài phạm vi yêu cầu này.

## 4. Khảo sát và cách làm việc

Trước khi sửa code:

1. Đọc hướng dẫn repository và xem working tree; bảo toàn thay đổi của user.
2. Xác minh state editor, schema, persistence, pipeline render và UI components có thể tái sử dụng.
3. Kiểm tra Node/OS, Codex runtime và các schema/protocol tương ứng phiên bản được chọn.
4. Kiểm tra nguồn phát hành, giấy phép và cách sử dụng SDK/devkit SIWC được tài liệu chính thức tham chiếu. Không giả định các package nội bộ trong ví dụ có sẵn trên npm; không phát minh package, export hay API.
5. Trình bày ngắn kiến trúc, file dự kiến sửa và các điều kiện còn chưa được chứng minh. Tiếp tục phần công việc đã được cho phép theo hướng dẫn môi trường; chỉ hỏi khi thiếu quyết định thực sự ảnh hưởng phạm vi hoặc quyền thực hiện.

Không đổi sang Next.js, thêm Electron/Tauri, thay reducer bằng thư viện state khác, hoặc refactor toàn bộ editor chỉ để làm tính năng này. Bản MVP cần tận dụng cấu trúc hiện có.

## 5. Kiến trúc đề xuất

Luồng xử lý:

`React editor -> local Node bridge -> Codex app-server qua stdio -> OpenAI qua phiên SIWC của user`

Phân trách nhiệm:

- **React:** login UI, chat, model selector, tiến độ, preview thay đổi, duyệt thay đổi, render preview. Browser không giữ access/refresh token.
- **Node bridge:** phiên SIWC, protected storage, quản lý process Codex, giao thức RPC, bảo vệ local endpoints, dispatch công cụ và kiểm tra dữ liệu.
- **Codex:** suy luận và điều phối agent theo ngữ cảnh, công cụ và quyền app đã cấu hình.
- **Editor domain/application:** validation, áp dụng project changes, timeline, persistence và render.

Tái sử dụng mô hình Vite middleware cho dev, với controller/service tách khỏi plugin. Frontend dùng các route `/api/codex/*` cùng origin. Dùng một kênh SSE có event ID để stream từ bridge về browser; các thao tác gửi yêu cầu đi qua HTTP đã kiểm tra quyền. Có thể chọn transport frontend khác nếu có lý do cụ thể từ code hiện tại, nhưng không mở thêm một RPC proxy tùy ý.

Tạo cấu trúc tương đương các nhóm dưới đây; tên file là đề xuất, cần điều chỉnh theo conventions thực tế:

```text
src/infrastructure/codex/       # runtime process, protocol client, adapter
src/infrastructure/chatgpt/     # SIWC auth, profile/credential storage
src/infrastructure/server/     # codex API plugin/controllers
src/application/assistant/     # sessions, tools, project proposals
src/editor/components/assistant/
src/editor/hooks/               # auth/chat/event hooks
src/shared/types/               # DTO dùng chung, không chứa secret
tests/unit/                    # protocol, lifecycle, reducer, permissions
tests/integration/             # bridge, event stream, tool/render integration
```

Giữ Node-only modules ngoài frontend bundle. `dist` từ Vite là frontend tĩnh, không tự cung cấp Node bridge. README phải nói rõ cách chạy MVP. Nếu thêm lệnh phục vụ build local, nó phải cung cấp bridge và static frontend trên loopback; không gọi đó là triển khai SaaS.

## 6. Quản lý runtime và giao thức

- Định vị executable đáng tin, kiểm tra version và chốt phiên bản hỗ trợ. Không tự cập nhật runtime khi app đang chạy.
- Hỗ trợ Windows và đường dẫn có dấu cách. Dùng executable/argument array; không đưa prompt, tool input hay đường dẫn user vào chuỗi shell.
- Chạy app-server bằng stdio/JSONL. Không để browser nối trực tiếp vào listener WebSocket của Codex.
- Hoàn tất handshake trước khi gửi các request khác. Lấy types/schema từ chính runtime đã chốt nếu runtime hỗ trợ sinh schema; không đoán wire format.
- Parser phải xử lý chunk chia giữa dòng, nhiều dòng trong một chunk, CRLF và UTF-8. Giới hạn kích thước message, queue và dữ liệu lịch sử trong memory.
- Phân biệt response, notification và server-initiated request. Message có `id` và `method` có thể là yêu cầu từ server, không phải response cho request pending của client.
- Mỗi request có correlation ID, timeout và cách reject khi process đóng. Các request chờ approval có vòng đời riêng, không dùng timeout ngắn của RPC thường.
- Xử lý stderr theo chế độ log đã redact. Không dump raw messages, process env hoặc toàn bộ payload đăng nhập.
- Dispose process và listeners khi local server đóng; tránh tạo process trùng khi Vite reload. Chỉ dừng process do app này tạo.
- Process crash không được âm thầm chạy lại turn hoặc tool đã có tác dụng. Khôi phục connection/history trước; để user quyết định retry công việc.
- Notifications chưa biết không làm sập toàn bộ session; server requests chưa hỗ trợ phải có xử lý lỗi/decline hợp lệ theo schema thay vì treo vô hạn.

## 7. Đăng nhập ChatGPT và vòng đời phiên

Tách interface cho auth provider với các thao tác: đọc trạng thái đã lọc secret, bắt đầu đăng nhập, hủy đăng nhập, logout, lấy credential nội bộ cho runtime và renew phiên. Credential chỉ được sử dụng bên Node.

Triển khai SIWC theo hướng dẫn chính thức, ưu tiên SDK/devkit được xác minh để tránh tự viết sai OAuth:

- Mỗi cài đặt có host ID ổn định, lưu ngoài repository; không sinh ID mới mỗi lần restart.
- Callback listener nằm trên loopback và chạy trước khi mở browser. Port có thể được chọn khi khởi động; URI phải khớp hoàn toàn trong một lần đăng nhập.
- Mỗi lần đăng nhập có transaction riêng, state/nonce/PKCE mới và thời hạn rõ ràng.
- Client ID được OpenAI cấp phải được lưu đúng profile và dùng đúng bước exchange/reauthorization. Không coi giá trị đăng ký ban đầu là client ID cuối cùng.
- Kiểm tra danh tính và các quyền được cấp thực tế. Đăng nhập nhận identity thành công chưa đồng nghĩa user đã cho app dùng gói ChatGPT.
- Profile phải gắn với account/workspace/client đã được xác minh. Một attempt mới chưa thành công không được ghi đè active profile cũ.
- Dùng OS credential storage hoặc protected storage phù hợp nền tảng; metadata không nhạy cảm có thể lưu trong app data. Browser storage chỉ dùng cho dữ liệu UI/project, không lưu token.
- Serialize refresh của cùng profile, lưu replacement token atomically và tránh refresh races. Kiểm tra epoch phiên để refresh hoàn tất muộn không phục hồi một user đã logout.
- Khi logout, ngừng nhận tác vụ, kết thúc phiên renewable theo hướng dẫn, xóa credential local và loại bỏ events/approvals cũ. Nếu remote revoke không được xác nhận, hiển thị trạng thái đúng và đường dẫn quản lý kết nối.

Thông báo đăng nhập phải thật sự nhìn thấy được trong app:

- Nút dùng tên/branding theo hướng dẫn SIWC, ví dụ `Continue with ChatGPT`, có giải thích tiếng Việt bên cạnh.
- Browser bị chặn hoặc không tự mở được: hiển thị một liên kết để user chủ động mở. Không báo thành công chỉ vì đã lấy được URL.
- Tách rõ `đang mở đăng nhập`, `đang chờ xác nhận`, `đã kết nối`, `chưa cấp quyền dùng gói`, `phiên hết hạn` và `lỗi`.
- Có nút hủy attempt; callback cũ sau cancel không được đăng nhập lại.
- Device-code login chỉ xuất hiện nếu tuyến xác thực/SDK đã chọn thực sự hỗ trợ và được phép; không ghép phương thức đăng nhập của một tuyến khác vào SIWC.

User tự mua gói trong tài khoản OpenAI của họ. Nếu chưa đủ điều kiện, app giải thích ngắn và đưa link chính thức phù hợp; không có chức năng mua gói thay user.

## 8. Kết nối phiên SIWC với Codex

Theo tài liệu SIWC/app-server, cấu hình provider để app-server dùng token được cấp quyền cho Responses API công khai. Truyền credential cho child process qua cơ chế được tài liệu hỗ trợ; giữ token khỏi argv, stdout, browser và context gửi cho model.

App sở hữu renewal ở tuyến SIWC. Khi token được thay thế, cập nhật runtime theo contract hiện tại và resume thread khi phù hợp. Không restart ở giữa một thao tác ghi đang chạy rồi tự phát lại thao tác đó.

Môi trường của công cụ agent phải được lọc độc lập với môi trường chứa credential của runtime. Không để shell/tool của agent đọc token từ env, auth profile hoặc `.env` của repository. Nếu một cơ chế sandbox/config không đạt được giới hạn này, giảm quyền/công cụ và báo rõ; không coi một câu system prompt là biện pháp bảo vệ filesystem.

Catalog model phải thuộc phiên user đang chọn. Kiểm tra tuyến lấy catalog được tài liệu mô tả; catalog cached/bundled của app-server không phải bằng chứng quyền truy cập. Để model mặc định theo cấu hình/catalog hợp lệ, không hardcode tên model hoặc Plus = được mọi model. Chỉ xác nhận model hoạt động sau một turn thực sự hoàn tất.

Các tính năng image/video generation, TTS, transcription hoặc công cụ hosted riêng không được coi là tự có quyền dùng chỉ vì user đăng nhập ChatGPT. MVP dùng những công cụ video local được app triển khai; giữ các tích hợp media khác ngoài phạm vi này.

## 9. Session, chat và streaming

MVP có một active conversation cho mỗi kết hợp installation/profile/workspace/project. Một active turn tại một thời điểm trong một conversation; gửi trùng phải được ngăn hoặc trả lỗi rõ ràng.

- Dùng các RPC thread/turn được schema phiên bản runtime hỗ trợ; giữ thread ID để tiếp tục và resume.
- Theo dõi text delta, hoạt động công cụ, approval và terminal status theo item/turn ID.
- Chỉ terminal status thành công mới được hiển thị là hoàn tất. Có text hoặc EOF chưa chứng minh thành công.
- Có nút dừng tác vụ; cancel phải đến runtime, không chỉ dừng render chữ trong UI.
- SSE reconnect dùng event ID và replay có giới hạn hoặc đồng bộ snapshot trạng thái. Không gọi lại turn khi browser reconnect. Dedupe theo event/item IDs để tránh lặp chữ hay áp dụng thay đổi hai lần.
- Refresh trang khôi phục UI/session metadata hợp lệ; không lưu credential cùng chat messages.
- Thay tài khoản, workspace hoặc project phải tách history/session và bỏ qua event đến muộn từ session trước.
- Logout khi đang chạy phải kết thúc hoặc cách ly turn cũ và giải quyết pending approvals theo policy. Không xóa project video của user.
- Giới hạn history, payload và streaming buffers; làm rõ timeout của login, tác vụ và idle connection.

UI panel AI nên mở từ `CommandBar` và gắn vào `EditorShell` bằng các tokens/components hiện có. Khi đóng panel, editor vẫn hoạt động. Panel cần có tài khoản đang kết nối, trạng thái gói/quyền nếu provider trả về, model selector, lịch sử chat, input, gửi/dừng, tiến độ công cụ, pending approvals và proposal preview.

## 10. Ngữ cảnh project và thay đổi AI

Agent nhận snapshot đã validate của **project đang mở**, gồm ID, revision, selected clip, playhead, các scene/audio/subtitle liên quan và manifest assets cần thiết. Tên file, subtitle và metadata của user là dữ liệu không tin cậy; không biến chúng thành chỉ dẫn có quyền cao.

Không tự gửi nội dung media, `.env`, auth files, đường dẫn ngoài workspace hoặc toàn bộ repository. Chỉ gửi ngữ cảnh cần cho yêu cầu. Nếu cần gửi frame/image để model xem, phải có lựa chọn user rõ ràng và phù hợp khả năng model/tuyến inference.

Thiết kế output AI thành một **proposal có schema**, không parse JSON bằng regex từ text trả lời. Proposal tối thiểu gồm:

- Proposal ID, session epoch, project ID.
- Base revision và fingerprint snapshot để phát hiện project bị thay khi revision trùng.
- Tóm tắt thay đổi dễ hiểu và các scene/track bị ảnh hưởng.
- Các thao tác domain có kiểu hoặc candidate project đã validate.
- Các cảnh báo cụ thể như asset còn thiếu hoặc track đang khóa.

Luồng áp dụng:

1. Bridge kiểm tra proposal bằng Zod và domain rules.
2. UI hiển thị thay đổi dự kiến; project hiện tại chưa bị sửa.
3. User chọn `Áp dụng` hoặc `Bỏ qua`.
4. Reducer kiểm tra lại project identity/revision/fingerprint tại thời điểm apply; không chỉ kiểm tra trước khi dispatch.
5. Nếu conflict do user vừa chỉnh project, từ chối ghi đè và cho phép tạo proposal mới từ state mới.
6. Áp dụng toàn bộ proposal như một transaction tạo **một** undo history entry, tăng revision, build lại timeline và chuyển save status phù hợp.
7. Một proposal chỉ được apply một lần. Undo/redo phải đi qua cơ chế hiện có.

Bổ sung action chuyên biệt tương đương `APPLY_AI_PROJECT_CHANGE` nếu cần, dùng logic history hiện có. Không dùng `LOAD_PROJECT` để né việc xử lý undo. Respect locked tracks, ID duy nhất, frame/time units, validation, selection và playhead reconciliation.

MVP không cho agent tự sửa source code React hoặc ghi đè file project của user. Việc sinh component/motion graphic executable là phạm vi riêng cần thiết kế sandbox riêng; không dùng `eval`, `new Function` hay nhập JSX chưa kiểm tra vào editor.

## 11. Công cụ video cho agent

Xây một lớp dispatch có allowlist và schema cho các công cụ tương đương:

| Công cụ app đề xuất | Hành vi |
| --- | --- |
| `get_project_context` | Đọc snapshot/context đã lọc |
| `list_project_assets` | Đọc manifest assets được phép |
| `propose_project_change` | Tạo draft, validate; chưa sửa state |
| `get_render_status` | Đọc trạng thái job thuộc session |
| `render_project_preview` | Render snapshot được user yêu cầu, qua render service |

Đây là tên công cụ của app, không phải khẳng định các RPC Codex này có sẵn. Đăng ký công cụ qua cơ chế được runtime hỗ trợ. Ưu tiên MCP local nếu phù hợp; dynamic tools chỉ dùng khi version/capability đã kiểm tra và ghi rõ tính thử nghiệm.

Mỗi tool invocation kiểm tra owner session, project/snapshot và request ID. Các công cụ có tác dụng phải có cơ chế chống thực thi trùng ở backend. Browser retry không được tạo thêm render job hoặc apply một proposal hai lần.

Render preview phải dùng snapshot cụ thể và schema/project validation hiện có; trả job ID, tiến độ và URL local qua API đã giới hạn phạm vi. Không thông báo có MP4 trước khi job thành công và output tồn tại. Khi user đổi project, kết quả cũ vẫn mang nhãn project/snapshot cũ.

Không bịa asset, ảnh, nhạc, lời thoại hay quyền sử dụng file. Yêu cầu thiếu media phải được phản ánh là thiếu input thay vì tạo đường dẫn giả.

## 12. Quyền thực thi và bảo vệ bridge local

Tính năng này có thể thao tác file/process nên phải bảo vệ ngay ở Node, không chỉ trong UI:

- Bridge bind loopback; dùng Host/Origin allowlist chính xác và bảo vệ mutation/session endpoints trước CSRF và truy cập từ website khác.
- Tạo session/capability của app qua bootstrap local đáng tin; không cung cấp token qua một endpoint công khai để website bất kỳ lấy được. Capability của bridge khác credential OpenAI.
- Yêu cầu session hợp lệ cho cả event stream và thao tác công cụ. Không bật CORS wildcard hoặc exposed raw RPC.
- Validate request body, giới hạn kích thước, map lỗi an toàn và tránh đưa auth URL nhạy cảm vào log.
- UI/controller chỉ gọi các thao tác đã định nghĩa. Không nhận `method`/`params` arbitrary từ browser rồi forward tới Codex; không expose shell/process endpoints ngoài sandbox như một shortcut.
- Sandbox/workspace của agent nên là vùng chứa context/drafts đã lọc, tách khỏi `.env`, `.git`, auth storage và source media gốc. Xác minh real path, symlinks/junctions và Windows path traversal ở mọi tool đọc/ghi.
- Không chọn chế độ toàn quyền filesystem hoặc bỏ qua approvals chỉ để chạy được demo. Nếu Windows sandbox chưa hỗ trợ yêu cầu, giảm về tool allowlist/read-only thay vì âm thầm tăng quyền.
- Phân biệt approval từ Codex với nút user áp dụng project proposal. Chúng có mục đích và request IDs khác nhau.
- Server-initiated approval phải xuất hiện bằng UI có mô tả lệnh/path/tác dụng, có accept/decline/cancel đúng schema; không tự accept khi user không trả lời.
- Approval hết hạn, request đã resolved, turn interrupted hoặc session đã đổi phải được đóng trong UI; reject câu trả lời trễ và request IDs không thuộc session hiện tại.

Giữ assets gốc an toàn. Các file tạm/generated mới có thể ghi trong workspace dành cho công việc đó; không xóa/move đệ quy bằng đường dẫn chưa xác minh.

## 13. Hạn mức, lỗi và sự minh bạch với user

Thông báo UI ngắn, tiếng Việt dễ hiểu, có hành động khắc phục cho các trường hợp: runtime chưa cài/không tương thích, login bị hủy, callback timeout/port bận, không đủ quyền dùng gói, model không được phép, mất mạng, phiên hết hạn, quota hết, process crash, proposal conflict và render thất bại.

- Khi hạn mức hết, giữ chat/draft và cho user xem quản lý usage/retry khi phù hợp. Không chuyển sang `OPENAI_API_KEY` của nhà phát triển, tài khoản khác hoặc provider khác.
- Hạn mức gói có thể dùng chung với những app khác. Không hiển thị phần trăm quota, số tiền hoặc giờ reset do app tự ước lượng như dữ liệu thật.
- Chỉ dùng số liệu quota provider thực sự trả về trong tuyến đang chọn. Nếu không có API quota phù hợp, dùng link quản lý usage chính thức và trạng thái có thể kiểm chứng.
- Phân biệt `đã đăng nhập`, `đã cấp quyền dùng gói` và `đã inference thành công`.
- Retry tự động chỉ dùng cho thao tác an toàn theo contract. Tác vụ ghi/render đã bắt đầu không được phát lại chỉ vì timeout hoặc stream bị ngắt.
- Redact secret trong lỗi và support diagnostics; không dump toàn bộ credential hoặc config.

Không thêm API-key fallback trong MVP. Nếu sau này user muốn thêm, đó phải là một lựa chọn riêng, có thông tin tính phí rõ ràng và sự đồng ý thực tế trước khi dùng.

## 14. Kiểm thử

Viết tests cho những ranh giới có lỗi thực tế, dùng fake child process/RPC fixtures và mocked auth/network. Test suite mặc định không mở browser đăng nhập, dùng secret thật hoặc gọi inference tính vào quota.

Các ca bắt buộc:

1. JSONL fragmented/multiple lines/CRLF/UTF-8, malformed message, correlation IDs và server requests.
2. Handshake chưa hoàn tất, timeout, process exit, teardown và restart không phát lại tác vụ.
3. OAuth callback sai state/nonce, thiếu quyền, user decline, cancel rồi callback tới trễ; active profile cũ không bị ghi đè.
4. Refresh token cùng lúc, replacement save, logout trong lúc refresh và credential storage thất bại.
5. Token không xuất hiện trong browser DTO, event stream, log, URL/argv hoặc agent tool context/env.
6. Origin/Host/session không hợp lệ bị từ chối; arbitrary RPC, path traversal và secret path bị chặn.
7. SSE reconnect/dedupe; không gửi turn hai lần; terminal failed/interrupted khác completed.
8. Switch profile/project, nhiều browser tab và event cũ không sửa nhầm session.
9. Proposal invalid schema/locked track/conflict/duplicate apply; apply atomic; undo/redo và autosave đúng.
10. Render dùng đúng snapshot, job idempotency, cancellation và output chỉ xuất hiện sau thành công.
11. Quota/model/auth lỗi không kích hoạt API-key fallback.
12. Editor/import/export/timeline/render hiện có không bị regression.

Chạy ít nhất `npm run typecheck`, `npm run test`, `npm run build:editor`. Bổ sung kiểm tra UI thích hợp để chứng minh panel/login/proposal flow thực sự hoạt động.

Smoke test thật cần user chủ động đăng nhập và cho phép một tác vụ nhỏ. Ghi rõ môi trường/version, tuyến auth, model và kết quả terminal đã quan sát, chỉ ghi metadata an toàn. Không nói live integration đã được xác minh nếu chỉ chạy mock tests. Nếu chưa có điều kiện thực hiện smoke test, cung cấp các bước ngắn để user kiểm tra và ghi rõ giới hạn còn lại.

## 15. Tiêu chí nghiệm thu

- Một user mới có thể chạy app local, thấy trạng thái Codex/runtime và mở đăng nhập từ UI.
- User đăng nhập tài khoản riêng và quyết định cho phép app sử dụng gói; app không mua gói hộ.
- Auth tokens nằm trong protected local storage; browser và repository không có secret mới.
- AI chat stream thật sau khi có quyền, có terminal status đúng và nút dừng tác vụ hoạt động.
- Agent nhận đúng project đang chỉnh và tạo proposal hợp lệ; editor chỉ thay đổi sau user apply.
- Proposal apply một lần, không ghi đè concurrent edits và undo/redo phục hồi đúng.
- Render preview chạy bằng pipeline hiện có, theo dõi job và hiển thị output thực tế.
- Logout/session switch không để lộ history/credential hoặc tác dụng đến nhầm user/project.
- Quota/permission failure có UI rõ ràng; API key trong `.env.local` không được dùng thay user.
- Các checks tự động qua; live verification được báo riêng và trung thực.
- README nói rõ phạm vi local, version requirements, cách chạy, quản lý kết nối/usage và giới hạn phát hành.

## 16. Bàn giao

Thực hiện lần lượt: khảo sát và chốt contract -> auth/storage -> runtime/bridge -> UI chat -> project proposals -> công cụ preview -> kiểm thử và tài liệu.

Bàn giao code hoạt động trong phạm vi được cấp quyền, tests cần thiết và README. Không dừng ở pseudocode hoặc dựng màn hình giả rồi coi là hoàn tất. Không tự commit, push, merge, publish app, mua gói hay thay billing settings nếu chưa có yêu cầu tương ứng.

Trong báo cáo cuối, nêu:

1. Luồng xác thực đã chọn và điều kiện sử dụng đã xác minh.
2. File/chức năng thay đổi chính và cách chạy app.
3. Kết quả typecheck/tests/build/UI checks.
4. Phần đã kiểm tra với phiên ChatGPT thật và phần chỉ có fixtures.
5. Điều kiện còn thiếu, giới hạn runtime hoặc chặn từ provider nếu có.

Các quyết định nhỏ về tên file, DTO, bố cục panel và test fixtures có thể tự giải quyết theo codebase. Nếu có một quyết định lớn làm đổi mô hình local, phạm vi phát hành hoặc tuyến tính phí, trình bày một lựa chọn cụ thể trước khi thực hiện phần phụ thuộc.
