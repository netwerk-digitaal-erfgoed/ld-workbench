import EventEmitter from 'node:events';
import type { ConstructQuery, SelectQuery } from 'sparqljs';
import { isFilePathString } from '../utils/guards.js';
import File from './File.js';
import { type LDWorkbenchConfiguration } from './LDWorkbenchConfiguration.js';
import getSPARQLQuery from '../utils/getSPARQLQuery.js';

declare interface Stage {
  on: ((event: 'progress', listener: (name: string) => void) => this) & ((event: string, listener: (message: string) => void) => this);
}

class Stage extends EventEmitter {
  public endpoint: File | URL
  public destination: File | URL
  public iterator: SelectQuery
  public generator: ConstructQuery

  public constructor(stageConfiguration: LDWorkbenchConfiguration['stages'][0]) {
    super()
    if (isFilePathString(stageConfiguration.endpoint)) {
      this.endpoint = new File(stageConfiguration.endpoint)
    } else if(stageConfiguration.endpoint !== undefined) {
      this.endpoint = new URL(stageConfiguration.endpoint)
    } else {
      this.endpoint = new URL('file://tmp/foo')
    }
    try {
      this.iterator = getSPARQLQuery(stageConfiguration.iterator, 'select')
    } catch(e) {
      throw new Error(`Error in the iterator of stage \`${stageConfiguration.name}\`: ${(e as Error).message}`)
    }

    try {
      this.generator = getSPARQLQuery(stageConfiguration.generator, 'construct')
    } catch(e) {
      throw new Error(`Error in the generator of stage \`${stageConfiguration.name}\`: ${(e as Error).message}`)
    }
    // @TODO
    this.destination = new URL('file://tmp/destination')
  }

  public run(): void {
    for (let i = 0; i < 10; i++) {
      this.emit('progress', `making progress ${i}`)
    }
  }

}

export default Stage