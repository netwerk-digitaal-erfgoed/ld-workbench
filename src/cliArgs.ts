import chalk from 'chalk';
import {program} from 'commander';
import {error} from './utils/error.js';
import version from './utils/version.js';
import init from './utils/init.js';

program
  .name('ld-workbench')
  .description('CLI tool to transform Linked Data using SPARQL')
  .option(
    '-c, --config <config.yml>',
    'Path to a configuration file for your pipeline.'
  )
  .option(
    '--configDir </path/to/yaml/>',
    'Path to a folder containing your configuration files.'
  )
  .option(
    '-p, --pipeline <name-of-pipeline>',
    'Name of the pipeline you want to run'
  )
  .option(
    '-s, --stage <name-of-stage>',
    'Name of the stage of the pipeline you want to run'
  )
  .option('--init', 'Initializes a new LDWorkbench project')
  .version(version());
program.parse();
export const cliArgs: {
  config?: string;
  configDir?: string;
  pipeline?: string;
  stage?: string;
  init?: boolean;
} = program.opts();

if (cliArgs.init !== undefined) {
  if (Object.values(cliArgs).length !== 1) {
    error(
      'The --init flag can not be used in conjunction with other CLI arguments.'
    );
  }
  try {
    init();
    console.log(
      chalk.green(
        'A boilerplate LDWorkbench has been created. You can now run a project using `npx @netwerk-digitaal-erfgoed/ld-workbench`.'
      )
    );
  } catch (e) {
    error(e as Error);
  }
}

if (cliArgs.config !== undefined && cliArgs.configDir !== undefined) {
  error(
    'Do not use both the --config and the --configDir options.',
    1,
    `${chalk.italic(
      '--config'
    )} should be used to process a single pipeline, ${chalk.italic(
      '--configDir'
    )} should be used to overwrite the default director where LD Workbench searches configs (${chalk.italic(
      './pipelines/'
    )}).`
  );
}
if (cliArgs.config !== undefined && cliArgs.pipeline !== undefined) {
  error(
    'Do not use both the --config and the --pipeline options.',
    1,
    `Both ${chalk.italic('--config')} and ${chalk.italic(
      '--pipeline'
    )} should be used to process a single pipeline.`
  );
}
