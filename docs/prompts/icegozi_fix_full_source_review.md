# Prompt sửa toàn bộ các finding đã xác nhận

Copy phần từ “Bạn là…” đến hết vào coding agent tại repository `D:\My Project\Github\icegozi_video`.

Bạn là senior TypeScript/React/Node engineer. Hãy sửa các finding trong `docs/reviews/2026-10-10-full-source-review.md`, baseline `master@a22edd9`. Đây là yêu cầu triển khai, không chỉ lập kế hoạch. Đọc lại code/callers trước khi sửa vì HEAD có thể đã thay đổi; nếu một finding đã được sửa, chứng minh bằng code và regression test thay vì áp lại patch cũ. Báo cáo và patch là điểm xuất phát; các mitigation trong báo cáo chưa phải lời giải đầy đủ.

## Phạm vi và ràng buộc

- Target là local Windows desktop: React 19 + Vite, Remotion, Node FFmpeg, SQLite/Drizzle/better-sqlite3. Giữ kiến trúc domain/application/infrastructure/editor/video hiện tại; không đổi stack hoặc viết lại ứng dụng.
- Đọc MEMORY.md và mọi AGENTS.md áp dụng. Giữ nguyên thay đổi có sẵn của người dùng. Không commit, merge, reset history hay chạy cleanup toàn generated/data/assets nếu chưa được yêu cầu.
- Media đã import và media nguồn trong public/assets phải bất biến. Chỉ tạo asset mới; không overwrite file cũ dù tên trùng. Không dùng tên do client gửi làm đường dẫn tin cậy.
- Browser project state tiếp tục là state chỉnh sửa authoritative. AI apply qua `APPLY_AI_PROJECT_CHANGE`, kiểm tra epoch/revision/SHA-256, 1 undo entry; không thay bằng `LOAD_PROJECT`.
- Giữ SIWC per-user, credential DPAPI ngoài repo, subject/nonce/state/JWT/refresh checks, namespace tool allowlist, empty machine environments, filtered process environment và shell disabled. Không dùng API key, cookie hay Codex auth có sẵn làm fallback.
- Tests dùng credential và runtime giả. Không đăng nhập OAuth hoặc gửi inference thật để kiểm chứng. Không làm yếu auth hoặc đổi runtime/model/provider chỉ để test pass.
- Chỉ refactor dùng chung khi trực tiếp giải quyết sự lệch semantics đã nêu. Không thay giao diện toàn bộ, không bổ sung tính năng ngoài các sửa lỗi/controls bị mất.

## Thứ tự triển khai

1. Isolate test database và fixtures trước, để mọi lần chạy test sau không chạm DB/media người dùng.
2. C1–C2: bảo vệ media và edit transaction.
3. I1–I3: persistence, revision, import và roundtrip.
4. I4–I7, I9: timeline/split/locks/visibility/IDs.
5. I10–I11, I14: render lifecycle và API/upload boundaries.
6. I8, I12–I13: draft, account controls và E2E UI hiện tại.
7. M2–M3: CLI cleanup và tài liệu. Chạy acceptance suite, review diff và báo cáo kết quả thực tế.

## 1. C1 và I14 — upload/API an toàn, không phá source

Các file chính: `src/infrastructure/server/renderApiPlugin.ts`, filesystem helpers, `AssetPanel.tsx` và tests upload/API mới.

- Tạo storage key bằng UUID hoặc content identity an toàn, giữ extension media đã xác minh. Original filename chỉ là metadata hiển thị. Filename tiếng Việt/emoji không gây lỗi header hay collision.
- Dùng exclusive create cho file tạm; stream request vào file tạm có giới hạn byte cấu hình hợp lý, không giữ toàn bộ video trong array Buffer rồi concat. Kiểm tra loại file từ dữ liệu/metadata server, không chỉ accept attribute hay MIME client.
- Chỉ promote sau khi upload hoàn tất và validation pass. Kiểm tra target directory/file realpath và containment, chặn symlink/junction escape trên Windows. Khi abort/error/validation fail, chỉ dọn file tạm của chính request; nguồn cũ không thay đổi.
- JSON endpoints `/api/projects` và `/api/render`: reader giới hạn khoảng 1MiB hoặc mức được giải thích, tính bytes thực nhận kể cả chunked body, kiểm tra Content-Type và schema request. Ghép Buffer trước UTF-8 decode để không hỏng chữ Việt ở ranh giới chunk.
- Trả lỗi HTTP có cấu trúc: 400 invalid schema, 413 quá dung lượng, 415 content type không phù hợp; không leak credential hoặc stack nội bộ. Giữ origin/Host guard hiện tại; kiểm tra ordering plugin để API khác không vô tình bypass guard.
- UI không xóa input/draft hoặc thêm scene khi upload thất bại; chỉ append asset đã hoàn tất và được server xác nhận.

Nghiệm thu: hai upload cùng original filename, kể cả đồng thời, có keys khác nhau; hash/bytes file đầu không đổi; oversized/chunked/aborted/junction cases không tạo partial asset hoặc ghi ngoài phạm vi.

## 2. C2 — manual edits là transaction có validation

Các file chính: `editorStore.tsx`, inspectors, `TimelineClip.tsx`, timeline validation và import hook.

- Tính candidate project/timeline và kiểm tra invariant trước commit. Nếu invalid, giữ nguyên project, timeline, history, revision, currentFrame và selection; báo lỗi có thể hiểu được, không throw qua React reducer.
- Có error state dành cho project edit/validation; không dùng `saveStatus:'error'` để báo mọi lỗi edit vì sẽ làm gián đoạn autosave của bản hợp lệ trước đó.
- Slider/trim không cho duration vi phạm transition. Không chỉ hardcode min 15; xét cả incoming/outgoing transition, adjacent scenes và nguồn video. Split sát transition phải bị từ chối rõ hoặc xử lý theo chính sách nhất quán, không crash.
- `LOAD_PROJECT`/import kiểm tra timeline trước thay workspace. Initial restore cũng phải chịu được persisted data hỏng; không reset/xóa bản có thể phục hồi chỉ vì parse lỗi.
- Input đang gõ được phép có draft tạm thời; validate khi commit phù hợp, tránh khiến người dùng không thể xóa rồi nhập lại một title/LaTeX bắt buộc.

Nghiệm thu: demo fade15 chỉnh duration15, trim xuống min, split ở frame10 và import invalid crossfade đều không làm editor trắng; thao tác bị reject không đổi revision/history/selection.

## 3. I1–I3 — persistence end-to-end và dữ liệu không mất fields

Các file chính: `ProjectStorage.ts`, `projectDbService.ts`, DB snapshot schema, renderService, `useProjectPersistence.ts`, keyboard save và reducer.

- Định nghĩa riêng editor revision (dirty/AI optimistic checks) và server revision (CAS DB). Không tiếp tục so hai counter khác nghĩa hoặc sửa bằng cách bỏ kiểm tra stale writes.
- Request save có expected server revision/base fingerprint và request ID phù hợp. DB compare-and-swap + snapshot write trong cùng transaction. Trả server revision thực tế; save lặp cùng request/content là idempotent, không tạo revision giả.
- Render dùng immutable snapshot của state được yêu cầu. Việc tạo render snapshot không đẩy nội dung cũ thành latest edited project hoặc làm lệch counter của browser. Nếu cần đổi schema, migration phải giữ dữ liệu hiện có và có đường load snapshot legacy.
- Await/quan sát response sync và phân biệt “đã lưu local” với “SQLite đã đồng bộ/pending/lỗi”. Offline vẫn giữ project local và cho phép chỉnh sửa; không báo DB sync thành công khi HTTP 400/409/500.
- Autosave/manual save/Ctrl+S dùng cùng pipeline; serialize hoặc coalesce theo project/session. Completion của revision/epoch cũ không đánh dấu revision mới đã saved. Không retry mù một request đã được server chấp nhận.
- Restore có revision đã persist thì không làm dirty; import JSON mới phải dirty và autosave. Không ghi demo lên storage trước initial hydration. Reset demo có semantics persist rõ và được test qua reload.
- Snapshot lưu toàn bộ domain project gồm schemaVersion, metadata và trackSettings; DB orchestration metadata nằm ngoài project. `getProject` phải khôi phục fields tương đương bản được save. Đọc snapshot cũ không có các fields mới vẫn an toàn.
- Kiểm tra nhiều tab: tab cũ không overwrite project mới trong localStorage/SQLite mà không có conflict detection. Nếu MVP không cho nhiều writer, enforce/communicate single-writer thay vì giả định static variable đủ bảo vệ.

Nghiệm thu: repeated save/render/edit không tạo false stale conflict; save order đảo và 2 writer được xử lý đúng; import rồi reload đúng; metadata/tags/author/schemaVersion roundtrip nguyên vẹn.

## 4. I4–I7, I9 — một bộ semantics cho timeline, track và renderer

Các file chính: build/validateTimeline, project schema/proposals, editorReducer, Timeline và MainVideo.

- Split chỉ giữ outgoing transition gốc ở nửa sau; nửa đầu không tạo outgoing transition mới. Với A120/crossfade15/B120, split A ở60 phải giữ tổng225f, vị trí B và synchronization. Kiểm tra source offset với playbackRate0.5/1/2 và startFromFrame khác0.
- Validation crossfade dùng chung: overlap ngắn hơn cả scene trước/sau, incoming+outgoing không vượt duration scene giữa, không tạo triple overlap; tổng duration bao trùm mọi scene end. Bắt lỗi ở import/render/proposal bằng cùng quy tắc, không rải các bản validator lệch nhau.
- Helper phân track thống nhất: nếu có primary media, text/formula thuộc V2 và primary thuộc V1; nếu chỉ text/formula, chúng thuộc V1 như UI hiện tại. Timeline, visibility renderer và lock checker dùng helper này.
- Hidden filter theo từng track/scene, không xóa hay co timeline duration; V2.hidden không còn xuất hiện trong preview/export, V1.hidden không tắt V2. Audio mute giữ semantics đã có; subtitle setting nếu hỗ trợ phải được renderer honor.
- Locked content/timing/canvas được kiểm tra trước mọi manual mutation: inspector, trim, delete, split, duplicate, audio/subtitle edit và ripple do scene khác. Cho phép unlock và thay đổi không ảnh hưởng locked content. Dùng enforcement ở reducer/application, không chỉ UI disabled.
- Global ID uniqueness cho scene/audio/subtitle hoặc typed selection đủ mạnh. Schema/import và AI không được có hai quy tắc khác nhau. Reject duplicate IDs bằng message/location rõ; không âm thầm đổi ID mà bỏ sót references.
- Test render tại frame trước/trong/sau transition, gồm media khác màu và mixed outgoing fade/incoming crossfade; xác minh ảnh xuất thực tế, không chỉ mock opacity hay timeline math.

Nghiệm thu: các số frame đã nêu chính xác; lock không bị bypass; selection audio không chạm scene; timeline/preview/export hiển thị cùng các track đang bật.

## 5. I10–I11 — render request ownership và cancellation

Các file chính: renderService, renderApiPlugin, ExportModal, render job tests.

- Validate render profile enum trước mọi DB/file/process side effect, kể cả direct service callers. Invalid profile không để lại project revision, snapshot, job hoặc props file.
- Nếu snapshot write/CLI resolution/spawn fail, job phải terminal failed và cleanup file sở hữu; không còn rendering giả. Không trả ChildProcess trong API DTO; process thuộc private runtime state.
- Export dùng operation generation/request ID. Cancel trong lúc POST chờ ack phải được ghi nhớ; khi job ID tới, cancel chính job đó và bỏ continuation cũ. Không abort mù khiến không biết job đã tạo ở server hay chưa.
- Poll thuộc đúng job/operation, dùng timeout/AbortSignal, không overlap không giới hạn và không để response cũ cập nhật UI mới. Cancel/reset/unmount dọn poll và vô hiệu continuation; HTTP lỗi được hiển thị/retry có giới hạn, không loading vô hạn.
- Cancel giữ terminal status trước khi kill, xử lý close/error/progress đến muộn; trên Windows kiểm tra process tree thực sự dừng và output partial được dọn sau writer đã dừng. Giữ shell:false, windowsHide:true, argument arrays và filtered env.
- Kiểm tra graceful shutdown/restart với persisted jobs. Job không còn owner/process phải có trạng thái phục hồi rõ; không tự render lại hoặc coi output partial là success. Không đánh dấu job của process khác failed chỉ vì process hiện tại không có nó trong Map.

Nghiệm thu: delay POST, Cancel rồi response tới tạo đúng cancel request; render khác không bị state/poll cũ ghi đè; invalid profile tạo0 side effects; real small render + cancel trên Windows có bằng chứng output/process.

## 6. I8, I12–I13 — draft, profiles và UI regression gate

Các file chính: AiChatPanel, LeftWorkspace, useAssistant, account controls và E2E.

- Draft thuộc workspace/project, sống qua tab switches. Không clear trước khi request accepted; giữ khi request reject/network error, chưa mở conversation hoặc busy guard chặn submit.
- Sau accepted send, chỉ clear đúng draft đã gửi; không xóa text mới gõ trong lúc chờ. Nếu server response chứa failed turn, hiển thị lỗi và giữ cách retry chủ động; không tự phát inference lại.
- Profile/project/bridge change vô hiệu async result cũ, preview URLs và session epoch; request cũ không resurrect UI/credential/proposal của tài khoản đã đổi.
- Thêm lại Add account và saved profile selector trong AiChatPanel đang được render. Dùng `login(true)` và `selectProfile`; disable pending profile phù hợp và handle legacy registration cần add new. Giữ subject guard, không reuse registration cho identity khác.
- E2E dùng `ai-chat-workspace`, controls/labels hiện tại; không tìm AssistantPanel cũ, không skip/disable assertions để test xanh. Chọn test ID ổn định khi labels có thể đổi.
- Fixture turn1 tạo proposal; fixture turn2 gọi `video_editor.render_project_preview`, UI duyệt approval rồi verify real MP4 metadata/frame. Giữ login/catalog/chat/apply/undo/redo/reload/logout, origin/Host/capability guards và IME typing tests. Không gọi OAuth/inference thật.
- E2E ở desktop viewport phải kiểm tra canvas/timeline/inspector/mode controls; nếu vẫn quảng bá responsive390/768 thì test interaction và viewport containment tương ứng, không chỉ chụp ảnh.

Nghiệm thu: HTTP503 và tab switch không mất draft; add/select profile dùng đúng epoch; test:assistant-ui pass trên UI hiện tại và decoded MP4, không có page errors.

## 7. M1–M3 và validation cuối

- Mọi test phải chọn memory/temp SQLite trước module DB import, không dùng `data/icegozi.sqlite`. Integration về persistence/restart dùng temp file và cleanup đúng containment sau đóng handles. Không sửa/xóa DB hay media người dùng để test pass.
- CLI render failure dùng `process.exitCode` để finally cleanup props. CLI nhận project JSON và dùng argument arrays; tài liệu không gọi CLI demo là “equivalent” của project đang mở nếu thiếu props snapshot.
- Sửa README commands/links theo chức năng thực có. Nếu thêm studio script, kiểm tra chạy thật; nếu docs chưa có, đổi link tới tài liệu thực hoặc tạo nội dung đúng, không tạo file rỗng.

Chạy và đọc kết quả:

```text
npm run typecheck
npm test
npm run build:editor
npm run codex:check
npm run test:assistant-ui
```

Thêm regression tests T1–T18 từ review; có thể gộp file/test suite theo hành vi. Dùng mocks chỉ ở boundary phù hợp; thêm integration kiểm chứng upload bytes, DB roundtrip, cancel race và decoded rendered frames. Không update expected output theo bug hoặc remove assertions.

Khi xong, cung cấp:

1. Bảng C1–C2/I1–I14/M1–M3: fixed hoặc chưa fixed, file thay đổi, test chứng minh, còn giới hạn nào.
2. Tóm tắt thiết kế revision/snapshot, edit validation/track semantics và request ownership để reviewer khác hiểu.
3. Lệnh test thực chạy và pass/fail/skipped thực tế; phân biệt native runtime test với OAuth/inference thật chưa kiểm chứng.
4. `git diff --stat`, review lại diff để loại refactor ngoài phạm vi và xác nhận không sửa media/DB người dùng.
5. Nếu có migration, hướng backup/upgrade/recovery có kiểm chứng. Cập nhật MEMORY.md theo semantics cuối cùng đã test.

Không tuyên bố hoàn tất khi còn một Critical/Important chưa xử lý mà không nêu rõ. Không đánh dấu “fixed” chỉ vì thêm try/catch nuốt lỗi hoặc làm test cũ pass.
