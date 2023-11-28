import type { ConstructQuery } from "sparqljs";
import type Stage from "./Stage.class.js";
import getSPARQLQuery from "../utils/getSPARQLQuery.js";
import type { Quad, NamedNode, ResultStream } from "@rdfjs/types";
import getSPARQLQueryString from "../utils/getSPARQLQueryString.js";
import getEndpoint from "../utils/getEndpoint.js";
import type { Endpoint, QueryEngine } from "./types.js";
import getEngine from '../utils/getEngine.js';
import getEngineSource from '../utils/getEngineSource.js';

export default class Generator {
  private readonly query: ConstructQuery;
  private readonly engine: QueryEngine;
  private source: string = ''
  private readonly endpoint: Endpoint;
  public constructor(stage: Stage) {
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

  public async loadStatements($this: NamedNode): Promise<ResultStream<Quad>> {
    // const values = this.query.values ?? []
    // values.push({$this})
    // this.query.values = values
    const queryString = getSPARQLQueryString(this.query)
      .replaceAll(
      /[?$]\bthis\b/g,
      `<${$this.value}>`
    );
    console.log(queryString)
    if (this.source === '') this.source = getEngineSource(this.endpoint)
    return this.engine.queryQuads(queryString, {
      sources: [this.source]
    });
  }
}
