import fs from 'node:fs';
import { z } from 'zod';
import { AssistantError } from '../../application/assistant/errors';
import type { SceneGenerationProvider } from '../../application/scene-generation/SceneGenerationProvider';
import type {
  GenerationPlan,
  GoogleConnection,
} from '../../application/scene-generation/generation.contracts';

const responseSchema = z.object({
  candidates: z
    .array(
      z.object({
        finishReason: z.string().optional(),
        content: z
          .object({
            parts: z
              .array(
                z.object({
                  inlineData: z
                    .object({
                      mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
                      data: z.string().max(24 * 1024 * 1024),
                    })
                    .optional(),
                  thought: z.boolean().optional(),
                  text: z.string().max(32000).optional(),
                }),
              )
              .max(20),
          })
          .optional(),
      }),
    )
    .max(1)
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
});

export class GeminiImageProvider implements SceneGenerationProvider {
  id = 'gemini';
  constructor(
    private connection: GoogleConnection,
    private request: typeof fetch = fetch,
  ) {}
  async generate(
    plan: GenerationPlan,
    output: string,
    reference: { mimeType: string; data: Buffer } | undefined,
    signal: AbortSignal,
  ): Promise<{ mimeType: string }> {
    if (!plan.connection)
      throw new AssistantError(
        'provider_not_configured',
        'Hãy cấu hình Gemini API key hoặc kết nối Google để tạo ảnh.',
      );
    const credential = await this.connection.credential(plan.profileId, plan.connection.version);
    const parts = [
      { text: plan.request.prompt },
      ...(reference
        ? [
            {
              inlineData: {
                mimeType: reference.mimeType,
                data: reference.data.toString('base64'),
              },
            },
          ]
        : []),
    ];
    const response = await this.request(
      `https://generativelanguage.googleapis.com/v1beta/models/${plan.preset.model}:generateContent`,
      {
        method: 'POST',
        redirect: 'error',
        signal,
        headers: {
          ...(credential.apiKey !== undefined
            ? { 'x-goog-api-key': credential.apiKey }
            : {
                Authorization: `Bearer ${credential.accessToken}`,
                'x-goog-user-project': credential.projectId,
              }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            candidateCount: 1,
            maxOutputTokens: 4096,
            imageConfig: { aspectRatio: plan.preset.ratio, imageSize: '1K' },
          },
        }),
      },
    );
    if (!response.ok) {
      const code =
        response.status === 401 || response.status === 403
          ? 'credential_expired'
          : response.status === 429
            ? 'quota_exceeded'
            : response.status === 404
              ? 'model_unavailable'
              : response.status >= 500
                ? 'submission_unknown'
                : 'unsupported_request';
      throw new AssistantError(
        code,
        code === 'credential_expired'
          ? 'Google chưa cho phép tạo ảnh. Kiểm tra API key hoặc quyền OAuth và Generative Language API của project.'
          : code === 'quota_exceeded'
            ? 'Gemini đã hết quota hoặc credits.'
            : code === 'model_unavailable'
              ? 'Model tạo ảnh Gemini chưa khả dụng cho project này.'
              : 'Gemini chưa hoàn tất ảnh. Không tự gửi lại yêu cầu.',
        response.status,
      );
    }
    const reader = response.body?.getReader();
    if (!reader) throw new AssistantError('submission_unknown', 'Gemini không trả kết quả ảnh.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 32 * 1024 * 1024) {
          await reader.cancel();
          throw new AssistantError('output_large', 'Kết quả ảnh quá lớn.');
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const result = responseSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    if (result.promptFeedback?.blockReason || result.candidates?.[0]?.finishReason === 'SAFETY')
      throw new AssistantError('moderation_rejected', 'Gemini từ chối nội dung ảnh này.');
    const images =
      result.candidates?.[0]?.content?.parts.filter((part) => part.inlineData && !part.thought) ??
      [];
    if (images.length !== 1)
      throw new AssistantError(
        'image_missing',
        'Gemini chưa trả đúng một ảnh. Giữ yêu cầu để xem lại.',
      );
    const image = images[0].inlineData!;
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image.data) || image.data.length % 4 !== 0)
      throw new AssistantError('invalid_media', 'Dữ liệu ảnh Gemini không hợp lệ.');
    fs.writeFileSync(output, Buffer.from(image.data, 'base64'), { flag: 'wx' });
    return { mimeType: image.mimeType };
  }
}
