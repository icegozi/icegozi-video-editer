import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { randomUUID } from 'node:crypto';
import { initDatabaseSchema } from '../../src/infrastructure/db/client';
import { GenerationRepository } from '../../src/infrastructure/scene-generation/generationRepository';
import { SceneGenerationService } from '../../src/application/scene-generation/sceneGenerationService';
import { AssetIngestService } from '../../src/infrastructure/media/AssetIngestService';
import { SnapshotSchema } from '../../src/application/assistant/assistant.contracts';
import { AssistantError } from '../../src/application/assistant/errors';
import { fixtureGoogle, fixtureImageProvider, fixturePng } from '../fixtures/generation-fixtures';
import { validateCandidate } from '../../src/application/assistant/projectProposals';
import type { SceneGenerationProvider } from '../../src/application/scene-generation/SceneGenerationProvider';
import { Readable } from 'node:stream';

const fixtures: {
  directory: string;
  database: Database.Database;
  service: SceneGenerationService;
}[] = [];
afterEach(async () => {
  for (const fixture of fixtures.splice(0)) {
    fixture.service.dispose();
    await vi.waitFor(() =>
      expect(
        fixture.database
          .prepare(
            "SELECT count(*) AS count FROM generation_jobs WHERE status IN ('queued','submitting','processing','validating','cancel_requested')",
          )
          .get(),
      ).toEqual({ count: 0 }),
    );
    fixture.database.close();
    const actual = fs.realpathSync(fixture.directory);
    expect(path.dirname(actual).toLowerCase()).toBe(fs.realpathSync(os.tmpdir()).toLowerCase());
    expect(path.basename(actual)).toMatch(/^icegozi-generation-test-/);
    fs.rmSync(actual, { recursive: true, force: true });
  }
});
function fixture(provider?: SceneGenerationProvider) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'icegozi-generation-test-'));
  const database = new Database(':memory:');
  database.pragma('foreign_keys=ON');
  initDatabaseSchema(drizzle(database));
  const repository = new GenerationRepository(database);
  const ingest = new AssetIngestService(path.join(directory, 'assets'));
  const png = path.join(directory, 'fixture.png');
  fixturePng(png);
  const real = provider ?? fixtureImageProvider(png);
  const generate = vi.fn(real.generate.bind(real));
  const google = fixtureGoogle();
  const owner = {
    profileId: 'fixture-profile',
    conversationId: randomUUID(),
    epoch: randomUUID(),
    projectId: 'generation-test',
  };
  let current = true;
  const snapshot = SnapshotSchema.parse({
    project: {
      id: owner.projectId,
      title: 'Original',
      width: 320,
      height: 180,
      fps: 30,
      scenes: [{ id: 'a', type: 'text', title: 'A', durationInFrames: 150 }],
    },
    revision: 1,
    selectedClipId: null,
    playhead: 0,
  });
  const service = new SceneGenerationService(
    repository,
    ingest,
    [{ ...real, generate }],
    google,
    path.join(directory, 'temp'),
    async (scope) => {
      if (
        !current ||
        scope.profileId !== owner.profileId ||
        scope.projectId !== owner.projectId ||
        scope.epoch !== owner.epoch
      )
        throw new AssistantError('owner_changed', 'Owner changed');
    },
    (context) => {
      database
        .prepare(
          'INSERT INTO projects(id,title,slug,last_edited_at,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',
        )
        .run(
          context.project.id,
          context.project.title,
          'fixture',
          Date.now(),
          Date.now(),
          Date.now(),
        );
    },
  );
  fixtures.push({ directory, database, service });
  const plan = () =>
    service.plan(owner, snapshot, {
      kind: 'image',
      presetId: 'gemini-image-landscape',
      prompt: 'Một con cáo trong đồng cỏ',
    });
  return {
    directory,
    database,
    repository,
    service,
    ingest,
    owner,
    snapshot,
    plan,
    generate,
    google,
    switchOwner: () => {
      current = false;
    },
  };
}
describe('Scene generation lifecycle and registered assets', () => {
  it('does not recover or invalidate another backend that owns the workspace', async () => {
    const f = fixture();
    const plan = await f.plan();
    await f.service.request(f.owner, plan.id);
    const other = new SceneGenerationService(
      f.repository,
      f.ingest,
      [],
      f.google,
      path.join(f.directory, 'temp'),
      async () => {},
      () => {},
    );
    await expect(other.capabilities(f.owner)).rejects.toThrow('Workspace');
    other.dispose();
    expect(f.repository.plan(plan.id)?.status).toBe('awaiting_approval');
  });
  it('retries a local failed job with the current epoch and an independent attempt directory', async () => {
    let calls = 0;
    const f = fixture({
      id: 'core',
      generate: async (_plan, output) => {
        calls++;
        if (calls === 1) throw new Error('Fixture local failure');
        fixturePng(output);
        return { mimeType: 'image/png' };
      },
    });
    const plan = await f.service.plan(f.owner, f.snapshot, {
      kind: 'image',
      presetId: 'core-image-landscape',
      prompt: 'A',
      templateId: 'growing-text',
    });
    await f.service.request(f.owner, plan.id);
    await f.service.approve(f.owner, plan.id, true);
    await vi.waitFor(() => expect(f.repository.jobForPlan(plan.id)?.status).toBe('failed'));
    f.owner.epoch = randomUUID();
    await f.service.retryLocal(f.owner, plan.id);
    await vi.waitFor(() => expect(f.repository.jobForPlan(plan.id)?.status).toBe('ready'), {
      timeout: 5_000,
    });
    expect(f.repository.jobForPlan(plan.id)?.epoch).toBe(f.owner.epoch);
    expect(calls).toBe(2);
    const job = f.repository.jobForPlan(plan.id)!;
    expect(
      fs
        .readdirSync(path.join(f.directory, 'temp', job.id))
        .filter((name) => name.startsWith('attempt-')),
    ).toHaveLength(2);
  });
  it('imports a decoded image without changing the timeline and allows only an owned reference', async () => {
    const f = fixture();
    const png = fs.readFileSync(path.join(f.directory, 'fixture.png'));
    const asset = await f.service.importImage(
      f.owner,
      f.snapshot,
      Readable.from([png]),
      'image/png',
    );
    expect(asset.origin).toBe('imported');
    expect(asset.jobId).toBeUndefined();
    expect(f.snapshot.project.scenes).toHaveLength(1);
    const plan = await f.service.plan(f.owner, f.snapshot, {
      kind: 'image',
      presetId: 'gemini-image-landscape',
      prompt: 'Use this reference',
      referenceAssetIds: [asset.id],
    });
    expect(plan.referenceHashes).toEqual([asset.hash]);
    await expect(
      f.service.importImage(
        f.owner,
        f.snapshot,
        Readable.from([Buffer.alloc(3 * 1024 * 1024 + 1)]),
        'image/png',
      ),
    ).rejects.toThrow('3 MiB');
  });
  it('boots additive schema on an existing database without changing existing projects', () => {
    const f = fixture();
    initDatabaseSchema(drizzle(f.database));
    expect(
      f.database.prepare("SELECT name FROM sqlite_master WHERE name='generation_jobs'").get(),
    ).toEqual({ name: 'generation_jobs' });
  });
  it('never submits before approval, deduplicates two approvals and registers a decoded image', async () => {
    const f = fixture();
    const plan = await f.plan();
    await f.service.request(f.owner, plan.id);
    expect(f.generate).not.toHaveBeenCalled();
    const approvals = await Promise.all([
      f.service.approve(f.owner, plan.id, true),
      f.service.approve(f.owner, plan.id, true),
    ]);
    expect(approvals[0].job?.id).toBe(approvals[1].job?.id);
    await vi.waitFor(
      async () => {
        const status = await f.service.status(f.owner, plan.id);
        if (status.job?.error) throw new Error(`${status.job.status}: ${status.job.error.message}`);
        expect(status.job?.status).toBe('ready');
      },
      { timeout: 3000 },
    );
    expect(f.generate).toHaveBeenCalledTimes(1);
    const status = await f.service.status(f.owner, plan.id);
    expect(status.asset?.metadata.width).toBe(64);
    expect(f.snapshot.project.scenes).toHaveLength(1);
    const candidate = {
      ...f.snapshot.project,
      scenes: [
        ...f.snapshot.project.scenes,
        {
          id: 'b',
          type: 'image',
          src: status.asset!.storageKey,
          durationInFrames: 150,
        },
      ],
    };
    expect(() => validateCandidate(f.snapshot.project, candidate)).toThrow('snapshot');
    expect(
      validateCandidate(f.snapshot.project, candidate, await f.service.assetPolicy(f.owner)).scenes,
    ).toHaveLength(2);
    expect(f.database.prepare('SELECT count(*) AS count FROM project_assets').get()).toEqual({
      count: 1,
    });
  });
  it('declines, expires and invalidates credential changes without generating', async () => {
    const f = fixture();
    const declined = await f.plan();
    await f.service.request(f.owner, declined.id);
    await f.service.approve(f.owner, declined.id, false);
    const expired = await f.plan();
    await f.service.request(f.owner, expired.id);
    f.repository.savePlan({
      ...f.repository.plan(expired.id)!,
      expiresAt: Date.now() - 1,
    });
    await expect(f.service.approve(f.owner, expired.id, true)).rejects.toThrow('hết hạn');
    const changed = await f.plan();
    await f.service.request(f.owner, changed.id);
    await f.google.disconnect(f.owner.profileId);
    await expect(f.service.approve(f.owner, changed.id, true)).rejects.toThrow('thay đổi');
    expect(f.generate).not.toHaveBeenCalled();
  });
  it('treats a lost Gemini response as unknown and does not automatically resubmit on restart', async () => {
    const f = fixture({
      id: 'gemini',
      generate: async () => {
        throw new Error('Synthetic network reset after submission');
      },
    });
    const plan = await f.plan();
    await f.service.request(f.owner, plan.id);
    await f.service.approve(f.owner, plan.id, true);
    await vi.waitFor(async () =>
      expect((await f.service.status(f.owner, plan.id)).job?.status).toBe('submission_unknown'),
    );
    await expect(f.service.retryLocal(f.owner, plan.id)).rejects.toThrow('Gemini');
    f.service.dispose();
    expect(f.generate).toHaveBeenCalledTimes(1);
    expect(f.repository.jobs()).toHaveLength(1);
  });
  it('does not grant a late result after account suspension and does not retry it', async () => {
    let finish: (() => void) | undefined;
    const f = fixture({
      id: 'gemini',
      generate: async (_plan, output) => {
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
        fixturePng(output);
        return { mimeType: 'image/png' };
      },
    });
    const plan = await f.plan();
    await f.service.request(f.owner, plan.id);
    await f.service.approve(f.owner, plan.id, true);
    await vi.waitFor(() => expect(finish).toBeDefined());
    f.switchOwner();
    f.service.suspend();
    finish!();
    await vi.waitFor(() =>
      expect(f.repository.jobForPlan(plan.id)?.status).toBe('completed_after_cancel'),
    );
    expect(f.repository.assets(f.owner)).toHaveLength(0);
    expect(f.generate).toHaveBeenCalledTimes(1);
  });
  it('enforces ownership, reference grants and conservative daily budget reservations', async () => {
    const f = fixture();
    await expect(
      f.service.plan(f.owner, f.snapshot, {
        kind: 'image',
        presetId: 'gemini-image-landscape',
        prompt: 'Fox',
        referenceAssetIds: [randomUUID()],
      }),
    ).rejects.toThrow('tham chiếu');
    const plan = await f.plan();
    await f.service.request(f.owner, plan.id);
    const stored = f.repository.plan(plan.id)!;
    stored.connection!.dailyBudgetMicros = 1000;
    f.repository.savePlan(stored);
    await expect(f.service.approve(f.owner, plan.id, true)).rejects.toThrow('chi phí');
    f.switchOwner();
    await expect(f.service.status(f.owner, plan.id)).rejects.toThrow('Owner changed');
    expect(f.generate).not.toHaveBeenCalled();
  });
  it('blocks corrupted file contents and Windows junction escapes during ingest', async () => {
    const f = fixture();
    const file = path.join(f.directory, 'fake.png');
    fs.writeFileSync(file, '<html>not an image</html>');
    await expect(
      f.ingest.prepare(file, 'image', 'image/png', randomUUID(), new AbortController().signal),
    ).rejects.toThrow('hợp lệ');
    const outside = path.join(f.directory, 'outside');
    fs.mkdirSync(outside);
    fs.symlinkSync(
      outside,
      path.join(f.directory, 'assets', 'images'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const png = path.join(f.directory, 'other.png');
    fixturePng(png);
    await expect(
      f.ingest.prepare(png, 'image', 'image/png', randomUUID(), new AbortController().signal),
    ).rejects.toThrow('ngoài');
    expect(f.repository.assets(f.owner)).toHaveLength(0);
  });
});
