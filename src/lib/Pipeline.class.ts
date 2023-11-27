/**
 * Running a pipeline
 */
import readline from 'node:readline'
import kebabcase from 'lodash.kebabcase'
import type { LDWorkbenchConfiguration } from './LDWorkbenchConfiguration.js';
import chalk from 'chalk';
import Stage from './Stage.class.js';
import duration from '../utils/duration.js';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

class Pipeline {

  private readonly stages = new Map<string, Stage>() 
  public dataDir: string
  private $isValidated: boolean = false

  public constructor(private readonly $configuration: LDWorkbenchConfiguration) {
    //  create data folder:
    this.dataDir = path.join('data', kebabcase(this.$configuration.name))
    mkdirSync(this.dataDir, {recursive: true})
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
      this.stages.set(stageConfiguration.name, new Stage(this, stageConfiguration))
      i++
    }
    this.$isValidated = true
  }

    public get configuration(): LDWorkbenchConfiguration {
      return this.$configuration
    }

    public async run(): Promise<number> {
    let quadCount = 0
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

    for (const name of this.stages.keys()) {
      const now = (new Date())
      const msg = `processing stage ${getStageNo()} "${chalk.bold(name)}"`
      process.stdout.write(`🔵 ${msg}`)
      try {
        const c = await this.stages.get(name)?.run()
        readline.cursorTo(process.stdout, 0) // up one line
        readline.clearLine(process.stdout, 0)
        process.stdout.write(`🟡 ${msg} done in ${duration(now)} (${c} statement${c===1?'':'s'}) ✅ \n`)
        quadCount += c ?? 0
      } catch (e) {
        readline.cursorTo(process.stdout, 0) // up one line
        readline.clearLine(process.stdout, 0)
        process.stdout.write(`🔴 ${msg} failed in ${duration(now)} ❌ \n`)
        this.error(e as Error)
      }
    }
    console.info(chalk.green(`🟢 your pipeline was completed in ${duration(now)}`))
    return quadCount
  }

  get name(): string {
    return this.$configuration.name
  }

  get description(): string | undefined {
    return this.$configuration.description
  }

}

export default Pipeline