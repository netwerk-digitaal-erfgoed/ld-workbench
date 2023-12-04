  import fs from 'fs'
import type { LDWorkbenchConfiguration } from '../lib/LDWorkbenchConfiguration.js'
import chalk from 'chalk'
import glob from 'glob'
import loadConfiguration from './loadConfiguration.js'

export default function loadPipelines (configDirOrFile: string): Map<string, LDWorkbenchConfiguration> {
  const pipelines = new Map<string, LDWorkbenchConfiguration>()

  if (!fs.existsSync(configDirOrFile))
    throw new Error(`Configuration directory/file ${chalk.italic(configDirOrFile)} could not be found.\nIf this is your first run of LDWorkbench, you might want to use \`npx ld-workbench --init\` to setup an example workbench project.`)

  const files: string[] = []
  if (fs.lstatSync(configDirOrFile).isDirectory()) {
    try {
      files.push(...glob.sync(`${configDirOrFile}/**/*.yml`))
    } catch (e) {
      throw (e as Error)
    }
    if (files.length <= 0) 
      throw new Error(`No configuration files found matching pattern ${chalk.italic(`${configDirOrFile}/**/*.yml`)}`)
  } else {
    files.push(configDirOrFile)
  }

  files.forEach(file => {
    let configuration: any
    try {
      configuration = loadConfiguration(file)
    } catch (e) {
      throw(e as Error)
    }
    if (pipelines.has(configuration.name)) {
      console.warn(chalk.yellow(`Warning: skipping a duplicate configuration from file ${chalk.italic(file)} with name ${chalk.italic(configuration.name)}`))
    } else {
      pipelines.set(configuration.name, configuration)
    }
  })
  return pipelines
}