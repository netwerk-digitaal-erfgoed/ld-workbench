import EventEmitter from 'node:events';
import sparqljs, {type SelectQuery, type VariableTerm} from 'sparqljs';
import type {NamedNode} from '@rdfjs/types';
import {type Bindings} from '@comunica/types';
import type {Endpoint, QueryEngine, QuerySource} from './types.js';
import getEngine from './utils/getEngine.js';
import getEngineSource from './utils/getEngineSource.js';
import {BaseQuery} from './sparql.js';

const DEFAULT_LIMIT = 10;

interface Events {
  data: [$this: NamedNode];
  end: [numResults: number];
  error: [Error];
}

export default class Iterator extends EventEmitter<Events> {
  private readonly engine: QueryEngine;
  private source?: QuerySource;
  private offset = 0;
  public totalResults = 0;

  constructor(
    public readonly query: Query,
    public readonly endpoint: Endpoint,
    private readonly delay: number = 0
  ) {
    super();
    this.engine = getEngine(this.endpoint);
  }

  public async run(): Promise<void> {
    setTimeout(async () => {
      let resultsPerPage = 0;
      this.query.offset = this.offset;
      const error = (e: unknown): Error =>
        new Error(
          `The Iterator did not run successfully, it could not get the results from the endpoint ${
            this.source?.value
          } (offset: ${this.offset}, limit ${this.query.limit}): ${
            (e as Error).message
          }`
        );
      try {
        const stream = await this.engine.queryBindings(this.query.toString(), {
          sources: [(this.source ??= getEngineSource(this.endpoint))],
        });

        stream.on('data', (binding: Bindings) => {
          resultsPerPage++;
          if (!binding.has('this'))
            throw new Error('Missing binding $this in the Iterator result.');
          const $this = binding.get('this')!;
          if ($this.termType !== 'NamedNode') {
            throw new Error(
              `Binding $this in the Iterator result must be an Iri/NamedNode, but it is of type ${$this.termType}.`
            );
          } else {
            this.emit('data', $this);
          }
        });
        stream.on('end', () => {
          this.totalResults += resultsPerPage;
          if (this.totalResults === 0) {
            this.emit(
              'error',
              error(
                new Error(`no results for query:\n ${this.query.toString()}`)
              )
            );
          }
          this.offset += this.query.limit;
          if (resultsPerPage < this.query.limit!) {
            this.emit('end', this.totalResults);
          } else {
            this.run();
          }
        });

        stream.on('error', e => {
          this.emit('error', error(e));
        });
      } catch (e) {
        this.emit('error', error(e));
      }
    }, this.delay);
  }
}

export class Query extends BaseQuery {
  public static from(query: SelectQuery, limit?: number) {
    const self = new Query(query);
    self.query.limit = limit ?? self.query.limit ?? DEFAULT_LIMIT;
    self.validate();
    return self;
  }

  private constructor(protected readonly query: SelectQuery) {
    super(query);
  }

  get limit(): number {
    return this.query.limit!;
  }

  set offset(offset: number) {
    this.query.offset = offset;
  }

  protected validate() {
    if (
      !this.query.variables.find(
        v =>
          v instanceof sparqljs.Wildcard || (v as VariableTerm).value === 'this'
      )
    ) {
      throw new Error(
        'The SPARQL iterator query must select either a variable $this or a wildcard *'
      );
    }
  }
}
