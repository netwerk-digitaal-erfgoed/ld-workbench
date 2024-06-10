import ora, {Ora} from 'ora';
import kebabcase from 'lodash.kebabcase';
import type {LDWorkbenchConfiguration} from './LDWorkbenchConfiguration.js';
import chalk from 'chalk';
import Stage from './Stage.class.js';
import formatDuration from '../utils/formatDuration.js';
import {millify} from 'millify';
import File from './File.class.js';
import path from 'node:path';
import * as fs from 'node:fs';
import {isFilePathString, isTriplyDBPathString} from '../utils/guards.js';
import TriplyDB from './TriplyDB.class.js';
import prettyMilliseconds from 'pretty-ms';
import {memoryConsumption} from '../utils/memory.js';
interface PipelineOptions {
  startFromStageName?: string;
  silent?: boolean;
}

let spinner: Ora;

class Pipeline {
  public readonly stages = new Map<string, Stage>();
  public dataDir: string;
  private stageNames: string[] = [];
  private startTime = performance.now();
  private readonly destination: File | TriplyDB;
  private readonly opts?: PipelineOptions;

  public constructor(
    private readonly $configuration: LDWorkbenchConfiguration,
    pipelineOptions?: PipelineOptions
  ) {
    //  create data folder:
    this.opts = pipelineOptions;
    this.dataDir = path.join(
      'pipelines',
      'data',
      kebabcase(this.$configuration.name)
    );
    fs.mkdirSync(this.dataDir, {recursive: true});
    const destinationFile =
      this.configuration.destination ??
      `file://${path.join(this.dataDir, 'statements.nt')}`;
    const actualPath = destinationFile.replace(/^file:\/\//, '');
    if (fs.existsSync(actualPath)) {
      // removing destintation if it already exists
      fs.unlinkSync(actualPath);
    }
    if (
      !isFilePathString(destinationFile) &&
      !isTriplyDBPathString(destinationFile)
    ) {
      throw new Error(
        'We currently only allow publishing data to local files and TriplyDB.'
      );
    }
    if (isFilePathString(destinationFile) && !destinationFile.endsWith('.nt')) {
      throw new Error(
        "We currently only writing results in N-Triples format,\nmake sure your destination filename ends with '.nt'."
      );
    }
    this.destination = isTriplyDBPathString(destinationFile)
      ? new TriplyDB(destinationFile).validate()
      : new File(destinationFile, true).validate();
    this.validate();
  }

  private error(e: Error, stage?: string): void {
    let message = `pipeline ${chalk.italic(this.name)} failed:`;
    if (stage !== undefined)
      message = `stage ${chalk.italic(stage)} of ${message}`;
    console.error(chalk.red(message));
    console.error(chalk.red(e.message));
    throw e;
  }

  public getPreviousStage(stage: Stage): Stage | undefined {
    if (!this.stages.has(stage.name)) {
      throw new Error(
        `This is unexpected: missing stage "${stage.name}" in stages.`
      );
    }
    const names = Array.from(this.stages.keys());
    const ix = names.findIndex(name => name === stage.name);
    if (ix === 0) return undefined;
    else return this.stages.get(names[ix - 1]);
  }

  private validate(): void {
    if (this.$configuration.stages.length === 0) {
      throw new Error('Your pipeline contains no stages.');
    }

    if (this.$configuration.stages[0].iterator.endpoint === undefined) {
      throw new Error(
        'The first stage of your pipeline must have an endpoint defined for the Iterator.'
      );
    }

    for (const stageConfiguration of this.$configuration.stages) {
      if (this.stages.has(stageConfiguration.name)) {
        throw new Error(
          `Detected a duplicate name for stage \`${stageConfiguration.name}\` in your pipeline: each stage must have a unique name.`
        );
      }
      this.stages.set(
        stageConfiguration.name,
        new Stage(this, stageConfiguration)
      );
    }
  }

  public get configuration(): LDWorkbenchConfiguration {
    return this.$configuration;
  }

  public async run(): Promise<void> {
    this.startTime = performance.now();
    if (!(this.opts?.silent === true))
      console.info(
        chalk.cyan(`▶ Starting pipeline “${chalk.bold(this.name)}”`)
      );
    spinner = ora('Validating pipeline');
    if (!(this.opts?.silent === true)) spinner.start();
    let startFromStage = 0;
    try {
      if (this.opts?.startFromStageName !== undefined) {
        if (/^\d+$/.test(this.opts.startFromStageName)) {
          const ix = parseInt(this.opts.startFromStageName);
          if (Array.from(this.stages.keys()).length < ix) {
            const e = new Error(
              `Pipeline ${chalk.italic(
                this.name
              )} does not have stage #${chalk.italic(
                this.opts.startFromStageName
              )}.`
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
            )} does not have stage ${chalk.italic(
              this.opts.startFromStageName
            )}.`
          );
          if (!(this.opts?.silent === true)) spinner.fail(e.message);
          this.error(e);
        } else {
          startFromStage = Array.from(this.stages.keys()).findIndex(
            value => value === this.opts?.startFromStageName
          );
        }
      }
      if (!(this.opts?.silent === true)) spinner.succeed();
    } catch (e) {
      spinner.fail((e as Error).message);
      this.error(e as Error);
    }

    this.stageNames = Array.from(this.stages.keys()).splice(startFromStage);

    Array.from(this.stages.keys())
      .slice(0, startFromStage)
      .forEach(stagename => {
        ora()
          .start()
          .info(`stage "${chalk.bold(stagename)}" was skipped`)
          .stop();
      });
    await this.runRecursive();
  }

  private async runRecursive(): Promise<void> {
    const stage = this.stages.get(this.stageNames.shift()!)!;
    spinner = ora('Loading results from Iterator');
    const startTime = performance.now();
    let iterationsProcessed = 0;
    if (!(this.opts?.silent === true)) spinner.start();
    await new Promise<void>((resolve, reject) => {
      stage.on('iteratorResult', (_$this, quadsGenerated) => {
        iterationsProcessed++;
        this.updateSpinner(
          stage,
          startTime,
          iterationsProcessed,
          quadsGenerated
        );
      });
      stage.on('generatorResult', count => {
        this.updateSpinner(stage, startTime, iterationsProcessed, count);
      });
      stage.on('error', e => {
        spinner.fail();
        this.error(e);
        reject(e);
      });
      stage.on('end', (iris, statements) => {
        if (!(this.opts?.silent === true))
          spinner.succeed(
            `Stage “${chalk.bold(
              stage.name
            )}” resulted in ${statements.toLocaleString()} statement${
              statements === 1 ? '' : 's'
            } in ${iris.toLocaleString()} iteration${
              iris === 1 ? '' : 's'
            } (took ${prettyMilliseconds(performance.now() - startTime)})`
          );
        resolve();
      });
      try {
        stage.run();
      } catch (e) {
        spinner.fail((e as Error).message);
        reject(e);
      }
    });

    if (this.stageNames.length !== 0) return this.runRecursive();
    try {
      await this.writeResult();
    } catch (e) {
      throw new Error('Pipeline failed: ' + (e as Error).message);
    }

    if (!(this.opts?.silent === true))
      console.info(
        chalk.green(
          `✔ Your pipeline “${chalk.bold(
            this.name
          )}” was completed in ${prettyMilliseconds(
            performance.now() - this.startTime
          )} using ${memoryConsumption()} MB of memory`
        )
      );
  }

  private async writeResult(): Promise<void> {
    spinner = ora('Writing results to destination');
    if (!(this.opts?.silent === true)) spinner.start();
    await this.destination.write(this, spinner);
    if (!(this.opts?.silent === true))
      spinner.suffixText = `${chalk.bold(
        path.relative(process.cwd(), this.destination.path)
      )}`;
    if (!(this.opts?.silent === true)) spinner.succeed();
  }

  get name(): string {
    return this.$configuration.name;
  }

  get description(): string | undefined {
    return this.$configuration.description;
  }

  private updateSpinner(
    stage: Stage,
    startTime: number,
    iterationsProcessed: number,
    quadsGenerated: number
  ) {
    if (this.opts?.silent === true) {
      return;
    }

    spinner.text = `Running stage “${chalk.bold(
      stage.name
    )}”:\n\n  Processed elements: ${millify(
      iterationsProcessed
    )}\n  Generated quads: ${millify(
      quadsGenerated
    )}\n  Duration: ${formatDuration(
      startTime,
      performance.now()
    )}\n  Memory: ${memoryConsumption()} MB`;
  }
}

export default Pipeline;
