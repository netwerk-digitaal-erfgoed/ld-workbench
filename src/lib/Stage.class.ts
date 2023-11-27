/* eslint-disable @typescript-eslint/adjacent-overload-signatures */
/* eslint-disable @typescript-eslint/method-signature-style */
import EventEmitter from 'node:events';
import File from './File.class.js';
import { type LDWorkbenchConfiguration } from './LDWorkbenchConfiguration.js';
import Iterator from './Iterator.class.js';
import Generator from './Generator.class.js';
import kebabcase from 'lodash.kebabcase'
import type Pipeline from './Pipeline.class.js';
import path from 'node:path';
import { Writer } from 'n3'
import type { Quad, NamedNode } from '@rdfjs/types'
import type { WriteStream } from 'node:fs';
declare interface Stage {
  on(event: "generatorResult", listener: () => void): this;
  off(event: "generatorResult", listener: () => void): this;
  emit(event: "generatorResult"): boolean;

  on(event: "iteratorResultFinished", listener: (statements: number) => void): this;
  off(event: "iteratorResultFinished", listener: (statements: number) => void): this;
  emit(event: "iteratorResultFinished", statements: number): boolean;

  on(event: "finished", listener: (statements: number) => void): this;
  off(event: "finished", listener: (statements: number) => void): this;
  emit(event: "finished", statements: number): boolean;

  on(event: "iteratorResult", listener: ($this: NamedNode) => void): this;
  off(event: "iteratorResult", listener: ($this: NamedNode) => void): this;
  emit(event: "iteratorResult", $this: NamedNode): boolean;

}

class Stage extends EventEmitter {
  public destination: WriteStream
  public iterator: Iterator
  public generator: Generator

  public constructor(
    pipeline: Pipeline,
    private readonly stageConfiguration: LDWorkbenchConfiguration['stages'][0]
  ) {
    super()
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

  public async run(): Promise<void> {
    let quadCount = 0
    for await (const $this of this.iterator) {
      let qc = 0
      this.emit('iteratorResult', $this)
      const quadStream = await this.generator.loadStatements($this)
      const writer = new Writer({ format: 'N-Triples' })
      quadStream.on('data', (quad: Quad) => {
        this.emit('generatorResult')
        quadCount++
        qc++
        writer.addQuad(quad)
      })

      quadStream.on('end', () => {
        writer.end((error, result) => {
        if (error !== null) {
          throw error
        }
        this.destination.write(result)
        this.emit('iteratorResultFinished', qc)
      });
      })
    }
    this.emit('finished', quadCount)
  }

}

export default Stage