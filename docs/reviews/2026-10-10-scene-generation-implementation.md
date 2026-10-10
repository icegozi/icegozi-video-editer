# Code Review: `master` → `master` — core tạo cảnh và Google OAuth/API key cho Gemini

**Base/head:** `573334a`; review working tree triển khai, chưa tạo commit.
**Phạm vi:** core renderer, Gemini adapter/OAuth/storage, plans/jobs/grants, tools/skills, proposal reserve/ack, UI, ingest và Windows package. Thay đổi di chuyển tài liệu sang `docs/` và `.gitignore` đang có song song được giữ nguyên, không thuộc phần sửa tính năng.
**Đã review kỹ:** ownership/epoch/turn, token lifecycle, submit ambiguity, workspace concurrency, SQLite/asset boundaries, reducer/history, native tool dispatch, production/package runtime. Không lấy fixture làm bằng chứng live entitlement hoặc chất lượng ảnh Gemini thật.
**Tóm tắt:** app đã có core vector/keyframe local xuất PNG/MP4 và adapter tạo ảnh Gemini qua API key hoặc Google Desktop OAuth. Tạo media, cấp grant và duyệt timeline là các bước riêng; dữ liệu model không trở thành executable scene code. Hướng dẫn hiện hành: [SCENE_GENERATION.md](../../SCENE_GENERATION.md).
**Kết luận:** 🟢 `READY TO MERGE` cho phần triển khai đã review và kiểm chứng. Live Google/Gemini phải dùng cấu hình/tài khoản/quota do user nhập trong app; chưa thực hiện trong lượt này.

Collector skill đã chạy trên `master`, có tracked/untracked diffs dưới `build/review/scene-generation/final`. Lỗi tổng hợp `/dev/fd` của Bash trên Windows được đối chiếu lại bằng Git native; không dùng số liệu collector lỗi để tuyên bố đã audit các tài liệu song song.

## 1. Critical issues

Không còn Critical phát hiện trong phạm vi review. OAuth dùng callback/PKCE/state/nonce/JWT chính thức; secrets không đi vào tool DTO, client persistence, argv hay package. Core nhận typed data, không nhận JSX/JS/URLs từ model.

## 2. Important issues

Các lỗi tìm được đã sửa và có kiểm chứng:

| # | Severity | File / Area | Finding | Risk | Minimal Patch | Status |
| --- | --- | --- | --- | --- | --- | --- |
| I1 | IMPORTANT | `assistantService.ts:515`, `useAssistant.ts` | Consume draft trước reducer có thể mất draft khi concurrent edit | Mất bản nháp | Reserve/lease/ack + kiểm tra lại ở reducer; release giữ draft | FIXED |
| I2 | IMPORTANT | `assistantService.ts:316`, `useSceneGeneration.ts` | Tool/preview hoàn thành sau đổi turn/owner hoặc unmount | Stale mutations/Blob leak | Turn/snapshot guard; owner-bound state và mounted check/revoke | FIXED |
| I3 | IMPORTANT | `sceneGenerationService.ts:58` | Backend thứ hai có thể recovery nhầm jobs của backend đang chạy, kể cả khởi động lỗi port | Trạng thái sai, vượt concurrency | Khóa workspace có heartbeat; recovery khi backend nhận request có ownership | FIXED |
| I4 | IMPORTANT | `secureStore.ts:69`, `googleOAuth.ts` | Callback/refresh cũ có thể ghi đè kết nối mới hoặc đóng login mới | Credential/session corruption | File lock + expected-version CAS; pending-login identity guard | FIXED |
| I5 | IMPORTANT | `assetIngestService.ts:62` | Bundled image demuxer không nhận ảnh `.tmp` hoặc extension khác MIME | Import/JPEG hợp lệ thất bại | Alias extension từ magic bytes, decode/hash/promotion và cleanup | FIXED |
| I6 | IMPORTANT | `sceneGenerationService.ts:488` | Retry local giữ epoch cũ và props của attempt cũ | Retry sau restart thất bại | Rebind owner epoch/conversation và thư mục riêng mỗi attempt | FIXED |
| I7 | IMPORTANT | `SceneGenerationPanel.tsx:81` | Form giữ secret đang nhập khi đổi assistant session | Có thể lưu nhầm secret sang profile khác | Remount form theo conversation epoch; clear secret khi đóng/lưu/đổi mode | FIXED |

Không tự retry Gemini khi mất response; cancellation và app restart không suy ra phí bằng 0. Media mới được phép dùng chỉ khi có grant đúng profile/project và file đã kiểm tra. Các assets hiện có trong snapshot vẫn giữ contract cũ.

## 3. Minor improvements

- M1: đã sửa description `get_render_status` để bao gồm preview/final. Toolset hash có skill version, giúp refresh native threads khi contract/instructions đổi.
- Build còn warnings có sẵn về annotation Zod và bundle frontend >500 kB; không phải lỗi build. Không thêm một refactor bundle ngoài phạm vi.
- Catalog Gemini có hạn giá 10/11/2026; cần cập nhật bản app/catalog khi hết hạn. Model/quota/billing thật phụ thuộc project Google Cloud, không được suy ra từ trạng thái OAuth connected.

## 4. Test cases cần thêm

Các regression quan trọng đã được thêm, không chỉ kiểm tra happy path:

| # | Scenario | Method | Expected | Actual | Status |
| --- | --- | --- | --- | --- | --- |
| T1 | Apply stale, competing tabs, lost/duplicate ack | Service + reducer integration | Giữ draft, một active reservation, một undo entry | Đạt | PASS |
| T2 | OAuth wrong state, nonce/audience delegation, single-flight refresh, cancelled old callback, cross-instance stale write | OAuth/storage fixtures | Không lộ token, không overwrite/cancel phiên mới | Đạt | PASS |
| T3 | No approval/double approval, invalid references/budget, unknown submission, late result, local retry | Generation integration | Không tạo trước duyệt; một job; không auto retry/late grant | Đạt | PASS |
| T4 | Invalid signatures, decode, junction, imported image, duration/offset/rate | Ingest/schema/proposal integration | Không ready/grant sai; chặn vượt media end | Đạt | PASS |
| T5 | Core node graph/parents/cycles/keyframes/text escaping | Unit + real MP4 frame comparison | Chặn code/URLs; có chuyển động thật giữa frames | Đạt | PASS |
| T6 | Config UI, fake Gemini photo, preview/apply/undo/redo, real fox animation, responsive | Playwright 1440/768/390 | Không page errors, decoded outputs | Đạt | PASS |
| T7 | Native Code Mode + app tools + production server + package without Vite/global FFmpeg | Packaged checker | Pending approval trước create; media → grant → proposal → render | Đạt | PASS |
| T8 | Google login/Gemini image/quota thật | Chưa có config/tài khoản được user nhập trong lượt này | Không dùng cookie/key sẵn trên máy làm fallback | Không gọi provider thật | NOT TESTED |
| T9 | API key configure/reopen/rotate/delete, malformed key/budget, headers/status leakage | Secure-store/provider integration + UI | Key được mã hóa, version cũ bị chặn, header riêng cho từng auth mode, public status không chứa key | Đạt | PASS |

Verification cuối:

- `npm run typecheck`: PASS.
- `npm test`: **230 Vitest tests + 41 SIWC checks passed**, **1 SIWC check dành cho Unix skipped trên Windows**.
- Existing assistant UI check: PASS; scene UI check: PASS.
- `npm run package:windows`: PASS.
- `scripts/check-packaged-app.ts` với release `ICEGOZI-Video-win32-x64-1791641924764`: PASS, gồm native toolbox, scene checker, API-key config qua bridge production + Windows DPAPI thật, production UI/API, SQLite và render thực. Lượt đầu bị giới hạn 180 giây khi render đạt 98%, không có lỗi render trong database; outer timeout tăng lên 360 giây để bao đủ hai bước render và DPAPI, giữ nguyên assertions và timeout của từng stage. Lượt kiểm tra lại hoàn tất với exit 0.

Evidence local: `build/evidence/scene-generation/fox-first.png`, `fox-bent.png`, `ui-1440.png`, `ui-768.png`, `ui-390.png`, `gemini-api-key-1440.png`, `gemini-api-key-768.png`, `gemini-api-key-390.png`; logs và collector dưới `build/review/scene-generation/`. Đây là artifacts kiểm thử, không ghi credentials thật.

## 5. Patch tối thiểu

Patches đã áp dụng vào implementation, nên không đưa lại diff để áp dụng lần hai:

- I1: routes reserve/ack + typed lease trong reducer; endpoint consume cũ giữ cho tương thích và bị chặn khi đã có reservation, frontend mới dùng reserve/ack.
- I2: kiểm tra epoch/project/turn/snapshot trước mutations; UI lọc owner, abort polling và revoke Blob URLs khi đổi phiên/unmount.
- I3: deferred recovery + `proper-lockfile` trên workspace SQLite; không recovery trong constructor trước khi backend nhận request.
- I4: encrypted-store write có lock/CAS và kiểm tra operation sau encrypt; callback cleanup chỉ đóng pending login của chính callback.
- I5: shared ingest kiểm tra signature/probe/decode/hash; dùng trusted typed alias cho image demuxer rồi promote immutable asset.
- I6: mỗi attempt có thư mục riêng; retry local cập nhật conversation/epoch, không dùng lại props của process cũ.
- I7: form cấu hình được key theo assistant epoch, nên dữ liệu nhập của phiên cũ bị bỏ khi đổi phiên/profile.

API-key extension giữ tương thích record OAuth cũ. Key ví dụ trong chat không được lưu hoặc gọi API; placeholder bị chặn khi lưu. Chỉ Node backend lấy key từ DPAPI và gửi `x-goog-api-key` tới endpoint Google cố định, không có key trong URL/body/tool outputs hoặc package. Trạng thái đã cấu hình không khẳng định quota/billing. Dùng model ảnh hiện hành thay vì model chat trong curl mẫu.

Phạm vi còn giới hạn: core là hoạt họa vector, Gemini là ảnh tĩnh; không ship local model sinh footage chân thực. Không có GC tự động cho source media hoặc tự cấp grant cho orphan file. Package có guide, native/runtime/media binaries và workflow skill; không seed developer uploads/user projects/credentials vào release.
