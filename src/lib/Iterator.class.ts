import EventEmitter from 'node:events';
import type {SelectQuery} from 'sparqljs';
import type Stage from './Stage.class.js';
import type {NamedNode} from '@rdfjs/types';
import getSPARQLQuery from '../utils/getSPARQLQuery.js';
import {type Bindings} from '@comunica/types';
import getSPARQLQueryString from '../utils/getSPARQLQueryString.js';
import getEndpoint from '../utils/getEndpoint.js';
import type {Endpoint, QueryEngine, QuerySource} from './types.js';
import getEngine from '../utils/getEngine.js';
import getEngineSource from '../utils/getEngineSource.js';
import parse from 'parse-duration';

const DEFAULT_LIMIT = 10;

interface Events {
  data: [$this: NamedNode];
  end: [numResults: number];
  error: [Error];
}

export default class Iterator extends EventEmitter<Events> {
  private readonly query: SelectQuery;
  public readonly endpoint: Endpoint;
  private readonly engine: QueryEngine;
  private readonly delay: number = 0;
  private source?: QuerySource;
  private $offset = 0;
  public totalResults = 0;

  constructor(stage: Stage) {
    super();
    this.query = getSPARQLQuery(stage.configuration.iterator.query, 'select');
    this.query.limit =
      stage.configuration.iterator.batchSize ??
      this.query.limit ??
      DEFAULT_LIMIT;
    this.endpoint = getEndpoint(stage);
    this.engine = getEngine(this.endpoint);
    if (stage.configuration.iterator.delay !== undefined) {
      const delay = parse(stage.configuration.iterator.delay);
      if (delay === undefined)
        throw new Error(
          `Error in stage \`${stage.configuration.name}\`: incorrect delay format was provided.`
        );
      this.delay = delay;
    }
  }

  public run(): void {
    setTimeout(() => {
      let resultsPerPage = 0;
      this.query.offset = this.$offset;
      const queryString = getSPARQLQueryString(this.query);
      const error = (e: unknown): Error =>
        new Error(
          `The Iterator did not run succesfully, it could not get the results from the endpoint ${
            this.source
          } (offset: ${this.$offset}, limit ${this.query.limit}): ${
            (e as Error).message
          }`
        );
      this.engine
        .queryBindings(queryString, {
          sources: [(this.source ??= getEngineSource(this.endpoint))],
        })
        .then(stream => {
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
            this.$offset += this.query.limit!;
            if (resultsPerPage < this.query.limit!) {
              this.emit('end', this.totalResults);
            } else {
              this.run();
            }
          });

          stream.on('error', e => {
            this.emit('error', error(e));
          });
        })
        .catch(e => {
          this.emit('error', error(e));
        });
    }, this.delay);
  }
}
