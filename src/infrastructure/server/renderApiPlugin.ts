import type { Plugin, ViteDevServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { renderService } from '../../application/render/renderService';
import { ProjectDbService } from '../db/projectDbService';
import { RenderProfile } from '../../config/render.config';
import { PATHS } from '../../config/paths.config';

/**
 * Vite plugin that serves local API endpoints for rendering, projects, jobs, and file downloads.
 * Seamlessly integrates SQLite database persistence with the editor without requiring an extra server process.
 */
export function renderApiPlugin(): Plugin {
  return {
    name: 'icegozi-render-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // GET /api/projects
        if (req.method === 'GET' && url === '/api/projects') {
          try {
            const list = ProjectDbService.listProjects();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, projects: list }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: String(err) }));
          }
          return;
        }

        // GET /api/projects/:id
        if (req.method === 'GET' && url.startsWith('/api/projects/') && !url.includes('?')) {
          const projectId = url.replace('/api/projects/', '');
          try {
            const project = ProjectDbService.getProject(projectId);
            if (!project) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Project not found' }));
              return;
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, project }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: String(err) }));
          }
          return;
        }

        // POST /api/projects
        if (req.method === 'POST' && url === '/api/projects') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', () => {
            try {
              const body = JSON.parse(bodyStr);
              const result = ProjectDbService.saveProject(body.project, {
                revision: body.revision,
                changeSummary: body.changeSummary,
              });
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, ...result }));
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  error: err instanceof Error ? err.message : String(err),
                })
              );
            }
          });
          return;
        }

        // DELETE /api/projects/:id
        if (req.method === 'DELETE' && url.startsWith('/api/projects/')) {
          const projectId = url.replace('/api/projects/', '');
          try {
            const deleted = ProjectDbService.deleteProject(projectId);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: deleted }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: String(err) }));
          }
          return;
        }

        // POST /api/render
        if (req.method === 'POST' && url === '/api/render') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', () => {
            try {
              const body = JSON.parse(bodyStr);
              const profile = (body.profile as RenderProfile) || RenderProfile.Preview;
              const job = renderService.createJob(body.project, profile);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, job }));
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  error: err instanceof Error ? err.message : String(err),
                })
              );
            }
          });
          return;
        }

        // GET /api/render/status/:jobId
        if (req.method === 'GET' && url.startsWith('/api/render/status/')) {
          const jobId = url.replace('/api/render/status/', '').split('?')[0];
          const job = renderService.getJob(jobId);

          if (!job) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Job not found' }));
            return;
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, job }));
          return;
        }

        // POST /api/render/cancel/:jobId
        if (req.method === 'POST' && url.startsWith('/api/render/cancel/')) {
          const jobId = url.replace('/api/render/cancel/', '').split('?')[0];
          const cancelled = renderService.cancelJob(jobId);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: cancelled }));
          return;
        }

        // GET /api/render/download/:jobId
        if (req.method === 'GET' && url.startsWith('/api/render/download/')) {
          const jobId = url.replace('/api/render/download/', '').split('?')[0];
          const job = renderService.getJob(jobId);

          if (!job || !job.outputPath || !fs.existsSync(job.outputPath)) {
            res.statusCode = 404;
            res.end('Render output not found');
            return;
          }

          const filename = path.basename(job.outputPath);
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          fs.createReadStream(job.outputPath).pipe(res);
          return;
        }

        // POST /api/assets/upload
        if (req.method === 'POST' && url === '/api/assets/upload') {
          // Parse file upload: read buffer
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => {
            chunks.push(chunk);
          });
          req.on('end', () => {
            try {
              const buffer = Buffer.concat(chunks);
              // Read filename from custom header or query
              const originalName = (req.headers['x-file-name'] as string) || `upload_${Date.now()}.mp4`;
              const safeFilename = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
              const targetDir = PATHS.publicVideo;
              fs.mkdirSync(targetDir, { recursive: true });

              const targetPath = path.resolve(targetDir, safeFilename);
              fs.writeFileSync(targetPath, buffer);

              const publicUrl = `assets/video/${safeFilename}`;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: true,
                  url: publicUrl,
                  filename: safeFilename,
                  path: targetPath,
                })
              );
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  success: false,
                  error: err instanceof Error ? err.message : String(err),
                })
              );
            }
          });
          return;
        }

        next();
      });
    },
  };
}
