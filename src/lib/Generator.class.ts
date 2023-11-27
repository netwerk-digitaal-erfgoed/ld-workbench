import type { ConstructQuery } from 'sparqljs';
import { QueryEngine } from '@comunica/query-sparql'
import type Stage from './Stage.class.js';
import getSPARQLQuery from '../utils/getSPARQLQuery.js';
import type { Quad, NamedNode, ResultStream, } from '@rdfjs/types'
import getSPARQLQueryString from '../utils/getSPARQLQueryString.js';
import { isFilePathString } from '../utils/guards.js';
import File from './File.class.js'

export default class Generator {
  private readonly query: ConstructQuery
  private readonly engine: QueryEngine
  private readonly endpoint: File | URL
  public constructor(stage: Stage) {
    this.query = getSPARQLQuery(stage.configuration.generator.query, 'construct')
    this.engine = new QueryEngine()
    const possibleEndpoint = stage.configuration.generator.endpoint ?? stage.configuration.iterator.endpoint
    if (isFilePathString(possibleEndpoint)) {
      this.endpoint = new File(possibleEndpoint)
    } else if(possibleEndpoint !== undefined) {
      this.endpoint = new URL(possibleEndpoint)
    } else {
      throw new Error('An endpoint is required, although we might change this to use the intermit result from the previous stage')
    }
  }

  public async loadStatements($this: NamedNode): Promise<ResultStream<Quad>> {
    const queryString = getSPARQLQueryString(this.query).replaceAll(/[?$]\bthis\b/g, `<${$this.value}>`)
    return this.engine.queryQuads(queryString, { sources: [{type: this.endpoint instanceof URL ? 'sparql' : 'file', value: this.endpoint.toString()}] })
  }
}