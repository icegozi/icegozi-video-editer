import path from 'node:path';
import { demoProject } from '../projects/demo/project';
import { validateAssets } from '../src/application/media/validateAssets';
import { logger } from '../src/infrastructure/logging/logger';
import { VideoProject } from '../src/domain/video/VideoProject';

async function main() {
  const projectFile = process.argv[2];
  let project: VideoProject = demoProject;

  if (projectFile) {
    const resolved = path.resolve(process.cwd(), projectFile);
    logger.info(`Loading project definition from: ${resolved}`);
    const imported = await import(`file://${resolved}`);
    project = imported.project || imported.default || imported.demoProject;
  }

  logger.info(`Validating assets for project: "${project.title}" (${project.id})`);

  try {
    const result = validateAssets(project);
    logger.info('Asset validation PASSED!', result);
  } catch (error) {
    logger.error('Asset validation FAILED!', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main();
