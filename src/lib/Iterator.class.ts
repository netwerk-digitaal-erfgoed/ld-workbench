import type { SelectQuery } from 'sparqljs';
import type Stage from './Stage.class.js';
import type { Term, NamedNode } from '@rdfjs/types'
import { DataFactory } from 'n3'
import getSPARQLQuery from '../utils/getSPARQLQuery.js';
import { QueryEngine } from '@comunica/query-sparql'
import { type Bindings } from '@comunica/types'
import getSPARQLQueryString from '../utils/getSPARQLQueryString.js';

const DEFAULT_LIMIT = 10

export default class Iterator implements AsyncIterator<NamedNode>, AsyncIterable<NamedNode> {
  private readonly query: SelectQuery
  private readonly engine: QueryEngine
  private bindings?: Bindings[]
  private $offset = 0
  private $index = 0
  constructor(private readonly stage: Stage) {
    this.query = getSPARQLQuery(stage.configuration.iterator, 'select')
    this.engine = new QueryEngine()
    this.query.limit = stage.configuration.iteratorBatchSize ?? DEFAULT_LIMIT
 }

  private async loadBindings(): Promise<Bindings[]> {
    this.query.offset = this.$offset
    const queryString = getSPARQLQueryString(this.query)
    const bindings = await this.engine.queryBindings(queryString, { sources: [{type: this.stage.endpoint instanceof URL ? 'sparql' : 'file', value: this.stage.endpoint.toString()}] })
    return bindings.toArray()
  }

  public async next(): Promise<{value: NamedNode, done: boolean}> {
    if (this.bindings === undefined) this.bindings = await this.loadBindings()
    if (this.$index > this.bindings.length - 1) {
      this.$offset += this.query.limit ?? DEFAULT_LIMIT
      this.bindings = await this.loadBindings()
      this.$index = 0
    }
    const done: boolean = this.bindings === undefined || this.bindings.length === 0
    let value: Term
    if (!done) {
      const $this = this.bindings[this.$index].get('this')
      if ($this === undefined) {
        throw new Error(`Missing binding \`$this\` in your SPARQL query in \`${this.stage.configuration.iterator}\`.`)
      } else if ($this.termType !== 'NamedNode') {
        throw new Error(`Binding \`$this\` in your SPARQL query in \`${this.stage.configuration.iterator}\` should be an Iri (NamedNode), found a ${$this.termType}.`)
      }
      value = $this as NamedNode
    } else {
      value = DataFactory.namedNode('')
    }
    this.$index++
    return {value, done };
  }

  public [Symbol.asyncIterator](): Iterator {
    return this;
  }
}