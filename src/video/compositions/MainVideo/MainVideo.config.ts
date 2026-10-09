import { VideoProject } from '../../../domain/video/VideoProject';
import { demoProject } from '../../../../projects/demo/project';

export interface MainVideoProps {
  project?: VideoProject;
}

export const defaultMainVideoProps: MainVideoProps = {
  project: demoProject,
};
