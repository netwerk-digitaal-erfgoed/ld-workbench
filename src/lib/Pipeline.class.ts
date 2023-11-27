import ora from 'ora'
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
      if (i === 0 && stageConfiguration.iterator.endpoint === undefined) {
        throw new Error('The first stage of your pipeline must have an endpoint defined for the Iterator.')
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

    public async run(): Promise<void> {
    const now = new Date()
    console.info(chalk.cyan(`🏁 starting pipeline "${chalk.bold(this.name)}"`))
    const spinner = ora('validating pipeline').start();
    try {
      this.validate()
      spinner.succeed()
    } catch (e) {
      spinner.fail((e as Error).message)
      this.error(e as Error)
    }

    for (const name of this.stages.keys()) {
      const spinner = ora('Loading results from Iterator').start();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const stage = this.stages.get(name)!
      stage.on('iteratorResult', ($this) => {
        spinner.text = $this.value
      })
      stage.on('finished', (noQuads) => {
        spinner.succeed(`stage "${chalk.bold(name)}" resulted in ${noQuads} quads`)
      })

      try {
        await stage.run()
      } catch (e) {
        spinner.fail((e as Error).message)
        this.error(e as Error)
      }
    }
    console.info(chalk.green(`✔ your pipeline was completed in ${duration(now)}`))
  }

  get name(): string {
    return this.$configuration.name
  }

  get description(): string | undefined {
    return this.$configuration.description
  }

}

export default Pipeline