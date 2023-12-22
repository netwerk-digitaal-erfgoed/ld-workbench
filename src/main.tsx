#!/usr/bin/env node
import inquirer from 'inquirer'
import chalk from 'chalk'
import { error } from './utils/error.js'
import version from './utils/version.js'
import type { LDWorkbenchConfiguration } from './lib/LDWorkbenchConfiguration.js'
import loadPipelines from './utils/loadPipelines.js'
import Pipeline from './lib/Pipeline.class.js'
import { cliArgs } from './cliArgs.js'

console.info(chalk.bold(`Welcome to LD Workbench version ${chalk.cyan(version())}`))

let pipelines = new Map<string, LDWorkbenchConfiguration>()
try {
  pipelines = loadPipelines(cliArgs.config ?? cliArgs.configDir ?? './pipelines/')
} catch (e) {
  error(e as Error)
}

const names = Array.from(pipelines.keys())

// this will be the configuration we use:
let configuration: LDWorkbenchConfiguration | undefined


if (cliArgs.pipeline !== undefined) {
  const config = pipelines.get(cliArgs.pipeline)
  if (config === undefined) {
    error(`No pipeline named "${cliArgs.pipeline}" was found.`, 2, `Valid pipeline names are: ${names.map(name => `"${name}"`).join(', ')}`)
  }
  configuration = pipelines.get(cliArgs.pipeline)
} else if (names.length === 1) {
  configuration = pipelines.get(names[0])
}

inquirer.prompt(
  {
    type: 'list',
    name: 'pipeline',
    when: configuration === undefined,
    message: 'Which pipeline do you want to run?',
    choices: names
  }
).then((answers: {pipeline?: string}) => {
  if (answers.pipeline !== undefined) {
    if (!pipelines.has(answers.pipeline)) {
      error(`This should not happen: pipeline ${chalk.italic(answers.pipeline)} does not exist.`)
    }
    configuration = pipelines.get(answers.pipeline)
  } else if (names.length !== 1) {
    error('This should not happen: no pipeline was picked, but we have multiple.')
  } else {
    configuration = pipelines.get(names[0])
  }
  if (configuration === undefined) {
    throw new Error("Unable to get a configuration based on the CLI arguments.")
  }
  const pipeline = new Pipeline(configuration, {startFromStageName: cliArgs.stage})
  pipeline.run().then(_ => {})
  .catch(e => {
    error(`Error in pipeline ${chalk.italic(configuration!.name)}`, 5, e as Error)
  })
})
.catch(e => {
  error(e as Error)
})
