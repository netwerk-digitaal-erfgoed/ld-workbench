import EventEmitter from 'node:events';
import File from './file.js';
import {Configuration} from './configuration.js';
import Iterator, {Query} from './iterator.js';
import Generator from './generator.js';
import kebabcase from 'lodash.kebabcase';
import type Pipeline from './pipeline.js';
import path from 'node:path';
import {Writer} from 'n3';
import type {NamedNode} from '@rdfjs/types';
import type {WriteStream} from 'node:fs';
import {isPreviousStage} from './utils/guards.js';
import getSPARQLQuery from './utils/getSPARQLQuery.js';
import parse from 'parse-duration';
import getEndpoint from './utils/getEndpoint.js';
import {Importer} from './import.js';

interface Events {
  importStart: [];
  imported: [numOfTriples: number];
  importSuccess: [numOfTriples: number];
  generatorResult: [count: number];
  end: [iteratorCount: number, statements: number];
  iteratorResult: [$this: NamedNode, quadsGenerated: number];
  error: [Error];
  importError: [Error];
}

export default class Stage extends EventEmitter<Events> {
  public readonly destination: () => WriteStream;
  public readonly iterator: Iterator;
  public readonly generators: Generator[] = [];
  public readonly importer?: Importer;
  private iteratorEnded = false;

  public constructor(
    public readonly pipeline: Pipeline,
    public readonly configuration: Configuration['stages'][0]
  ) {
    super();

    const endpoint = getEndpoint(this);
    if (
      undefined !== configuration.iterator['importTo'] &&
      endpoint instanceof File
    ) {
      const storeUrl = configuration.iterator['importTo']!;
      const store = pipeline.stores.find(
        store => store.options.queryUrl.toString() === storeUrl
      );
      if (store === undefined) {
        throw new Error(`No store configured with queryUrl ${storeUrl}`);
      }
      this.importer = new Importer(store, endpoint);
    }

    this.iterator = new Iterator(
      Query.from(
        getSPARQLQuery(configuration.iterator.query, 'select'),
        configuration.iterator.batchSize
      ).withDefaultGraph(this.importer?.graph),
      this.importer?.url ?? endpoint,
      this.parseDelay(configuration.iterator.delay)
    );

    // Handle both single generator and array of generators
    for (let index = 0; index < this.configuration.generator.length; index++) {
      try {
        this.generators.push(new Generator(this, index));
      } catch (e) {
        throw new Error(
          `Error in the generator of stage \`${configuration.name}\`: ${
            (e as Error).message
          }`
        );
      }
    }
    this.destination = () =>
      new File(`file://${this.destinationPath}`, true).getStream();
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

    if (this.importer !== undefined) {
      this.importer.on('imported', numOfTriples =>
        this.emit('imported', numOfTriples)
      );
      this.importer.on('end', numOfTriples =>
        this.emit('importSuccess', numOfTriples)
      );
      this.emit('importStart');
      try {
        await this.importer.run();
      } catch (e) {
        this.emit('importError', e as Error);
        return;
      }
    }

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

    await this.iterator.run();
  }

  private parseDelay(delay?: string) {
    if (delay === undefined) {
      return undefined;
    }

    const parsed = parse(delay);
    if (parsed === null) {
      throw new Error(
        `Error in stage “${this.configuration.name}”: incorrect delay format was provided.`
      );
    }

    return parsed;
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
