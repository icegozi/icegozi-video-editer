import { Config } from '@remotion/cli/config';

// Ensure renders overwrite previous output cleanly
Config.setOverwriteOutput(true);

// Optimize rendering image format for speed and quality
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(90);
