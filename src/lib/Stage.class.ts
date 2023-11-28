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

  on(event: "generatorResultFinished", listener: (statements: number) => void): this;
  off(event: "generatorResultFinished", listener: (statements: number) => void): this;
  emit(event: "generatorResultFinished", statements: number): boolean;

  on(event: "finished", listener: (statements: number) => void): this;
  off(event: "finished", listener: (statements: number) => void): this;
  emit(event: "finished", statements: number): boolean;

  on(event: "iteratorResult", listener: ($this: NamedNode) => void): this;
  off(event: "iteratorResult", listener: ($this: NamedNode) => void): this;
  emit(event: "iteratorResult", $this: NamedNode): boolean;

}

class Stage extends EventEmitter {
  public destination: () => WriteStream
  public iterator: Iterator
  public generator: Generator

  public constructor(
    public readonly pipeline: Pipeline,
    public readonly configuration: LDWorkbenchConfiguration['stages'][0]
  ) {
    super()
    try {
      this.iterator = new Iterator(this)
    } catch(e) {
      throw new Error(`Error in the iterator of stage \`${configuration.name}\`: ${(e as Error).message}`)
    }

    try {
      this.generator = new Generator(this)
    } catch(e) {
      throw new Error(`Error in the generator of stage \`${configuration.name}\`: ${(e as Error).message}`)
    }
    this.destination = () => new File(this.destinationPath).getStream()
  }

  public get destinationPath(): string {
    return path.join(this.pipeline.dataDir, kebabcase(this.configuration.name) + '.nt')
  }

  public get name(): string {
    return this.configuration.name
  }

  public async run(): Promise<number> {
    let quadCount = 0
    const writeStream = this.destination()
    for await (const $this of this.iterator) {
      let qc = 0
      this.emit('iteratorResult', $this)
      const quadStream = await this.generator.loadStatements($this)
      const writer = new Writer(writeStream, { end: false, format: 'N-Triples' })
      quadStream.on('data', (quad: Quad) => {
        this.emit('generatorResult')
        quadCount++
        qc++
        writer.addQuad(quad)
      })

      quadStream.on('end', () => {
        this.emit('generatorResultFinished', qc)
      })
    }
    this.emit('finished', quadCount)
    return quadCount
  }

}

export default Stage