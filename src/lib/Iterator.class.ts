/* eslint-disable @typescript-eslint/method-signature-style */
import EventEmitter from "node:events";
import type { SelectQuery } from "sparqljs";
import type Stage from "./Stage.class.js";
import type { NamedNode } from "@rdfjs/types";
import getSPARQLQuery from "../utils/getSPARQLQuery.js";
import { type Bindings } from "@comunica/types";
import getSPARQLQueryString from "../utils/getSPARQLQueryString.js";
import getEndpoint from "../utils/getEndpoint.js";
import type { Endpoint, QueryEngine } from "./types.js";
import getEngine from "../utils/getEngine.js";
import getEngineSource from "../utils/getEngineSource.js";

const DEFAULT_LIMIT = 10;
declare interface Iterator {
  on(event: "data", listener: ($this: NamedNode) => void): this;
  on(event: "end", listener: (numResults: number) => void): this;
  on(event: "error", listener: (e: Error) => void): this;

  emit(event: "data", $this: NamedNode): boolean;
  emit(event: "end", numResults: number): boolean;
  emit(event: "error", e: Error): boolean;
}

class Iterator extends EventEmitter {
  private readonly query: SelectQuery;
  public readonly endpoint: Endpoint;
  private readonly engine: QueryEngine;
  private source: string = "";
  private $offset = 0;
  private totalResults = 0;

  constructor(stage: Stage) {
    super();
    this.query = getSPARQLQuery(stage.configuration.iterator.query, "select");
    this.query.limit =
      this.query.limit ??
      stage.configuration.iterator.batchSize ??
      DEFAULT_LIMIT;
    this.endpoint = getEndpoint(stage);
    this.engine = getEngine(this.endpoint);
  }

  public run(): void {
    let resultsPerPage = 0;
    if (this.source === "") this.source = getEngineSource(this.endpoint);
    this.query.offset = this.$offset;
    const queryString = getSPARQLQueryString(this.query);
    const error = (e: any): Error => new Error(
      `The Iterator did not run succesfully, it could not get the results from the endpoint ${this.source} (offset: ${this.$offset}, limit ${this.query.limit}): ${(e as Error).message}`
    )
    this.engine
      .queryBindings(queryString, {
        sources: [this.source],
      })
      .then((stream) => {
        stream.on("data", (binding: Bindings) => {
          resultsPerPage++;
          if (!binding.has("this"))
            throw new Error("Missing binding $this in the Iterator result.");
          const $this = binding.get("this")!;
          if ($this.termType !== "NamedNode") {
            throw new Error(
              `Binding $this in the Iterator result must be an Iri/NamedNode, but it is of type ${$this.termType}.`
            );
          } else {
            this.emit("data", $this);
          }
        });

        stream.on("end", () => {
          this.totalResults += resultsPerPage;
          this.$offset += this.query.limit!;
          if (resultsPerPage < this.query.limit!) {
            this.emit("end", this.totalResults);
          } else {
            this.run();
          }
        });

        stream.on('error', (e) => {
          this.emit("error", error(e))
        })
      })
      .catch((e) => {
        this.emit("error", error(e))
      });
  }
}

export default Iterator;
