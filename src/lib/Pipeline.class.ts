import ora from "ora";
import kebabcase from "lodash.kebabcase";
import type { LDWorkbenchConfiguration } from "./LDWorkbenchConfiguration.js";
import chalk from "chalk";
import Stage from "./Stage.class.js";
import duration from "../utils/duration.js";
import File from './File.class.js'
import path from "node:path";
import * as fs from "node:fs";
import { isFilePathString, isTriplyDBPathString } from '../utils/guards.js';
import TriplyDB from './TriplyDB.class.js';
interface PipelineOptions {
  startFromStageName?: string
  silent?: boolean
}
class Pipeline {
  public readonly stages = new Map<string, Stage>();
  public dataDir: string;
  private $isValidated: boolean = false;
  private stageNames: string[] = [];
  private now = new Date();
  private readonly destination: File | TriplyDB
  private readonly opts?: PipelineOptions

  public constructor(
    private readonly $configuration: LDWorkbenchConfiguration,
    pipelineOptions?: PipelineOptions
  ) {
    //  create data folder:
    this.opts = pipelineOptions
    this.dataDir = path.join("pipelines", "data", kebabcase(this.$configuration.name));
    fs.mkdirSync(this.dataDir, { recursive: true });
    const destinationFile = this.configuration.destination ?? `file://${path.join(this.dataDir, 'statements.nt')}`
    if (!isFilePathString(destinationFile) && !isTriplyDBPathString(destinationFile)) {
      throw new Error('We currently only allow publishing data to local files and TriplyDB.')
    }
    if(isFilePathString(destinationFile) && !destinationFile.endsWith('.nt')) {
      throw new Error('We currently only writing results in N-Triples format,\nmake sure your destination filename ends with \'.nt\'.')
    }
    this.destination = isTriplyDBPathString(destinationFile) ? 
      (new TriplyDB(destinationFile)).validate() : (new File(destinationFile, true)).validate()
  }

  private error(e: Error, stage?: string): void {
    let message = `pipeline ${chalk.italic(this.name)} failed:`;
    if (stage !== undefined)
      message = `stage ${chalk.italic(stage)} of ${message}`;
    console.error(chalk.red(message));
    console.error(chalk.red(e.message));
    process.exit(100);
  }

  public getPreviousStage(stage: Stage): Stage | undefined {
    this.validate();
    if (!this.stages.has(stage.name)) {
      throw new Error(
        `This is unexpected: missing stage "${stage.name}" in stages.`
      );
    }
    const names = Array.from(this.stages.keys());
    const ix = names.findIndex((name) => name === stage.name);
    if (ix === 0) return undefined;
    else return this.stages.get(names[ix - 1]);
  }

  public validate(): void {
    if (this.$isValidated) return;
    let i = 0;
    if (this.$configuration.stages.length === 0) {
      throw new Error(
        "Your pipeline contains no stages."
      );
    }
    for (const stageConfiguration of this.$configuration.stages) {
      if (i === 0 && stageConfiguration.iterator.endpoint === undefined) {
        throw new Error(
          "The first stage of your pipeline must have an endpoint defined for the Iterator."
        );
      }
      if (this.stages.has(stageConfiguration.name)) {
        throw new Error(
          `Detected a duplicate name for stage \`${stageConfiguration.name}\` in your pipeline: each stage must have a unique name.`
        );
      }
      this.stages.set(
        stageConfiguration.name,
        new Stage(this, stageConfiguration)
      );
      i++;
    }
    this.$isValidated = true;
  }

  public get configuration(): LDWorkbenchConfiguration {
    return this.$configuration;
  }

  public async run(): Promise<void> {
    this.now = new Date();
    if (!(this.opts?.silent === true)) console.info(chalk.cyan(`🏁 starting pipeline "${chalk.bold(this.name)}"`));
    const spinner = ora("validating pipeline")
    if (!(this.opts?.silent === true)) spinner.start();
    let startFromStage = 0;
    try {
      this.validate();
      if (this.opts?.startFromStageName !== undefined) {
        if (/^\d+$/.test(this.opts.startFromStageName)) {
          const ix = parseInt(this.opts.startFromStageName);
          if (Array.from(this.stages.keys()).length < ix) {
            const e = new Error(
              `Pipeline ${chalk.italic(
                this.name
              )} does not have stage #${chalk.italic(this.opts.startFromStageName)}.`
            );
            if (!(this.opts?.silent === true)) spinner.fail(e.message);
            this.error(e);
          } else {
            startFromStage = ix - 1;
          }
        } else if (!this.stages.has(this.opts.startFromStageName)) {
          const e = new Error(
            `Pipeline ${chalk.italic(
              this.name
            )} does not have stage ${chalk.italic(this.opts.startFromStageName)}.`
          );
          if (!(this.opts?.silent === true)) spinner.fail(e.message);
          this.error(e);
        } else {
          startFromStage = Array.from(this.stages.keys()).findIndex(
            (value) => value === this.opts?.startFromStageName
          );
        }
      }
      if (!(this.opts?.silent === true)) spinner.succeed();
    } catch (e) {
      spinner.fail((e as Error).message);
      this.error(e as Error);
    }

    this.stageNames = Array.from(this.stages.keys()).splice(startFromStage);

    Array.from(this.stages.keys()).slice(0, startFromStage).forEach(stagename => {
      ora().start().info(`stage "${chalk.bold(stagename)}" was skipped`).stop();
    })
    this.runRecursive();
  }

  private runRecursive(): void {
    const stage = this.stages.get(this.stageNames.shift()!)!;
    const spinner = ora("Loading results from Iterator")
    if (!(this.opts?.silent === true)) spinner.start();
    stage.on("iteratorResult", ($this) => {
      if (!(this.opts?.silent === true)) spinner.text = $this.value;
    });
    stage.on('error', (e) => {
      spinner.fail()
      this.error(e)
    })
    stage.on("end", (iris, statements) => {
      if (!(this.opts?.silent === true)) spinner.succeed(
        `stage "${chalk.bold(
          stage.name
        )}" resulted in ${statements.toLocaleString()} statement${
          statements === 1 ? "" : "s"
        } in ${iris.toLocaleString()} iteration${iris === 1 ? "" : "s"}.`
      );
      if (this.stageNames.length !== 0) {
        this.runRecursive();
      } else {
        this.writeResult()
          .then(_ => {
            if (!(this.opts?.silent === true)) console.info(
              chalk.green(
                `✔ your pipeline "${chalk.bold(
                  this.name
                )}" was completed in ${duration(this.now)}`
              )
            );
          })
          .catch(e => {
            throw new Error('Pipeline failed: ' + (e as Error).message)
          })
      }
    });
    try {
      stage.run();
    } catch (e) {
      spinner.fail((e as Error).message);
    }
  }

  private async writeResult(): Promise<void> {
    const spinner = ora('Writing results to destination')
    if (!(this.opts?.silent === true)) spinner.start();
    await this.destination.write(this, spinner)
    if (!(this.opts?.silent === true)) spinner.suffixText = this.destination.path
    if (!(this.opts?.silent === true)) spinner.succeed()
  }

  get name(): string {
    return this.$configuration.name;
  }

  get description(): string | undefined {
    return this.$configuration.description;
  }
}

export default Pipeline;