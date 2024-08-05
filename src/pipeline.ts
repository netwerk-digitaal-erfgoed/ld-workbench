import kebabcase from 'lodash.kebabcase';
import type {Configuration} from './configuration.js';
import chalk from 'chalk';
import Stage from './stage.js';
import File from './file.js';
import path from 'node:path';
import * as fs from 'node:fs';
import {isFilePathString, isTriplyDBPathString} from './utils/guards.js';
import TriplyDB from './triply-db.js';
import prettyMilliseconds from 'pretty-ms';
import {memoryConsumption} from './utils/memory.js';
import {Progress} from './progress.js';
import {millify} from 'millify';
import formatDuration from './utils/formatDuration.js';
import {GraphStore} from './import.js';
interface PipelineOptions {
  startFromStageName?: string;
  silent?: boolean;
}

class Pipeline {
  public readonly stages = new Map<string, Stage>();
  public dataDir: string;
  private stageNames: string[] = [];
  private startTime = performance.now();
  private readonly destination: File | TriplyDB;
  public readonly stores: GraphStore[] = [];
  private readonly opts?: PipelineOptions;

  public constructor(
    private readonly configuration: Configuration,
    pipelineOptions?: PipelineOptions
  ) {
    //  create data folder:
    this.opts = pipelineOptions;
    this.dataDir = path.join(
      'pipelines',
      'data',
      kebabcase(this.configuration.name)
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
      : new File(destinationFile, true);

    this.stores = (configuration.stores ?? []).map(
      storeConfig =>
        new GraphStore({
          queryUrl: new URL(storeConfig.queryUrl),
          updateUrl: storeConfig.updateUrl
            ? new URL(storeConfig.updateUrl)
            : undefined,
          storeUrl: storeConfig.storeUrl
            ? new URL(storeConfig.storeUrl)
            : undefined,
        })
    );

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
    if (this.configuration.stages.length === 0) {
      throw new Error('Your pipeline contains no stages.');
    }

    if (this.configuration.stages[0].iterator.endpoint === undefined) {
      throw new Error(
        'The first stage of your pipeline must have an endpoint defined for the Iterator.'
      );
    }

    for (const stageConfiguration of this.configuration.stages) {
      if (this.stages.has(stageConfiguration.name)) {
        throw new Error(
          `Detected a duplicate name for stage \`${stageConfiguration.name}\` in your pipeline: each stage must have a unique name.`
        );
      }
      try {
        this.stages.set(
          stageConfiguration.name,
          new Stage(this, stageConfiguration)
        );
      } catch (e) {
        throw new Error(
          `Error in the configuration of stage “${stageConfiguration.name}”: ${
            (e as Error).message
          }`,
          {cause: e}
        );
      }
    }
  }

  public async run(): Promise<void> {
    const progress = new Progress({silent: this.opts?.silent === true})
      .line(chalk.cyan(`▶ Starting pipeline “${chalk.bold(this.name)}”`))
      .start('Validating pipeline');
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
          this.error(e);
        } else {
          startFromStage = Array.from(this.stages.keys()).findIndex(
            value => value === this.opts?.startFromStageName
          );
        }
      }
      progress.succeed();
    } catch (e) {
      this.error(e as Error);
    }

    this.stageNames = Array.from(this.stages.keys()).splice(startFromStage);

    Array.from(this.stages.keys())
      .slice(0, startFromStage)
      .forEach(stagename => {
        new Progress({silent: this.opts?.silent === true})
          .start(`stage "${chalk.bold(stagename)}" was skipped`)
          .stop();
      });
    await this.runStage();
  }

  private async runStage(): Promise<void> {
    const stage = this.stages.get(this.stageNames.shift()!)!;
    const progress = new Progress({silent: this.opts?.silent === true}).start(
      'Loading results from iterator'
    );
    const startTime = performance.now();
    let iterationsProcessed = 0;
    await new Promise<void>((resolve, reject) => {
      stage.on('iteratorResult', (_$this, quadsGenerated) => {
        iterationsProcessed++;
        this.increaseProgress(
          progress,
          stage,
          iterationsProcessed,
          quadsGenerated
        );
      });
      stage.on('generatorResult', count => {
        this.increaseProgress(progress, stage, iterationsProcessed, count);
      });
      stage.on('error', e => {
        progress.fail(`Stage “${this.name}” failed`);
        reject(e);
      });
      stage.on('end', (iris, statements) => {
        progress.succeed(
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
      this.monitorImport(stage);
      try {
        stage.run();
      } catch (e) {
        progress.fail((e as Error).message);
        reject(e);
      }
    });

    if (this.stageNames.length !== 0) return this.runStage();
    try {
      await this.writeResult();
    } catch (e) {
      throw new Error('Pipeline failed: ' + (e as Error).message);
    }

    progress.line(
      chalk.green(
        `✔ Your pipeline “${chalk.bold(
          this.name
        )}” was completed in ${prettyMilliseconds(
          performance.now() - this.startTime
        )} using ${memoryConsumption()} MB of memory`
      )
    );
  }

  private monitorImport(stage: Stage) {
    let progress: Progress;

    stage.on('importStart', () => {
      progress = new Progress({silent: this.opts?.silent === true}).start(
        'Importing data to SPARQL store'
      );
    });
    stage.on('imported', numOfTriples => {
      progress.text(
        `Importing data to SPARQL store\n\n  Statements: ${millify(
          numOfTriples
        )}\n  Duration: ${formatDuration(progress.startTime, performance.now())} `
      );
    });
    stage.on('importSuccess', numOfTriples => {
      progress.succeed(
        `Imported ${millify(
          numOfTriples
        )} statements to SPARQL store (took ${prettyMilliseconds(
          performance.now() - progress.startTime
        )})`
      );
    });
    stage.on('importError', e => {
      progress?.fail('Import failed');
      this.error(e);
    });
  }

  private async writeResult(): Promise<void> {
    const progress = new Progress({silent: this.opts?.silent === true}).start(
      'Writing results to destination'
    );
    await this.destination.write(this, progress);
    progress.suffixText(
      chalk.bold(path.relative(process.cwd(), this.destination.path))
    );
    progress.succeed();
  }

  get name(): string {
    return this.configuration.name;
  }

  get description(): string | undefined {
    return this.configuration.description;
  }

  private increaseProgress(
    progress: Progress,
    stage: Stage,
    iterationsProcessed: number,
    quadsGenerated: number
  ) {
    if (this.opts?.silent === true) {
      return;
    }

    progress.text(
      `Running stage “${chalk.bold(
        stage.name
      )}”:\n\n  Processed elements: ${millify(
        iterationsProcessed
      )}\n  Generated quads: ${millify(
        quadsGenerated
      )}\n  Duration: ${formatDuration(
        progress.startTime,
        performance.now()
      )}\n  Memory: ${memoryConsumption()} MB`
    );
  }
}

export default Pipeline;
