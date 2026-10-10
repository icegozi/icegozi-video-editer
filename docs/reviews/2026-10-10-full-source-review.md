# Code Review: `master@a22edd9` — toàn bộ source

**Phạm vi:** snapshot hiện tại của `src/`, `scripts/`, `projects/`: 161 file TypeScript/TSX, 13.316 dòng; đối chiếu tests, cấu hình, schema SQLite và tài liệu. Working tree sạch trước review. Repository chỉ có branch `master`; đây là review toàn bộ source, không phải review một diff rỗng so với chính `master`.

**Đã review kỹ:** editor reducer và persistence; upload/render API; SQLite snapshots; timeline và renderer; assistant service, proposal validation, JSONL runtime, OAuth và protected storage; các luồng UI gọi những thành phần này. **Chỉ lướt:** barrel exports, constants/styles, lockfile, schema protocol sinh tự động và một phần assertion/fixture trong tests. Không đánh giá nội dung media ngoài source.

**Tóm tắt:** Có 2 Critical và 14 Important cần sửa. Các rủi ro lớn nhất là ghi đè media gốc, crash khi chỉnh duration, persistence báo thành công khi chưa lưu đúng, và sai timeline sau split/crossfade. Typecheck, build và test mặc định đều pass, nhưng E2E giao diện thất bại và các tái hiện bổ sung xác nhận những lỗi chưa được test hiện tại bảo vệ.

**Kết luận:** 🔴 Không nên coi snapshot hiện tại là sẵn sàng merge/phát hành trước khi xử lý Critical và Important.

Các patch ở mục 5 là đề xuất, chưa áp dụng vào source. Patch ghi rõ “mitigation” chỉ giảm rủi ro trước mắt; prompt sửa kèm theo yêu cầu hoàn thành giải pháp đầy đủ và regression tests.

## 1. Critical issues

### C1. Upload trùng tên ghi đè media gốc — `src/infrastructure/server/renderApiPlugin.ts:184` `[logic][security]`

**Vấn đề:** Tên file chỉ được sanitize rồi dùng trực tiếp làm storage key. `writeFileSync` dùng chế độ ghi đè mặc định; không có tên duy nhất, exclusive create hoặc kiểm tra đích qua realpath.

**Hậu quả:** Import hai video khác nhau cùng tên `same.mp4` thay thế file đầu, làm mọi project tham chiếu file đó đổi nội dung. Mâu thuẫn trực tiếp với quy tắc media nguồn bất biến trong MEMORY.md.

**Bằng chứng:**

```ts
const safeFilename = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
const targetPath = path.resolve(targetDir, safeFilename);
fs.writeFileSync(targetPath, buffer);
```

**Tái hiện:** Gọi middleware với thư mục assets tạm; upload `ORIGINAL SOURCE`, sau đó `SECOND UPLOAD`, cùng header `x-file-name: same.mp4`. File cuối chứa `SECOND UPLOAD`; source cũ không còn.

**Fix:** → Patch C1. Dùng storage key duy nhất và `wx`; giải pháp đầy đủ cần kiểm tra realpath/junction, loại media và atomic upload.

### C2. Chỉnh duration hoặc split có thể làm crash toàn bộ editor — `src/editor/state/editorStore.tsx:131` `[logic][edge]`

**Vấn đề:** `pushHistory` và `LOAD_PROJECT` gọi `buildTimeline` mà không xử lý lỗi. Slider cho phép duration 15; demo có fade 15 và validator yêu cầu transition ngắn hơn scene. Split gần đầu cũng giữ transition quá dài trong scene con.

**Hậu quả:** Thao tác hợp lệ trên UI gây exception trong React reducer; EditorApp không có error boundary để giữ workspace. Thay đổi chưa autosave có thể mất khi phải reload.

**Bằng chứng:**

```ts
export function pushHistory(state: EditorState, newProject: VideoProject): EditorState {
  const newTimeline = buildTimeline(newProject);
```

```ts
if (transDuration >= item.durationInFrames) {
  throw new InvalidTimelineError(
```

**Tái hiện:** Scene duration 120, transition 15; dispatch `UPDATE_SCENE` với duration 15 → `transition duration (15) must be strictly less than scene duration (15)`. Slider demo và trim đều có thể tạo giá trị này.

**Fix:** → Patch C2. Mitigation giữ nguyên state khi timeline không hợp lệ. Sửa đầy đủ phải có thông báo validation, clamp/ràng buộc duration phù hợp và không đổi selection/history/revision khi từ chối edit.

## 2. Important issues

### I1. Browser revision và SQLite revision khác nghĩa; lỗi sync bị nuốt — `src/infrastructure/db/projectDbService.ts:39` `[logic][async]`

**Vấn đề:** Browser tăng revision khi edit, SQLite tăng revision mỗi lần save, kể cả save lại cùng nội dung hoặc render. Client gửi editor revision nhưng không nhận/áp dụng server revision, không await fetch và không kiểm tra HTTP status.

**Hậu quả:** SQLite từ chối bản mới sau nhiều manual save/render, trong khi UI vẫn báo đã lưu. LocalStorage còn giữ bản local, nhưng bản SQLite có thể cũ mà người dùng không biết.

**Bằng chứng:**

```ts
if (options.revision !== undefined && options.revision < existing.currentRevision) {
  throw new Error(
```

```ts
targetRevision = existing.currentRevision + 1;
```

```ts
fetch('/api/projects', {
```

**Tái hiện:** Save cùng project với client revision 1 ba lần: SQLite trả revision 1, rồi 2, rồi `Stale revision conflict`. Client hiện không phát hiện HTTP 400. `renderService.createJob` cũng gọi `saveProject(validated)` và làm tăng counter.

**Fix:** → Patch I1, mitigation hiển thị lỗi sync thay vì nuốt lỗi. Giải pháp đầy đủ: tách editor revision/server revision; CAS bằng expected server revision và fingerprint; save idempotent; render snapshot không cập nhật “latest edited project”; trạng thái local save và SQLite sync riêng; xử lý save completion theo revision/epoch.

### I2. Import JSON báo đã lưu nhưng không lưu project vừa import — `src/editor/state/editorStore.tsx:390` `[logic]`

**Vấn đề:** `importJson` dispatch `LOAD_PROJECT`; reducer đặt `saveStatus: 'saved'`. Autosave chỉ chạy khi status là `dirty`.

**Hậu quả:** Refresh ngay sau import, kể cả chờ quá debounce 800ms, vẫn mở project trước đó hoặc demo. Status “Đã lưu” không phản ánh dữ liệu trên disk/browser storage.

**Bằng chứng:**

```ts
dispatch({ type: 'LOAD_PROJECT', project: imported });
```

```ts
revision: action.revision ?? state.revision + 1,
saveStatus: 'saved',
```

**Tái hiện bằng Edge headless:** Import project `Imported review project`, chờ 1.200ms: `icegozi_current_project` vẫn `null`; reload trở lại `The Beauty of Mathematics`.

**Fix:** → Patch I2. Phân biệt restore từ dữ liệu đã persist và import/new workspace cần persist. Không autosave đè dữ liệu trước khi initial hydration hoàn tất.

### I3. SQLite roundtrip làm mất project metadata/schemaVersion — `src/infrastructure/db/projectDbService.ts:96` `[compat]`

**Vấn đề:** Snapshot chỉ lưu scenes/audio/subtitles/trackSettings. `getProject` thay domain metadata bằng metadata do database tự tạo; không khôi phục schemaVersion.

**Hậu quả:** `author`, `tags`, thông tin branding và các trường metadata người dùng mất sau save/load qua SQLite. Bản được gọi là snapshot không giữ trọn project.

**Bằng chứng:**

```ts
timelineData: {
  scenes: project.scenes as any,
  audioTracks: (project.audioTracks || []) as any,
  subtitles: (project.subtitles || []) as any,
},
```

```ts
metadata: {
  currentRevision: projectRecord.currentRevision,
  lastEditedAt: projectRecord.lastEditedAt,
},
```

**Tái hiện:** `{brand:'icegozi', tags:['draft']}` trở thành `{currentRevision:1,lastEditedAt:...}`; schemaVersion không xuất hiện trong project đọc lại.

**Fix:** → Patch I3. Lưu domain metadata/schemaVersion trong JSON snapshot, giữ tương thích snapshot cũ; metadata điều phối persistence nên nằm ngoài domain project.

### I4. Split sao chép outgoing crossfade vào cả hai nửa — `src/editor/state/editorStore.tsx:278` `[logic]`

**Vấn đề:** Cả `scenePart1` và `scenePart2` spread scene gốc nên cùng giữ outgoing transition. `buildTimeline` thêm một overlap tại chính điểm split.

**Hậu quả:** Split làm project ngắn đi, scene sau dịch sớm và audio/subtitles không còn đồng bộ như trước. Split cũng thêm fade không mong muốn nếu transition gốc là fade.

**Bằng chứng:**

```ts
const scenePart1: SceneConfig = {
  ...originalScene,
  durationInFrames: offsetInScene,
};
```

**Tái hiện:** A=120f, outgoing crossfade=15f, B=120f: tổng 225f. Split A tại 60f cho tổng 210f. Hai nửa vẫn có transition 15f.

**Fix:** → Patch I4. Nửa đầu không có outgoing transition; nửa sau giữ outgoing transition gốc. Kiểm tra cả incoming/outgoing và giới hạn source video trước khi commit split.

### I5. Timeline chấp nhận crossfade dài hơn scene kế tiếp — `src/application/timeline/validateTimeline.ts:46` `[logic][edge]`

**Vấn đề:** Validator chỉ so transition với scene sở hữu transition; không so với scene nhận incoming transition hoặc tổng incoming + outgoing overlap trong scene giữa. Proposal validator có một phần kiểm tra riêng nhưng import/manual/render không dùng nó.

**Hậu quả:** Scene có thể kết thúc ngoài tổng duration, overlap ba scene hoặc bị cắt mất nội dung khi export.

**Bằng chứng:**

```ts
if (transDuration >= item.durationInFrames) {
  throw new InvalidTimelineError(
```

**Tái hiện:** A=100f, crossfade=80f, B=30f được chấp nhận. `totalDurationInFrames=50`, trong khi A kết thúc ở frame 100.

**Fix:** → Patch I5. Validation chung phải bảo vệ cả hai scene và không cho incoming + outgoing crossfade vượt duration scene giữa; schema/import, timeline và proposal dùng cùng quy tắc.

### I6. Khóa track không chặn các edit thủ công — `src/editor/state/editorStore.tsx:253` `[logic]`

**Vấn đề:** Nút Lock chỉ cập nhật `trackSettings`. UPDATE/DELETE/SPLIT/DUPLICATE, inspector, trim và keyboard shortcuts không kiểm tra lock. Chỉ AI proposal có validation lock.

**Hậu quả:** Track khóa vẫn bị sửa/xóa. Thay đổi scene ở track khác còn có thể dịch thời gian của scene khóa do timeline tuần tự.

**Bằng chứng:**

```ts
case 'DELETE_SCENE': {
  if (state.project.scenes.length <= 1) return state;
  const filteredScenes = state.project.scenes.filter((s) => s.id !== action.sceneId);
  return pushHistory(state, { ...state.project, scenes: filteredScenes });
}
```

**Tái hiện:** Lock V1 trong project hai text scenes; dispatch DELETE scene A vẫn giảm số scene từ 2 xuống 1.

**Fix:** → Patch I6. Tách validation locked content dùng chung và gọi trước commit manual edit. Cho phép unlock; không khóa cả workspace nếu chỉ một track khóa. Không chỉ disable nút trên UI.

### I7. Hide V2 không tác động preview/export; Hide V1 ẩn cả V2 — `src/video/compositions/MainVideo/MainVideo.tsx:16` `[logic]`

**Vấn đề:** Timeline phân text/formula vào V2 khi có primary media; MainVideo chỉ dùng `V1.hidden` để bật/tắt toàn bộ visual sequences.

**Hậu quả:** Người dùng ẩn overlay trên timeline nhưng overlay vẫn xuất hiện trong video. Ẩn V1 lại làm mất toàn bộ visual V2.

**Bằng chứng:**

```ts
const isVisualHidden = Boolean(project.trackSettings?.['V1']?.hidden);
```

```tsx
{!isVisualHidden &&
  timeline.computedScenes.map((computed) => (
```

**Fix:** → Patch I7. Dùng cùng helper phân track cho Timeline, renderer và lock validator; filter riêng từng scene, giữ thời gian timeline khi hide. Quy định subtitle hidden cũng cần áp dụng nếu hỗ trợ setting đó.

### I8. Mất draft khi gửi lỗi hoặc chuyển tab — `src/editor/components/chat/AiChatPanel.tsx:65` `[async][logic]`

**Vấn đề:** Prompt được clear trước khi request được chấp nhận; `useAssistant.run` nuốt lỗi. Draft nằm trong local state của component bị unmount khi chuyển sang Assets.

**Hậu quả:** Người dùng mất yêu cầu chưa gửi khi mạng/bridge lỗi hoặc chỉ đổi tab.

**Bằng chứng:**

```ts
const handleSendPrompt = (text: string) => {
  if (!text.trim()) return;
  setPromptText('');
  void assistant.send(text.trim());
};
```

```tsx
{activeTab === 'ai' ? <AiChatPanel /> : <AssetPanel />}
```

**Tái hiện bằng Edge:** `/api/codex/turn` trả HTTP 503 → textarea `""`. Đi Assets rồi về AI Studio → draft cũng `""`.

**Fix:** → Patch I8. Mitigation giữ draft và giữ mounted panel. Sửa đầy đủ: draft thuộc workspace/project, clear sau acknowledgment và chỉ clear đúng draft đã gửi; không xóa nội dung người dùng gõ mới trong lúc chờ.

### I9. ID chỉ duy nhất từng collection nhưng selection dùng namespace chung — `src/schemas/project.schema.ts:47` `[logic][compat]`

**Vấn đề:** Scene/audio/subtitle dùng ba Set riêng nên cùng ID giữa các loại vẫn hợp lệ. `selectedClipId` không chứa loại; inspector, reconciliation và Delete dùng ID chung.

**Hậu quả:** Chọn audio có ID trùng scene có thể chọn/sửa/xóa nhầm scene. AI assistant lại từ chối project này vì validateCandidate yêu cầu ID duy nhất toàn project.

**Bằng chứng:**

```ts
const sceneIds = new Set<string>();
```

```ts
const audioIds = new Set<string>();
```

```ts
const subtitleIds = new Set<string>();
```

**Tái hiện:** Scene `id:'a'` và audio `id:'a'` cùng project → `VideoProjectSchema.safeParse(...).success === true`.

**Fix:** → Patch I9. Enforce global uniqueness hoặc dùng typed selection. Với schema v1, nên reject rõ lỗi import; nếu migrate IDs phải cập nhật trackSettings và mọi reference, không đổi âm thầm.

### I10. Invalid render profile tạo job mồ côi trước khi trả lỗi — `src/application/render/renderService.ts:234` `[edge]`

**Vấn đề:** API cast profile thay cho runtime validation. Service ghi project, snapshot, job và file props trước khi đọc `RENDER_CONFIG[job.profile]`.

**Hậu quả:** Payload `{profile:'typo'}` tạo bản ghi `rendering` không có process, rồi request lỗi; job và file props không được dọn.

**Bằng chứng:**

```ts
const profile = (body.profile as RenderProfile) || RenderProfile.Preview;
```

```ts
const profileSettings = RENDER_CONFIG[job.profile];
```

**Tái hiện:** createJob với profile `typo` ném `Cannot read properties of undefined (reading 'crf')`; listJobs vẫn trả `{profile:'typo',status:'rendering'}`.

**Fix:** → Patch I10. Validate enum trước mọi side effect, kể cả caller gọi trực tiếp service; xử lý startup/spawn/write failure thành terminal status và cleanup.

### I11. Cancel trước response tạo job vẫn tiếp tục render — `src/editor/components/export/ExportModal.tsx:101` `[async]`

**Vấn đề:** Cancel chỉ gửi request nếu `activeJobIdRef` đã có ID. Khi POST tạo job còn chờ, Cancel đổi UI sang idle nhưng không vô hiệu hóa continuation của startRender. Response tới sau vẫn đặt ID và bắt đầu polling.

**Hậu quả:** Tác vụ đã hủy vẫn chạy, UI có thể báo completed; nếu bắt đầu render khác, response/poll cũ có thể ghi đè trạng thái mới.

**Bằng chứng:**

```ts
const jobId = data.job.id;
activeJobIdRef.current = jobId;
```

```ts
if (activeJobIdRef.current) {
  try {
    await fetch(`/api/render/cancel/${activeJobIdRef.current}`, { method: 'POST' });
```

**Tái hiện bằng Edge:** Hoãn POST response, bấm Cancel, rồi trả job ID. Có 0 cancel request; UI vẫn chuyển sang `Render completed successfully!` khi status mock báo completed.

**Fix:** → Patch I11. Dùng operation generation/request ID; khi response thuộc request đã hủy tới, hủy job vừa nhận và không attach polling. Mỗi poll kiểm tra ownership trước cập nhật; cleanup/unmount vô hiệu hóa continuation.

### I12. E2E vẫn kiểm tra AssistantPanel cũ — `tests/e2e/assistant-ui.check.ts:58` `[test][compat]`

**Vấn đề:** Test tìm nút `Trợ lý AI`, panel `aria-label="Trợ lý AI"`, `Continue with ChatGPT`, label/button/status cũ. EditorShell hiện render LeftWorkspace/AiChatPanel. npm test không chạy test E2E này.

**Hậu quả:** Không có gate đang hoạt động cho UI hiện tại, apply/undo, login và preview MP4 sau redesign. npm test pass không chứng minh E2E pass.

**Bằng chứng:**

```ts
await page.getByRole('button', { name: 'Trợ lý AI', exact: true }).click();
const panel = page.getByRole('complementary', { name: 'Trợ lý AI' });
```

**Kết quả chạy:** `npm run test:assistant-ui` exit 1, timeout 20.000ms tại line 58.

**Fix:** → Patch I12. Cập nhật flow/test IDs theo UI hiện tại, dùng fixture tool call để yêu cầu preview và kiểm tra approval; giữ kiểm tra MP4 thật, apply/undo/redo và origin guard. Không skip test hoặc dựng lại panel cũ để chiều test.

### I13. UI mới mất Add account và chọn profile — `src/editor/components/chat/AiChatPanel.tsx:261` `[compat]`

**Vấn đề:** Panel cũ có `assistant.login(true)` và `assistant.selectProfile`; panel mới chỉ gọi `assistant.login()` và logout. Không có consumer của profile list để chọn tài khoản trong flow đang được render.

**Hậu quả:** Người dùng không thể thêm/chọn tài khoản riêng hoặc nâng cấp registration cũ bằng thao tác UI. Login mặc định tiếp tục dùng registration/profile hiện tại và subject guard từ chối đổi sang người khác, nên logout/login không thay được flow thêm profile.

**Bằng chứng:**

```tsx
onClick={() => void assistant.login()}
```

Panel cũ tại `src/editor/components/assistant/AssistantPanel.tsx:21` và `:29`:

```tsx
onClick={() => void assistant.login(true)}
```

```tsx
onChange={(event) => void assistant.selectProfile(event.target.value)}
```

**Fix:** → Patch I13. Khôi phục Add account/profile selector trong AiChatPanel; giữ subject guard và reset/suspend đúng epoch khi đổi profile. Không nới authentication để đổi identity cùng registration.

### I14. Local API đọc upload/JSON không giới hạn vào RAM — `src/infrastructure/server/renderApiPlugin.ts:175` `[perf][security]`

**Vấn đề:** Toàn bộ upload được giữ trong chunks rồi Buffer.concat; JSON routes cũng nối body không giới hạn. Không có byte limit hoặc request-abort handling như ở Codex API.

**Hậu quả:** Một hoặc nhiều video lớn có thể chiếm hơn hai lần kích thước payload trong RAM và làm bridge local mất ổn định; malformed/oversized JSON cũng không bị chặn sớm. Đây là đường nhập video thực tế, dù server chỉ bind loopback.

**Bằng chứng:**

```ts
const chunks: Buffer[] = [];
req.on('data', (chunk) => {
  chunks.push(chunk);
});
```

```ts
const buffer = Buffer.concat(chunks);
```

**Fix:** → Patch I14. Mitigation thêm byte limit; giải pháp đầy đủ stream upload vào file tạm, validate và promote atomically, abort cleanup; JSON dùng bounded UTF-8 buffer reader và schema. Không tái hiện OOM bằng file khổng lồ trên máy người dùng.

**Cần xác nhận / giới hạn kiểm chứng:** Login OAuth thật, entitlement SIWC, inference thật và resume sau inference chưa chạy. Native initialize/thread/start/restart đã kiểm tra với credential giả, không gửi inference. Recovery render job sau server restart và quản lý concurrency/process tree Windows cần test riêng trước khi coi pipeline đủ ổn định cho tác vụ dài. Review dependency ở mức lock/version alignment; không có kiểm toán CVE hay license toàn dependency tree.

## 3. Minor improvements

- **M1.** `tests/integration/render-jobs.test.ts:2`, `src/infrastructure/db/client.ts:15` `[test]` — Test mặc định import database thật `data/icegozi.sqlite`; render fixture để lại project/jobs. Log npm test đã xác nhận đường dẫn DB thật. Cần isolated memory/temp database trước import; test persistence dùng file tạm riêng và dọn có kiểm tra containment. Các tái hiện bổ sung và E2E review đã dùng DB tạm.
- **M2.** `scripts/render-preview.ts:79` `[logic]` — `process.exit(1)` trong catch kết thúc process trước finally, để lại props temp khi render lỗi. Dùng `process.exitCode = 1`, để finally chạy. → Patch M2.
- **M3.** `README.md:40` `[compat]` — Tài liệu yêu cầu `npm run studio` nhưng package.json không có script `studio`; các link `docs/ARCHITECTURE.md`, WORKFLOW, ADDING_A_SCENE, MEDIA_GUIDE không có file tương ứng trong snapshot. Cập nhật các lệnh/link hoặc thêm tài liệu/script thực sự được hỗ trợ.

## 4. Test cases cần thêm

| # | File test đề xuất | Test case / Input | Kỳ vọng | Bảo vệ |
|---|---|---|---|---|
| T1 | `tests/integration/assets-upload.test.ts` | Hai file cùng tên, khác bytes; concurrent upload; filename unicode | Storage keys khác nhau; hash/bytes file cũ nguyên vẹn | C1 |
| T2 | `tests/integration/assets-upload.test.ts` | Junction/symlink ra ngoài root, file đích tồn tại, abort giữa upload | Không ghi ra ngoài hoặc overwrite; không còn file tạm | C1, I14 |
| T3 | `tests/unit/editor-reducer.test.ts` | Demo fade 15, duration 15; split tại 10; LOAD invalid timeline | Không throw/crash; project/history/revision/selection cũ giữ nguyên; error rõ | C2 |
| T4 | `tests/integration/project-sync.test.ts` | Save lặp cùng revision, render xen giữa, edit/save tiếp, HTTP 400/409/500 | Idempotent/CAS đúng; local và SQLite sync status phản ánh thực tế | I1 |
| T5 | `tests/integration/project-sync.test.ts` | Hai tab/process cùng base; save response đến ngược thứ tự; chuyển project lúc save | Bản cũ không overwrite bản mới; completion không đánh dấu revision mới là saved | I1 |
| T6 | `tests/e2e/persistence.check.ts` | Import JSON, đợi autosave, reload; reset demo; initial hydration | Restore đúng bản import; không ghi đè dữ liệu đã có bởi demo | I2 |
| T7 | `tests/integration/database-sqlite.test.ts` | Metadata/schemaVersion có đủ trường; snapshot legacy thiếu fields | Roundtrip đầy đủ; legacy load vẫn hợp lệ | I3 |
| T8 | `tests/unit/editor-reducer.test.ts` | Split A=120/crossfade15 tại 60, B=120; rates 0.5/1/2 | Tổng 225f; chỉ nửa sau có outgoing transition; source liên tục | I4 |
| T9 | `tests/unit/timeline.test.ts` | A100/crossfade80/B30; scene giữa incoming60 + outgoing60 > duration100 | Từ chối cùng quy tắc ở import/render/proposal; không cắt scene ngoài duration | I5 |
| T10 | `tests/unit/editor-reducer.test.ts` | Locked V1/V2/audio/subtitle; inspector/trim/Delete/Split/Duplicate; ripple từ track khác | Reject nội dung/thời gian track khóa; unlock và edit track thực sự không ảnh hưởng vẫn được | I6 |
| T11 | `tests/integration/track-visibility.test.tsx` | Mixed video + text/formula; hide từng V1/V2; project chỉ text | Timeline, preview, export cùng semantics; duration không đổi | I7 |
| T12 | `tests/e2e/assistant-ui.check.ts` | Turn HTTP 503; tab switch; typing mới khi send pending; IME Enter | Draft giữ đúng; chỉ clear draft đã được chấp nhận; IME không submit sớm | I8 |
| T13 | `tests/unit/validation.test.ts` | ID trùng scene/audio/subtitle; selection audio rồi Delete | Schema reject rõ hoặc typed selection không chạm nhầm scene | I9 |
| T14 | `tests/integration/render-jobs.test.ts` | Profile typo, null, object; write/spawn failure | Không tạo orphan job/snapshot; terminal status/cleanup đúng | I10 |
| T15 | `tests/e2e/export.check.ts` | Delay POST ack, cancel trước ack, bắt đầu job khác, poll cũ đến muộn | Job cũ được cancel; không polling/overwrite UI job mới | I11 |
| T16 | `tests/e2e/assistant-ui.check.ts` | UI hiện tại login/catalog/chat/proposal/apply/undo/redo/approval + real MP4 | Script pass, origin/capability guard giữ nguyên, không inference thật | I12 |
| T17 | `tests/e2e/assistant-ui.check.ts` | Add profile/select profile/pending legacy registration; đổi lúc turn đang chạy | Có controls; epoch đổi; không dùng credential/chat/proposal sai tài khoản | I13 |
| T18 | `tests/integration/local-api-limits.test.ts` | Chunked body vượt limit, JSON UTF-8 bị cắt giữa bytes, client abort | 413/validation thích hợp; tiếng Việt giữ nguyên; không ghi partial source | I14 |

**Đã chạy:** `npm run typecheck` pass; `npm test`: 23 Vitest files/105 tests pass, SIWC 41 pass + 1 skipped; `npm run build:editor` pass (bundle JS khoảng 1.041kB, có warning chunk >500kB và annotation từ Zod); `npm run codex:check` pass; `npm run test:assistant-ui` fail vì selector cũ. Các tái hiện bổ sung dùng Node/Edge với fixture và thư mục/DB tạm, không login/inference thật.

Collector của skill được chạy với base master nhưng gặp lỗi Git Bash `/dev/fd` và counter ở diff rỗng. Phạm vi/clean tree được xác nhận lại bằng git và inventory source; không dùng thống kê diff lỗi để suy ra coverage.

## 5. Patch tối thiểu

Mọi diff dưới đây được tạo từ source thực tại `a22edd9` và kiểm tra bằng `git apply --check --ignore-space-change`. Chưa áp dụng/chưa kiểm chứng hành vi sau vá. Mỗi patch độc lập dựa trên baseline; các patch chạm cùng hàm phải được hợp nhất có chủ đích, không apply tuần tự mù. Prompt yêu cầu giải pháp đầy đủ, không dừng ở mitigation.

### Patch C1 — storage key duy nhất và exclusive create

Fix collision/overwrite. Stream, realpath và media validation phải hoàn thiện cùng I14; không ghi đè lại file nguồn cũ để migrate.

```diff
--- a/src/infrastructure/server/renderApiPlugin.ts
+++ b/src/infrastructure/server/renderApiPlugin.ts
@@ -1,5 +1,6 @@
 import type { Plugin, ViteDevServer } from 'vite';
 import fs from 'node:fs';
+import { randomUUID } from 'node:crypto';
 import path from 'node:path';
 import { renderService } from '../../application/render/renderService';
 import { ProjectDbService } from '../db/projectDbService';
@@ -181,12 +182,13 @@
               const buffer = Buffer.concat(chunks);
               // Read filename from custom header or query
               const originalName = (req.headers['x-file-name'] as string) || `upload_${Date.now()}.mp4`;
-              const safeFilename = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
+              const sanitizedName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
+              const safeFilename = `${randomUUID()}_${sanitizedName}`;
               const targetDir = PATHS.publicVideo;
               fs.mkdirSync(targetDir, { recursive: true });
 
               const targetPath = path.resolve(targetDir, safeFilename);
-              fs.writeFileSync(targetPath, buffer);
+              fs.writeFileSync(targetPath, buffer, { flag: 'wx' });
 
               const publicUrl = `assets/video/${safeFilename}`;
               res.setHeader('Content-Type', 'application/json');
```

### Patch C2 — giữ workspace khi candidate timeline invalid

Mitigation: reject edit/import không hợp lệ và không chọn ID scene chưa tồn tại. Cần error state/feedback riêng và validation trước commit; không coi việc âm thầm return state là nghiệm thu cuối.

```diff
--- a/src/editor/state/editorStore.tsx
+++ b/src/editor/state/editorStore.tsx
@@ -128,7 +128,9 @@
 }
 
 export function pushHistory(state: EditorState, newProject: VideoProject): EditorState {
-  const newTimeline = buildTimeline(newProject);
+  let newTimeline: ProjectTimeline;
+  try { newTimeline = buildTimeline(newProject); }
+  catch { return state; }
   const reconciled = reconcileTimelineState(
     state.currentFrame,
     state.selectedClipId,
@@ -246,6 +248,7 @@
     case 'ADD_SCENE': {
       const newScenes = [...state.project.scenes, action.scene];
       const nextState = pushHistory(state, { ...state.project, scenes: newScenes });
+      if (nextState === state) return state;
       return { ...nextState, selectedClipId: action.scene.id };
     }
 
@@ -306,6 +309,7 @@
       ];
 
       const nextState = pushHistory(state, { ...state.project, scenes: newScenes });
+      if (nextState === state) return state;
       return {
         ...nextState,
         selectedClipId: scenePart2.id,
@@ -330,6 +334,7 @@
       ];
 
       const nextState = pushHistory(state, { ...state.project, scenes: newScenes });
+      if (nextState === state) return state;
       return { ...nextState, selectedClipId: newId };
     }
 
@@ -373,7 +378,9 @@
     }
 
     case 'LOAD_PROJECT': {
-      const timeline = buildTimeline(action.project);
+      let timeline: ProjectTimeline;
+      try { timeline = buildTimeline(action.project); }
+      catch { return state; }
       const reconciled = reconcileTimelineState(
         state.currentFrame,
         state.selectedClipId,
```

### Patch I1 — quan sát lỗi SQLite sync

Mitigation: lỗi HTTP không còn bị báo thành sync success; local snapshot vẫn đã lưu. Counter/CAS, idempotency, offline sync status và render snapshot cần sửa đồng bộ theo prompt, không chỉ áp patch này.

```diff
--- a/src/infrastructure/storage/ProjectStorage.ts
+++ b/src/infrastructure/storage/ProjectStorage.ts
@@ -105,20 +105,13 @@
 
     // Asynchronously sync to backend SQLite database if in browser environment
     if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
-      try {
-        fetch('/api/projects', {
-          method: 'POST',
-          headers: { 'Content-Type': 'application/json' },
-          body: JSON.stringify({
-            project: validated,
-            revision,
-            changeSummary: `Revision ${revision}`,
-          }),
-        }).catch(() => {
-          // Offline fallback
-        });
-      } catch {
-        // Offline fallback
+      const response = await fetch('/api/projects', {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ project: validated, revision, changeSummary: `Revision ${revision}` }),
+      });
+      if (!response.ok) {
+        throw new Error(`Project saved locally; SQLite sync failed (HTTP ${response.status}).`);
       }
     }
 
```

### Patch I2 — import cần persist; restore giữ saved

Trong callers hiện tại, restore truyền revision đã lưu; import không truyền revision. Khi mở rộng callers, chuyển sang action/source flag tường minh.

```diff
--- a/src/editor/state/editorStore.tsx
+++ b/src/editor/state/editorStore.tsx
@@ -387,7 +387,7 @@
         currentFrame: reconciled.currentFrame,
         selectedClipId: reconciled.selectedClipId,
         revision: action.revision ?? state.revision + 1,
-        saveStatus: 'saved',
+        saveStatus: action.revision === undefined ? 'dirty' : 'saved',
         saveError: null,
         lastSavedAt: Date.now(),
         historyPast: [],
```

### Patch I3 — preserve domain fields trong snapshot JSON

Không đổi DDL vì các fields nằm trong JSON. Snapshot legacy thiếu fields đọc thành undefined; API persistence revision nên trả trong record riêng theo I1.

```diff
--- a/src/infrastructure/db/schema/projects.ts
+++ b/src/infrastructure/db/schema/projects.ts
@@ -1,6 +1,8 @@
 import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
 
 export interface TimelineData {
+  schemaVersion?: number;
+  projectMetadata?: Record<string, unknown>;
   scenes: Array<Record<string, unknown>>;
   audioTracks?: Array<Record<string, unknown>>;
   subtitles?: Array<Record<string, unknown>>;
--- a/src/infrastructure/db/projectDbService.ts
+++ b/src/infrastructure/db/projectDbService.ts
@@ -94,6 +94,8 @@
           revision: targetRevision,
           changeSummary: options.changeSummary || `Revision ${targetRevision}`,
           timelineData: {
+            schemaVersion: project.schemaVersion,
+            projectMetadata: project.metadata,
             scenes: project.scenes as any,
             audioTracks: (project.audioTracks || []) as any,
             subtitles: (project.subtitles || []) as any,
@@ -136,6 +138,7 @@
     const timeline = latestSnapshot.timelineData;
 
     return {
+      schemaVersion: timeline.schemaVersion,
       id: projectRecord.id,
       title: projectRecord.title,
       width: projectRecord.width,
@@ -145,10 +148,7 @@
       audioTracks: (timeline.audioTracks || []) as any,
       subtitles: (timeline.subtitles || []) as any,
       trackSettings: (latestSnapshot.trackSettings || {}) as any,
-      metadata: {
-        currentRevision: projectRecord.currentRevision,
-        lastEditedAt: projectRecord.lastEditedAt,
-      },
+      metadata: timeline.projectMetadata,
     };
   }
 
```

### Patch I4 — không thêm transition tại điểm split

Nửa sau vẫn giữ transition gốc. Cần C2/I5 và test split sát incoming/outgoing để không commit scene con không hợp lệ.

```diff
--- a/src/editor/state/editorStore.tsx
+++ b/src/editor/state/editorStore.tsx
@@ -277,6 +277,7 @@
       const originalScene = state.project.scenes[sceneIndex];
       const scenePart1: SceneConfig = {
         ...originalScene,
+        transition: undefined,
         durationInFrames: offsetInScene,
       };
 
```

### Patch I5 — validate incoming và combined overlap

Timeline dùng chung được bảo vệ. Schema/import phải kiểm tra cùng invariant trước LOAD để trả lỗi rõ; không bổ sung một bản quy tắc lệch trong proposal validator.

```diff
--- a/src/application/timeline/validateTimeline.ts
+++ b/src/application/timeline/validateTimeline.ts
@@ -43,6 +43,14 @@
       );
     }
 
+    const incoming = item.incomingTransition?.type === 'crossfade'
+      ? item.incomingTransition.durationInFrames : 0;
+    const outgoing = i < timeline.computedScenes.length - 1 && item.outgoingTransition?.type === 'crossfade'
+      ? item.outgoingTransition.durationInFrames : 0;
+    if (incoming >= item.durationInFrames || incoming + outgoing > item.durationInFrames) {
+      throw new InvalidTimelineError(`Scene "${item.scene.id}" has invalid crossfade overlap.`);
+    }
+
     if (item.scene.transition) {
       const transDuration = item.scene.transition.durationInFrames;
       if (!Number.isFinite(transDuration) || transDuration <= 0) {
```

### Patch I6 — dùng lock content validator cho manual edits

Trích chính kiểm tra locked content hiện có, giữ riêng kiểm tra không đổi lock setting cho AI; manual unlock vẫn hoạt động. Hợp nhất guard với C2 và thêm feedback/test ripple trước nghiệm thu.

```diff
--- a/src/application/assistant/projectProposals.ts
+++ b/src/application/assistant/projectProposals.ts
@@ -46,6 +46,12 @@
       throw new Error('Không được thay đổi track đang khóa.');
     }
   }
+  validateLockedContent(base, candidate);
+  return candidate;
+}
+
+export function validateLockedContent(base: VideoProject, candidate: VideoProject): void {
+  const settings = base.trackSettings ?? {};
   const anyLocked = Object.values(settings).some((s) => s.locked);
   if (anyLocked && (base.fps !== candidate.fps || base.width !== candidate.width || base.height !== candidate.height)) {
     throw new Error('Không được đổi canvas/fps khi có track khóa.');
@@ -70,7 +76,6 @@
     }
   }
   if (settings.subtitles?.locked && canonical(base.subtitles) !== canonical(candidate.subtitles)) throw new Error('Subtitle track đang khóa.');
-  return candidate;
 }
 
 export function validateProposal(base: VideoProject, revision: number, epoch: string | null, raw: unknown): ProjectProposal {
--- a/src/editor/state/editorStore.tsx
+++ b/src/editor/state/editorStore.tsx
@@ -6,7 +6,7 @@
 import { buildTimeline } from '../../application/timeline/buildTimeline';
 import { demoProject } from '../../../projects/demo/project';
 import { generateId } from '../../shared/utils/id';
-import { validateProposal } from '../../application/assistant/projectProposals';
+import { validateProposal, validateLockedContent } from '../../application/assistant/projectProposals';
 import type { ProjectProposal } from '../../shared/types/assistant';
 
 export type PersistenceStatus = 'saved' | 'dirty' | 'saving' | 'error';
@@ -128,7 +128,11 @@
 }
 
 export function pushHistory(state: EditorState, newProject: VideoProject): EditorState {
-  const newTimeline = buildTimeline(newProject);
+  let newTimeline: ProjectTimeline;
+  try {
+    validateLockedContent(state.project, newProject);
+    newTimeline = buildTimeline(newProject);
+  } catch { return state; }
   const reconciled = reconcileTimelineState(
     state.currentFrame,
     state.selectedClipId,
@@ -246,6 +250,7 @@
     case 'ADD_SCENE': {
       const newScenes = [...state.project.scenes, action.scene];
       const nextState = pushHistory(state, { ...state.project, scenes: newScenes });
+      if (nextState === state) return state;
       return { ...nextState, selectedClipId: action.scene.id };
     }
 
@@ -306,6 +311,7 @@
       ];
 
       const nextState = pushHistory(state, { ...state.project, scenes: newScenes });
+      if (nextState === state) return state;
       return {
         ...nextState,
         selectedClipId: scenePart2.id,
@@ -330,6 +336,7 @@
       ];
 
       const nextState = pushHistory(state, { ...state.project, scenes: newScenes });
+      if (nextState === state) return state;
       return { ...nextState, selectedClipId: newId };
     }
 
```

### Patch I7 — honor visibility từng visual track

Sửa renderer hiện tại. Bước triển khai đầy đủ đưa phân loại track vào helper chung cho Timeline/lock checker để không lệch lại.

```diff
--- a/src/video/compositions/MainVideo/MainVideo.tsx
+++ b/src/video/compositions/MainVideo/MainVideo.tsx
@@ -13,7 +13,12 @@
  */
 export const MainVideo: React.FC<MainVideoProps> = ({ project = defaultMainVideoProps.project! }) => {
   const timeline = useMemo(() => buildTimeline(project), [project]);
-  const isVisualHidden = Boolean(project.trackSettings?.['V1']?.hidden);
+  const hasPrimary = project.scenes.some((scene) => scene.type !== 'text' && scene.type !== 'formula');
+  const visibleScenes = timeline.computedScenes.filter(({ scene }) => {
+    const overlay = scene.type === 'text' || scene.type === 'formula';
+    const track = hasPrimary && overlay ? 'V2' : 'V1';
+    return !project.trackSettings?.[track]?.hidden;
+  });
 
   return (
     <AbsoluteFill
@@ -22,8 +27,7 @@
       }}
     >
       {/* Visual Scene Sequence */}
-      {!isVisualHidden &&
-        timeline.computedScenes.map((computed) => (
+      {visibleScenes.map((computed) => (
           <Sequence
             key={computed.scene.id}
             from={computed.startFrame}
```

### Patch I8 — giữ draft khi lỗi/chuyển tab

Mitigation: không clear trước ack, panel còn mounted. Cần clear sau successful acceptance đúng draft và project/profile scoping; không để draft tài khoản cũ đi vào hội thoại mới.

```diff
--- a/src/editor/components/chat/AiChatPanel.tsx
+++ b/src/editor/components/chat/AiChatPanel.tsx
@@ -64,7 +64,6 @@
 
   const handleSendPrompt = (text: string) => {
     if (!text.trim()) return;
-    setPromptText('');
     void assistant.send(text.trim());
   };
 
--- a/src/editor/components/shell/LeftWorkspace.tsx
+++ b/src/editor/components/shell/LeftWorkspace.tsx
@@ -84,7 +84,8 @@
 
       {/* Tab Content Viewport */}
       <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
-        {activeTab === 'ai' ? <AiChatPanel /> : <AssetPanel />}
+        <div style={{ height: '100%', display: activeTab === 'ai' ? 'block' : 'none' }}><AiChatPanel /></div>
+        {activeTab !== 'ai' && <AssetPanel />}
       </div>
     </div>
   );
```

### Patch I9 — reject IDs trùng giữa các collection

Các Set cũ vẫn bảo vệ duplicate trong cùng collection. Có thể hợp nhất sau nhưng phải giữ location/message và không migrate reference âm thầm.

```diff
--- a/src/schemas/project.schema.ts
+++ b/src/schemas/project.schema.ts
@@ -45,6 +45,21 @@
   trackSettings: z.record(z.string(), TrackSettingSchema).optional(),
   metadata: z.record(z.string(), z.unknown()).optional(),
 }).superRefine((project, context) => {
+  const owners = new Map<string, string>();
+  const collections = [
+    ['scenes', project.scenes],
+    ['audioTracks', project.audioTracks ?? []],
+    ['subtitles', project.subtitles ?? []],
+  ] as const;
+  for (const [collection, entries] of collections) {
+    entries.forEach((entry, index) => {
+      const owner = owners.get(entry.id);
+      if (owner && owner !== collection) {
+        context.addIssue({ code: z.ZodIssueCode.custom, path: [collection, index, 'id'],
+          message: `ID "${entry.id}" is already used by ${owner}. IDs must be unique across the project.` });
+      } else owners.set(entry.id, collection);
+    });
+  }
   // Validate scene IDs uniqueness
   const sceneIds = new Set<string>();
   project.scenes.forEach((scene, index) => {
```

### Patch I10 — validate profile trước side effects

Service bảo vệ cả direct callers và HTTP. Startup/write/spawn failure vẫn cần terminal status/cleanup như prompt.

```diff
--- a/src/application/render/renderService.ts
+++ b/src/application/render/renderService.ts
@@ -39,6 +39,9 @@
   }
 
   createJob(rawProject: unknown, profileName: RenderProfile = RenderProfile.Preview): RenderJob {
+    if (profileName !== RenderProfile.Preview && profileName !== RenderProfile.Final) {
+      throw new Error('Invalid render profile. Expected preview or final.');
+    }
     ensureDirectories();
 
     // Validate project schema and make an immutable clone
--- a/src/infrastructure/server/renderApiPlugin.ts
+++ b/src/infrastructure/server/renderApiPlugin.ts
@@ -105,7 +105,7 @@
           req.on('end', () => {
             try {
               const body = JSON.parse(bodyStr);
-              const profile = (body.profile as RenderProfile) || RenderProfile.Preview;
+              const profile = body.profile === undefined ? RenderProfile.Preview : body.profile;
               const job = renderService.createJob(body.project, profile);
 
               res.setHeader('Content-Type', 'application/json');
```

### Patch I11 — invalidate request/poll đã hủy

Late create ack được cancel và không attach polling. Bổ sung HTTP cancel failure, request timeout/idempotency và process-tree verification; patch không chứng minh child processes đã dừng.

```diff
--- a/src/editor/components/export/ExportModal.tsx
+++ b/src/editor/components/export/ExportModal.tsx
@@ -15,10 +15,12 @@
   const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
   const [outputPath, setOutputPath] = useState<string | null>(null);
   const activeJobIdRef = useRef<string | null>(null);
+  const renderGenerationRef = useRef(0);
   const pollTimerRef = useRef<any>(null);
 
   useEffect(() => {
     return () => {
+      renderGenerationRef.current++;
       if (pollTimerRef.current) {
         clearInterval(pollTimerRef.current);
       }
@@ -40,6 +42,9 @@
   };
 
   const startRender = async () => {
+    const generation = ++renderGenerationRef.current;
+    activeJobIdRef.current = null;
+    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
     setRenderStatus('rendering');
     setProgress(5);
     setErrorMessage(null);
@@ -62,6 +67,10 @@
       }
 
       const jobId = data.job.id;
+      if (generation !== renderGenerationRef.current) {
+        await fetch(`/api/render/cancel/${jobId}`, { method: 'POST' });
+        return;
+      }
       activeJobIdRef.current = jobId;
 
       // Start polling status
@@ -69,6 +78,7 @@
         try {
           const res = await fetch(`/api/render/status/${jobId}`);
           const statusData = await res.json();
+          if (generation !== renderGenerationRef.current) return;
           if (!res.ok || !statusData.success) return;
 
           const job = statusData.job;
@@ -93,12 +103,14 @@
         }
       }, 1000);
     } catch (err) {
+      if (generation !== renderGenerationRef.current) return;
       setRenderStatus('error');
       setErrorMessage(err instanceof Error ? err.message : String(err));
     }
   };
 
   const cancelRender = async () => {
+    const generation = ++renderGenerationRef.current;
     if (activeJobIdRef.current) {
       try {
         await fetch(`/api/render/cancel/${activeJobIdRef.current}`, { method: 'POST' });
@@ -106,9 +118,11 @@
         // Ignore
       }
     }
+    if (generation !== renderGenerationRef.current) return;
     if (pollTimerRef.current) {
       clearInterval(pollTimerRef.current);
     }
+    activeJobIdRef.current = null;
     setRenderStatus('idle');
     setProgress(0);
   };
```

### Patch I12 — E2E dùng flow UI hiện tại và approval tool preview

Patch cập nhật cả fixture render flow và DB isolation cho E2E. Đã kiểm tra context/applicability; chưa chạy phiên bản test đã vá vì review không áp source. Thêm draft/profile/cancel regression cases theo bảng T, giữ decoded-MP4 assertions.

```diff
--- a/tests/e2e/assistant-ui.check.ts
+++ b/tests/e2e/assistant-ui.check.ts
@@ -6,11 +6,13 @@
 import { mkdtemp, realpath, rm } from 'node:fs/promises';
 import { existsSync } from 'node:fs';
 import os from 'node:os';
-import { codexApiPlugin } from '../../src/infrastructure/server/codexApiPlugin';
-import { renderApiPlugin } from '../../src/infrastructure/server/renderApiPlugin';
 import { fakeAssistantAuth, fakeAssistantRuntime } from '../fixtures/assistant-fixtures';
 
 const directory = await mkdtemp(path.join(os.tmpdir(), 'icegozi-ui-'));
+process.env.ICEGOZI_DB_PATH = path.join(directory, 'test.sqlite');
+const { codexApiPlugin } = await import('../../src/infrastructure/server/codexApiPlugin');
+const { renderApiPlugin } = await import('../../src/infrastructure/server/renderApiPlugin');
+let uiTurn = 0;
 let runtime: Awaited<ReturnType<typeof fakeAssistantRuntime>> | undefined;
 let candidate: unknown;
 const auth = fakeAssistantAuth();
@@ -21,10 +23,17 @@
     runtime.process.stdin.on('data', (chunk: Buffer) => {
       const message = JSON.parse(chunk.toString()) as { method?: string; id?: number; result?: unknown };
       if (message.method === 'turn/start') {
+        const turnId = `fixture-turn-${++uiTurn}`;
+        if (uiTurn === 2) {
+          setTimeout(() => runtime!.notify({ id: 501, method: 'item/tool/call', params: { threadId: 'fixture-thread', turnId, callId: 'ui-render', namespace: 'video_editor', tool: 'render_project_preview', arguments: {} } }), 50);
+          return;
+        }
         setTimeout(() => {
           runtime!.notify({ method: 'item/agentMessage/delta', params: { threadId: 'fixture-thread', turnId: 'fixture-turn-1', itemId: 'ui-message', delta: 'Đây là đề xuất kiểm thử fixtures.' } });
           runtime!.notify({ id: 500, method: 'item/tool/call', params: { threadId: 'fixture-thread', turnId: 'fixture-turn-1', callId: 'ui-proposal', namespace: 'video_editor', tool: 'propose_project_change', arguments: { summary: 'Đổi tiêu đề để kiểm tra apply/undo', candidate } } });
         }, 50);
+      } else if (message.id === 501 && message.result) {
+        runtime!.notify({ method: 'turn/completed', params: { threadId: 'fixture-thread', turn: { id: 'fixture-turn-2', status: 'completed' } } });
       } else if (message.id === 500 && message.result) {
         runtime!.notify({ method: 'turn/completed', params: { threadId: 'fixture-thread', turn: { id: 'fixture-turn-1', status: 'completed' } } });
       }
@@ -55,30 +64,30 @@
   const safeStatus = await context.request.get('http://127.0.0.1:3217/api/codex/status', { headers: { 'X-Icegozi-Capability': capability } });
   assert.equal((await safeStatus.text()).includes('synthetic-fixture-token'), false);
   await page.locator('input[type=file]').first().setInputFiles({ name: 'fixture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) });
-  await page.getByRole('button', { name: 'Trợ lý AI', exact: true }).click();
-  const panel = page.getByRole('complementary', { name: 'Trợ lý AI' });
+  const panel = page.getByTestId('ai-chat-workspace');
   await panel.getByText('Chưa kết nối ChatGPT', { exact: true }).waitFor();
-  assert.equal(await panel.getByRole('button', { name: 'Gửi', exact: true }).isDisabled(), true);
-  await panel.getByRole('button', { name: 'Continue with ChatGPT', exact: true }).click();
-  await panel.getByText('Đã kết nối · Đã cấp quyền dùng gói', { exact: true }).waitFor();
-  await panel.getByLabel('Model của phiên ChatGPT').selectOption('fixture-model');
-  await panel.getByLabel('Yêu cầu chỉnh sửa').fill('Đổi tiêu đề');
-  await panel.getByRole('button', { name: 'Gửi', exact: true }).click();
+  assert.equal(await panel.getByRole('button', { name: 'Gửi yêu cầu (Enter)', exact: true }).isDisabled(), true);
+  await panel.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
+  await panel.getByText('ChatGPT Pro/Plus kết nối', { exact: true }).waitFor();
+  await panel.locator('#ai-model-select').selectOption('fixture-model');
+  await panel.getByLabel('Yêu cầu chỉnh sửa video AI').fill('Đổi tiêu đề');
+  await panel.getByRole('button', { name: 'Gửi yêu cầu (Enter)', exact: true }).click();
   await panel.getByText('Đổi tiêu đề để kiểm tra apply/undo', { exact: true }).waitFor();
   console.info('UI: fixture chat and proposal visible');
-  await panel.getByRole('button', { name: 'Áp dụng', exact: true }).click();
+  await panel.getByRole('button', { name: 'Duyệt & Áp dụng', exact: true }).click();
   await page.locator('header').first().getByText('AI fixture proposal', { exact: true }).waitFor();
   console.info('UI: proposal applied');
   await page.getByRole('button', { name: 'Undo (Ctrl+Z)', exact: true }).click();
   await page.locator('header').first().getByText('UI Fixture', { exact: true }).waitFor();
   await page.getByRole('button', { name: 'Redo (Ctrl+Shift+Z)', exact: true }).click();
   await page.locator('header').first().getByText('AI fixture proposal', { exact: true }).waitFor();
-  await page.locator('header').first().getByText('Saved', { exact: true }).waitFor();
+  await page.locator('header').first().getByText('Đã lưu', { exact: true }).waitFor();
   await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
-  await page.getByRole('button', { name: 'Trợ lý AI', exact: true }).click();
   await panel.getByText('Đây là đề xuất kiểm thử fixtures.', { exact: true }).waitFor();
   await page.locator('header').first().getByText('AI fixture proposal', { exact: true }).waitFor();
-  await panel.getByRole('button', { name: 'Render snapshot hiện tại', exact: true }).click();
+  await panel.getByLabel('Yêu cầu chỉnh sửa video AI').fill('Render preview bằng tool có approval');
+  await panel.getByRole('button', { name: 'Gửi yêu cầu (Enter)', exact: true }).click();
+  await panel.getByRole('button', { name: 'Cho phép', exact: true }).click();
   await panel.getByRole('button', { name: 'Xem MP4', exact: true }).waitFor({ timeout: 120_000 });
   console.info('UI: real MP4 ready');
   await panel.getByRole('button', { name: 'Xem MP4', exact: true }).click();
@@ -101,10 +110,7 @@
     await page.screenshot({ path: path.resolve(`generated/temp/assistant-ui-${width}.png`) });
   }
   await page.setViewportSize({ width: 1440, height: 900 });
-  await panel.getByRole('button', { name: 'Đóng trợ lý AI' }).click();
-  assert.equal(await panel.isVisible(), false);
-  await page.getByRole('button', { name: 'Trợ lý AI', exact: true }).click();
-  await panel.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
+  await panel.getByRole('button', { name: 'Đăng xuất ChatGPT', exact: true }).click();
   await panel.getByText('Chưa kết nối ChatGPT', { exact: true }).waitFor();
   assert.equal(await panel.getByText('Đổi tiêu đề để kiểm tra apply/undo', { exact: true }).count(), 0);
   assert.deepEqual(errors, []);
@@ -114,6 +120,8 @@
   throw error;
 } finally {
   await browser.close(); await server.close();
+  const { sqlite } = await import('../../src/infrastructure/db/client');
+  sqlite.close();
   const resolved = await realpath(directory);
   assert.equal(path.dirname(resolved).toLowerCase(), (await realpath(os.tmpdir())).toLowerCase());
   assert.ok(path.basename(resolved).startsWith('icegozi-ui-'));
```

### Patch I13 — restore Add account và profile selector

Dùng API/hook đã có; không đổi subject guard. Hoàn thiện styling/states theo UI hiện tại và test đổi profile khi đang chạy turn.

```diff
--- a/src/editor/components/chat/AiChatPanel.tsx
+++ b/src/editor/components/chat/AiChatPanel.tsx
@@ -291,6 +291,21 @@
           </div>
         </div>
 
+        {auth?.profileId && (
+          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
+            <Button size="sm" disabled={assistant.busy || connecting} onClick={() => void assistant.login(true)}>
+              Thêm tài khoản
+            </Button>
+            <select aria-label="Tài khoản ChatGPT" value={auth.profileId}
+              disabled={assistant.busy || connecting}
+              onChange={(event) => void assistant.selectProfile(event.target.value)}>
+              {assistant.status?.profiles.map((profile) => (
+                <option key={profile.id} value={profile.id} disabled={profile.pending}>{profile.label}</option>
+              ))}
+            </select>
+          </div>
+        )}
+
         {/* Model Selector Bar (When Connected) */}
         {isConnected && auth?.sharing && (
           <div
```

### Patch I14 — cap lượng dữ liệu nhận trước khi buffer tiếp

Mitigation: JSON 1MiB, upload 256MiB, kể cả chunked. Không thay thế stream-to-temp, UTF-8 Buffer reader, schema/content validation và aborted-request cleanup trong giải pháp đầy đủ.

```diff
--- a/src/infrastructure/server/renderApiPlugin.ts
+++ b/src/infrastructure/server/renderApiPlugin.ts
@@ -1,10 +1,30 @@
 import type { Plugin, ViteDevServer } from 'vite';
+import type { IncomingMessage, ServerResponse } from 'node:http';
 import fs from 'node:fs';
 import path from 'node:path';
 import { renderService } from '../../application/render/renderService';
 import { ProjectDbService } from '../db/projectDbService';
 import { RenderProfile } from '../../config/render.config';
 import { PATHS } from '../../config/paths.config';
+
+function acceptBoundedBody(req: IncomingMessage, res: ServerResponse, maxBytes: number): () => boolean {
+  let accepted = true;
+  let received = 0;
+  const reject = () => {
+    if (!accepted) return;
+    accepted = false;
+    res.statusCode = 413;
+    res.setHeader('Content-Type', 'application/json');
+    res.end(JSON.stringify({ success: false, error: 'Request body exceeds the supported limit.' }));
+  };
+  const declared = Number(req.headers['content-length']);
+  if (Number.isFinite(declared) && declared > maxBytes) reject();
+  req.on('data', (chunk: Buffer) => {
+    received += chunk.length;
+    if (received > maxBytes) reject();
+  });
+  return () => accepted;
+}
 
 /**
  * Vite plugin that serves local API endpoints for rendering, projects, jobs, and file downloads.
@@ -54,11 +74,13 @@
 
         // POST /api/projects
         if (req.method === 'POST' && url === '/api/projects') {
+          const accepted = acceptBoundedBody(req, res, 1024 * 1024);
           let bodyStr = '';
           req.on('data', (chunk) => {
-            bodyStr += chunk;
+            if (accepted()) bodyStr += chunk;
           });
           req.on('end', () => {
+            if (!accepted()) return;
             try {
               const body = JSON.parse(bodyStr);
               const result = ProjectDbService.saveProject(body.project, {
@@ -98,11 +120,13 @@
 
         // POST /api/render
         if (req.method === 'POST' && url === '/api/render') {
+          const accepted = acceptBoundedBody(req, res, 1024 * 1024);
           let bodyStr = '';
           req.on('data', (chunk) => {
-            bodyStr += chunk;
+            if (accepted()) bodyStr += chunk;
           });
           req.on('end', () => {
+            if (!accepted()) return;
             try {
               const body = JSON.parse(bodyStr);
               const profile = (body.profile as RenderProfile) || RenderProfile.Preview;
@@ -172,11 +196,13 @@
         // POST /api/assets/upload
         if (req.method === 'POST' && url === '/api/assets/upload') {
           // Parse file upload: read buffer
+          const accepted = acceptBoundedBody(req, res, 256 * 1024 * 1024);
           const chunks: Buffer[] = [];
           req.on('data', (chunk) => {
-            chunks.push(chunk);
+            if (accepted()) chunks.push(chunk);
           });
           req.on('end', () => {
+            if (!accepted()) return;
             try {
               const buffer = Buffer.concat(chunks);
               // Read filename from custom header or query
```

### Patch M2 — để finally cleanup chạy khi CLI render lỗi

```diff
--- a/scripts/render-preview.ts
+++ b/scripts/render-preview.ts
@@ -76,7 +76,7 @@
     logger.error('Render execution failed', {
       error: error instanceof Error ? error.message : String(error),
     });
-    process.exit(1);
+    process.exitCode = 1;
   } finally {
     if (propsTempPath && fs.existsSync(propsTempPath)) {
       try {
```

