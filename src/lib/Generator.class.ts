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

  emit(event: "data", statement: Quad): boolean;
  emit(event: "end", numResults: number): boolean;
}
class Generator extends EventEmitter {
  private readonly query: ConstructQuery;
  private readonly engine: QueryEngine;
  private source: string = ''
  private readonly endpoint: Endpoint;
  public constructor(stage: Stage) {
    super()
    this.query = getSPARQLQuery(
      stage.configuration.generator.query,
      "construct"
    );
    
    this.endpoint =
      stage.configuration.generator.endpoint === undefined
        ? stage.iterator.endpoint
        : getEndpoint(stage, "generator");

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
    }).catch(e => {
      throw e as Error
    })
  }
}

export default Generator