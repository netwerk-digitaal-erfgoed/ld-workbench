import type {ConstructQuery, Pattern} from 'sparqljs';
import type Stage from './stage.js';
import getSPARQLQuery from './utils/getSPARQLQuery.js';
import type {NamedNode, Quad} from '@rdfjs/types';
import getEndpoint from './utils/getEndpoint.js';
import type {Endpoint, QueryEngine, QuerySource} from './types.js';
import getEngine from './utils/getEngine.js';
import getEngineSource from './utils/getEngineSource.js';
import EventEmitter from 'node:events';
import {BaseQuery} from './sparql.js';
import clonedeep from 'lodash.clonedeep';

const DEFAULT_BATCH_SIZE = 10;

interface Events {
  end: [iterations: number, statements: number, processed: number];
  error: [e: Error];
  data: [statement: Quad];
}

export default class Generator extends EventEmitter<Events> {
  private readonly query: Query;
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
    this.query = Query.from(
      getSPARQLQuery(
        stage.configuration.generator[this.index].query,
        'construct'
      )
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

    try {
      const stream = await this.engine.queryQuads(
        this.query.withIris(batch).toString(),
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

export class Query extends BaseQuery {
  public static from(query: ConstructQuery) {
    const self = new this(query);
    self.validate();
    return self;
  }

  private constructor(protected readonly query: ConstructQuery) {
    super(query);
  }

  public withIris(iris: NamedNode[]) {
    const query = clonedeep(this.query);
    // Increase Comunica query performance by inserting the VALUES as the first element in the query’s WHERE clause.
    const patterns: Pattern[] = [
      {
        type: 'values',
        values: iris.map($this => ({'?this': $this})),
      },
      ...(query.where ?? []),
    ];
    query.where = [{type: 'group', patterns}];

    return new Query(query);
  }

  protected validate() {
    this.validatePreBinding(this.query.where ?? []);
  }

  /**
   * Because we use pre-binding, the query must follow the rules as specified by https://www.w3.org/TR/shacl/#pre-binding:
   * - SPARQL queries must not contain a MINUS clause
   * - SPARQL queries must not contain a federated query (SERVICE)
   * - SPARQL queries must not contain a VALUES clause
   * - SPARQL queries must not use the syntax form `AS ?var` for any potentially pre-bound variable
   */
  private validatePreBinding(patterns: Pattern[]) {
    for (const pattern of patterns) {
      if (pattern.type === 'bind' && pattern.variable.value === 'this') {
        throw new Error(
          'SPARQL CONSTRUCT generator query must not use the syntax form `AS ?this` because it is a pre-bound variable'
        );
      } else if (['minus', 'service', 'values'].includes(pattern.type)) {
        throw new Error(
          `SPARQL CONSTRUCT generator query must not contain a ${pattern.type.toUpperCase()} clause`
        );
      } else if (
        pattern.type === 'optional' ||
        pattern.type === 'union' ||
        pattern.type === 'group' ||
        pattern.type === 'graph'
      ) {
        this.validatePreBinding(pattern.patterns);
      }
    }
  }
}
