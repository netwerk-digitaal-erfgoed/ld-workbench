import { isPreviousStage } from '../utils/guards.js';
import type Stage from './Stage.class.js';

export default class PreviousStage {
  public readonly $id = 'PreviousStage'
  public constructor (
    public readonly nextStage: Stage,
    public readonly name: string
  ) {}

  public load(): Stage {
    if (!this.nextStage.pipeline.stages.has(this.name)) {
      throw new Error(`This is unexpected: missing stage "${this.name}" in stages.`)
    }
    const previousStage = this.nextStage.pipeline.getPreviousStage(this.nextStage)
    if (previousStage === undefined) {
      throw new Error('no endpoint was defined, but there is also no previous stage to use')
    }
    return previousStage
  }

  public static is(value: any): value is PreviousStage {
    return isPreviousStage(value)
  }
 }