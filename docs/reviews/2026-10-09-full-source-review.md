# Code Review: master → phiên bản app hiện có

**Ngày review:** 2026-10-09.

**Phạm vi khi bắt đầu:** 146 file staged, +14788 dòng theo Git; package-lock.json +5882 dòng. Lúc thu thập baseline, repo chưa có commit/HEAD hoặc base branch và collector của skill báo không tìm được base. Đây là review hiện trạng, không phải diff giữa hai nhánh hoặc kết luận regression của PR.

**Trạng thái lúc bàn giao:** repo đã có initial commit `1db1862` và hai commit cập nhật `.gitignore`; HEAD là `6e3ad5b`. Những commit xuất hiện trong lúc review được giữ nguyên. Các patch đề xuất đã kiểm tra được với source hiện tại; không áp dụng patch hoặc tạo commit trong phiên này. Hai tài liệu review/prompt hiện bị ignore theo quy tắc `docs/*` của repo, nhưng vẫn có đầy đủ trên máy.

**Đã review kỹ:** editor state/split/history, save/export, audio timeline/controls, schema, asset paths, normalize cache, cleanup filesystem, metadata/CLI render.

**Chỉ lướt:** UI primitives/tokens, một số animation/subtitle/command builders và tài liệu cũ; lockfile chỉ kiểm tra phiên bản liên quan. Không audit toàn bộ .agents hoặc lỗ hổng dependency.

**Tóm tắt:** App build được, nhưng một số luồng quan trọng còn mô phỏng hoặc chưa nối engine. Rủi ro chính là mất chỉnh sửa, cleanup nguồn, split sai source offset và cache normalize dùng nhầm media.

**Kết luận:** NOT READY TO MERGE / chưa sẵn sàng phát hành với các luồng đang được biểu thị. Repo chưa có PR; đây là đánh giá mức sẵn sàng của app.

Source app không được sửa trong phiên review. Các patch là đề xuất; một số chỉ giảm rủi ro và không thay thế yêu cầu hoàn thiện tính năng trong prompt đi kèm.

## 1. Critical issues

### C1. Cleanup có thể xóa media nguồn khi nhận thư mục cha — `src/infrastructure/filesystem/FileSystem.ts:33` `[security][logic]`

**Vấn đề:** Guard startsWith chỉ chặn public/assets và con. Target public hoặc repo root vượt guard; vòng rmSync recursive có thể xóa assets. CLI hiện gọi bốn thư mục generated nên chưa tự kích hoạt lỗi này.

**Hậu quả:** Mất source media nếu helper dùng chung nhận target là thư mục cha.

**Bằng chứng** (dòng source liên quan, có thể thuộc nhiều vị trí đã nêu):

~~~tsx
if (resolved.startsWith(path.resolve(PATHS.publicAssets))) {
  throw new Error(`Safety violation: Cannot clean public assets directory: ${resolved}`);
}
~~~

**Xác minh:** Mock readdirSync trả assets và rmSync chỉ ghi target xác nhận helper cho phép xóa public/assets khi nhận public. Không xóa file thật.

**Fix:** → Patch C1. Allowlist bốn thư mục generated và chặn alias/symlink đổi target. Test bằng cây thư mục tạm, gồm junction Windows.

### C2. Badge Saved không có persistence — `src/editor/components/shell/CommandBar.tsx:58` `[logic]`

**Vấn đề:** Saved luôn hiện, project chỉ ở useReducer và EditorApp khởi tạo demo. Search source không thấy save handler, storage adapter hoặc restore.

**Hậu quả:** Reload/đóng trang làm mất chỉnh sửa dù UI báo đã lưu.

**Bằng chứng** (dòng source liên quan, có thể thuộc nhiều vị trí đã nêu):

~~~tsx
Saved
const [state, dispatch] = useReducer(editorReducer, initialProject, createInitialState);
~~~

**Fix:** → Patch C2. Patch chỉ đổi badge sang Unsaved để giảm hiểu nhầm. Full fix cần persistence, restore, revision/migration và dirty/saving/saved/error.

## 2. Important issues

### I1. Export mô phỏng báo thành công nhưng không tạo video — `src/editor/components/export/ExportModal.tsx:28` `[logic][async]`

**Vấn đề:** Handler setTimeout 2500 ms chuyển done, không gọi renderer. CLI copy không chứa snapshot editor; CLI hiện render demo trong source.

**Hậu quả:** Người dùng không xuất được nội dung đang sửa và nhận thông báo output không được tạo.

**Bằng chứng** (dòng source liên quan, có thể thuộc nhiều vị trí đã nêu):

~~~tsx
const startSimulatedRender = () => {
  setRenderStatus('rendering');
  setTimeout(() => {
    setRenderStatus('done');
  }, 2500);
};
~~~

**Fix:** → Patch I1. Tạm disable nút chưa nối renderer. Full fix cần snapshot đã validate, job thật, progress/error/cancel và verify output.

### I2. Split video lặp lại nguồn ở đoạn sau — `src/editor/state/editorStore.tsx:136` `[logic]`

**Vấn đề:** Đoạn sau copy originalScene nên giữ cùng startFromFrame; chỉ thay ID và duration.

**Hậu quả:** Nội dung bị lặp thay vì tiếp nối, rõ hơn khi playbackRate khác 1.

**Bằng chứng** (dòng source liên quan, có thể thuộc nhiều vị trí đã nêu):

~~~tsx
const scenePart2: SceneConfig = {
  ...originalScene,
~~~

**Fix:** → Patch I2. Harness: 120 frame, offset30, rate2, split60 tạo cả hai offset30; đoạn sau cần150 theo đơn vị hiện tại. Fix cộng source time đã tiêu thụ theo rate; cần kiểm tra FPS/rounding/video thật.

### I3. Playhead và selection sai sau edit/history — `src/editor/state/editorStore.tsx:74` `[edge][logic]`

**Vấn đề:** Seek chấp nhận totalDurationInFrames; project mutations và undo/redo không reconcile frame/selection.

**Hậu quả:** Playhead ngoài timeline; undo split giữ ID không còn tồn tại.

**Bằng chứng** (dòng source liên quan, có thể thuộc nhiều vị trí đã nêu):

~~~tsx
const clamped = Math.max(0, Math.min(state.timeline.totalDurationInFrames, Math.round(action.frame)));
~~~

**Xác minh:** Harness: seek120 trên120f được giữ120; shrink30f vẫn giữ120; undo split giữ ID đã biến mất.

**Fix:** → Patch I3. Helper reconcile dùng chung; clamp [0,total-1]; selection tồn tại hoặc null. Patch chưa xử lý NaN/Infinity/playback ending.

### I4. Normalize cache dùng nhầm nguồn hoặc settings — `src/application/media/normalizeMedia.ts:30` `[logic][async]`

**Vấn đề:** Cache chỉ theo basename, không xét nguồn/target settings; file có sẵn được coi là hợp lệ.

**Hậu quả:** Hai clip cùng tên hoặc target khác nhau trả cùng output; force/concurrency có thể ghi cùng file.

**Bằng chứng** (dòng source liên quan, có thể thuộc nhiều vị trí đã nêu):

~~~tsx
const basename = path.basename(inputPath, path.extname(inputPath));
const outputPath = resolveNormalizedPath(`${basename}_normalized.mp4`);
if (FileSystem.exists(outputPath) && !options.forceReencode) {
~~~

**Xác minh:** Mock existence: a/clip.mp4 và b/clip.mp4 với target khác nhau đều trả clip_normalized.mp4 và alreadyNormalized=true. Không chạy FFmpeg thật.

**Fix:** → Patch I4. Fingerprint nguồn/settings giảm collision. Full fix cần content identity/manifest, probe, temp riêng từng job, publish atomic và concurrency.

### I5. Disk asset path lệch browser URL và boundary — `src/infrastructure/filesystem/paths.ts:9` `[compat][security]`

**Vấn đề:** Editor dùng assets/video/x, resolver nối thành public/assets/assets/video/x. Absolute input thoát root. Validator nhận file disk nhưng renderer dùng staticFile; generated/normalized ở docs/WORKFLOW.md:58 nằm ngoài public serving hiện tại.

**Hậu quả:** Asset có thể fail preflight dù URL đúng hoặc pass disk validation nhưng browser không tải được. Chưa xác nhận endpoint công khai bị khai thác.

**Bằng chứng** (dòng source liên quan, có thể thuộc nhiều vị trí đã nêu):

~~~tsx
return path.resolve(PATHS.publicAssets, normalized);
~~~

**Xác minh:** Harness xác nhận assets/assets và absolute README trả ngoài assets root.

**Fix:** → Patch I5. Patch sửa prefix/lexical containment. Full fix cần catalog tách diskPath/browserUrl và serve generated media; chưa giải quyết symlink hoặc bypass trong validateAssets.

### I6. Mute, hide và lock chưa tác động engine — `src/editor/components/preview/PreviewWorkspace.tsx:15` `[logic]`

**Vấn đề:** Master volume không gọi Player.setVolume. Header mute/visible/locked chỉ ở local state, không truyền renderer hoặc commands.

**Hậu quả:** Mute vẫn có tiếng; hide/lock không làm điều UI biểu thị.

**Bằng chứng** (dòng source liên quan, có thể thuộc nhiều vị trí đã nêu):

~~~tsx
onClick={() => setMuted(!muted)}
onClick={() => setLocked(!locked)}
~~~

**Fix:** → Patch I6. Patch nối master volume bằng API có trong type declarations local; track controls tạm disable. Full fix lưu track settings và kiểm tra lock tại command boundary.

### I7. Timeline audio sai timing và thiếu tracks — `src/editor/components/timeline/Timeline.tsx:142` `[logic]`

**Vấn đề:** Chỉ vẽ index0/1, left0 và width toàn project. AudioLayer lại đọc startFrame/durationInFrames.

**Hậu quả:** Căn audio theo biểu đồ sai; track thứ ba có thể phát mà không xuất hiện.

**Bằng chứng** (dòng source liên quan, có thể thuộc nhiều vị trí đã nêu):

~~~tsx
left: '0px',
width: `${framesToPixels(totalFrames, fps, pps)}px`,
~~~

**Fix:** → Patch I7. Patch sửa geometry hai lane hiện có. Full fix render mọi track, phân lane theo loại và chọn/sửa audio thật.

### I8. Crossfade thực tế fade qua nền đen — `src/video/transitions/CrossFade.tsx:36` `[logic]`

**Vấn đề:** Timeline nối scenes không overlap; CrossFade chỉ đổi opacity một scene, nên không có hai scenes cùng tồn tại để hòa trộn.

**Hậu quả:** Crossfade khác contract, có frame nền đen tại đầu scene kế tiếp.

**Bằng chứng** (dòng source liên quan, có thể thuộc nhiều vị trí đã nêu):

~~~tsx
currentStartFrame += duration;
const opacity = Math.min(fadeIn, fadeOut);
~~~

**Fix:** → Patch I8. Patch tạm reject crossfade ở preflight; full fix cần overlap thống nhất editor/render, tính lại duration và test frame quanh boundary.

### I9. LaTeX in thành chuỗi và màu không theo inspector — `src/video/components/FormulaOverlay/FormulaOverlay.tsx:94` `[logic]`

**Vấn đề:** font-family KaTeX không parse LaTeX; component in trực tiếp latex và hard-code màu công thức.

**Hậu quả:** Demo Euler hiện source syntax; chỉnh màu không áp dụng cho công thức.

**Bằng chứng** (dòng source liên quan, có thể thuộc nhiều vị trí đã nêu):

~~~tsx
color: '#38BDF8',
{latex}
~~~

**Fix:** → Patch I9. Patch dùng KaTeX renderer và textColor. Prerequisite khi implementation: chọn/cài katex tương thích, bổ sung types nếu cần, cập nhật lockfile bằng npm. Chưa cài dependency/build thử patch. Cần fonts ổn định và parse error rõ.

### I10. Composition metadata giữ demo, entry render không nhất quán — `src/app/Root.tsx:16` `[compat][logic]`

**Vấn đề:** duration/FPS/size cố định từ demo. render:direct và prepareRender.entryFile dùng Root.tsx không gọi registerRoot; entry thật là src/index.ts. CLI render chính hard-code entry đúng.

**Hậu quả:** Truyền input project khác có thể bị cắt duration hoặc sai FPS/canvas. Direct command dùng sai entry theo source hiện tại.

**Bằng chứng** (dòng source liên quan, có thể thuộc nhiều vị trí đã nêu):

~~~tsx
durationInFrames={MAIN_VIDEO_COMPOSITION.durationInFrames}
fps={MAIN_VIDEO_COMPOSITION.fps}
width={MAIN_VIDEO_COMPOSITION.width}
height={MAIN_VIDEO_COMPOSITION.height}
~~~

**Fix:** → Patch I10. Patch tính metadata từ resolved input bằng calculateMetadata và thống nhất entry. Chưa kiểm chứng MP4/headless browser trong review.

### I11. Schema không chặn ID trùng — `src/schemas/project.schema.ts:22` `[edge][logic]`

**Vấn đề:** ID chỉ cần string không rỗng. Update/delete tìm bằng ID và React dùng làm key. Bốn số cuối timestamp không bảo đảm unique, lặp mỗi10 giây.

**Hậu quả:** Project ID trùng có thể update/delete nhiều scene và tạo duplicate key/selection sai.

**Bằng chứng** (dòng source liên quan, có thể thuộc nhiều vị trí đã nêu):

~~~tsx
scenes: z.array(SceneConfigSchema).min(1),
audioTracks: z.array(AudioTrackConfigSchema).optional(),
~~~

**Xác minh:** safeParse chấp nhận hai scene có cùng ID.

**Fix:** → Patch I11. Patch schema validate unique theo collection. Full fix tạo UUID ngoài reducer, truyền qua action và reject invalid mutation trước commit state.

## 3. Minor improvements

- **M1.** scripts/render-preview.ts:28 [compat] — Scale 0.5 trên demo 1920×1080 cho kích thước dự kiến 960×540, lệch config/UI 1280×720. CRF UI là 26, config là 28; output filename/path cũng lệch UI/CLI. Chưa probe render thật.
- **M2.** src/editor/hooks/useKeyboardShortcuts.ts:21 [logic] — Ctrl/Cmd+Z override native input undo trước focus guard; guard chưa xét select/modal/IME. Cần kiểm tra typing/focus/modal.
- **M3.** src/application/timeline/validateTimeline.ts:9 [edge] — Chưa kiểm tra số hữu hạn/số nguyên. Harness xác nhận buildTimeline nhận duration 1.5/Infinity. Zod chặn được nhưng chưa được gọi ở mọi boundary; cần validate có error handling trước commit state.
- **M4.** JS chunk 615.46 kB, gzip 183.62 kB, Vite warning >500 kB. Đây là số đo build, chưa chứng minh runtime chậm; profile trước tối ưu context/bundle.
- **M5.** src/video/scenes/implementations/CompositionScene.tsx:7 chỉ render tên component; command search/settings chưa có flow hoàn chỉnh. Xác định scope trước implementation.

## 4. Test cases cần thêm

| # | File test đề xuất | Input / Tình huống | Kỳ vọng | Bảo vệ |
|---|---|---|---|---|
| T1 | tests/unit/filesystem-safety.test.ts | public/assets, public, root, output, sibling, symlink; filesystem tạm | Reject ngoài allowlist; giữ source | C1 |
| T2 | tests/integration/project-persistence.test.ts | edit/save/reload; quota lỗi; revision cũ trả sau mới | Restore đúng; không báo saved khi write fail | C2 |
| T3 | tests/integration/render-jobs.test.ts | snapshot khác demo; success/fail/cancel/double submit | Đúng snapshot; done sau verify output | I1 |
| T4 | tests/unit/editor-reducer.test.ts | split120f offset30 rate2 tại60; rate0.5/1/1.5 | Offset tiếp nối; total giữ nguyên | I2 |
| T5 | tests/unit/editor-reducer.test.ts | seekend; shrink/delete ởcuối; undo/redo split | Frame hợp lệ; selection tồn tại/null | I3 |
| T6 | tests/integration/normalize-media.test.ts | samebasename khác nguồn; đổi target; partial; 2jobs | Cache đúng; atomic publish; giữ nguồn | I4 |
| T7 | tests/unit/asset-resolution.test.ts | video/x, assets/video/x, absolute, traversal, Unicode, generated | Disk/browser thống nhất; unsafe path bị reject | I5 |
| T8 | tests/integration/audio-controls.test.ts | master mute, track mute/hide/lock và undo | Playback/export/edit phản ánh settings | I6 |
| T9 | tests/unit/audio-timeline.test.tsx | 3tracks; start60 duration30 fps30 pps120 | Mọi track; mẫu x240px width120px | I7 |
| T10 | tests/integration/transitions.test.ts | 90/90f crossfade15; frames quanh boundary | Overlap thật; 165f theo contract | I8 |
| T11 | tests/integration/formula-render.test.ts | Euler, fraction, invalid/long latex | Typeset/màu đúng; font ổn định; error rõ | I9 |
| T12 | tests/integration/render-metadata.test.ts | input1080×1920 fps60 600f | Metadata/output/entry đúng | I10 |
| T13 | tests/unit/validation.test.ts | duplicate scene/audio IDs | Schema reject duplicate | I11 |
| T14 | tests/e2e/editor-workflows.spec.ts | save/import/edit/preview/export; mobile; focus/modal | Flow hoàn chỉnh; không lỗi console/media | C2, I1–I11 |
| T15 | tests/unit/timeline.test.ts | NaN/Infinity/fractional/zero; transition quá dài | Error rõ; không commit invalid state | M3 |

**Đã chạy:** npm run typecheck PASS; npm test: 6 file, 24 test PASS; npm run build:editor PASS với chunk warning. Installed Remotion core/player/CLI/transitions cùng 4.0.534 khi review.

**Harness riêng:** bundle reducer trong memory để gọi hàm nội bộ; path/schema/timeline chạy trực tiếp; normalize/cleanup dùng mock. Không thêm harness vào suite hoặc sửa source.

**Chưa kiểm chứng:** UI bằng browser, MP4 thật, media thực tế, subtitle workflow đầy đủ, responsive screenshots, runtime performance, dependency security audit, junction Windows thật. Các mục này không phải PASS.

**Tài liệu đối chiếu:** metadata động dùng [calculateMetadata](https://www.remotion.dev/docs/calculate-metadata); overlap dùng [TransitionSeries](https://www.remotion.dev/docs/transitions/transitionseries); media public dùng [staticFile](https://www.remotion.dev/docs/staticfile); [KaTeX options](https://katex.org/docs/options.html) cho renderer công thức và trust=false. Các đề xuất API cần kiểm tra lại với phiên bản được chọn khi implementation.

## 5. Patch tối thiểu

Patch đề xuất riêng theo issue. Cả 13 patch đã qua `git apply --check` riêng lẻ với source hiện tại. Kiểm tra này chỉ xác nhận patch có thể áp dụng, không chứng minh logic/build/runtime đúng sau khi sửa. Không áp dụng máy móc cả nhóm: C2/I1/I8 là mitigation, I4/I5/I7 có giới hạn đã nêu. Prompt yêu cầu implementation đầy đủ. Chưa áp dụng và chưa chạy test trên source đã patch.

### Patch C1 — Cleanup có thể xóa media nguồn khi nhận thư mục cha

~~~diff
--- a/src/infrastructure/filesystem/FileSystem.ts
+++ b/src/infrastructure/filesystem/FileSystem.ts
@@ -29,9 +29,10 @@
     const resolved = path.resolve(dirPath);
     if (!fs.existsSync(resolved)) return 0;
 
+    const allowedTargets = [PATHS.normalized, PATHS.frames, PATHS.previews, PATHS.temp]
+      .map((target) => path.resolve(target));
+    if (!allowedTargets.includes(resolved) || path.relative(resolved, fs.realpathSync(resolved)) !== '') {
+      throw new Error(`Safety violation: Cannot clean directory: ${resolved}`);
-    // Safety guard: NEVER clean public assets
-    if (resolved.startsWith(path.resolve(PATHS.publicAssets))) {
-      throw new Error(`Safety violation: Cannot clean public assets directory: ${resolved}`);
     }
 
     let deletedCount = 0;
~~~

Allowlist bốn thư mục generated và chặn alias/symlink đổi target. Test bằng cây thư mục tạm, gồm junction Windows.

### Patch C2 — Badge Saved không có persistence

~~~diff
--- a/src/editor/components/shell/CommandBar.tsx
+++ b/src/editor/components/shell/CommandBar.tsx
@@ -55,7 +55,7 @@
           </span>
           <span style={{ fontSize: '10px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
             <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
+            Unsaved
-            Saved
           </span>
         </div>
       </div>
~~~

Patch chỉ đổi badge sang Unsaved để giảm hiểu nhầm. Full fix cần persistence, restore, revision/migration và dirty/saving/saved/error.

### Patch I1 — Export mô phỏng báo thành công nhưng không tạo video

~~~diff
--- a/src/editor/components/export/ExportModal.tsx
+++ b/src/editor/components/export/ExportModal.tsx
@@ -214,10 +214,10 @@
             variant="primary"
             size="sm"
             icon={<Download size={13} />}
+            disabled
+            title="Browser export is not connected to a renderer yet"
-            onClick={startSimulatedRender}
-            disabled={renderStatus === 'rendering'}
           >
+            Renderer unavailable
-            {renderStatus === 'rendering' ? 'Rendering...' : 'Render Video'}
           </Button>
         </div>
       </div>
~~~

Tạm disable nút chưa nối renderer. Full fix cần snapshot đã validate, job thật, progress/error/cancel và verify output.

### Patch I2 — Split video lặp lại nguồn ở đoạn sau

~~~diff
--- a/src/editor/state/editorStore.tsx
+++ b/src/editor/state/editorStore.tsx
@@ -137,6 +137,10 @@
         ...originalScene,
         id: `${originalScene.id}_split_${Date.now().toString().slice(-4)}`,
         durationInFrames: originalScene.durationInFrames - offsetInScene,
+        ...(originalScene.type === 'video'
+          ? { startFromFrame: (originalScene.startFromFrame ?? 0)
+              + Math.round(offsetInScene * (originalScene.playbackRate ?? 1)) }
+          : {}),
       };
 
       const newScenes = [
~~~

Harness: 120 frame, offset30, rate2, split60 tạo cả hai offset30; đoạn sau cần150 theo đơn vị hiện tại. Fix cộng source time đã tiêu thụ theo rate; cần kiểm tra FPS/rounding/video thật.

### Patch I3 — Playhead và selection sai sau edit/history

~~~diff
--- a/src/editor/state/editorStore.tsx
+++ b/src/editor/state/editorStore.tsx
@@ -57,12 +57,22 @@
   };
 }
 
+function reconcileTimelineState(state: EditorState, project: VideoProject, timeline: ProjectTimeline) {
+  return {
+    currentFrame: Math.max(0, Math.min(timeline.totalDurationInFrames - 1, state.currentFrame)),
+    selectedClipId: project.scenes.some((scene) => scene.id === state.selectedClipId)
+      ? state.selectedClipId
+      : project.scenes[0]?.id ?? null,
+  };
+}
+
 function pushHistory(state: EditorState, newProject: VideoProject): EditorState {
   const newTimeline = buildTimeline(newProject);
   return {
     ...state,
     project: newProject,
     timeline: newTimeline,
+    ...reconcileTimelineState(state, newProject, newTimeline),
     historyPast: [...state.historyPast.slice(-20), state.project], // keep max 20 history states
     historyFuture: [],
   };
@@ -71,7 +81,7 @@
 function editorReducer(state: EditorState, action: EditorAction): EditorState {
   switch (action.type) {
     case 'SET_CURRENT_FRAME': {
+      const clamped = Math.max(0, Math.min(state.timeline.totalDurationInFrames - 1, Math.round(action.frame)));
-      const clamped = Math.max(0, Math.min(state.timeline.totalDurationInFrames, Math.round(action.frame)));
       return { ...state, currentFrame: clamped };
     }
 
@@ -173,6 +183,7 @@
         ...state,
         project: prev,
         timeline,
+        ...reconcileTimelineState(state, prev, timeline),
         historyPast: newPast,
         historyFuture: [state.project, ...state.historyFuture],
       };
@@ -187,6 +198,7 @@
         ...state,
         project: next,
         timeline,
+        ...reconcileTimelineState(state, next, timeline),
         historyPast: [...state.historyPast, state.project],
         historyFuture: newFuture,
       };
~~~

Helper reconcile dùng chung; clamp [0,total-1]; selection tồn tại hoặc null. Patch chưa xử lý NaN/Infinity/playback ending.

### Patch I4 — Normalize cache dùng nhầm nguồn hoặc settings

~~~diff
--- a/src/application/media/normalizeMedia.ts
+++ b/src/application/media/normalizeMedia.ts
@@ -1,4 +1,6 @@
 import path from 'node:path';
+import fs from 'node:fs';
+import { createHash } from 'node:crypto';
 import { FfmpegClient } from '../../infrastructure/ffmpeg/FfmpegClient';
 import { buildNormalizeCommand } from '../../infrastructure/ffmpeg/commands/normalize';
 import { resolveNormalizedPath } from '../../infrastructure/filesystem/paths';
@@ -28,7 +30,13 @@
   }
 
   const basename = path.basename(inputPath, path.extname(inputPath));
+  const stat = fs.statSync(inputPath);
+  const fingerprint = createHash('sha256').update(JSON.stringify({
+    inputPath: path.resolve(inputPath), size: stat.size, mtimeMs: stat.mtimeMs,
+    width: options.targetWidth ?? 1920, height: options.targetHeight ?? 1080,
+    fps: options.targetFps ?? 30,
+  })).digest('hex').slice(0, 16);
+  const outputPath = resolveNormalizedPath(`${basename}_${fingerprint}_normalized.mp4`);
-  const outputPath = resolveNormalizedPath(`${basename}_normalized.mp4`);
 
   if (FileSystem.exists(outputPath) && !options.forceReencode) {
     logger.info(`Asset already normalized: ${outputPath}`);
~~~

Fingerprint nguồn/settings giảm collision. Full fix cần content identity/manifest, probe, temp riêng từng job, publish atomic và concurrency.

### Patch I5 — Disk asset path lệch browser URL và boundary

~~~diff
--- a/src/infrastructure/filesystem/paths.ts
+++ b/src/infrastructure/filesystem/paths.ts
@@ -6,8 +6,13 @@
  * Ensures the path does not escape the assets directory.
  */
 export function resolveAssetPath(relativePath: string): string {
+  const normalized = relativePath.replace(/\\/g, '/').replace(/^assets\//, '');
+  const resolved = path.resolve(PATHS.publicAssets, normalized);
+  const relative = path.relative(PATHS.publicAssets, resolved);
+  if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
+    throw new Error(`Asset path escapes public/assets: ${relativePath}`);
+  }
+  return resolved;
-  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
-  return path.resolve(PATHS.publicAssets, normalized);
 }
 
 /**
~~~

Patch sửa prefix/lexical containment. Full fix cần catalog tách diskPath/browserUrl và serve generated media; chưa giải quyết symlink hoặc bypass trong validateAssets.

### Patch I6 — Mute, hide và lock chưa tác động engine

~~~diff
--- a/src/editor/components/preview/PreviewWorkspace.tsx
+++ b/src/editor/components/preview/PreviewWorkspace.tsx
@@ -15,6 +15,10 @@
   const [volume, setVolume] = useState<number>(1);
   const isSyncingRef = useRef(false);
 
+  useEffect(() => {
+    playerRef.current?.setVolume(volume);
+  }, [volume]);
+
   // Sync state.currentFrame -> Player
   useEffect(() => {
     if (!playerRef.current) return;

--- a/src/editor/components/timeline/TimelineTrackHeader.tsx
+++ b/src/editor/components/timeline/TimelineTrackHeader.tsx
@@ -70,6 +70,7 @@
             icon={visible ? <Eye size={12} /> : <EyeOff size={12} />}
             label={visible ? 'Hide Track' : 'Show Track'}
             size="sm"
+            disabled
             onClick={() => setVisible(!visible)}
             style={{ width: '22px', height: '22px', opacity: visible ? 0.7 : 0.4 }}
           />
@@ -78,6 +79,7 @@
             icon={muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
             label={muted ? 'Unmute Track' : 'Mute Track'}
             size="sm"
+            disabled
             onClick={() => setMuted(!muted)}
             style={{ width: '22px', height: '22px', opacity: muted ? 0.4 : 0.7 }}
           />
@@ -87,6 +89,7 @@
           icon={locked ? <Lock size={12} /> : <Unlock size={12} />}
           label={locked ? 'Unlock Track' : 'Lock Track'}
           size="sm"
+          disabled
           onClick={() => setLocked(!locked)}
           style={{ width: '22px', height: '22px', opacity: locked ? 1 : 0.4 }}
         />
~~~

Patch nối master volume bằng API có trong type declarations local; track controls tạm disable. Full fix lưu track settings và kiểm tra lock tại command boundary.

### Patch I7 — Timeline audio sai timing và thiếu tracks

~~~diff
--- a/src/editor/components/timeline/Timeline.tsx
+++ b/src/editor/components/timeline/Timeline.tsx
@@ -143,8 +143,9 @@
                 <div
                   style={{
                     position: 'absolute',
+                    left: `${framesToPixels(state.project.audioTracks[0].startFrame, fps, pps)}px`,
+                    width: `${framesToPixels(state.project.audioTracks[0].durationInFrames
+                      ?? Math.max(0, totalFrames - state.project.audioTracks[0].startFrame), fps, pps)}px`,
-                    left: '0px',
-                    width: `${framesToPixels(totalFrames, fps, pps)}px`,
                     top: '8px',
                     bottom: '8px',
                     borderRadius: '4px',
@@ -168,8 +169,9 @@
                 <div
                   style={{
                     position: 'absolute',
+                    left: `${framesToPixels(state.project.audioTracks[1].startFrame, fps, pps)}px`,
+                    width: `${framesToPixels(state.project.audioTracks[1].durationInFrames
+                      ?? Math.max(0, totalFrames - state.project.audioTracks[1].startFrame), fps, pps)}px`,
-                    left: '0px',
-                    width: `${framesToPixels(totalFrames, fps, pps)}px`,
                     top: '8px',
                     bottom: '8px',
                     borderRadius: '4px',
~~~

Patch sửa geometry hai lane hiện có. Full fix render mọi track, phân lane theo loại và chọn/sửa audio thật.

### Patch I8 — Crossfade thực tế fade qua nền đen

~~~diff
--- a/src/application/timeline/buildTimeline.ts
+++ b/src/application/timeline/buildTimeline.ts
@@ -2,6 +2,7 @@
 import { ProjectTimeline, ComputedScene } from '../../domain/video/Timeline';
 import { framesToSeconds } from './calculateDuration';
 import { validateTimeline } from './validateTimeline';
+import { InvalidTimelineError } from '../../shared/errors/pipelineErrors';
 
 /**
  * Builds a deterministic ProjectTimeline from a VideoProject definition.
@@ -12,6 +13,9 @@
   let currentStartFrame = 0;
 
   for (const scene of project.scenes) {
+    if (scene.transition?.type === 'crossfade') {
+      throw new InvalidTimelineError('Crossfade requires overlapping scenes; use fade until overlap is supported.');
+    }
     const duration = scene.durationInFrames;
     const computed: ComputedScene = {
       scene,
~~~

Patch tạm reject crossfade ở preflight; full fix cần overlap thống nhất editor/render, tính lại duration và test frame quanh boundary.

### Patch I9 — LaTeX in thành chuỗi và màu không theo inspector

~~~diff
--- a/src/video/components/FormulaOverlay/FormulaOverlay.tsx
+++ b/src/video/components/FormulaOverlay/FormulaOverlay.tsx
@@ -1,4 +1,6 @@
+import React, { useMemo } from 'react';
+import katex from 'katex';
+import 'katex/dist/katex.min.css';
-import React from 'react';
 import { useCurrentFrame, interpolate } from 'remotion';
 import { SafeArea } from '../SafeArea/SafeArea';
 
@@ -25,6 +27,9 @@
   style,
 }) => {
   const frame = useCurrentFrame();
+  const markup = useMemo(() => katex.renderToString(latex, {
+    displayMode: true, throwOnError: false, trust: false,
+  }), [latex]);
 
   const opacity = interpolate(frame, [0, 15], [0, 1], {
     extrapolateLeft: 'clamp',
@@ -87,12 +92,11 @@
               fontSize: `${fontSize}px`,
               fontWeight: 500,
               letterSpacing: '0.03em',
+              color: textColor,
-              color: '#38BDF8',
               textShadow: '0 0 30px rgba(56, 189, 248, 0.35)',
             }}
+            dangerouslySetInnerHTML={{ __html: markup }}
+          />
-          >
-            {latex}
-          </div>
         </div>
 
         {explanation && (
~~~

Patch dùng KaTeX renderer và textColor. Prerequisite khi implementation: chọn/cài katex tương thích, bổ sung types nếu cần, cập nhật lockfile bằng npm. Chưa cài dependency/build thử patch. Cần fonts ổn định và parse error rõ.

### Patch I10 — Composition metadata giữ demo, entry render không nhất quán

~~~diff
--- a/src/app/Root.tsx
+++ b/src/app/Root.tsx
@@ -3,6 +3,8 @@
 import { MainVideo } from '../video/compositions/MainVideo/MainVideo';
 import { MAIN_VIDEO_COMPOSITION } from './compositions';
 import { registerBuiltInScenes } from './registerCompositions';
+import { buildTimeline } from '../application/timeline/buildTimeline';
+import { VideoProjectSchema } from '../schemas/project.schema';
 
 // Ensure built-in scene components are registered in SceneRegistry
 registerBuiltInScenes();
@@ -18,6 +20,13 @@
         width={MAIN_VIDEO_COMPOSITION.width}
         height={MAIN_VIDEO_COMPOSITION.height}
         defaultProps={MAIN_VIDEO_COMPOSITION.defaultProps}
+        calculateMetadata={({ props }) => {
+          const project = VideoProjectSchema.parse(props.project ?? MAIN_VIDEO_COMPOSITION.defaultProps.project);
+          return {
+            durationInFrames: buildTimeline(project).totalDurationInFrames,
+            fps: project.fps, width: project.width, height: project.height,
+          };
+        }}
       />
     </>
   );

--- a/src/application/render/prepareRender.ts
+++ b/src/application/render/prepareRender.ts
@@ -14,7 +14,7 @@
   const targetDir = profile === RenderProfile.Preview ? PATHS.previews : PATHS.output;
   const filename = `${compositionId}_${profile}.mp4`;
   const outputPath = path.resolve(targetDir, filename);
+  const entryFile = path.resolve(PATHS.root, 'src', 'index.ts');
-  const entryFile = path.resolve(PATHS.root, 'src', 'app', 'Root.tsx');
 
   return {
     compositionId,

--- a/package.json
+++ b/package.json
@@ -9,7 +9,7 @@
     "build:editor": "vite build",
     "render": "tsx scripts/render-preview.ts --profile final",
     "render:preview": "tsx scripts/render-preview.ts --profile preview",
+    "render:direct": "remotion render src/index.ts MainVideo output/main_video.mp4",
-    "render:direct": "remotion render src/app/Root.tsx MainVideo output/main_video.mp4",
     "typecheck": "tsc --noEmit",
     "test": "vitest run",
     "test:watch": "vitest",
~~~

Patch tính metadata từ resolved input bằng calculateMetadata và thống nhất entry. Chưa kiểm chứng MP4/headless browser trong review.

### Patch I11 — Schema không chặn ID trùng

~~~diff
--- a/src/schemas/project.schema.ts
+++ b/src/schemas/project.schema.ts
@@ -22,4 +22,14 @@
   scenes: z.array(SceneConfigSchema).min(1),
   audioTracks: z.array(AudioTrackConfigSchema).optional(),
   metadata: z.record(z.string(), z.unknown()).optional(),
+}).superRefine((project, context) => {
+  for (const collection of ['scenes', 'audioTracks'] as const) {
+    const seen = new Set<string>();
+    (project[collection] ?? []).forEach((item, index) => {
+      if (seen.has(item.id)) {
+        context.addIssue({ code: 'custom', path: [collection, index, 'id'], message: 'Duplicate ID' });
+      }
+      seen.add(item.id);
+    });
+  }
 });
~~~

Patch schema validate unique theo collection. Full fix tạo UUID ngoài reducer, truyền qua action và reject invalid mutation trước commit state.

