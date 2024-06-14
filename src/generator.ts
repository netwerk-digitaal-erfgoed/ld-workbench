import type {ConstructQuery} from 'sparqljs';
import type Stage from './stage.js';
import getSPARQLQuery from './utils/getSPARQLQuery.js';
import type {Quad, NamedNode} from '@rdfjs/types';
import getSPARQLQueryString from './utils/getSPARQLQueryString.js';
import getEndpoint from './utils/getEndpoint.js';
import type {Endpoint, QueryEngine, QuerySource} from './types.js';
import getEngine from './utils/getEngine.js';
import getEngineSource from './utils/getEngineSource.js';
import EventEmitter from 'node:events';

const DEFAULT_BATCH_SIZE = 10;

interface Events {
  end: [iterations: number, statements: number, processed: number];
  error: [e: Error];
  data: [statement: Quad];
}

export default class Generator extends EventEmitter<Events> {
  private readonly query: ConstructQuery;
  private readonly engine: QueryEngine;
  private iterationsProcessed = 0;
  private iterationsIncoming = 0;
  private statements = 0;
  private $thisList: NamedNode[] = [];
  private readonly endpoint: Endpoint;
  private source?: QuerySource;

  public constructor(
    private readonly stage: Stage,
    private readonly index: number
  ) {
    if (stage.configuration.generator === undefined)
      throw new Error(
        'Error in Generator: no generators were present in stage configuration'
      );
    super();
    this.index = index;
    this.query = getSPARQLQuery(
      stage.configuration.generator[this.index].query,
      'construct'
    );

    this.endpoint =
      stage.configuration.generator[this.index].endpoint === undefined
        ? stage.iterator.endpoint
        : getEndpoint(stage, 'generator', this.index);

    this.engine = getEngine(this.endpoint);

    stage.iterator.on('end', async () => {
      await this.flush();
    });
  }

  public async run($this: NamedNode): Promise<void> {
    // Prevent duplicates from added to $thisList, but immediately run any query that is batched.
    this.$thisList.push($this);
    this.iterationsIncoming++;
    if (this.$thisList.length >= this.batchSize) {
      const batch = this.$thisList;
      this.$thisList = [];
      await this.runBatch(batch);
    }
  }

  private get batchSize(): number {
    return (
      this.stage.configuration.generator[this.index].batchSize ??
      DEFAULT_BATCH_SIZE
    );
  }

  private async runBatch(batch: NamedNode[]): Promise<void> {
    const error = (e: unknown): Error =>
      new Error(
        `The Generator did not run successfully, it could not get the results from the endpoint ${this
          .source?.value}: ${(e as Error).message}`
      );
    const unionQuery = getSPARQLQuery(
      getSPARQLQueryString(this.query),
      'construct'
    );
    const patterns = unionQuery.where ?? [];
    patterns.push({
      type: 'values',
      values: batch.map($this => ({'?this': $this})),
    });
    unionQuery.where = [{type: 'group', patterns}];

    try {
      const stream = await this.engine.queryQuads(
        getSPARQLQueryString(unionQuery),
        {
          sources: [(this.source ??= getEngineSource(this.endpoint))],
        }
      );

      stream.on('data', (quad: Quad) => {
        this.statements++;
        this.emit('data', quad);
      });
      stream.on('error', e => {
        this.emit('error', error(e));
        // reject(e);
      });
      stream.on('end', () => {
        // resolve();
        this.iterationsProcessed += batch.length;
        this.emit(
          'end',
          this.iterationsIncoming,
          this.statements,
          this.iterationsProcessed
        );
      });
    } catch (e) {
      this.emit('error', error(e));
    }
  }

  private async flush(): Promise<void> {
    await this.runBatch(this.$thisList);
  }
}
