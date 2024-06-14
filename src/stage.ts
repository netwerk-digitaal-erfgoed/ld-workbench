import EventEmitter from 'node:events';
import File from './file.js';
import {Configuration} from './configuration.js';
import Iterator from './iterator.js';
import Generator from './generator.js';
import kebabcase from 'lodash.kebabcase';
import type Pipeline from './pipeline.js';
import path from 'node:path';
import {Writer} from 'n3';
import type {NamedNode} from '@rdfjs/types';
import type {WriteStream} from 'node:fs';
import {isPreviousStage} from './utils/guards.js';

interface Events {
  generatorResult: [count: number];
  end: [iteratorCount: number, statements: number];
  iteratorResult: [$this: NamedNode, quadsGenerated: number];
  error: [Error];
}

export default class Stage extends EventEmitter<Events> {
  public destination: () => WriteStream;
  public iterator: Iterator;
  public generators: Generator[] = [];
  private iteratorEnded = false;

  public constructor(
    public readonly pipeline: Pipeline,
    public readonly configuration: Configuration['stages'][0]
  ) {
    super();
    try {
      this.iterator = new Iterator(this);
    } catch (e) {
      throw new Error(
        `Error in the iterator of stage \`${configuration.name}\`: ${
          (e as Error).message
        }`
      );
    }

    // Handle both single generator and array of generators
    for (let index = 0; index < this.configuration.generator.length; index++) {
      const generatorConfig = this.configuration.generator[index];
      try {
        this.generators.push(
          new Generator({...this, generators: [generatorConfig]}, index)
        );
      } catch (e) {
        throw new Error(
          `Error in the generator of stage \`${configuration.name}\`: ${
            (e as Error).message
          }`
        );
      }
    }
    this.destination = () => new File(this.destinationPath).getStream();
  }

  public get destinationPath(): string {
    return path.join(
      this.pipeline.dataDir,
      kebabcase(this.configuration.name) + '.nt'
    );
  }

  public get name(): string {
    return this.configuration.name;
  }

  public async run(): Promise<void> {
    const writer = new Writer(this.destination(), {
      end: false,
      format: 'N-Triples',
    });

    const generatorProcessedCounts = new Map<number, number>();
    let quadsGenerated = 0;

    const checkEnd = (iterationsIncoming: number): void => {
      if (
        ![...generatorProcessedCounts].some(
          ([, processed]) => processed < iterationsIncoming
        ) &&
        this.iteratorEnded
      ) {
        this.emit('end', iterationsIncoming, quadsGenerated);
      }
    };

    this.generators.forEach((generator, index) => {
      generatorProcessedCounts.set(index, 0);

      generator.on('data', quad => {
        quadsGenerated++;
        writer.addQuad(quad);
        this.emit('generatorResult', quadsGenerated);
      });

      generator.on('end', (iterationsIncoming, statements, processed) => {
        generatorProcessedCounts.set(index, processed);
        checkEnd(iterationsIncoming);
      });

      generator.on('error', e => {
        this.emit('error', e);
      });
    });

    this.iterator.on('data', async $this => {
      await Promise.all(this.generators.map(generator => generator.run($this)));
      this.emit('iteratorResult', $this, quadsGenerated);
    });

    this.iterator.on('end', () => {
      this.iteratorEnded = true;
    });

    this.iterator.on('error', e => {
      this.emit('error', e);
    });

    // Start the iterator
    this.iterator.run();
  }
}

export class PreviousStage {
  public readonly $id = 'PreviousStage';
  public constructor(
    public readonly nextStage: Stage,
    public readonly name: string
  ) {}

  public load(): Stage {
    if (!this.nextStage.pipeline.stages.has(this.name)) {
      throw new Error(
        `This is unexpected: missing stage "${this.name}" in stages.`
      );
    }
    const previousStage = this.nextStage.pipeline.getPreviousStage(
      this.nextStage
    );
    if (previousStage === undefined) {
      throw new Error(
        'no endpoint was defined, but there is also no previous stage to use'
      );
    }
    return previousStage;
  }

  public static is(value: unknown): value is PreviousStage {
    return isPreviousStage(value);
  }
}
