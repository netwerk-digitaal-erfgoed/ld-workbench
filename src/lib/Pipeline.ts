/**
 * Running a pipeline
 */

import type { LDWorkbenchConfiguration } from './LDWorkbenchConfiguration.js';
import chalk from 'chalk';
import Stage from './Stage.js';
import duration from '../utils/duration.js';

class Pipeline {

  private readonly stages = new Map<string, Stage>() 
  private $isValidated: boolean = false

  public constructor(private readonly $configuration: LDWorkbenchConfiguration) {

  }

  private error(e: Error, stage?: string): void {
    let message = `pipeline ${chalk.italic(this.name)} failed:`
    if (stage !== undefined) message = `stage ${chalk.italic(stage)} of ${message}`
    console.error(chalk.red(message))
    console.error(chalk.red(e.message))
    process.exit(100)
  }

  public validate(): void {
    if (this.$isValidated) return
    let i = 0
    for (const stageConfiguration of this.$configuration.stages) {
      if (i === 0 && stageConfiguration.endpoint === undefined) {
        throw new Error('The first stage of your pipeline must have an endpoint defined.')
      }
      if (this.stages.has(stageConfiguration.name)) {
        throw new Error(`Detected a duplicate name for stage \`${stageConfiguration.name}\` in your pipeline: each job must have a unique name.`)
      }
      this.stages.set(stageConfiguration.name, new Stage(stageConfiguration))
      i++
    }
    this.$isValidated = true
  }

  public run(): void {
    const now = new Date()
    console.info(chalk.cyan(`⚪️ starting pipeline "${chalk.bold(this.name)}"`))
    process.stdout.write('🟡 validating pipeline: ')
    try {
      this.validate()
      process.stdout.write('✅\n')
    } catch (e) {
      process.stdout.write('❌\n')
      this.error(e as Error)
    }

    let i = 0
    const stages = Array.from(this.stages.keys()).length
    const getStageNo = (): string => {
      const counter = `${++i}`.padStart(stages.toString().length, '0')
      return `[${counter}/${stages}]`
    }
    this.stages.forEach((stage, name) => {
      const now = (new Date())
      process.stdout.write(`🔵 stage ${getStageNo()} "${chalk.bold(name)}": `)
      // stage.on('progress', (message) => {
      // })
      try {
        stage.run()
        process.stdout.write(`✅ done in ${duration(now)}\n`)
      } catch (e) {
        process.stdout.write(`❌ failed in ${duration(now)}\n`)
        this.error(e as Error)
      }
    })

    console.info(chalk.green(`🟢 your pipeline was completed in ${duration(now)}`))
  }

  get name(): string {
    return this.$configuration.name
  }

  get description(): string | undefined {
    return this.$configuration.description
  }

}

export default Pipeline