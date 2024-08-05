import {
  type WriteStream,
  createWriteStream,
  existsSync,
  statSync,
  mkdirSync,
  createReadStream,
} from 'fs';
import {isFile, isFilePathString} from './utils/guards.js';
import {dirname} from 'path';
import chalk from 'chalk';
import type Pipeline from './pipeline.js';
import {pipeline as streamPipeline} from 'stream/promises';
import {Progress} from './progress.js';

export default class File {
  private $isValid?: boolean;

  public constructor(
    private $path: string,
    private readonly skipExistsCheck: boolean = false
  ) {
    this.validate();
  }

  private validate(): File {
    if (this.$isValid !== undefined) return this;
    if (!isFilePathString(this.$path)) {
      throw new Error(
        `The filename \`${this.$path}\` should start with \`file://\``
      );
    }
    this.$path = this.$path.replace(/^file:\/\//, '');
    if (
      !this.skipExistsCheck &&
      (!existsSync(this.$path) || !statSync(this.$path).isFile())
    ) {
      throw new Error(`File not found: \`${this.$path}\``);
    }
    this.$isValid = true;
    return this;
  }

  public get path(): string {
    return this.$path;
  }

  public getStream(append = false): WriteStream {
    if (existsSync(this.$path)) {
      // throw new Error(`File already exists: \`${this.$path}\``)
    }
    if (!existsSync(dirname(this.$path))) {
      mkdirSync(dirname(this.$path), {recursive: true});
    }
    return createWriteStream(this.$path, append ? {flags: 'a'} : {});
  }

  public toString(): string {
    return this.$path;
  }

  public static is(value: unknown): value is File {
    return isFile(value);
  }

  public async write(pipeline: Pipeline, progress: Progress): Promise<void> {
    const stageNames = Array.from(pipeline.stages.keys());
    for (const stageName of stageNames) {
      progress.suffixText(chalk.bold(stageName));
      await streamPipeline(
        createReadStream(pipeline.stages.get(stageName)!.destinationPath),
        this.getStream(true)
      );
    }
  }
}
