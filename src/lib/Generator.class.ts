import type { ConstructQuery } from 'sparqljs';
import { QueryEngine } from '@comunica/query-sparql'
import type Stage from './Stage.class.js';
import getSPARQLQuery from '../utils/getSPARQLQuery.js';
import type { Quad, NamedNode, ResultStream, } from '@rdfjs/types'
import getSPARQLQueryString from '../utils/getSPARQLQueryString.js';

export default class Generator {
  private readonly query: ConstructQuery
  private readonly engine: QueryEngine
  public constructor(private readonly stage: Stage) {
    this.query = getSPARQLQuery(stage.configuration.generator, 'construct')
    this.engine = new QueryEngine()
  }

  public async loadStatements($this: NamedNode): Promise<ResultStream<Quad>> {
    const queryString = getSPARQLQueryString(this.query).replaceAll(/[?$]\bthis\b/g, `<${$this.value}>`)
    return this.engine.queryQuads(queryString, { sources: [{type: this.stage.endpoint instanceof URL ? 'sparql' : 'file', value: this.stage.endpoint.toString()}] })
  }
}