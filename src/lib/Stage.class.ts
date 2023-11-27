import EventEmitter from 'node:events';
import * as readline from 'node:readline'
import { isFilePathString } from '../utils/guards.js';
import File from './File.class.js';
import { type LDWorkbenchConfiguration } from './LDWorkbenchConfiguration.js';
import Iterator from './Iterator.class.js';
import Generator from './Generator.class.js';
import kebabcase from 'lodash.kebabcase'
import type Pipeline from './Pipeline.class.js';
import path from 'node:path';
import { Writer } from 'n3'
import type { Quad } from '@rdfjs/types'
import type { WriteStream } from 'node:fs';

declare interface Stage {
  on: ((event: 'progress', listener: (name: string) => void) => this) & ((event: string, listener: (message: string) => void) => this);
}

class Stage extends EventEmitter {
  public endpoint: File | URL
  public destination: WriteStream
  public iterator: Iterator
  public generator: Generator

  public constructor(
    pipeline: Pipeline,
    private readonly stageConfiguration: LDWorkbenchConfiguration['stages'][0]
  ) {
    super()
    if (isFilePathString(stageConfiguration.endpoint)) {
      this.endpoint = new File(stageConfiguration.endpoint)
    } else if(stageConfiguration.endpoint !== undefined) {
      this.endpoint = new URL(stageConfiguration.endpoint)
    } else {
      throw new Error('An endpoint is required, although we might change this to use the intermit result from the previous stage')
    }

    try {
      this.iterator = new Iterator(this)
    } catch(e) {
      throw new Error(`Error in the iterator of stage \`${stageConfiguration.name}\`: ${(e as Error).message}`)
    }

    try {
      this.generator = new Generator(this)
    } catch(e) {
      throw new Error(`Error in the generator of stage \`${stageConfiguration.name}\`: ${(e as Error).message}`)
    }
    this.destination = new File(path.join(pipeline.dataDir, kebabcase(stageConfiguration.name) + '.nt')).create()

  }

  public get configuration(): LDWorkbenchConfiguration['stages'][0] {
    return this.stageConfiguration
  }

  public async run(): Promise<number> {
    process.stdout.write('\n   fetching results from the iterator ...')
    let i = 0
    let quadCount = 0
    for await (const $this of this.iterator) {
      let qc = 0
      const quadStream = await this.generator.loadStatements($this)
      const writer = new Writer({ format: 'N-Triples' })
      quadStream.on('data', (quad: Quad) => {
        quadCount++
        qc++
        writer.addQuad(quad)
      })

      quadStream.on('end', () => {
        writer.end((error, result) => {
        readline.clearLine(process.stdout, 0)
        readline.cursorTo(process.stdout, 0)
        process.stdout.write(`   - [${++i}] ${$this.value}: ${qc} statement${qc===1?'':'s'}`)
        if (error !== null) {
          throw error
        }
        this.destination.write(result)
      });
      })
    }
    readline.clearLine(process.stdout, 0)
    readline.cursorTo(process.stdout, 0)
    readline.moveCursor(process.stdout, 0, -1) // up one line
    readline.clearLine(process.stdout, 1) // from cursor to end
    return quadCount
  }

}

export default Stage