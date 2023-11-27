import inquirer from 'inquirer'
import chalk from 'chalk'
import { program } from 'commander'
import { error } from './utils/error.js'
import version from './utils/version.js'
import type { LDWorkbenchConfiguration } from './lib/LDWorkbenchConfiguration.js'
import loadPipelines from './utils/loadPipelines.js'
import Pipeline from './lib/Pipeline.class.js'

console.info(chalk.bold(`Welcome to LD Workbench version ${chalk.cyan(version())}`))

program
  .name('ld-workbench')
  .description('CLI tool to transform Linked Data using SPARQL')
  .option('-c, --config <config.yml>', 'Path to a configuration file for your pipeline.')
  .option('--configDir </path/to/yaml/>', 'Path to a folder containing your configuration files.')
  .version(version());

program.parse();

const cliArgs: {config?: string, configDir?: string} = program.opts();

if (cliArgs.config !== undefined && cliArgs.configDir !== undefined) {
  error(
    'Do not use both the --config and the --configDir options.',
    1,
    `${chalk.italic('--config')} should be used to process a single pipeline, ${chalk.italic('--configDir')} should be used to overwrite the default director where LD Workbench searches configs (${chalk.italic('./pipelines/')}).`
  )
}
let pipelines = new Map<string, LDWorkbenchConfiguration>()
try {
  pipelines = loadPipelines(cliArgs.config ?? cliArgs.configDir ?? './pipelines/')
} catch (e) {
  error(e as Error)
}

const names = Array.from(pipelines.keys())

if (Array.from(pipelines.keys()).length === 1) {
  cliArgs.config = Object.keys(pipelines)[0]
  delete cliArgs.configDir
}

let configuration: LDWorkbenchConfiguration

inquirer.prompt(
  {
    type: 'list',
    name: 'pipeline',
    when: Array.from(pipelines.keys()).length > 1,
    message: 'Which pipeline do you want to run?',
    choices: names
  }
).then((answers: {pipeline?: string}) => {
  if (answers.pipeline !== undefined) {
    if (!pipelines.has(answers.pipeline)) {
      error(`This should not happen: pipeline ${chalk.italic(answers.pipeline)} does not exist.`)
    }
    // @ts-expect-error the Map does contain the key, we checked it
    configuration = pipelines.get(answers.pipeline)
  } else if (names.length !== 1) {
    error('This should not happen: no pipeline was picked, but we have multiple.')
  } else {
    // @ts-expect-error the Map does contain the key, we checked it
    configuration = pipelines.get(names[0])
  }
  (new Pipeline(configuration)).run().then(_ => {})
  .catch(e => {
    error(`Error in pipeline ${chalk.italic(configuration.name)}`, 5, e as Error)
  })
})
.catch(e => {
  error(e as Error)
})
