# Code Review: `master` → `master` — khảo sát tích hợp tạo cảnh AI

**Phạm vi:** so sánh branch mặc định `master...HEAD` có **0 file thay đổi** tại thời điểm bắt đầu; base/head `573334a`. Để hiểu tính năng hiện tại, khảo sát thêm hai commits `8247951..573334a`: **44 files (+1370/−356)**. Đây là phạm vi tham chiếu kiến trúc, không giả lập một feature branch chưa tồn tại.

**Đã review kỹ:** tools/capabilities/skills, service ownership và proposal flow, reducer/hook apply, asset paths/upload, schema SQLite, metadata probe, production server và scripts build/package. **Chỉ lướt:** package lock, UI style/text-motion ngoài đường tạo cảnh, phần render không thay đổi. Không coi đây là audit toàn bộ lịch sử repository hoặc xác nhận quyền truy cập provider thật.

**Tóm tắt:** ICEGOZI đã có agent gọi công cụ editor và render trong app local/portable, nhưng chưa có service sinh ảnh/clip AI. Thông báo trong ảnh phản ánh capability hiện tại; thêm skill hoặc bật boolean không đủ. Cần nối provider jobs → media ingest → registry/grants → proposal → editor apply, đồng thời xử lý race mất draft hiện hữu trước khi tái sử dụng flow này.

**Kết luận:** 🟡 Cần sửa Important I1 trước khi coi luồng apply cảnh mới hoàn chỉnh. `NOT READY TO MERGE` đối với bản triển khai tạo cảnh sắp tới; chưa có bản triển khai để xác nhận merge. Không kết luận rằng toàn bộ app hiện có không chạy.

Tài liệu triển khai: [Prompt tạo cảnh AI](ai-scene-generation-implementation.md).

Collector của skill đã chạy cho `master` và `8247951`, tạo diff/file lists dưới `build/review/scene-generation/`. Phần tổng hợp line counts của Bash lỗi `/dev/fd` trên môi trường Windows này; số liệu ở trên được kiểm tra lại bằng `git diff --shortstat 8247951`. Working tree ban đầu sạch. Không sửa mã ứng dụng trong lần khảo sát này.

Các điểm thiếu chức năng, **không phân loại thành bug**:

| Điểm | Bằng chứng | Hướng triển khai |
| --- | --- | --- |
| Chưa sinh tư liệu | `src/application/assistant/editorCapabilities.ts:23`: `generation: { images: false, footage: false, voice: false, music: false, transcription: false }` | Provider adapter + durable jobs + truthful capabilities |
| Không nhận asset mới ngoài snapshot | `src/application/assistant/projectProposals.ts:69`–`:70`: `new Set(projectAssets(base))` và reject nguồn ngoài set | Asset registry/grants + policy dùng chung cả server/reducer; không bỏ allowlist |
| Assets panel chưa là thư viện độc lập | `src/editor/components/assets/AssetPanel.tsx:151` suy danh sách từ `state.project.scenes`; upload thêm scene ngay | Registry/listing riêng cho ready media chưa có trên timeline |
| Upload chưa ghi registry DB | `src/infrastructure/server/renderApiPlugin.ts:573` trả local URL sau rename; handler không gọi registry | Shared ingest service, transaction và recovery |
| Probe phụ thuộc môi trường máy | `src/infrastructure/ffmpeg/FfprobeClient.ts:26`, `:42`, `:59`; packager hiện ship Node/Codex/Chrome | Nếu generation dùng probe/normalize, ship và resolve FFprobe/FFmpeg rõ ràng |
| Provider không tự có từ ChatGPT login | SIWC không hỗ trợ image generation tools; Sora/Videos API đã đóng 24/09/2026 | Credential/provider riêng, không dùng SIWC token thay thế |

Hai giới hạn provider được đối chiếu tại ngày khảo sát từ [OpenAI SIWC limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) và [OpenAI Video generation](https://developers.openai.com/api/docs/guides/video-generation). SDK có method cũ không chứng minh dịch vụ còn hoạt động. Runway là lựa chọn adapter được đề xuất trong prompt; chưa gọi provider thật.

## 1. Critical issues

Không phát hiện trong phạm vi đã review. Các nguy cơ secrets, SSRF, chi phí trùng và wrong-owner callbacks của generation là yêu cầu thiết kế cho tính năng mới, chưa phải lỗi đã hiện diện ở service generation vì service đó chưa tồn tại.

## 2. Important issues

### I1. Draft bị mất nếu editor đổi trong lúc apply chờ HTTP — `src/application/assistant/assistantService.ts:L437`, `src/editor/hooks/useAssistant.ts:L142` `[async]`

**Vấn đề:** frontend gửi snapshot tại lúc bấm Apply. Backend validate snapshot đó và xóa proposal trước khi trả về. Nếu editor tăng revision hoặc đổi project/epoch trong lúc request đang chờ, reducer kiểm tra state mới và từ chối. Draft đã bị consume nên không còn để user xem/lập lại. Đây là lỗi hiện hữu ở đường handoff, không phải lỗi do generation mới gây ra.

**Hậu quả:** mất bản nháp sau xung đột; project và manual edit vẫn được giữ, không bị ghi đè. Người dùng phải yêu cầu agent tạo lại draft dù media có thể đã tạo xong.

**Bằng chứng — backend:**

```ts
    try { validateProposal(snapshot.project, snapshot.revision, epoch, proposal); }
    catch { throw new AssistantError('proposal_conflict', 'Project đã thay đổi. Hãy tạo proposal mới từ snapshot hiện tại.', 409); }
    conversation.view.proposals = conversation.view.proposals.filter((entry) => entry.id !== proposalId);
    this.emit(conversation);
    return structuredClone(proposal);
```

**Bằng chứng — frontend:**

```ts
  const apply = (proposal: ProjectProposal) => run(async () => {
    const validated = await assistantRequest<ProjectProposal>('proposal/apply', { ...owner(), proposalId: proposal.id, snapshot: snapshot() });
    dispatch({ type: 'APPLY_AI_PROJECT_CHANGE', proposal: validated });
  });
```

Reducer tại `src/editor/state/editorStore.tsx:215` gọi `validateProposal(state.project, state.revision, state.assistantEpoch, action.proposal)` rồi giữ state cũ khi conflict.

**Tái hiện:** script fixture `build/review/scene-generation/reproduce-draft-loss.ts` gọi service hiện có, thay editor revision trong lúc promise đang chờ và chạy reducer thật. Kết quả:

```json
{"editorRejectedStaleDraft":true,"serverDraftsRemaining":0,"originalProjectPreserved":true}
```

**Fix:** → Patch I1 là mitigation tối thiểu để giữ draft. Fix hoàn chỉnh cần reserve/lease/ack, idempotent recovery và guard hai tabs như mục 10 trong prompt. Không merge patch mitigation độc lập vì nó thay semantics consume hiện được test tại `tests/integration/assistant-service.test.ts:78`.

| # | Severity | File / Area | Finding | Risk | Minimal Patch | Status |
| --- | --- | --- | --- | --- | --- | --- |
| I1 | IMPORTANT | Proposal handoff | Backend consume trước khi reducer áp dụng | Mất draft khi concurrent edit/network gap | Giữ draft, rồi bổ sung reserve/ack | OPEN |
| M1 | MINOR | Tool metadata | Status tool chỉ mô tả preview dù hỗ trợ final | Agent hiểu thiếu phạm vi tool | Sửa description | OPEN |

## 3. Minor improvements

- **M1.** `src/application/assistant/editorTools.ts:L14` `[compat]` — `get_render_status` mô tả “preview job”, trong khi `renderStatus()` tra `conversation.view.renders` của cả preview/final. Sửa description thành render job preview/final. Thay đổi này làm toolset hash đổi; cơ chế refresh native thread hiện có đã xử lý tình huống đó.

## 4. Test cases cần thêm

Các tests dưới đây là công việc cho bước triển khai, chưa được thêm vào suite trong lượt review này.

| # | File test | Test case | Input / Điều kiện | Kỳ vọng | Bảo vệ |
| --- | --- | --- | --- | --- | --- |
| T1 | `tests/integration/assistant-service.test.ts`, UI check | Edit trong lúc apply HTTP chờ | Response trì hoãn, tăng editor revision trước dispatch | Manual edit giữ nguyên; draft còn/released reservation; không auto replay | I1 |
| T2 | Proposal reserve/ack tests | Hai tabs và lost ack | Cùng proposal, competing leases, disconnect sau reducer apply | Một active reservation; ack idempotent; không double history | I1 |
| T3 | `tests/integration/scene-generation.test.ts` mới | Duyệt và submit trùng | Một plan, hai accept requests cùng lúc | Một job/submit/budget reservation, trước duyệt zero submits | Generation cost |
| T4 | Generation recovery tests mới | Provider nhận nhưng mất response | Timeout hoặc crash trước persist task ID | `submission_unknown`, không resubmit tự động | Duplicate charge |
| T5 | Asset ingest tests mới | Download/probe fail | Oversize stream, redirect private IP, HTML giả MP4, corrupt image, disk full | Không ready/grant; cleanup chỉ owned temp; không app crash | File boundary |
| T6 | `tests/unit/assistant-proposals.test.ts` | Generated asset allowlist | Ready grant cùng owner/project và key bịa/owner khác | Chỉ key thật được cấp qua cả backend/frontend | Asset authorization |
| T7 | Generation ownership tests mới | Kết quả về sau đổi profile/project | Submit project A, chuyển B rồi task A hoàn tất | B không bị sửa/hiển thị nhầm; kết quả scoped A | Async ownership |
| T8 | `scripts/check-packaged-app.ts` | Portable tạo cảnh → render | Fixture output thật, bundled Node/probe, không Vite/global tools | Media decode được, proposal/apply/undo và MP4 chạy trong package | Distribution |

Đã chạy lại trong lần khảo sát này:

| # | Verification | Method | Result | Status |
| --- | --- | --- | --- | --- |
| 1 | Type safety hiện tại | `npm run typecheck` | Exit 0 | PASS |
| 2 | Proposal/skills/service/upload/production/persistence/output scope | Vitest 7 files liên quan | 48 tests passed | PASS |
| 3 | Frontend + backend build | `npm run build:app` | Exit 0; có warnings annotation Zod và chunk >500 kB | PASS |
| 4 | Race mất draft | Script fixture dùng service/reducer thật | Tái hiện được I1; manual project giữ nguyên | PASS |
| 5 | Generation live/API entitlement | Không có generation service hoặc credential được cấu hình cho khảo sát | Chưa thực hiện | NOT TESTED |
| 6 | UI/portable generation mới | Chưa có implementation | Không lấy kết quả test package cũ làm bằng chứng feature mới | NOT TESTED |

Các existing tests đạt không phủ race tổng hợp I1: unit test đã chứng minh reducer từ chối stale proposal, integration test đã chứng minh server consume, nhưng chưa nối hai hành vi với concurrent edit giữa chúng.

## 5. Patch tối thiểu

Chỉ là diff đề xuất, **chưa áp dụng vào source**.

### Patch I1 — giữ draft đến khi có xác nhận áp dụng

```diff
--- a/src/application/assistant/assistantService.ts
+++ b/src/application/assistant/assistantService.ts
@@ -435,6 +435,5 @@
     try { validateProposal(snapshot.project, snapshot.revision, epoch, proposal); }
     catch { throw new AssistantError('proposal_conflict', 'Project đã thay đổi. Hãy tạo proposal mới từ snapshot hiện tại.', 409); }
-    conversation.view.proposals = conversation.view.proposals.filter((entry) => entry.id !== proposalId);
-    this.emit(conversation);
+    // Retain the draft until a client acknowledgement confirms a successful apply.
     return structuredClone(proposal);
   }
```

Diff này chỉ tránh xóa sớm. Nó **chưa triển khai acknowledgement hoặc reservation**, làm thay đổi expectation consume-once của test hiện tại và chưa ngăn hai tabs lấy cùng draft. Cần hoàn thiện protocol + callers/tests ở mục 10 của prompt trước merge; không bỏ stale revision/fingerprint/epoch guard để làm test qua.

### Patch M1 — mô tả đúng phạm vi status tool

```diff
--- a/src/application/assistant/editorTools.ts
+++ b/src/application/assistant/editorTools.ts
@@ -14,1 +14,1 @@
-  { name: 'get_render_status', description: 'Read a preview job belonging to this conversation.', inputSchema: { type: 'object', properties: { jobId: { type: 'string' } }, required: ['jobId'], additionalProperties: false } },
+  { name: 'get_render_status', description: 'Read a preview or final render job belonging to this conversation.', inputSchema: { type: 'object', properties: { jobId: { type: 'string' } }, required: ['jobId'], additionalProperties: false } },
```

Hai patch đã được kiểm tra cú pháp/context bằng `git apply --check --unidiff-zero` trên HEAD khảo sát, không apply. Patch I1 vẫn là mitigation có giới hạn như trên; chưa claim lỗi đã được sửa.
