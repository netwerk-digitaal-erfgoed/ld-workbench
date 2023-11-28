import { QueryEngine as QueryEngineSparql } from "@comunica/query-sparql";
import { QueryEngine as QueryEngineFile } from "@comunica/query-sparql-file";
import type { Endpoint } from "../lib/types.js";

export default function getEngine(endpoint: Endpoint): QueryEngineFile | QueryEngineSparql {
  let engine: QueryEngineFile | QueryEngineSparql;
  if (endpoint instanceof URL) {
    engine = new QueryEngineSparql();
  } else {
    engine = new QueryEngineFile();
  }
  return engine
}
