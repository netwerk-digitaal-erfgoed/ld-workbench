/* eslint-disable @typescript-eslint/method-signature-style */
import type { ConstructQuery, FilterPattern, GroupPattern, UnionPattern } from "sparqljs";
import type Stage from "./Stage.class.js";
import getSPARQLQuery from "../utils/getSPARQLQuery.js";
import type { Quad, NamedNode } from "@rdfjs/types";
import getSPARQLQueryString from "../utils/getSPARQLQueryString.js";
import getEndpoint from "../utils/getEndpoint.js";
import type { Endpoint, QueryEngine } from "./types.js";
import getEngine from '../utils/getEngine.js';
import getEngineSource from '../utils/getEngineSource.js';
import EventEmitter from 'node:events';
import { DataFactory } from 'n3';

const DEFAULT_BATCH_SIZE = 10

declare interface Generator {
  on(event: "data", listener: (statement: Quad) => void): this;
  on(event: "end", listener: (iterations: number, statements: number) => void): this;
  on(event: "error", listener: (e: Error) => void): this;

  emit(event: "data", statement: Quad): boolean;
  emit(event: "end", iterations: number, statements: number): boolean;
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
  public constructor(private readonly stage: Stage) {
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

    stage.iterator.on('end', count => {
      this.iterationsIncoming = count
      if (this.$thisList.length > 0) {
        for (const $this of this.$thisList) {
          this.run($this, this.$thisList.length)
        }
      }
    })

  }

  private get batchSize(): number {
    return this.stage.configuration.generator.batchSize ?? DEFAULT_BATCH_SIZE
  }

  private $thisToFilter($this: NamedNode): FilterPattern {
    return {
      type: 'filter',
      expression: {
        type: 'operation',
        operator: '=',
        args: [
          DataFactory.variable('this'),
          $this
        ]
      }
    }
  }

  public run($this?: NamedNode, batchSize?: number): void {
    if ($this !== undefined) this.$thisList.push($this)
    const union: UnionPattern = { type: 'union', patterns: [] }
    const error = (e: any): Error => new Error(`The Generator did not run succesfully, it could not get the results from the endpoint ${this.source}: ${(e as Error).message}`)
    if (this.$thisList.length >= (batchSize ?? this.batchSize)) {
      if (this.source === '') this.source = getEngineSource(this.endpoint)
      const unionQuery = getSPARQLQuery(getSPARQLQueryString(this.query), "construct");
      for (const $this of this.$thisList) {
        this.iterationsProcessed++
        const group: GroupPattern = { type: 'group', patterns: [...unionQuery.where ?? []] }
        group.patterns.push(this.$thisToFilter($this))
        union.patterns.push(group)
      }
      unionQuery.where = [union]

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
            this.emit('end', this.iterationsIncoming, this.statements)
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