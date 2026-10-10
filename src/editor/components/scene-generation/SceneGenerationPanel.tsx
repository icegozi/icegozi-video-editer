import React, { useState } from 'react';
import { useSceneGeneration } from '../../hooks/useSceneGeneration';
import type { AssistantConversation, ProjectSnapshot } from '../../../application/assistant/assistant.contracts';
import { GenerationRequestSchema } from '../../../application/scene-generation/generation.contracts';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { Select } from '../ui/Select';
import { Dialog } from '../ui/Dialog';
import { GoogleConnectionDialog } from './GoogleConnectionDialog';

const names: Record<string, string> = {
  awaiting_approval: 'Chờ duyệt',
  approved: 'Đã duyệt',
  queued: 'Đang chờ dựng',
  submitting: 'Đang tạo',
  processing: 'Đang dựng',
  validating: 'Đang kiểm tra',
  ready: 'Đã tạo',
  failed: 'Không hoàn tất',
  declined: 'Đã bỏ',
  cancelled: 'Đã hủy',
  cancel_requested: 'Đang dừng',
  cancellation_unknown: 'Chưa xác nhận hủy',
  submission_unknown: 'Chưa xác nhận kết quả',
  interrupted: 'Đã gián đoạn',
  invalidated: 'Phiên đã đổi',
};
export function SceneGenerationPanel({
  conversation,
  snapshot,
  running,
}: {
  conversation: AssistantConversation | null;
  snapshot: () => ProjectSnapshot;
  running: boolean;
}) {
  const generation = useSceneGeneration(conversation, snapshot);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [presetId, setPresetId] = useState('gemini-image-landscape');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState('5');
  const [template, setTemplate] = useState('growing-text');
  const [title, setTitle] = useState('A');
  const [sceneJson, setSceneJson] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [placement, setPlacement] = useState('append');
  const [replaceSceneId, setReplaceSceneId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const presets = generation.overview?.capabilities.presets ?? [];
  const preset = presets.find((entry) => entry.id === presetId);
  return (
    <section data-testid="scene-generation" style={{ display: 'grid', gap: 8, fontSize: 12 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Button size="sm" disabled={!conversation} onClick={() => setCreateOpen(true)}>
          Tạo cảnh
        </Button>
        <Button size="sm" disabled={!conversation} onClick={() => setGoogleOpen(true)}>
          {generation.google?.status === 'connected'
            ? generation.google.authMode === 'api_key'
              ? 'Gemini API key đã cấu hình'
              : 'Google đã kết nối'
            : 'Kết nối Google / Gemini'}
        </Button>
        <span style={{ color: 'var(--text-secondary)' }}>Core local · Ảnh Gemini</span>
      </div>
      {generation.error && (
        <p role="alert" style={{ margin: 0, color: 'var(--color-danger)' }}>
          {generation.error}
        </p>
      )}
      <GoogleConnectionDialog
        key={conversation?.epoch ?? 'no-session'}
        open={googleOpen}
        onClose={() => setGoogleOpen(false)}
        status={generation.google}
        busy={generation.busy}
        action={generation.googleAction}
        failure={generation.error}
      />
      <Dialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo tư liệu cho cảnh"
        description="Tạo media trước, xem kết quả rồi duyệt bản nháp timeline."
        width={540}
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <Select
            label="Cách tạo cảnh"
            value={presetId}
            options={presets.map((entry) => ({
              value: entry.id,
              label: entry.label,
            }))}
            onChange={(event) => {
              setPresetId(event.target.value);
              setReferenceId('');
            }}
          />
          <TextArea
            label="Mô tả cảnh"
            value={prompt}
            maxLength={4000}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ví dụ: Một con cáo giữa đồng cỏ, ánh sáng buổi sớm"
          />
          {preset?.providerId === 'gemini' && (
            <>
              <p style={{ margin: 0, fontSize: 12 }}>
                Gemini tạo ảnh tĩnh. Core dựng hoạt họa; ảnh tĩnh không có động tác của chủ thể.
              </p>
              <Select
                label="Ảnh tham chiếu (tùy chọn)"
                value={referenceId}
                onChange={(event) => {
                  setReferenceId(event.target.value);
                  const asset = generation.overview?.assets.find(
                    (entry) => entry.id === event.target.value,
                  );
                  if (asset) void generation.showAsset(asset);
                }}
                options={[
                  { value: '', label: 'Không gửi ảnh tham chiếu' },
                  ...(generation.overview?.assets
                    .filter((asset) => asset.mediaType === 'image')
                    .map((asset) => ({
                      value: asset.id,
                      label: `${asset.origin === 'generated' ? 'Ảnh đã tạo' : 'Ảnh nhập'} · ${asset.id.slice(0, 8)}`,
                    })) ?? []),
                ]}
              />
              <label style={{ fontSize: 12 }}>
                Nhập ảnh tham chiếu (PNG/JPEG/WebP, tối đa 3 MiB)
                <input
                  aria-label="Nhập ảnh tham chiếu Gemini"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={generation.busy || running}
                  onChange={async (event) => {
                    const input = event.currentTarget;
                    const file = input.files?.[0];
                    if (!file) return;
                    const asset = await generation.importImage(file);
                    if (asset) {
                      setReferenceId(asset.id);
                      await generation.showAsset(asset);
                    }
                    input.value = '';
                  }}
                />
              </label>
              {generation.preview?.assetId === referenceId &&
                generation.preview.kind === 'image' && (
                  <img
                    alt="Ảnh tham chiếu đã chọn"
                    src={generation.preview.url}
                    style={{
                      maxWidth: '100%',
                      maxHeight: 160,
                      objectFit: 'contain',
                    }}
                  />
                )}
              {!generation.google?.connection && (
                <Button
                  onClick={() => {
                    setCreateOpen(false);
                    setGoogleOpen(true);
                  }}
                >
                  Cấu hình Google / Gemini
                </Button>
              )}
            </>
          )}
          {preset?.providerId === 'core' && (
            <>
              <Select
                label="Mẫu core"
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
                options={[
                  { value: 'growing-text', label: 'Chữ lớn dần' },
                  { value: 'fox-eating-grass', label: 'Cáo ăn cỏ hoạt họa' },
                  { value: 'custom', label: 'Dữ liệu cảnh tùy chỉnh' },
                ]}
              />
              {template === 'growing-text' && (
                <Input
                  label="Chữ trong cảnh"
                  value={title}
                  maxLength={100}
                  onChange={(event) => setTitle(event.target.value)}
                />
              )}
              {template === 'custom' && (
                <TextArea
                  label="Dữ liệu cảnh JSON"
                  value={sceneJson}
                  onChange={(event) => setSceneJson(event.target.value)}
                  hint="LLM có thể dựng dữ liệu này qua tools; không nhập mã JavaScript/JSX."
                />
              )}
              {template === 'fox-eating-grass' && (
                <p style={{ margin: 0 }}>
                  Cảnh vector có chuyển động cúi đầu và nhai, chạy tại máy.
                </p>
              )}
            </>
          )}
          {preset?.kind === 'video' && (
            <Select
              label="Thời lượng video"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              options={preset.durations.map((seconds) => ({
                value: seconds,
                label: `${seconds} giây`,
              }))}
            />
          )}
          <Select
            label="Cách dựng bản nháp sau khi tạo"
            value={placement}
            onChange={(event) => setPlacement(event.target.value)}
            options={[
              { value: 'append', label: 'Thêm cảnh cuối timeline' },
              { value: 'replace', label: 'Thay một cảnh hiện có' },
            ]}
          />
          {placement === 'replace' && (
            <Select
              label="Cảnh cần thay"
              value={replaceSceneId}
              onChange={(event) => setReplaceSceneId(event.target.value)}
              options={[
                { value: '', label: 'Chọn cảnh' },
                ...snapshot().project.scenes.map((scene) => ({
                  value: scene.id,
                  label: scene.id,
                })),
              ]}
            />
          )}
          {(formError || generation.error) && (
            <p role="alert" style={{ color: 'var(--color-danger)', margin: 0 }}>
              {formError ?? generation.error}
            </p>
          )}
          <Button
            variant="primary"
            disabled={generation.busy || running || !preset || !prompt.trim()}
            onClick={async () => {
              try {
                const request = GenerationRequestSchema.parse({
                  kind: preset!.kind,
                  presetId,
                  prompt,
                  ...(preset!.kind === 'video' ? { durationSeconds: Number(duration) } : {}),
                  referenceAssetIds: referenceId ? [referenceId] : [],
                  ...(preset!.providerId === 'core'
                    ? template === 'custom'
                      ? { sceneSpec: JSON.parse(sceneJson) }
                      : { templateId: template, title }
                    : {}),
                  intent: {
                    placement,
                    ...(placement === 'replace' ? { replaceSceneId } : {}),
                    objectFit: 'cover',
                  },
                });
                const result = await generation.create(request);
                if (result) {
                  setCreateOpen(false);
                  setFormError(null);
                }
              } catch {
                setFormError('Kiểm tra mô tả, mẫu, dữ liệu JSON và cảnh cần thay.');
              }
            }}
          >
            Lập yêu cầu tạo cảnh
          </Button>
        </div>
      </Dialog>
      {generation.overview?.requests.slice(0, 20).map((entry) => {
        const state = entry.job?.status ?? entry.plan.status;
        const pending =
          state === 'awaiting_approval' &&
          entry.plan.epoch === conversation?.epoch &&
          entry.plan.expiresAt > Date.now();
        const cancellable =
          !!entry.job &&
          ['queued', 'submitting', 'submitted', 'processing', 'validating'].includes(state);
        const reference = generation.overview?.assets.find(
          (asset) => asset.id === entry.plan.request.referenceAssetIds[0],
        );
        return (
          <article
            key={entry.requestId}
            data-testid={`generation-request-${entry.requestId}`}
            style={{
              padding: 10,
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 8,
              display: 'grid',
              gap: 6,
            }}
          >
            <strong>
              {entry.plan.preset.label} · {names[state] ?? state}
              {entry.job?.progress !== undefined ? ` (${entry.job.progress}%)` : ''}
            </strong>
            <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {entry.plan.request.prompt.slice(0, 350)}
            </span>
            <span>
              {entry.plan.request.durationSeconds
                ? `${entry.plan.request.durationSeconds}s · `
                : ''}
              {entry.plan.preset.ratio} ·{' '}
              {entry.plan.preset.providerId === 'core'
                ? 'Dựng local, không phí API'
                : `Ước tính dự phòng $${(entry.plan.estimate.costMicros / 1000000).toFixed(4)} · ${entry.plan.preset.model}`}
            </span>
            {!!entry.plan.request.referenceAssetIds.length && (
              <span>Gửi 1 ảnh tham chiếu đã chọn đến Gemini.</span>
            )}
            {pending && reference && (
              <Button
                size="sm"
                disabled={generation.busy}
                onClick={() => void generation.showAsset(reference)}
              >
                Xem ảnh tham chiếu
              </Button>
            )}
            {pending && reference && generation.preview?.assetId === reference.id && (
              <img
                alt="Ảnh tham chiếu trong yêu cầu"
                src={generation.preview.url}
                style={{
                  maxWidth: '100%',
                  maxHeight: 160,
                  objectFit: 'contain',
                }}
              />
            )}
            {entry.job?.error && (
              <span role="status" style={{ color: 'var(--color-danger)' }}>
                {entry.job.error.message}
              </span>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {pending && (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={generation.busy}
                    onClick={() => void generation.decide(entry.requestId, true)}
                  >
                    Duyệt tạo cảnh
                  </Button>
                  <Button
                    size="sm"
                    disabled={generation.busy}
                    onClick={() => void generation.decide(entry.requestId, false)}
                  >
                    Bỏ yêu cầu
                  </Button>
                </>
              )}
              {cancellable && (
                <Button
                  size="sm"
                  disabled={generation.busy}
                  onClick={() => void generation.cancel(entry.requestId)}
                >
                  Hủy tạo cảnh
                </Button>
              )}
              {state === 'ready' && entry.asset && (
                <>
                  <Button
                    size="sm"
                    disabled={generation.busy}
                    onClick={() => void generation.show(entry)}
                  >
                    Xem cảnh đã tạo
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={generation.busy || running}
                    onClick={() => void generation.propose(entry)}
                  >
                    Tạo bản nháp cảnh
                  </Button>
                </>
              )}
              {['failed', 'interrupted'].includes(state) &&
                entry.plan.preset.providerId === 'core' && (
                  <Button
                    size="sm"
                    disabled={generation.busy}
                    onClick={() => void generation.retry(entry.requestId)}
                  >
                    Dựng lại local
                  </Button>
                )}
            </div>
          </article>
        );
      })}
      {generation.preview && (
        <div style={{ background: '#101827', borderRadius: 8, overflow: 'hidden' }}>
          {generation.preview.kind === 'video' ? (
            <video
              aria-label="Cảnh core đã tạo"
              src={generation.preview.url}
              controls
              style={{ width: '100%', display: 'block' }}
            />
          ) : (
            <img
              alt="Ảnh cảnh đã tạo"
              src={generation.preview.url}
              style={{ width: '100%', display: 'block' }}
            />
          )}
          <Button size="sm" onClick={generation.revoke}>
            Đóng xem cảnh
          </Button>
        </div>
      )}
    </section>
  );
}
