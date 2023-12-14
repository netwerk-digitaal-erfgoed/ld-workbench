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
import type { NamedNode } from '@rdfjs/types'
import type { WriteStream } from 'node:fs';
declare interface Stage {
  on(event: "generatorResult", listener: (count: number) => void): this;
  on(event: "end", listener: (iteratorCount: number, statements: number) => void): this;
  on(event: "iteratorResult", listener: ($this: NamedNode) => void): this;

  emit(event: "generatorResult", count: number): boolean;
  emit(event: "end", iteratorCount: number, statements: number): boolean;
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
    } catch (e) {
      throw new Error(`Error in the iterator of stage \`${configuration.name}\`: ${(e as Error).message}`)
    }

    try {
      this.generator = new Generator(this)
    } catch (e) {
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

  public run(): void {
    let quadCount = 0
    let iteratorCount = 0
    let generatorCount = 0
    const writer = new Writer(this.destination(), { end: false, format: 'N-Triples' })
    this.generator.on('data', quad => {
      writer.addQuad(quad)
      quadCount++
      this.emit('generatorResult', quadCount)
    })
    this.generator.on('end', _ => {
      generatorCount++
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const numberOfLeftoverNamedNodes = this.generator["batchArrayOfNamedNodes"]!.length
      console.log('🪵  | file: Stage.class.ts:70 | Stage | run | numberOfLeftoverNamedNodes:', numberOfLeftoverNamedNodes)
      const batchGeneratorCount = generatorCount * this.configuration.generator.batchSize!  + numberOfLeftoverNamedNodes
      console.log('🪵  | file: Stage.class.ts:71 | Stage | run | generatorCount:', generatorCount)
      console.log('🪵  | file: Stage.class.ts:71 | Stage | run | this.configuration.generator.batchSize!:', this.configuration.generator.batchSize!)
      console.log('🪵  | file: Stage.class.ts:69 | Stage | run | batchGeneratorCount:', batchGeneratorCount)
      console.log('🪵  | file: Stage.class.ts:77 | Stage | run | iteratorCount:', iteratorCount)
      if (generatorCount === iteratorCount) {
        console.log('🪵  | file: Stage.class.ts:70 | Stage | run | quadCount:', quadCount)
        this.emit('end', iteratorCount, quadCount)
      }
      // with batchsize, the number of the generatorCount is the number of batchSize times smaller + the leftover elements that did not fit into the batch
      else if ((this.configuration.generator.batchSize !== undefined) && (batchGeneratorCount === iteratorCount)) {
        if (numberOfLeftoverNamedNodes !== 0){
          // clean up generator and process quads
          this.generator.end()        
          this.generator.on('data', quad => {
            writer.addQuad(quad)
            quadCount++
            this.emit('generatorResult', quadCount)
          })
          this.generator.on('end', _ => {
            console.log('🪵  | file: Stage.class.ts:83 | Stage | run | quadCount:', quadCount)
            this.emit('end', iteratorCount, quadCount)
          })
        }else{
          console.log('🪵  | file: Stage.class.ts:83 | Stage | run | quadCount:', quadCount)
          this.emit('end', iteratorCount, quadCount)
        }
      }
    })
    this.iterator.on('data', $this => {
      this.generator.run($this)
      this.emit('iteratorResult', $this)
    })
    this.iterator.on('end', count => {
        iteratorCount = count
    })
    this.iterator.run()
  }

}

export default Stage