import {isPreviousStage} from './guards.js';
import {existsSync} from 'fs';
import path from 'path';
import type {Endpoint, QuerySource} from '../types.js';

export default function getEngineSource(endpoint: Endpoint): QuerySource {
  if (isPreviousStage(endpoint)) {
    const previousStage = endpoint.load();
    if (!existsSync(previousStage.destinationPath)) {
      throw new Error(
        `The result from stage "${previousStage.name}" (${previousStage.destinationPath}) is not available, make sure to run that stage first`
      );
    }
    return {
      type: 'file',
      value: path.resolve(previousStage.destinationPath),
    };
  } else if (endpoint instanceof URL) {
    return {
      type: 'sparql',
      value: endpoint.toString(),
    };
  }

  return {
    value: endpoint.toString(),
  };
}
