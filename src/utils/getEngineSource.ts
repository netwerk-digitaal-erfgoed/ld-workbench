import { isPreviousStage } from './guards.js';
import { existsSync } from 'fs';
import path from 'path';
import type { Endpoint } from '../lib/types.js';

export default function getEngineSource(endpoint: Endpoint): string {
  let source: string;
  if (isPreviousStage(endpoint)) {
    const previousStage = endpoint.load();
    if (!existsSync(previousStage.destinationPath)) {
      throw new Error(
        `The result from stage "${previousStage.name}" (${previousStage.destinationPath}) is not available, make sure to run that stage first`
      );
    }
    source = path.resolve(previousStage.destinationPath);
  } else {
    source = endpoint.toString();
  }
  return source
}
