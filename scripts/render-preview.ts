import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { RenderProfile } from '../src/config/render.config';
import { prepareRender } from '../src/application/render/prepareRender';
import { logger } from '../src/infrastructure/logging/logger';
import { migrateProject } from '../src/schemas/project.schema';

async function main() {
  const profileArg = process.argv.find((arg) => arg.startsWith('--profile='));
  let rawProfile = profileArg
    ? profileArg.split('=')[1]
    : process.argv.includes('--profile') && process.argv[process.argv.indexOf('--profile') + 1]
    ? process.argv[process.argv.indexOf('--profile') + 1]
    : 'preview';

  const validProfiles: Record<string, RenderProfile> = {
    final: RenderProfile.Final,
    preview: RenderProfile.Preview,
  };

  const profileName = validProfiles[rawProfile.toLowerCase()] ?? RenderProfile.Preview;

  // Check for --project flag
  const projectArg = process.argv.find((arg) => arg.startsWith('--project='));
  const projectPath = projectArg
    ? projectArg.split('=')[1]
    : process.argv.includes('--project') && process.argv[process.argv.indexOf('--project') + 1]
    ? process.argv[process.argv.indexOf('--project') + 1]
    : null;

  let propsTempPath: string | null = null;
  if (projectPath) {
    const resolvedPath = path.resolve(projectPath);
    if (!fs.existsSync(resolvedPath)) {
      logger.error(`Specified project file not found: ${resolvedPath}`);
      process.exit(1);
    }
    const rawContent = fs.readFileSync(resolvedPath, 'utf-8');
    const project = migrateProject(JSON.parse(rawContent));
    propsTempPath = path.resolve(process.cwd(), 'generated', 'temp', `render_props_${Date.now()}.json`);
    fs.mkdirSync(path.dirname(propsTempPath), { recursive: true });
    fs.writeFileSync(propsTempPath, JSON.stringify({ project }));
  }

  const prep = prepareRender('MainVideo', profileName);

  logger.info(`Starting render for composition "${prep.compositionId}" with profile "${profileName}"`);
  logger.info(`Target output path: ${prep.outputPath}`);

  const renderArgs = [
    'npx',
    'remotion',
    'render',
    'src/index.ts',
    prep.compositionId,
    `"${prep.outputPath}"`,
    `--crf=${prep.profile.crf}`,
    `--jpeg-quality=${prep.profile.jpegQuality}`,
    `--scale=${profileName === RenderProfile.Preview ? 0.5 : 1}`,
  ];

  if (propsTempPath) {
    renderArgs.push(`--props="${propsTempPath}"`);
  }

  const command = renderArgs.join(' ');
  logger.info(`Executing render command: ${command}`);

  const startTime = Date.now();
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.info(`Render successfully completed in ${duration}s! Output saved to: ${prep.outputPath}`);
  } catch (error) {
    logger.error('Render execution failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  } finally {
    if (propsTempPath && fs.existsSync(propsTempPath)) {
      try {
        fs.unlinkSync(propsTempPath);
      } catch {
        // Ignore cleanup error
      }
    }
  }
}

main();
