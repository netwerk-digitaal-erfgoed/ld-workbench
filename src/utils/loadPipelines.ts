import fs from 'fs';
import {Configuration} from '../configuration.js';
import chalk from 'chalk';
import glob from 'glob';
import loadConfiguration from './loadConfiguration.js';

export default function loadPipelines(
  configDirOrFile: string
): Map<string, Configuration> {
  const pipelines = new Map<string, Configuration>();

  if (!fs.existsSync(configDirOrFile))
    throw new Error(
      `Configuration directory/file ${chalk.italic(
        configDirOrFile
      )} could not be found.\nIf this is your first run of LDWorkbench, you might want to use \`npx @netwerk-digitaal-erfgoed/ld-workbench@latest --init\` to set up an example workbench project.`
    );

  const files: string[] = [];
  if (fs.lstatSync(configDirOrFile).isDirectory()) {
    try {
      files.push(...glob.sync(`${configDirOrFile}/**/*.yml`));
    } catch (e) {
      throw e as Error;
    }
    if (files.length <= 0)
      throw new Error(
        `No configuration files found matching pattern ${chalk.italic(
          `${configDirOrFile}/**/*.yml`
        )}`
      );
  } else {
    files.push(configDirOrFile);
  }

  files.forEach(file => {
    const configuration = loadConfiguration(file);
    if (pipelines.has(configuration.name)) {
      console.warn(
        chalk.yellow(
          `Warning: skipping a duplicate configuration from file ${chalk.italic(
            file
          )} with name ${chalk.italic(configuration.name)}`
        )
      );
    } else {
      pipelines.set(configuration.name, configuration);
    }
  });
  return pipelines;
}
