/* eslint-disable @typescript-eslint/method-signature-style */
import type { ConstructQuery } from "sparqljs";
import type Stage from "./Stage.class.js";
import getSPARQLQuery from "../utils/getSPARQLQuery.js";
import type { Quad, NamedNode } from "@rdfjs/types";
import getEndpoint from "../utils/getEndpoint.js";
import type { Endpoint, QueryEngine } from "./types.js";
import getEngine from '../utils/getEngine.js';
import getEngineSource from '../utils/getEngineSource.js';
import EventEmitter from 'node:events';
import getBatchSPARQLQueryString from "../utils/getBatchSPARQLQueryString.js";
declare interface Generator {
  on(event: "data", listener: (statement: Quad) => void): this;
  on(event: "dataCleanup", listener: (statement: Quad) => void): this;
  on(event: "end", listener: (numResults: number) => void): this;
  on(event: "endCleanup", listener: (numResults: number) => void): this;

  emit(event: "data", statement: Quad): boolean;
  emit(event: "dataCleanup", statement: Quad): boolean;
  emit(event: "end", numResults: number): boolean;
  emit(event: "endCleanup", numResults: number): boolean;
}
class Generator extends EventEmitter {
  private readonly query: ConstructQuery;
  private readonly engine: QueryEngine;
  private readonly batchSize: number | undefined
  public $this: NamedNode[] = []
  private source: string = ''
  private readonly endpoint: Endpoint;
  private numberOfStatements: number = 0
  private generateQuads(generator: Generator, queryString: string, onEvent:'data'|'dataCleanup',endEmit: 'end' | 'endCleanup'): void {
    const emitType: any = endEmit;
    const onType: any = onEvent;

    generator.engine.queryQuads(queryString, {
      sources: [generator.source],
    }).then((stream) => {
      stream.on('data', (quad: Quad) => {
        this.numberOfStatements++;
        generator.emit(onType, quad);
      });
  

      stream.on('end', () => {
        generator.emit(emitType, this.numberOfStatements);
      });
    }).catch(_ => {
      throw new Error(`The Generator did not run successfully, it could not get the results from the endpoint ${generator.source}`);
    });
  }
  
  
  public constructor(stage: Stage) {
    super()
    this.batchSize = stage.configuration.generator.batchSize
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
    if (this.source === '') this.source = getEngineSource(this.endpoint)
    // batch processing of queries
    this.$this.push($this)
    // when batchSize is undefined -> treat it as batchSize is one 
    if ((this.$this.length === this.batchSize) || this.batchSize === undefined) {
      // getting batch SPARQL query string 
      const queryString = getBatchSPARQLQueryString(this.query, this.$this)
      // Clearing batch Named Node targets array when it is the size of the batchSize
      this.$this = []

      this.generateQuads(this, queryString, "data", "end")
    }
  }

  // clean up function, in case batch processing is used and there are leftovers in batchArrayOfNamedNodes
  public end(): void {
    if(this.$this?.length !== 0){
      const queryString = getBatchSPARQLQueryString(this.query, this.$this)
      // Clearing batch Named Node targets array when it is the size of the batchSize
      this.$this = []

      this.generateQuads(this, queryString, "dataCleanup", "endCleanup")
    }
    else{
      this.emit("endCleanup", this.numberOfStatements)
    }
  }
}

export default Generator