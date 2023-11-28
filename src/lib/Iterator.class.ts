import type { SelectQuery } from "sparqljs";
import type Stage from "./Stage.class.js";
import type { Term, NamedNode } from "@rdfjs/types";
import { DataFactory } from "n3";
import getSPARQLQuery from "../utils/getSPARQLQuery.js";
import { type Bindings } from "@comunica/types";
import getSPARQLQueryString from "../utils/getSPARQLQueryString.js";
import getEndpoint from '../utils/getEndpoint.js';
import type { Endpoint, QueryEngine } from './types.js';
import getEngine from '../utils/getEngine.js';
import getEngineSource from '../utils/getEngineSource.js';

const DEFAULT_LIMIT = 10;

export default class Iterator
  implements AsyncIterator<NamedNode>, AsyncIterable<NamedNode>
{
  private readonly query: SelectQuery;
  public readonly endpoint: Endpoint;
  private readonly engine: QueryEngine;
  private source: string = ''
  private bindings?: Bindings[];
  private $offset = 0;
  private $index = 0;
  constructor(private readonly stage: Stage) {
    this.query = getSPARQLQuery(stage.configuration.iterator.query, "select");
    this.query.limit = stage.configuration.iterator.batchSize ?? DEFAULT_LIMIT;
    this.endpoint = getEndpoint(stage)
    this.engine = getEngine(this.endpoint)
  }

  private async loadBindings(): Promise<Bindings[]> {
    if (this.source === '') this.source = getEngineSource(this.endpoint)
    this.query.offset = this.$offset;
    const queryString = getSPARQLQueryString(this.query);
    const bindings = await this.engine.queryBindings(queryString, {
      sources: [this.source],
    });
    return bindings.toArray();
  }

  public async next(): Promise<{ value: NamedNode; done: boolean }> {
    if (this.bindings === undefined) this.bindings = await this.loadBindings();
    if (this.$index > this.bindings.length - 1) {
      this.$offset += this.query.limit ?? DEFAULT_LIMIT;
      this.bindings = await this.loadBindings();
      this.$index = 0;
    }
    const done: boolean =
      this.bindings === undefined || this.bindings.length === 0;
    let value: Term;
    if (!done) {
      const $this = this.bindings[this.$index].get("this");
      if ($this === undefined) {
        throw new Error(
          `Missing binding \`$this\` in your SPARQL query in \`${this.stage.configuration.iterator.query}\`.`
        );
      } else if ($this.termType !== "NamedNode") {
        throw new Error(
          `Binding \`$this\` in your SPARQL query in \`${this.stage.configuration.iterator.query}\` should be an Iri (NamedNode), found a ${$this.termType}.`
        );
      }
      value = $this as NamedNode;
    } else {
      value = DataFactory.namedNode("");
    }
    this.$index++;
    return { value, done };
  }

  public [Symbol.asyncIterator](): Iterator {
    return this;
  }
}
