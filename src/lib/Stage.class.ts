import EventEmitter from 'node:events';
import File from './File.class.js';
import {type LDWorkbenchConfiguration} from './LDWorkbenchConfiguration.js';
import Iterator from './Iterator.class.js';
import Generator from './Generator.class.js';
import kebabcase from 'lodash.kebabcase';
import type Pipeline from './Pipeline.class.js';
import path from 'node:path';
import {Writer} from 'n3';
import type {NamedNode} from '@rdfjs/types';
import type {WriteStream} from 'node:fs';

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
    public readonly configuration: LDWorkbenchConfiguration['stages'][0]
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

  public run(): void {
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

    this.iterator.on('data', $this => {
      this.generators.forEach(generator => {
        generator.run($this);
      });
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
