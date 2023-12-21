/* eslint-disable @typescript-eslint/method-signature-style */
import type { ConstructQuery } from "sparqljs";
import type Stage from "./Stage.class.js";
import getSPARQLQuery from "../utils/getSPARQLQuery.js";
import type { Quad, NamedNode } from "@rdfjs/types";
import getSPARQLQueryString from "../utils/getSPARQLQueryString.js";
import getEndpoint from "../utils/getEndpoint.js";
import type { Endpoint, QueryEngine } from "./types.js";
import getEngine from '../utils/getEngine.js';
import getEngineSource from '../utils/getEngineSource.js';
import EventEmitter from 'node:events';

declare interface Generator {
  on(event: "data", listener: (statement: Quad) => void): this;
  on(event: "end", listener: (numResults: number) => void): this;
  on(event: "error", listener: (e: Error) => void): this;

  emit(event: "data", statement: Quad): boolean;
  emit(event: "end", numResults: number): boolean;
  emit(event: "error", e: Error): boolean;
}
class Generator extends EventEmitter {
  private readonly query: ConstructQuery;
  private readonly engine: QueryEngine;
  private source: string = ''
  private readonly endpoint: Endpoint;
  private readonly index: number
  public constructor(stage: Stage, index: number) {
    if (stage.configuration.generator === undefined) throw new Error('Error in Generator: no generators were present in stage configuration')
    super()
    this.index = index
    this.query = getSPARQLQuery(
      stage.configuration.generator[this.index].query,
      "construct"
    );
    
    this.endpoint =
      stage.configuration.generator[this.index].endpoint === undefined
        ? stage.iterator.endpoint
        : getEndpoint(stage, "generator", this.index);

    this.engine = getEngine(this.endpoint)
  }

  public run($this: NamedNode): void {
    // Prebinding, see https://www.w3.org/TR/shacl/#pre-binding
    // we know the query is safe to use replacement since we checked it before
    const queryString = getSPARQLQueryString(this.query)
      .replaceAll(
      /[?$]\bthis\b/g,
      `<${$this.value}>`
    );
    const error = (e: any): Error => new Error(`The Generator did not run succesfully, it could not get the results from the endpoint ${this.source}: ${(e as Error).message}`)
    if (this.source === '') this.source = getEngineSource(this.endpoint)
    let numberOfStatements = 0
    this.engine.queryQuads(queryString, {
      sources: [this.source]
    }).then(stream => {
      stream.on('data', (quad: Quad) => {
        numberOfStatements ++
        this.emit('data', quad)
      })
      stream.on('end', () => {
        this.emit('end', numberOfStatements)
      })
      stream.on('error', (e) => {
        this.emit("error", error(e))
      })
    }).catch(e => {
      this.emit("error", error(e))
    })
  }
}

export default Generator