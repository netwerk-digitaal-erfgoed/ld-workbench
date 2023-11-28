import type File from './File.class.js'
import type PreviousStage from './PreviousStage.class.js'
import { type QueryEngine as QueryEngineSparql } from "@comunica/query-sparql";
import { type QueryEngine as QueryEngineFile } from '@comunica/query-sparql-file';

export type Endpoint = File | URL | PreviousStage
export type QueryEngine = QueryEngineSparql | QueryEngineFile