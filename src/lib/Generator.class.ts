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
import getBatchSPARQLQueryString from "../utils/getBatchSPARQLQueryString.js";
declare interface Generator {
  on(event: "data", listener: (statement: Quad) => void): this;
  on(event: "end", listener: (numResults: number) => void): this;

  emit(event: "data", statement: Quad): boolean;
  emit(event: "end", numResults: number): boolean;
}
class Generator extends EventEmitter {
  private readonly query: ConstructQuery;
  private readonly engine: QueryEngine;
  private readonly batchSize: number | undefined
  private batchArrayOfNamedNodes: NamedNode[] | undefined
  private source: string = ''
  private readonly endpoint: Endpoint;
  public constructor(stage: Stage) {
    super()
    this.query = getSPARQLQuery(
      stage.configuration.generator.query,
      "construct"
    );

    if (stage.configuration.generator.batchSize !== undefined) {
      this.batchArrayOfNamedNodes = []
      this.batchSize = stage.configuration.generator.batchSize
    } else {
      this.batchArrayOfNamedNodes = undefined
      this.batchSize = undefined
    }

    this.endpoint =
      stage.configuration.generator.endpoint === undefined
        ? stage.iterator.endpoint
        : getEndpoint(stage, "generator");

    this.engine = getEngine(this.endpoint)
  }

  // clean up function, in case batch processing is used and there are leftovers in batchArrayOfNamedNodes
  public end(): void {
    let numberOfStatements = 0
    if((this.batchArrayOfNamedNodes !== undefined) && (this.batchArrayOfNamedNodes?.length > 0)){
      console.log('TEST - leftovers!')
      const queryString = getBatchSPARQLQueryString(this.query, this.batchArrayOfNamedNodes)
      // Clearing batch Named Node targets array when it is the size of the batchSize
      this.batchArrayOfNamedNodes = []

      // TODO turn this into a function
      this.engine.queryQuads(queryString, {
        sources: [this.source]
      }).then(stream => {
        stream.on('data', (quad: Quad) => {
          numberOfStatements++
          this.emit('data', quad)
        })
        stream.on('end', () => {
          this.emit('end', numberOfStatements)
        })
      }).catch(_ => {
        throw new Error(`The Generator did not run successfully, it could not get the results from the endpoint ${this.source}`)
      })

    }

  }

  public run($this: NamedNode): void {
    let numberOfStatements = 0
    if (this.source === '') this.source = getEngineSource(this.endpoint)

    if (this.batchArrayOfNamedNodes !== undefined) {
      // batch processing of queries
      this.batchArrayOfNamedNodes.push($this)
      if (this.batchArrayOfNamedNodes.length === this.batchSize) {
        // getting batch SPARQL query string 
        const queryString = getBatchSPARQLQueryString(this.query, this.batchArrayOfNamedNodes)

        // Clearing batch Named Node targets array when it is the size of the batchSize
        this.batchArrayOfNamedNodes = []

        // TODO turn this into a function
        this.engine.queryQuads(queryString, {
          sources: [this.source]
        }).then(stream => {
          stream.on('data', (quad: Quad) => {
            console.log('🪵  | file: Generator.class.ts:103 | Generator | stream.on | quad:', quad)
            numberOfStatements++
            this.emit('data', quad)
          })
          stream.on('end', () => {
            this.emit('end', numberOfStatements)
          })
        }).catch(_ => {
          throw new Error(`The Generator did not run successfully, it could not get the results from the endpoint ${this.source}`)
        })
      }
    } else {
      // Prebinding, see https://www.w3.org/TR/shacl/#pre-binding
      // we know the query is safe to use replacement since we checked it before
      const queryString = getSPARQLQueryString(this.query)
        .replaceAll(
          /[?$]\bthis\b/g,
          `<${$this.value}>`
        );
      // TODO turn this into a function
      this.engine.queryQuads(queryString, {
        sources: [this.source]
      }).then(stream => {
        stream.on('data', (quad: Quad) => {
          numberOfStatements++
          this.emit('data', quad)
        })
        stream.on('end', () => {
          this.emit('end', numberOfStatements)
        })
      }).catch(_ => {
        throw new Error(`The Generator did not run successfully, it could not get the results from the endpoint ${this.source}`)
      })
    }
  }
}

export default Generator