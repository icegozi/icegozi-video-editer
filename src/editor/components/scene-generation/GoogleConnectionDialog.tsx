import React, { useEffect, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import type { GoogleConnectionStatus } from '../../../application/scene-generation/generation.contracts';
import { geminiApiKeyInputError, normalizeGeminiApiKey } from '../../../application/scene-generation/geminiApiKey';

export function GoogleConnectionDialog({
  open,
  onClose,
  status,
  busy,
  action,
  failure,
}: {
  open: boolean;
  onClose: () => void;
  status: GoogleConnectionStatus | null;
  failure?: string | null;
  busy: boolean;
  action: (
    name: 'configure' | 'login' | 'cancel' | 'disconnect',
    config?: unknown,
  ) => Promise<GoogleConnectionStatus | undefined>;
}) {
  const [mode, setMode] = useState<'api_key' | 'oauth'>('api_key');
  const [apiKey, setApiKey] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [projectId, setProjectId] = useState('');
  const [maxJob, setMaxJob] = useState('0.25');
  const [daily, setDaily] = useState('2.00');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) setMode(status?.authMode ?? (status?.configured ? 'oauth' : 'api_key'));
    if (!open) {
      setClientSecret('');
      setApiKey('');
      setKeyError(null);
      setError(null);
    }
  }, [open, status?.authMode, status?.configured]);
  useEffect(() => {
    if (open && status?.connection) {
      setMaxJob(String(status.connection.maxJobCostMicros / 1000000));
      setDaily(String(status.connection.dailyBudgetMicros / 1000000));
    }
  }, [open, status?.connection?.maxJobCostMicros, status?.connection?.dailyBudgetMicros]);
  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title="Kết nối Google cho Gemini"
      description="Chọn Gemini API key hoặc Google OAuth. Cấu hình được mã hóa trên Windows và dùng được trong bản đóng gói."
      width={520}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <Select
          label="Cách kết nối Gemini"
          value={mode}
          disabled={busy || status?.status === 'connecting'}
          options={[
            { value: 'api_key', label: 'Gemini API key' },
            { value: 'oauth', label: 'Đăng nhập Google OAuth' },
          ]}
          onChange={(event) => {
            setMode(event.target.value as 'api_key' | 'oauth');
            setApiKey('');
            setKeyError(null);
            setClientSecret('');
            setError(null);
          }}
        />
        {mode === 'api_key' ? (
          <>
            <p style={{ margin: 0, fontSize: 12 }}>
              Nhập key mới từ{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                Google AI Studio
              </a>
              . Không cần OAuth client hoặc đăng nhập Google trong app.
            </p>
            <Input
              label="Gemini API key"
              type="password"
              value={apiKey}
              placeholder="YOUR_GEMINI_API_KEY"
              error={keyError ?? undefined}
              onChange={(event) => {
                setApiKey(event.target.value);
                setKeyError(null);
              }}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData('text');
                const normalized = normalizeGeminiApiKey(pasted);
                if (normalized !== pasted && !geminiApiKeyInputError(normalized)) {
                  event.preventDefault();
                  setApiKey(normalized);
                  setKeyError(null);
                }
              }}
              autoComplete="new-password"
              disabled={busy}
              spellCheck={false}
            />
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
              Có thể dán chuỗi key hoặc dòng X-goog-api-key; app sẽ lấy riêng key. Không dán cả lệnh
              curl.
            </p>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 12 }}>
              Bật Generative Language API, tạo OAuth client loại <strong>Desktop app</strong> và
              thêm tài khoản vào Test users nếu ứng dụng đang Testing.{' '}
              <a
                href="https://ai.google.dev/gemini-api/docs/oauth"
                target="_blank"
                rel="noreferrer"
              >
                Hướng dẫn Google
              </a>
            </p>
            <label style={{ fontSize: 12 }}>
              Nhập file cấu hình OAuth Desktop
              <input
                aria-label="File cấu hình OAuth Desktop"
                type="file"
                accept="application/json,.json"
                disabled={busy}
                onChange={async (event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > 16384) throw new Error('File cấu hình quá lớn.');
                    const value = JSON.parse(await file.text()) as {
                      installed?: {
                        client_id?: string;
                        client_secret?: string;
                        project_id?: string;
                      };
                    };
                    if (
                      !value.installed?.client_id ||
                      !value.installed.client_secret ||
                      !value.installed.project_id
                    )
                      throw new Error('Chọn file OAuth loại Desktop app.');
                    setClientId(value.installed.client_id);
                    setClientSecret(value.installed.client_secret);
                    setProjectId(value.installed.project_id);
                    setError(null);
                  } catch (failure) {
                    setError(failure instanceof Error ? failure.message : 'File không hợp lệ.');
                  } finally {
                    input.value = '';
                  }
                }}
              />
            </label>
            <Input
              label="Google Cloud project ID"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              autoComplete="off"
            />
            <Input
              label="OAuth Desktop client ID"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              autoComplete="off"
            />
            <Input
              label="OAuth client secret"
              type="password"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              autoComplete="new-password"
            />
          </>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <Input
            label="Ước tính tối đa mỗi tác vụ (USD)"
            type="number"
            min="0.01"
            max="10"
            step="0.01"
            value={maxJob}
            onChange={(event) => setMaxJob(event.target.value)}
          />
          <Input
            label="Giới hạn ước tính mỗi ngày (USD)"
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            value={daily}
            onChange={(event) => setDaily(event.target.value)}
          />
        </div>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
          Giới hạn này kiểm soát việc gửi yêu cầu trong app theo ước tính; không thay thế spend cap
          của Google Cloud. Không nhập thông tin kết nối vào chat.
        </p>
        {!keyError && (error || failure || status?.error) && (
          <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12 }}>
            {error ?? failure ?? status?.error}
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Button
            disabled={
              busy ||
              (mode === 'api_key' ? !apiKey.trim() : !clientId || !clientSecret || !projectId)
            }
            onClick={async () => {
              if (mode === 'api_key') {
                const invalid = geminiApiKeyInputError(apiKey);
                setKeyError(invalid);
                if (invalid) {
                  setError(null);
                  return;
                }
              }
              const job = Math.round(Number(maxJob) * 1000000);
              const budget = Math.round(Number(daily) * 1000000);
              if (
                !Number.isFinite(job) ||
                !Number.isFinite(budget) ||
                job < 10000 ||
                job > 10000000 ||
                budget < job ||
                budget > 100000000
              ) {
                setError(
                  'Mỗi tác vụ cần 0.01–10 USD; mỗi ngày cần ít nhất bằng mỗi tác vụ và tối đa 100 USD.',
                );
                return;
              }
              const result = await action('configure', {
                ...(mode === 'api_key'
                  ? { mode: 'api_key', apiKey: normalizeGeminiApiKey(apiKey) }
                  : {
                      clientId: clientId.trim(),
                      clientSecret: clientSecret.trim(),
                      projectId: projectId.trim(),
                    }),
                maxJobCostMicros: job,
                dailyBudgetMicros: budget,
              });
              if (result) {
                setClientSecret('');
                setApiKey('');
                setKeyError(null);
                setError(null);
              }
            }}
          >
            {mode === 'api_key' ? 'Lưu Gemini API key' : 'Lưu cấu hình Google'}
          </Button>
          {mode === 'oauth' &&
            status?.authMode !== 'api_key' &&
            status?.configured &&
            status.status !== 'connecting' && (
              <Button variant="primary" disabled={busy} onClick={() => void action('login')}>
                Đăng nhập Google
              </Button>
            )}
          {status?.status === 'connecting' && (
            <Button disabled={busy} onClick={() => void action('cancel')}>
              Hủy đăng nhập
            </Button>
          )}
          {status?.status === 'connected' && (
            <Button variant="danger" disabled={busy} onClick={() => void action('disconnect')}>
              {status.authMode === 'api_key' ? 'Xóa Gemini API key' : 'Ngắt kết nối Google'}
            </Button>
          )}
        </div>
        {status?.loginUrl && (
          <a href={status.loginUrl} target="_blank" rel="noreferrer">
            Mở Google để chọn tài khoản và cấp quyền
          </a>
        )}
        {status?.status === 'connected' && (
          <p style={{ margin: 0, fontSize: 12 }}>
            {status.authMode === 'api_key'
              ? 'Đã cấu hình Gemini API key. '
              : `Đã kết nối ${status.identity?.email ?? 'tài khoản Google'} · Project ${status.projectId}. `}
            Quyền tạo ảnh và quota được kiểm tra khi gọi Gemini.
          </p>
        )}
      </div>
    </Dialog>
  );
}
