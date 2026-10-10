## Bắt đầu prompt

Bạn là senior engineer chịu trách nhiệm sửa lỗi và nâng cấp ứng dụng Icegozi Video đến mức người dùng có thể hoàn thành quy trình thực tế: tạo hoặc mở project, nhập media, chỉnh sửa, preview, lưu, mở lại và xuất video đúng nội dung đã chỉnh sửa.

Hãy thực hiện công việc trong repo, bao gồm implementation, kiểm thử, kiểm tra giao diện và bàn giao. Đừng kết thúc ở một danh sách đề xuất. Đừng coi việc đổi nhãn hoặc disable tính năng là đã hoàn thành yêu cầu nâng cấp. Có thể dùng các biện pháp đó ở bước sửa khẩn cấp, nhưng các luồng được yêu cầu dưới đây phải được nối với engine thật trước khi nghiệm thu.

Ngôn ngữ trao đổi, tài liệu triển khai và báo cáo: tiếng Việt. Giữ nguyên identifiers, API names và commands bằng ngôn ngữ của codebase. Viết rõ đã kiểm chứng điều gì, bằng cách nào và còn giới hạn gì.

### Bối cảnh đã xác nhận

- Repo: `D:/My Project/Github/icegozi_video`.
- Frontend: React 19, TypeScript và Vite; đây không phải dự án Next.js.
- Video engine: Remotion; media pipeline: Node.js, FFmpeg và FFprobe.
- Runtime validation: Zod; unit test: Vitest; icons: lucide-react.
- `src/editor`: editor UI, store, geometry và keyboard shortcuts.
- `src/video` và `src/app`: Remotion primitives, scene renderers, compositions và registration.
- `src/domain`: models thuần TypeScript.
- `src/application`: timeline, media và render workflows.
- `src/infrastructure`: filesystem, child processes, metadata reader và logging.
- `src/schemas`: project, scene và asset validation.
- `projects/demo/project.ts`: demo đang được dùng mặc định.
- Source media nằm trong `public/assets`; intermediates trong `generated`; final exports trong `output`.
- Timeline hiện tại xếp scene tuần tự. Các lane V1/V2 trên UI chưa tạo thành một model compositing nhiều lớp.
- Chưa có persistence hoặc render service thực sự được nối với editor trong phạm vi review.
- Khi bắt đầu review, repo chưa có commit/HEAD; lúc bàn giao đã có initial commit và HEAD `6e3ad5b` sau các thay đổi `.gitignore`. Luôn đọc Git state hiện tại; đừng giả định có `develop`, `main` hoặc merge-base.

### Tài liệu phải đọc

1. `MEMORY.md`, nếu tồn tại.
2. Các `AGENTS.md` áp dụng cho vị trí đang làm việc và `.agents/rules` liên quan.
3. `.agents/skills/senior-code-review/SKILL.md` cùng checklist và report template khi thực hiện review.
4. `docs/review/CODE_REVIEW_2026-10-09.md`.
5. `README.md`, `docs/ARCHITECTURE.md`, `docs/WORKFLOW.md`, `docs/MEDIA_GUIDE.md`, `docs/ADDING_A_SCENE.md`.
6. `package.json`, lockfile, TypeScript/Vite/Remotion config và các source files liên quan.
7. Các plan cũ trong `docs/prompt` để hiểu mục tiêu ban đầu, nhưng ưu tiên source hiện tại và yêu cầu của prompt này khi có khác biệt.

Nếu không có `MEMORY.md`, chỉ ghi những thông tin đã xác minh vào một file ngắn. Không tự tạo quy ước dự án dựa trên phỏng đoán.

### Mục tiêu và thứ tự ưu tiên

**P0: tính đúng và bảo vệ dữ liệu.** Sửa các finding Critical/Important còn tồn tại, bổ sung persistence, import media bền vững và render đúng project hiện tại. Loại bỏ success giả, cache sai nguồn, split sai offset và thao tác có nguy cơ xóa source.

**P1: trải nghiệm editor hoàn chỉnh.** Hoàn thiện timeline/audio/preview, crossfade, formula, subtitle cơ bản, form validation, shortcuts, responsive và accessibility. Các control hiển thị phải có tác dụng thực tế và nhất quán giữa preview và export.

**P2: độ bền và khả năng phát triển.** Đo và tối ưu hiệu năng, cập nhật dependencies có kiểm soát, bổ sung CI và tài liệu vận hành. Chỉ tối ưu sau khi baseline đúng và có số đo hoặc vấn đề cụ thể.

Không tự thêm tài khoản người dùng, billing, cloud storage, marketplace, analytics theo dõi, AI generation provider hoặc dịch vụ trả phí vào phạm vi này. Kiến trúc có thể để điểm mở rộng, nhưng không triển khai các sản phẩm đó khi chưa có yêu cầu.

### Nguyên tắc thực hiện

- Giữ kiến trúc đang có; không rewrite toàn bộ app hoặc đổi framework.
- Tái sử dụng component/helper trước khi tạo abstraction mới.
- Domain không phụ thuộc React, Remotion, filesystem hoặc child_process.
- Browser không import các Node-only adapters; server không tin project JSON chưa validate.
- Dùng parser/schema/structured APIs thay cho xử lý chuỗi tùy tiện khi có giải pháp phù hợp.
- Mỗi nhóm thay đổi có phạm vi rõ, lý do rõ và verification tương ứng.
- Tách sửa lỗi, hoàn thiện tính năng, cập nhật dependencies và tối ưu để diff dễ review.
- Không hạ strict TypeScript, thêm `any` diện rộng, bỏ assertion hoặc skip test để làm check xanh.
- Không sửa generated output, vendored code hoặc lockfile bằng tay.
- Không ghi đè thay đổi có sẵn của người dùng, không reset/clean worktree và không tự commit/push/merge.
- Source media là dữ liệu bất biến. Chỉ đọc hoặc tạo bản sao được định danh; không sửa/xóa bản gốc.
- Animation và video rendering phải xác định được từ frame, props và assets; không dùng Date.now/random/timer làm nội dung frame.
- Không báo saved/rendered/imported nếu operation thực tế chưa thành công.
- Không dùng progress giả bằng timer; progress phải đến từ job hoặc dùng trạng thái indeterminate có ý nghĩa.
- Không tuyên bố toàn bộ app đã được review/test nếu chỉ kiểm tra một phần.
- Các bước local, có thể hoàn tác và cần thiết để hoàn thành yêu cầu được phép tiến hành. Chỉ cần quyết định bổ sung khi thiếu thông tin bắt buộc hoặc phát sinh thao tác ngoài phạm vi như publish, trả phí hay dùng credentials.

### Cách quản lý công việc

Lập một checklist hoặc task ledger ngắn với các trạng thái `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`, `DEFERRED`. Với mỗi finding, ghi ID, nguyên nhân, files, hướng sửa, test và kết quả.

Mỗi giai đoạn dưới đây phải có đầu vào, thay đổi cụ thể, đầu ra có thể review và điều kiện hoàn thành. Nếu phát hiện blocker ở một phần, ghi rõ bằng chứng và tiếp tục phần độc lập có thể làm. Không tự coi hết thời gian hoặc thiếu một câu trả lời tùy chọn là lý do để báo hoàn thành.

Cập nhật tiến độ ngắn trong khi làm việc. Nêu điều đã học được và bước tiếp theo sẽ xác minh điều gì. Trước khi sửa file, giải thích nhóm chỉnh sửa sắp làm.

## A. Tiếp nhận repo và bảo toàn worktree

1. Xác định cwd, shell, branch, Git status, staged/unstaged/untracked files và instructions áp dụng.
2. Xác định có commit/HEAD và base branch hay không. Chỉ dùng merge-base khi thực sự có.
3. Nếu repo còn unborn, ghi rõ review initial tree; không tạo commit giả chỉ để có base.
4. Ghi nhận các thay đổi đã có trước khi bắt đầu để cuối task chỉ báo đúng files mình đã sửa.
5. Kiểm tra Node/npm, FFmpeg/FFprobe và các runtime prerequisites bằng commands thực tế.
6. Đọc memory rồi kiểm tra source; không dùng memory lỗi thời thay cho code.
7. Không in `.env`, token hoặc secrets. Chỉ ghi tên cấu hình và tình trạng có/thiếu.

**Đầu ra:** bản mô tả ngắn về repo, môi trường, worktree và giới hạn review. Hoàn thành khi biết chính xác đang sửa phiên bản nào và không ảnh hưởng thay đổi của người dùng.

## B. Chạy baseline trước khi sửa

Chạy các commands hiện có:

```powershell
npm run typecheck
npm test
npm run build:editor
```

Ghi exit code và các lỗi/warnings quan trọng. Review trước ghi nhận 24 tests trong 6 files qua, typecheck/build qua và có Vite chunk warning. Đây là dữ kiện lịch sử, không phải kết quả của lần chạy mới.

Kiểm tra scripts và entry points thực tế. Xác minh cách chạy editor, render pipeline, asset validation và normalize. Không chạy cleanup thật trên media để kiểm tra an toàn.

Nếu thiếu dependency, dùng lockfile và package manager hiện tại để cài môi trường. Không trộn nhiều package manager. Phân biệt baseline failure với lỗi do implementation mới gây ra.

**Đầu ra:** baseline verification table gồm `PASS`, `FAIL`, `NOT TESTED`, `BLOCKED`. Không gán PASS dựa trên việc đọc code.

## C. Lập bản đồ kiến trúc và luồng dữ liệu

Trace các luồng sau từ UI đến domain/application/infrastructure:

1. Tạo và mở project.
2. Thêm scene và import video/image/audio.
3. Update scene/project metadata.
4. Split, trim, delete, undo và redo.
5. Seek, playback, preview volume và track controls.
6. Resolve assets, inspect, normalize và sử dụng derivative.
7. Build timeline và render scene/audio.
8. Lưu, restore và xuất project/video.

Với mỗi luồng, chỉ rõ bước nào đang có implementation, bước nào mô phỏng và bước nào chưa có. Tìm tất cả callers khi đổi types/schema/API. Xem cả code ngoài diff để tránh bỏ sót consumer.

**Đầu ra:** architecture map ngắn và feature matrix. Không dùng matrix này làm nội dung hướng dẫn hiển thị trong app.

## D. Review lại và lập backlog theo bằng chứng

Revalidate các finding sau từ báo cáo, không mặc định chúng vẫn đúng:

| ID | Vấn đề đã ghi nhận | Yêu cầu sửa đầy đủ |
|---|---|---|
| C1 | Cleanup guard cho phép thư mục cha của source | Allowlist generated targets, containment/realpath, test không mất nguồn |
| C2 | Saved luôn hiện nhưng không có persistence | Save/restore thực sự, revision và trạng thái chính xác |
| I1 | Export mô phỏng, CLI không nhận snapshot editor | Render job thật dùng đúng snapshot, verify output |
| I2 | Split video giữ source offset cũ | Offset đoạn sau đúng consumed source time |
| I3 | Frame/selection invalid sau edit/history | Reconcile invariants sau mọi mutation/history |
| I4 | Cache normalize chỉ theo basename | Identity nguồn/settings, valid output, concurrency/atomicity |
| I5 | Disk path lệch URL; generated không được serve đúng | Catalog/asset reference thống nhất browser và server |
| I6 | Mute/hide/lock chỉ đổi icon/local state | Model/store/engine/commands thực thi settings |
| I7 | Audio timeline cứng hai tracks, timing sai | Hiển thị mọi track và geometry đúng dữ liệu |
| I8 | Crossfade không overlap | Hai scenes cùng render trong transition, duration đúng |
| I9 | LaTeX chỉ in source string | Formula renderer thật, font/color/error đúng |
| I10 | Metadata giữ demo và render entry lệch | Metadata từ input snapshot; entry đăng ký thống nhất |
| I11 | Schema nhận ID trùng, timestamp ID yếu | UUID và uniqueness validation |

Kiểm tra thêm preview profile mismatch, shortcut/focus/IME, non-finite frame values, CompositionScene placeholder và các controls chưa nối flow.

Mỗi issue phải có scenario, file/line, consequence và test có thể tái hiện. Không nâng mức severity cho naming/style. Không coi chunk warning là runtime regression khi chưa đo.

**Đầu ra:** backlog ưu tiên có ID và acceptance criteria. Chốt phạm vi P0/P1/P2 trước implementation, sau đó tiến hành các bước trong phạm vi đã có.

## E. Chuẩn hóa contracts và schema có version

Xác định một project document có thể serialize ổn định, với schemaVersion và migration từ dữ liệu legacy. Giữ compatibility với demo và project định nghĩa bằng TypeScript đang có.

Cần định nghĩa rõ:

- Project identity, title, FPS, width/height, scene order và audio tracks.
- Stable scene/track/asset IDs; reference giữa chúng.
- Source offset, timeline offset, clip duration, playbackRate và đơn vị đo.
- Frame boundary theo khoảng `[startFrame, endFrame)`.
- Transition là incoming hay outgoing, duration tính thế nào và ảnh hưởng total timeline ra sao.
- Audio duration mặc định, loop/fade và track settings.
- Asset catalog, browser URL, disk source, derivative và metadata.
- Export profile, render snapshot, job status và output metadata.
- Subtitle timing/model nếu được tích hợp vào project.

Không thêm field chỉ vì có thể hữu ích. Mọi field mới cần consumer, default, validation và migration cụ thể.

Validate finite/safe integer khi cần, số dương/nonnegative, FPS/rate/volume hợp lệ, IDs unique, references tồn tại, transition bounds và project đủ điều kiện render. Phân biệt draft input đang nhập với project đã commit; xóa tạm nội dung input không được làm reducer throw khiến app crash.

Dùng typed actions phù hợp với discriminated scene union. Tránh `Partial<SceneConfig>` cho phép đổi type mà thiếu required fields. Đừng cho action metadata tổng quát tùy ý thay scenes/audio khi đã có commands chuyên biệt.

**Đầu ra:** contracts/schema/migrations và tests. Migrate trên bản sao, giữ tài liệu cũ nếu migration thất bại; không silently bỏ fields người dùng.

## F. Lưu project, autosave và phục hồi

Triển khai project persistence phù hợp app local. Ưu tiên IndexedDB cho browser document; server/file storage có thể bổ sung khi cần cho local workflow. Không dùng demo object hoặc local state làm “save”.

Yêu cầu:

1. Mở project đã lưu khi reload; chỉ dùng demo cho workspace mới hoặc khi người dùng chọn demo.
2. Save explicit và autosave có debounce; lưu snapshot/revision xác định.
3. States `dirty`, `saving`, `saved`, `error`; Saved chỉ sau durable write thành công.
4. Async save cũ trả sau save mới không được đánh dấu revision mới là saved sai.
5. Retry an toàn khi write fail; hiển thị lỗi và giữ dữ liệu đang edit.
6. Xử lý quota/storage unavailable/corrupt JSON/version unsupported bằng flow có thể phục hồi.
7. Export/import project document hoặc project package với manifest media rõ ràng.
8. New/Open/Save/Save As/Duplicate có semantics rõ; không ghi đè project khác do ID reuse.
9. Asset references được lưu bền vững; object URL chỉ là runtime resource và không được serialize thành nguồn phục hồi.
10. Không coi beforeunload async là cơ chế save đáng tin cậy; dirty warning chỉ là hỗ trợ cuối cùng.
11. Nếu nhiều tab cùng sửa, có policy revision/conflict minh bạch, không âm thầm overwrite snapshot mới.

History undo/redo và UI preferences có thể lưu riêng; đừng serialize toàn bộ runtime PlayerRef, functions hoặc file handles vào project JSON.

**Nghiệm thu:** sửa project khác demo → save → reload → nội dung đúng; lỗi storage không báo Saved và không mất draft.

## G. Asset catalog, import và filesystem an toàn

Thiết lập asset reference nhất quán. Browser sử dụng URL/assetId; Node resolve assetId thành disk path qua catalog. Không để browser request một arbitrary filesystem path.

Import media phải thực sự hoạt động:

- Chọn file hoặc drag/drop phù hợp thiết bị; video/image/audio được validate theo loại và metadata.
- Không tự tạo scene video bằng một filename mặc định không tồn tại.
- File import được lưu vào managed source storage bền vững, với tên an toàn và identity unique.
- Giữ filename gốc như metadata, không dùng nó trực tiếp làm path có quyền truy cập rộng.
- Khi import tên có dấu, khoảng trắng hoặc ký tự URL đặc biệt, preview và export đều tải đúng.
- Có pending/success/error/cancel; partial import không trở thành asset usable.
- Relink thiếu media có lựa chọn rõ; không thay nhầm asset bằng một file cùng basename.
- Thumbnail/metadata error được xử lý; resource object URLs/listeners được cleanup.

Định nghĩa canonical public reference, ví dụ `assets/...`; hỗ trợ legacy references qua migration có chủ đích. Tách resolver cho CLI raw input có kiểm soát khỏi resolver cho project asset references.

Generated derivative phải được phục vụ qua route hoặc managed public publication rõ ràng. Browser, Remotion render và asset preflight phải nhìn cùng một asset, không chỉ “exists trên disk”. Không sao chép/bật serving toàn repo để giải quyết nhanh.

Filesystem safety:

- Normalize/resolve bằng path APIs và kiểm tra containment bằng relative path boundary.
- Với operation nhạy cảm, kiểm tra realpath/junction/symlink và allowlist rõ.
- Cleanup chỉ được vào các targets generated đã cho phép; chặn source, parent source, repo root và final output.
- Không cho cleanup phá asset/derivative đang được job hoặc project sử dụng.
- Test destructive operation bằng temporary tree và sentinel files; tuyệt đối không dùng media gốc để thử.

**Nghiệm thu:** imported asset còn usable sau reload; asset source và derivative đều preview/render được; malformed/traversal path bị từ chối; cleanup không chạm source.

## H. Inspect, normalize và cache media

Tái sử dụng FFmpeg/FFprobe adapters và command builders hiện có, bổ sung contract cần thiết. Giữ execution dạng argument array và tránh shell command ghép từ input không tin cậy.

Cache identity phải xét source identity, transform settings và pipeline version. Khi cần hash video lớn, dùng streaming thay vì đọc toàn bộ file vào RAM. Stat có thể hỗ trợ optimization, nhưng không được là bằng chứng duy nhất khi cache cần tính đúng theo nội dung.

Yêu cầu bổ sung:

1. Hai nguồn cùng basename không dùng chung cache sai.
2. Đổi width/height/FPS/codec/audio settings không reuse derivative khác contract.
3. Output có sẵn phải có manifest/probe hợp lệ, không chỉ exists.
4. Job dùng file tạm riêng; promote completed output atomic hoặc theo cơ chế publish an toàn tương đương.
5. Concurrent requests cho cùng fingerprint được deduplicate hoặc serialized có chủ đích.
6. Failure/cancel không để partial output được coi là normalized.
7. Force reencode tạo hoặc publish derivative an toàn, không sửa nguồn.
8. Probe có timeout, lỗi binary/codec/permission có message hữu ích.
9. Target settings được validate; bảo toàn aspect ratio và orientation theo profile/project.
10. Dừng job dài và child process theo cancellation policy; không để orphan process sau shutdown.

**Nghiệm thu:** normalize hai clip cùng tên, thay settings, failure và hai requests đồng thời đều giữ source và trả đúng derivative.

## I. Sửa editor store và history

Tách pure reducer/commands để test trực tiếp nếu cần; provider chỉ nối React. Thay đổi phải giữ API hợp lý cho consumers hiện tại.

Đảm bảo sau mọi command, update, delete, split, load, migration, undo và redo:

- Timeline được rebuild đúng với project đã commit.
- `currentFrame` nằm trong `[0, totalDurationInFrames - 1]`.
- Selection trỏ đến entity còn tồn tại hoặc null; phân biệt scene/audio selection khi hỗ trợ cả hai.
- Invalid action không làm hỏng document hoặc tạo history entry vô nghĩa.
- No-op không đẩy history và không đánh dấu dirty sai.
- Undo/redo khôi phục dữ liệu đúng, giữ selection/frame theo policy nhất quán.
- History giới hạn đúng số lượng; không có lệch “20” nhưng giữ 21 snapshots.
- Một lần kéo slider/trim tạo một logical edit trong history; không tạo hàng chục undo steps không chủ đích.
- Thực thi lock tại command boundary, không chỉ ở UI.
- UUID tạo ở action/command boundary; reducer không tạo identity bằng thời gian hoặc random.

Reconcile invariants ở một vị trí tái sử dụng, tránh copy/paste riêng cho mỗi case.

**Nghiệm thu:** split→undo→redo, delete cuối timeline, shrink tại cuối và no-op có tests phản ánh trạng thái người dùng thấy.

## J. Split, trim và chỉnh sửa video

Sửa split để đoạn sau bắt đầu ở source time đã tiêu thụ. Với contract hiện tại dùng frame theo composition FPS, ví dụ offset30, rate2, split sau60 timeline frames phải cho offset đoạn sau150. Khi source FPS khác, chuyển đơn vị theo seconds hoặc công thức contract đã định nghĩa; không cộng nhầm source-native frames với composition frames.

Phải xử lý:

- Playback rates 0.5, 1, 1.5 và 2 cùng rounding policy deterministic.
- Split tại đầu/cuối, sát minimum duration và split nhiều lần.
- Bảo toàn tổng duration; ID unique; metadata/volume/object-fit còn đúng.
- Transition của hai đoạn sau split theo policy rõ, tránh thêm fade ở điểm cắt làm nội dung không còn liên tục.
- Trim phải giữ source in/out hợp lệ, không kéo quá media available mà không có freeze/loop policy đã định nghĩa.
- Pointer capture, pointercancel/lost capture và Escape hủy gesture; unmount không để gesture treo.
- Preview gesture tạm và commit final có semantics rõ; một gesture tương ứng một history transaction.
- Delete/duplicate/reorder hoạt động đúng model tuần tự; không biểu thị drag tự do nếu engine chưa hỗ trợ.

**Nghiệm thu:** kiểm tra source frames trước/sau split bằng video có marker thời gian, không chỉ assert số trong object.

## K. Timeline geometry, lanes và navigation

Sử dụng geometry helpers hiện có; thống nhất frames↔seconds↔pixels và scroll coordinate.

- Clip position/duration lấy từ computed timeline, không từ hard-coded pixel assumptions.
- Audio clip geometry lấy startFrame và actual effective duration.
- Mọi audio track đều có representation; không giới hạn ở index0/1.
- V1/V2 phải phản ánh model. Trong phạm vi này giữ scene sequencing, không tự viết một engine compositing arbitrary nhiều lớp.
- Timeline toolbar, ruler, playhead và clips dùng cùng timeline total duration.
- Fit timeline đo viewport thực tế thay vì giả định 900px; zoom giữ anchor hợp lý.
- Snapping có threshold rõ, phản ánh scene boundaries/playhead và không gây seek/trim nhảy bất ngờ.
- Empty/short/long project có layout ổn định; clip label không làm resize geometry.
- Selection, keyboard focus và hover styles phân biệt được; controls có tooltip/accessible name.
- Auto-scroll playhead khi playback hợp lý, không tranh quyền với user scroll.
- Nếu virtualize, đảm bảo ruler/playhead/hit testing/scroll vẫn đúng.

**Nghiệm thu:** FPS24/30/60, zoom min/max, project dài và nhiều audio tracks cho đúng vị trí, selection và scrolling.

## L. Audio mixing và track controls

Tách master preview volume khỏi audio settings được xuất. Người dùng giảm volume nghe thử không được vô tình làm giảm final render, trừ khi UI xác định đây là project mix setting.

Nối master mute/volume vào Player API được phiên bản local hỗ trợ. Track settings được lưu trong model/store và dùng bởi cả preview/export.

Yêu cầu:

- Mute có tác dụng thực tế; nếu hỗ trợ solo thì có semantics và test tương ứng.
- Visibility của visual lane ảnh hưởng rendering; lock chặn commands chỉnh sửa nhưng không tự mute/ẩn.
- Voice/music/sfx có start, duration, volume và fade rõ; timeline và AudioLayer nhất quán.
- Duration omitted có policy theo media duration/project bounds; không âm thầm vẽ full project khi audio ngắn.
- Loop và fade dùng đúng frame/time basis của phiên bản Remotion; test fade trên loop và cuối track.
- Không cộng volume ngoài giới hạn API; cần cảnh báo hoặc normalization policy nếu mix có clipping thực tế.
- Các controls phản ánh loading/missing media/error thay vì cho người dùng thao tác vào entity không usable.
- Nếu làm waveform, dùng metadata/audio sampling và cache hợp lý; không chặn UI thread hoặc coi waveform là audio engine.

**Nghiệm thu:** project có voice+music+sfx; mute/volume/fade timing đúng ở playback và MP4 xuất thật.

## M. Đồng bộ preview, playback và canvas

Kiểm tra Player lifecycle và events theo package đã cài, không dùng API từ trí nhớ khi versions khác nhau.

- Seek từ store và frame update từ Player không tạo feedback loop hoặc bỏ mất user seek.
- Thay đổi duration/project khi đang play reconcile frame và trạng thái playback đúng.
- End playback, pause, restart và scrubbing có states đúng; không giữ isPlaying sau khi thực tế đã dừng.
- Event listeners/RAF/timers có cleanup; StrictMode không double-register.
- Fit/50%/100% giữ đúng canvas aspect ratio; zoom có overflow/pan hợp lý.
- Safe area overlay bám canvas thật, không bám toàn panel.
- Portrait 9:16, square1:1 và landscape16:9 đều có framing đúng.
- Loading/missing/error media có trạng thái có thể phục hồi; không blank canvas vô thông báo.
- Fullscreen failure có handling phù hợp; exit fullscreen không làm layout hỏng.
- Context rerender theo frame không làm mọi inspector/list nặng chạy lại không cần thiết; đo trước khi đổi store.

**Nghiệm thu:** play/pause/seek/frame step, sửa clip khi ở cuối timeline và chuyển project không desync giữa timecode/playhead/canvas.

## N. Fade và crossfade thực sự

Giữ fade-through-black và crossfade là hai semantics khác nhau. Với crossfade, hai scenes phải được render trong khoảng overlap, không chỉ giảm opacity của một scene.

Ưu tiên thư viện `@remotion/transitions` đã có, kiểm tra API và constraints hiện hành. Không viết engine transition mới khi thư viện giải quyết đúng bài toán.

Xác định:

- Transition gắn vào cạnh nào và scene nào sở hữu cấu hình.
- Start/end của mỗi scene và total duration sau overlap.
- Incoming/outgoing transition trên một scene có thể kết hợp trong những giới hạn nào.
- Duration transition không vượt available duration của scenes liên quan.
- Scene đầu/cuối, một scene, transition none, zero/invalid config và clip rất ngắn.
- Scene-local frame, source offset và audio behavior trong overlap.
- Migration của legacy projects khi thay đổi duration semantics.

Ví dụ với hai scenes90/90 và overlap15: total timeline là165 theo contract overlap đã chọn. Editor ruler, computed timeline, composition metadata và MP4 phải đồng ý về165 frames.

**Nghiệm thu:** inspect các frame trước/trong/sau boundary, có contribution của cả hai scenes trong overlap và không có black gap không chủ đích. Gỡ mitigation reject crossfade sau khi implementation/test hoàn tất.

## O. Formula và typography cho video

Render LaTeX bằng thư viện thực sự như KaTeX, dùng phiên bản được kiểm tra tương thích. Font-family mang tên KaTeX không đủ.

- Load CSS/fonts cùng app/render bundle, tránh phụ thuộc font mạng chưa tải xong.
- Dùng cấu hình trust phù hợp input; giới hạn source size/macro expansion và xử lý parse error.
- Chỉ đưa markup do renderer được kiểm soát tạo ra vào HTML; không render raw user HTML tùy tiện.
- `textColor`, fontSize, background và fields inspector thực sự ảnh hưởng output.
- Formula dài có layout/scale theo container, không overflow hoặc che nội dung khác.
- Việt hóa text có dấu, nhiều dòng và từ dài không bị cắt; fonts consistent preview/render.
- Invalid draft formula hiển thị lỗi có thể sửa; export phải báo input chưa hợp lệ hoặc dùng policy đã định nghĩa, không im lặng xuất sai.
- Animation deterministic theo frame, không dùng timer trong nội dung composition.

**Nghiệm thu:** Euler, fraction, căn, integral, matrix, formula dài và invalid source; kiểm tra hình ảnh render thật, không chỉ DOM string.

## P. Subtitle cơ bản và composition registry

Đọc SubtitleLayer và types hiện có trước khi tích hợp. Trong phạm vi P1, hỗ trợ import/edit subtitles có timestamp, đủ để sử dụng trong project và render; không tự thêm cloud transcription/translation.

- Dùng parser phù hợp SRT/VTT hoặc format đã chọn; bảo vệ Unicode, multiline và timestamp.
- Định nghĩa subtitle time basis và mapping với project FPS.
- Validate start<end, boundaries, cues overlap và policy khi project FPS/duration thay đổi.
- Subtitle không che safe areas/subject theo layout settings; preview/export dùng cùng style.
- Import lỗi có message và không phá cues cũ.
- Nếu subtitle editing có history, undo/redo phải khôi phục dữ liệu đúng.

Với CompositionScene, registry phải resolve componentName tới component đã đăng ký, hoặc báo unsupported có ngữ cảnh. Không dùng eval hoặc import code tùy ý từ project JSON. Nếu tính năng nằm ngoài phạm vi, UI phải biểu thị rõ trạng thái unsupported, không giả làm composition đã render.

**Nghiệm thu:** project có subtitles và composition hợp lệ hoặc unsupported state rõ; không crash toàn editor vì một registry lookup thất bại.

## Q. Render service, jobs và export thật

Repo hiện là editor Vite cùng CLI pipeline. Nếu chưa có service, triển khai một Node local render service tối thiểu để browser gọi Remotion/FFmpeg. Giữ browser/server boundary rõ; không đưa child_process vào bundle frontend.

Service local bind loopback, kiểm tra origin/session phù hợp local workflow, request validation, giới hạn input và routes có phạm vi. Không mở quyền filesystem tùy ý hoặc listen công khai để tiện demo.

Luồng bắt buộc:

1. User chọn profile và bấm export.
2. Chụp snapshot immutable của project/revision hiện tại.
3. Validate schema/assets/timeline và resolve catalog references.
4. Tạo jobId; queued/rendering/completed/failed/cancelled có state transitions rõ.
5. Tính composition metadata từ resolved input snapshot.
6. Render bằng registered entry thật, hiện nằm ở `src/index.ts` theo source ban đầu.
7. Progress từ engine/job, có log cần thiết và thông báo lỗi có ngữ cảnh.
8. Cancel thực sự dừng công việc theo khả năng engine; không chỉ đóng modal.
9. Chỉ completed sau output tồn tại, có size hợp lý và FFprobe metadata đúng.
10. UI cung cấp preview/download/open output phù hợp local environment.

Không để edit sau khi job chạy thay đổi snapshot của job; người dùng có thể tiếp tục edit revision mới. Double submit có policy disabled/idempotency; concurrency giới hạn tránh làm máy cạn CPU/RAM.

Chuẩn hóa profile từ một nguồn dữ liệu:

- Preview nhanh và final chất lượng cao có codec/CRF/pixel format/FPS/resolution cụ thể.
- Giữ aspect ratio project; không ép mọi portrait vào landscape1080p.
- UI hiển thị đúng settings, output path và filename thực tế.
- Unsupported dimensions/codec/profile được validate trước job; không silently round dữ liệu quan trọng.
- CLI nhận `--project` hoặc input props snapshot document theo contract và dùng cùng application workflow.
- Parse CLI args có validation; lỗi profile không được cast enum rồi crash không rõ nguyên nhân.
- Nếu giữ command copy, command phải render document người dùng đã lưu/xuất, không ngầm dùng demo.

**Nghiệm thu:** sửa title/media/duration của project khác demo → render preview và final → MP4 có đúng nội dung, duration, FPS, dimensions và audio.

## R. Forms, errors, notifications và shortcuts

Audit các UI components hiện có và mở rộng đúng patterns. Không tạo một hệ form framework mới nếu components hiện tại đủ.

- Inputs có label/description/error phù hợp; errors gắn với field và giữ draft khi sai.
- Numeric inputs cho phép người dùng nhập từng bước, validate trước commit; không nhảy về1920 khi xóa một ký tự nếu UX không chủ đích.
- Scene-specific inspector dùng types phù hợp, không ép union bằng `as any`.
- Clipboard API có await/catch; chỉ báo copied sau write thành công; timers cleanup.
- Notifications phản ánh operation thật; không lạm dụng toast cho validation đơn giản.
- Modal có role/accessible name, focus trap, return focus, Escape và backdrop behavior phù hợp trạng thái job.
- Shortcuts xét INPUT/TEXTAREA/SELECT/contentEditable, IME composition và active modal.
- Native undo của field không bị global undo chiếm quyền khi đang nhập.
- Ctrl/Cmd+K, V, N hoặc tooltips khác chỉ được biểu thị nếu thực sự được implement.
- Khi một command unavailable, có disabled state và lý do rõ, không control có click nhưng không tác dụng.

**Nghiệm thu:** keyboard-only workflows, typing tiếng Việt/IME, undo trong field, modal/job error/retry và clipboard failure không gây side effects bất ngờ.

## S. Responsive và accessibility cho editor

Thiết kế quanh công việc chỉnh sửa video, không tạo landing page/hero marketing. Giữ thương hiệu Icegozi rõ trong workspace nhưng ưu tiên canvas/timeline và các thao tác lặp lại.

- Desktop có panels có thể resize/collapse, canvas đủ rộng và timeline ergonomic.
- Tablet/mobile không ép hai sidebar min-width cố định khiến canvas biến mất; dùng tabs/drawers/collapse có chủ đích.
- Preview/timeline/actions quan trọng vẫn truy cập được ở viewport hẹp.
- Horizontal scroll được giới hạn ở surfaces cần thiết, không làm toàn page tràn.
- Toolbar/icons có dimensions ổn định, tooltip và accessible name.
- Mode dùng segmented control/tabs; binary dùng toggle/checkbox; numeric dùng input/stepper/slider; colors dùng swatches; commands dùng icon hoặc icon+label phù hợp.
- Reuse lucide icons; không vẽ SVG icons tự chế khi library đã có.
- Spacing/type scale nhất quán; text trong compact panel không dùng hero size; letter spacing mặc định0.
- Không có text overlap, button label tràn, card-in-card hoặc sections trang trí không phục vụ task.
- Focus visible, contrast phù hợp, touch target đủ dùng; resize handle có keyboard alternative khi khả thi.
- Reduced motion ảnh hưởng UI motion; không làm thay đổi nội dung video xuất mà người dùng đã chọn.

Kiểm tra tối thiểu các viewport đại diện1440×900,1280×720,768×1024,390×844 và360×800, cùng zoom browser200%. Chụp screenshot và inspect thật; screenshot không thay thế interaction testing.

**Nghiệm thu:** tạo/chỉnh sửa/lưu/preview/export truy cập được ở desktop và mobile layout, không overlap hoặc mất primary controls.

## T. Hiệu năng có số đo

Đo trước khi tối ưu. Build warning về chunk size chỉ là tín hiệu để điều tra.

Thiết lập workload đại diện: project nhỏ và project stress có nhiều scenes/audio/cues nhưng không vượt mục tiêu sản phẩm vô lý. Ghi máy, viewport, fixture và phương pháp đo.

Quan sát:

- Render counts của context consumers khi frame update.
- Latency seek, scrub, inspector edit và gesture commit.
- Large timeline/list rendering và DOM count.
- RAM của metadata/hash/normalize jobs.
- Bundle size, startup và lazy-load boundaries.
- Render throughput/CPU/concurrency với preview/final.

Chỉ áp dụng memoization/selectors/context split/virtualization/code splitting khi có nguyên nhân rõ. Không làm history/persistence/render semantics phức tạp để giảm một warning. Giữ số đo before/after và kiểm tra behavior sau tối ưu.

**Nghiệm thu:** không có regression có ý nghĩa so với baseline; improvements có số đo, không dùng “nhanh hơn” khi chưa đo.

## U. Dependencies và tooling có kiểm soát

Inspect installed versions, lockfile, Node support và package compatibility. Review trước thấy Remotion core/player/CLI/transitions cùng 4.0.534; không coi các range trong package.json khác nhau là installed mismatch nếu chưa kiểm tra.

- Tra tài liệu chính thức/changelog/npm metadata ở thời điểm upgrade; không dùng version “latest” từ trí nhớ.
- Giữ các Remotion packages đồng bộ theo yêu cầu phiên bản được chọn.
- Nâng nhóm dependencies nhỏ, xử lý deprecations có tests; không chạy blanket force upgrade.
- Nếu chuyển `startFrom` sang API mới, kiểm chứng behavior trim/rate và không dùng old/new props xung đột.
- Thêm thư viện chỉ khi giải quyết bài toán thực: formula renderer, parsers hoặc test tooling cần thiết.
- Dùng npm cập nhật lockfile; không sửa lockfile tay.
- Không giảm strictness/lint để che lỗi API.
- Bổ sung scripts lint/format/check chỉ khi cấu hình thực sự có; không báo command không tồn tại đã qua.
- Ghi engine/version prerequisites và setup cross-platform.

**Nghiệm thu:** clean install từ lockfile chạy được các checks; migrations/API behavior có validation sau từng nhóm upgrade.

## V. Test theo rủi ro và workflow

Bổ sung meaningful tests cho behavior mới/sửa, không viết tests chỉ mirror implementation hoặc assertion luôn đúng.

**Unit:** frame math, timeline invariants, schema/migration/ID uniqueness, reducers/commands/history, geometry, profile/CLI argument validation và path containment.

**Integration:** project persistence/revision race, asset import/resolve, normalize cache/concurrency/failure, render snapshot/metadata/job lifecycle, audio envelope và formula/subtitle rendering.

**E2E:** user flow mở/tạo→import→edit→preview→save→reload→export; error/retry/cancel; focus/shortcuts/modals và responsive interactions.

Các tình huống bắt buộc:

1. Split offset30/rate2 tại60 cho đoạn sau150 theo contract frame hiện tại.
2. Seek/clamp đúng frame cuối; shrink/delete/undo/redo không invalid selection.
3. Hai nguồn cùng tên và target settings khác không reuse sai normalize cache.
4. Cleanup targets source/parent/root/output/symlink bị chặn trên temporary tree.
5. Saved chỉ sau write thành công; old save không ack revision mới.
6. Render dùng immutable snapshot khác demo; edit trong khi render không đổi job.
7. Job failed/cancelled không tạo success UI hoặc usable partial output.
8. Audio3+ tracks có geometry và playback đúng; mute/hide/lock có tác dụng.
9. Crossfade90+90-15=165, frame overlap có cả hai scenes theo contract.
10. Formula/typesetting/fonts/color và invalid input được kiểm tra hình ảnh.
11. Portrait/square/landscape exports đúng ratio/FPS/duration.
12. Imported media phục hồi sau reload và browser/server resolve cùng asset.
13. Unicode filenames, multiline Vietnamese text, SRT/VTT lỗi và asset missing.
14. Keyboard input undo/IME/modal không kích hoạt editor command sai.

Dùng synthetic media fixtures nhỏ tạo deterministic bằng tool có sẵn, không dùng dữ liệu cá nhân hoặc network ngẫu nhiên. Filesystem destructive tests chỉ ở thư mục tạm đã kiểm tra boundary. Mock timers/processes phù hợp; integration render thật phải được chạy riêng để xác minh phần mock không chứng minh được.

**Nghiệm thu:** tests có thể fail nếu revert fix, không flaky vì sleep/network/order, và mọi required check đã hoàn thành.

## W. Review source/diff sau implementation

Dùng skill senior-code-review và checklist để review thay đổi thực tế. Nếu repo có base hợp lệ, review committed+staged+unstaged+relevant untracked; nếu unborn, mô tả cách so với snapshot ban đầu.

Review logic, edge/null, async/concurrency, security, performance, compatibility và missing tests. Trace callers khi đổi schema/model/API. Kiểm tra Node code không lọt vào browser bundle, filesystem boundary và source integrity.

Mọi finding phải có bằng chứng file/line/scenario. Sửa các lỗi do implementation gây ra bằng patch nhỏ, chạy lại tests liên quan và review lại diff. Không flood report bằng style suggestions.

Tìm actual conflict markers, accidental secrets, debug code, mock success handlers, stale UI labels và unrelated generated artifacts. Không xóa artifacts của người dùng.

**Nghiệm thu:** không còn unresolved Critical hoặc Important chặn flow; mọi finding có trạng thái fixed/remaining rõ và bằng chứng validation.

## X. Tài liệu, CI và vận hành

Cập nhật tài liệu theo behavior cuối cùng, không giữ instructions render sai entry hoặc generated path không serve được.

Tài liệu cần có:

- Setup Node/npm/FFmpeg/FFprobe và cách mở editor local.
- Cách chạy local service, lifecycle và ports.
- Project schema/version/migration và save/restore behavior.
- Managed source/derivative/export locations cùng cleanup policy.
- Import/relink/normalize workflow và cache identity.
- Preview/final profiles, actual commands, snapshot export và job errors.
- Cách thêm scene/composition/subtitle capability theo architecture.
- Commands unit/integration/e2e/build/typecheck và prerequisites của render tests.
- Các limitations còn lại và troubleshooting có ngữ cảnh.

Thêm CI phù hợp repo chạy required automated checks. Render tests nặng có job riêng nếu cần, nhưng phải giải thích điều gì được kiểm chứng ở local và CI. Không đưa credentials vào workflow.

Cập nhật MEMORY chỉ với quyết định bền vững, không ghi toàn bộ task log hoặc copy secrets.

**Nghiệm thu:** người khác làm theo docs từ clean install có thể mở app, thực hiện workflow và chạy checks đúng.

## Y. Nghiệm thu tổng thể và rollback

Chạy lại các required commands sau khi implementation ổn định:

```powershell
npm run typecheck
npm test
npm run build:editor
```

Chạy thêm lint/integration/e2e scripts đã thực sự bổ sung. Start server local, mở URL và test app thật; nếu port đã có process, xác định trước và chọn port khác khi cần, không tự kill process không thuộc task.

Thực hiện hai project mẫu tối thiểu:

1. Landscape với video/image/text/formula, voice/music/sfx, transition và subtitles.
2. Portrait dùng media import, duration/FPS khác demo và edit qua nhiều thao tác undo/redo.

Với mỗi project: save/reload, render preview/final, dùng FFprobe kiểm tra dimensions/FPS/duration/codecs/audio, inspect representative frames và kiểm tra audio. Đầu/cuối scene và transition boundaries phải được kiểm tra.

Xác minh source media vẫn nguyên vẹn bằng manifest/hash hoặc phương pháp tương đương phù hợp fixture. Kiểm tra migrations không overwrite file cũ khi fail.

Chuẩn bị rollback cho thay đổi schema/dependencies/service: giữ compatibility adapters hoặc bản project cũ khi migration; nêu cách quay lại mà không mất data. Không tự rollback thay đổi của người dùng để làm checks qua.

**Nghiệm thu:** workflow hoàn thành end-to-end, output đúng snapshot và source còn nguyên. Nếu chưa kiểm chứng render/UI thì trạng thái tương ứng là NOT TESTED/BLOCKED, không báo đầy đủ DONE.

## Z. Bàn giao và định nghĩa hoàn thành

Chỉ kết thúc implementation khi có kết quả cụ thể, reviewable và các required checks đã chạy. Không tự commit, push, merge hoặc publish.

Báo cáo bàn giao gồm:

- Những gì đã sửa/nâng cấp, nhóm theo tác dụng với người dùng.
- Findings C1/C2/I1–I11: trạng thái, files và test xác nhận; findings không còn tồn tại trước khi sửa được đánh dấu rõ.
- Contracts/migrations/dependency versions mới và lý do thay đổi.
- Verification table với command/method/result/status thực tế.
- UI workflows/viewports đã kiểm tra và bằng chứng screenshots khi có.
- MP4 outputs/probe results và representative frames đã inspect.
- Remaining risks, giới hạn hoặc deferred scope có lý do cụ thể.
- URL local để chạy thử và links tới tài liệu/artifacts cần thiết.
- Merge gate theo repository rules, không nói READY nếu còn blocker.

Checklist hoàn thành:

- [ ] Source media được bảo vệ; cleanup và normalize an toàn.
- [ ] Project save/restore có tác dụng và status chính xác.
- [ ] Import/relink media bền vững, usable sau reload.
- [ ] Split/trim/history/frame/selection đúng invariants.
- [ ] Timeline/audio controls phản ánh engine thực tế.
- [ ] Preview và export dùng cùng project semantics.
- [ ] Crossfade overlap đúng; formula typeset; subtitles được tích hợp theo scope.
- [ ] Export job thật dùng snapshot hiện tại và output đã kiểm chứng.
- [ ] Forms/shortcuts/modals/responsive/accessibility được test.
- [ ] Typecheck/tests/build và các required checks khác qua.
- [ ] Final source/diff review không còn blocker chưa giải quyết.
- [ ] Docs/CI/memory phản ánh implementation cuối cùng.
- [ ] Không có success giả, committed secrets hoặc unrelated destructive changes.

Hãy bắt đầu ở giai đoạn A, chạy baseline, rồi triển khai theo thứ tự dependencies và mức rủi ro. Kế hoạch có thể điều chỉnh khi source cung cấp bằng chứng mới, nhưng phải giữ mục tiêu hoàn thành workflow thực tế và ghi rõ phạm vi chưa làm.

## Kết thúc prompt

### Tài liệu kỹ thuật đã đối chiếu cho prompt

- [Remotion calculateMetadata](https://www.remotion.dev/docs/calculate-metadata): tính metadata theo input props.
- [Remotion TransitionSeries](https://www.remotion.dev/docs/transitions/transitionseries): transition overlap và total duration.
- [Remotion staticFile](https://www.remotion.dev/docs/staticfile): media public và URL resolution.
- [Remotion Html5Video](https://www.remotion.dev/docs/html5-video): trimming và playback props; kiểm tra lại với version chọn khi implementation.
- [KaTeX options](https://katex.org/docs/options.html): formula rendering, error handling và trust settings.

Các links là nguồn tham khảo kỹ thuật, không thay thế việc kiểm tra type declarations/package versions đang được cài trong repo khi thực thi.
