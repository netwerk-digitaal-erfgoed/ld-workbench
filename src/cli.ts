import chalk from 'chalk';
import {program} from 'commander';
import {error} from './utils/error.js';
import version from './utils/version.js';
import init from './utils/init.js';

program
  .name('ld-workbench')
  .description('CLI tool to transform Linked Data using SPARQL')
  .option(
    '-c, --config </path/to/configurations/>',
    'Path to the directory containing your pipeline configuration(s)',
    'pipelines/'
  )
  .option(
    '-p, --pipeline <name-of-pipeline>',
    'Name of the pipeline you want to run'
  )
  .option(
    '-s, --stage <name-of-stage>',
    'Name of the stage of the pipeline you want to run'
  )
  .option('--init', 'Initialize a new LDWorkbench project')
  .option(
    '--silent',
    'Disable console output, including the progress indicator'
  )
  .version(version());
program.parse();
export const cli: {
  config: string;
  pipeline?: string;
  stage?: string;
  silent?: boolean;
  init?: boolean;
} = program.opts();

if (cli.init !== undefined) {
  if (Object.values(cli).length !== 2) {
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
