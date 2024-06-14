import File from '../file.js';
import {Configuration} from '../configuration.js';
import Stage, {PreviousStage} from '../stage.js';
import type {Endpoint} from '../types.js';
import {isFilePathString} from './guards.js';

export default function getEndpoint(stage: Stage, type?: 'iterator'): Endpoint;
export default function getEndpoint(
  stage: Stage,
  type: 'generator',
  index: number
): Endpoint;
export default function getEndpoint(
  stage: Stage,
  type: 'iterator' | 'generator' = 'iterator',
  index?: number
): Endpoint {
  const t: keyof Configuration['stages'][number] = type;
  const endpoint =
    t === 'generator'
      ? stage.configuration[t]?.[index!]?.endpoint
      : stage.configuration[t]?.endpoint;
  if (isFilePathString(endpoint)) {
    return new File(endpoint);
  } else if (endpoint !== undefined) {
    try {
      return new URL(endpoint);
    } catch (e) {
      throw new Error(`"${endpoint as string}" is not a valid URL`);
    }
  } else {
    const stagesSoFar = Array.from(stage.pipeline.stages.keys());
    if (stagesSoFar.length === 0) {
      throw new Error(
        `no destination defined for the ${type} and no previous stage to use that result`
      );
    } else {
      return new PreviousStage(stage, stagesSoFar.pop()!);
    }
  }
}
