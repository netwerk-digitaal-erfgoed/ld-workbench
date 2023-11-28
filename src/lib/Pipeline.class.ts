import ora from "ora";
import kebabcase from "lodash.kebabcase";
import type { LDWorkbenchConfiguration } from "./LDWorkbenchConfiguration.js";
import chalk from "chalk";
import Stage from "./Stage.class.js";
import duration from "../utils/duration.js";
import path from "node:path";
import { mkdirSync } from "node:fs";

class Pipeline {
  public readonly stages = new Map<string, Stage>();
  public dataDir: string;
  private $isValidated: boolean = false;

  public constructor(
    private readonly $configuration: LDWorkbenchConfiguration
  ) {
    //  create data folder:
    this.dataDir = path.join("data", kebabcase(this.$configuration.name));
    mkdirSync(this.dataDir, { recursive: true });
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

  public async run(startFromStageName?: string): Promise<void> {
    const now = new Date();
    console.info(chalk.cyan(`🏁 starting pipeline "${chalk.bold(this.name)}"`));
    const spinner = ora("validating pipeline").start();
    let startFromStage = 0
    try {
      this.validate();
      if (startFromStageName !== undefined) {
        if(/^\d+$/.test(startFromStageName)) {
          const ix = parseInt(startFromStageName)
          if (Array.from(this.stages.keys()).length < ix) {
            const e = new Error(`Pipeline ${chalk.italic(this.name)} does not have stage #${chalk.italic(startFromStageName)}.`)
            spinner.fail(e.message);
            this.error(e);
          } else {
            startFromStage = ix - 1
          }
        } else if(!this.stages.has(startFromStageName)) {
          const e = new Error(`Pipeline ${chalk.italic(this.name)} does not have stage ${chalk.italic(startFromStageName)}.`)
          spinner.fail(e.message);
          this.error(e);
        } else {
          startFromStage = Array.from(this.stages.keys()).findIndex(value => value === startFromStageName)
        }
      }
      spinner.succeed();
    } catch (e) {
      spinner.fail((e as Error).message);
      this.error(e as Error);
    }
    let i = -1
    for (const name of this.stages.keys()) {
      i++
      if (i < startFromStage) {
        ora().start().info(`skipping stage "${chalk.bold(name)}" as requested`).stop()
      } else {
        const spinner = ora("Loading results from Iterator").start();
        const stage = this.stages.get(name)!;
        stage.on("iteratorResult", ($this) => {
          spinner.text = $this.value;
        });
        let count = 0
        stage.on("generatorResult", () => {
          count++
        });

        try {
          await stage.run()
          // @TODO: the # of quads is not correct, should be something in the async loop...
          spinner.succeed(`stage "${chalk.bold(name)}" resulted in ${count} quads`)
        } catch (e) {
          spinner.fail((e as Error).message);
          this.error(e as Error);
        }
      }
    }
    console.info(
      chalk.green(`✔ your pipeline was completed in ${duration(now)}`)
    );
  }

  get name(): string {
    return this.$configuration.name;
  }

  get description(): string | undefined {
    return this.$configuration.description;
  }
}

export default Pipeline;
