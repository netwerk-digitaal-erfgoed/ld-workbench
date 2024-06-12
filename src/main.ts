#!/usr/bin/env node
import inquirer from 'inquirer';
import chalk from 'chalk';
import {error} from './utils/error.js';
import version from './utils/version.js';
import type {LDWorkbenchConfiguration} from './lib/LDWorkbenchConfiguration.js';
import loadPipelines from './utils/loadPipelines.js';
import Pipeline from './lib/Pipeline.class.js';
import {cliArgs} from './cliArgs.js';

console.info(
  chalk.bold(`Welcome to LD Workbench version ${chalk.cyan(version())}`)
);

async function main(): Promise<void> {
  const pipelines = loadPipelines(cliArgs.config ?? './pipelines/');
  const names = [...pipelines.keys()];
  let configuration: LDWorkbenchConfiguration | undefined;

  if (cliArgs.pipeline !== undefined) {
    configuration = pipelines.get(cliArgs.pipeline);
    if (configuration === undefined) {
      error(
        `No pipeline named “${cliArgs.pipeline}” was found.`,
        2,
        `Valid pipeline names are: ${names.map(name => `"${name}"`).join(', ')}`
      );
    }
  } else if (names.length === 1) {
    configuration = pipelines.get(names[0]);
  }

  const answers: {pipeline?: string} = await inquirer.prompt({
    type: 'list',
    name: 'pipeline',
    when: configuration === undefined,
    message: 'Which pipeline do you want to run?',
    choices: names,
  });

  if (answers.pipeline !== undefined) {
    if (!pipelines.has(answers.pipeline)) {
      error(
        `This should not happen: pipeline ${chalk.italic(
          answers.pipeline
        )} does not exist.`
      );
    }
    configuration = pipelines.get(answers.pipeline);
  }

  if (configuration === undefined) {
    throw new Error(
      'Unable to get a configuration based on the CLI arguments.'
    );
  }

  try {
    const pipeline = new Pipeline(configuration, {
      startFromStageName: cliArgs.stage,
      silent: cliArgs.silent,
    });
    await pipeline.run();
  } catch (e) {
    error(
      `Error in pipeline ${chalk.italic(configuration.name)}`,
      5,
      e as Error
    );
  }
}

main().catch(e => {
  error(e as Error);
});
