/* eslint-disable @typescript-eslint/method-signature-style */
import type { ConstructQuery, ValuePatternRow } from "sparqljs";
import type Stage from "./Stage.class.js";
import getSPARQLQuery from "../utils/getSPARQLQuery.js";
import type { Quad, NamedNode } from "@rdfjs/types";
import getSPARQLQueryString from "../utils/getSPARQLQueryString.js";
import getEndpoint from "../utils/getEndpoint.js";
import type { Endpoint, QueryEngine } from "./types.js";
import getEngine from '../utils/getEngine.js';
import getEngineSource from '../utils/getEngineSource.js';
import EventEmitter from 'node:events';

const DEFAULT_BATCH_SIZE = 10

declare interface Generator {
  on(event: "data", listener: (statement: Quad) => void): this;
  on(event: "end", listener: (iterations: number, statements: number, processed: number) => void): this;
  on(event: "error", listener: (e: Error) => void): this;

  emit(event: "data", statement: Quad): boolean;
  emit(event: "end", iterations: number, statements: number, processed: number): boolean;
  emit(event: "error", e: Error): boolean;
}
class Generator extends EventEmitter {
  private readonly query: ConstructQuery;
  private readonly engine: QueryEngine;
  private iterationsProcessed: number = 0
  private iterationsIncoming?: number
  private statements: number = 0
  private source: string = ''
  private readonly $thisList: NamedNode[] = []
  private readonly endpoint: Endpoint;
  public constructor(private readonly stage: Stage, private readonly index: number) {
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

    stage.iterator.on('end', count => {
      this.iterationsIncoming = count
        for (const $this of this.$thisList) {
          this.run($this, this.$thisList.length)
      }
    })

  }

  private get batchSize(): number {
    return this.stage.configuration.generator[this.index].batchSize ?? DEFAULT_BATCH_SIZE
  }


  public run($this?: NamedNode, batchSize?: number): void {
    if ($this !== undefined) this.$thisList.push($this)
    const error = (e: any): Error => new Error(`The Generator did not run successfully, it could not get the results from the endpoint ${this.source}: ${(e as Error).message}`)
    if (this.$thisList.length >= (batchSize ?? this.batchSize)) {
      if (this.source === '') this.source = getEngineSource(this.endpoint)
      const unionQuery = getSPARQLQuery(getSPARQLQueryString(this.query), "construct");
      const patterns = unionQuery.where ?? [];
      const valuePatterns: ValuePatternRow[] = []
      for (const $this of this.$thisList) {
        this.iterationsProcessed++
        valuePatterns.push({'?this': $this})
      }
      patterns.push({ type: 'values', values: valuePatterns });
      unionQuery.where = [{ type: 'group', patterns }]

      this.engine.queryQuads(getSPARQLQueryString(unionQuery), {
        sources: [this.source]
      }).then(stream => {
        stream.on('data', (quad: Quad) => {
          this.statements++
          this.emit('data', quad)
        })
        stream.on('error', (e) => {
          this.emit("error", error(e))
        })
        stream.on('end', () => {
          if (this.iterationsIncoming !== undefined && this.iterationsProcessed >= this.iterationsIncoming) {
            this.emit('end', this.iterationsIncoming, this.statements, this.iterationsProcessed)
          }
        })
      }).catch(e => {
        this.emit("error", error(e))
      })
      this.$thisList.length = 0
    }
  }
}


export default Generator