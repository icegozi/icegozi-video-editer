import { execSync } from 'node:child_process';
import { RenderProfile } from '../src/config/render.config';
import { prepareRender } from '../src/application/render/prepareRender';
import { logger } from '../src/infrastructure/logging/logger';

async function main() {
  const profileArg = process.argv.find((arg) => arg.startsWith('--profile='));
  const profileName = profileArg
    ? (profileArg.split('=')[1] as RenderProfile)
    : process.argv.includes('--profile') && process.argv[process.argv.indexOf('--profile') + 1]
    ? (process.argv[process.argv.indexOf('--profile') + 1] as RenderProfile)
    : RenderProfile.Preview;

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
  }
}

main();
