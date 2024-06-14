import type File from './file.js';
import {type QueryEngine as QueryEngineSparql} from '@comunica/query-sparql';
import {type QueryEngine as QueryEngineFile} from '@comunica/query-sparql-file';
import {PreviousStage} from './stage.js';

export type Endpoint = File | URL | PreviousStage;
export type QueryEngine = QueryEngineSparql | QueryEngineFile;
export type QuerySource = {type?: string; value: string};
