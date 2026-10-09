# Project Memory

## Confirmed Architecture

- The app uses React 19, TypeScript, Vite, Remotion, Zod, and a Node-based FFmpeg pipeline.
- `src/editor` contains the browser editor. `src/video` and `src/app` contain Remotion compositions and scene registration.
- `src/domain` contains framework-independent models; `src/application` contains timeline, media, and render workflows; `src/infrastructure` contains filesystem and process adapters.
- Project definitions currently use `VideoProject` in `src/domain/video/VideoProject.ts` and runtime schemas in `src/schemas`.
- The current timeline places scenes sequentially. Separate visual lanes in the editor do not establish a compositing model.

## Media Constraints

- Source media in `public/assets` must be preserved.
- Intermediate media belongs in `generated`; final render output belongs in `output`.
- Filesystem paths and browser media URLs require separate resolution rules.
- Rendered scenes must use deterministic frame-based animation.

## Verification Commands

- `npm run typecheck`
- `npm test`
- `npm run build:editor`
- `npm run dev` starts the Vite editor on port 3200 by default.
- `npm run render:preview` and `npm run render` invoke the CLI render pipeline.

## Collaboration

- A request for a review and an implementation prompt authorizes review documents, not application changes.
- Preserve existing staged, unstaged, and untracked work. Do not create commits or alter branch history without an explicit request.
