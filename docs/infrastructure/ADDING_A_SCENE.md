# How to Add a New Scene Type

Adding a new scene type to `icegozi_video` does not require editing existing compositions or timeline logic. The system is designed to be open for extension.

---

## Step 1: Define the Scene Configuration Interface

In `src/domain/video/Scene.ts`, define your new scene configuration:

```ts
export interface ParticleSceneConfig extends BaseSceneConfig {
  type: 'particle';
  particleCount: number;
  color: string;
}

// Add to the discriminated union:
export type SceneConfig =
  | VideoSceneConfig
  | ImageSceneConfig
  | TextSceneConfig
  | FormulaSceneConfig
  | CompositionSceneConfig
  | ParticleSceneConfig;
```

---

## Step 2: Add Zod Schema Validation

In `src/schemas/scene.schema.ts`, define the runtime validator:

```ts
export const ParticleSceneSchema = BaseSceneSchema.extend({
  type: z.literal('particle'),
  particleCount: z.number().int().positive(),
  color: z.string(),
});

// Update the discriminated union:
export const SceneConfigSchema = z.discriminatedUnion('type', [
  // ... existing schemas
  ParticleSceneSchema,
]);
```

---

## Step 3: Implement the React Scene Component

Create `src/video/scenes/implementations/ParticleScene.tsx`:

```tsx
import React from 'react';
import { ParticleSceneConfig } from '../../../domain/video/Scene.js';
import { SceneComponentProps } from '../SceneRegistry.js';
import { VideoFrame } from '../../components/VideoFrame/VideoFrame.js';

export const ParticleScene: React.FC<SceneComponentProps<ParticleSceneConfig>> = ({ scene }) => {
  return (
    <VideoFrame>
      <div style={{ color: scene.color }}>
        Rendering {scene.particleCount} particles!
      </div>
    </VideoFrame>
  );
};
```

---

## Step 4: Register with SceneRegistry

In `src/app/registerCompositions.ts`, register the component:

```ts
import { ParticleScene } from '../video/scenes/implementations/ParticleScene.js';

export function registerBuiltInScenes(): void {
  // ... existing registrations
  SceneRegistry.register('particle', ParticleScene);
}
```

---

## Done!

You can now immediately use the new scene type in any project configuration:

```ts
{
  id: 'particles-intro',
  type: 'particle',
  durationInFrames: 90,
  particleCount: 500,
  color: '#38BDF8',
}
```
`MainVideo` and `SceneRenderer` will automatically dispatch and render it!
