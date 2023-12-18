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
  on(event: "error", listener: (e: Error) => void): this;

  emit(event: "generatorResult", count: number): boolean;
  emit(event: "end", iteratorCount: number, statements: number): boolean;
  emit(event: "iteratorResult", $this: NamedNode): boolean;
  emit(event: "error", e: Error): boolean;
}

class Stage extends EventEmitter {
  public destination: () => WriteStream
  public generators: Generator[] = []
  public iterator: Iterator
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

    // Handle both single generator and array of generators
   if (this.configuration.generators !== undefined && this.configuration.generators?.length > 0){
    for  (const generatorConfig of this.configuration.generators){
      try {
        this.generators.push(new Generator({...this, generator: generatorConfig}))
      } catch(e) {
        throw new Error(`Error in the generator of stage \`${configuration.name}\`: ${(e as Error).message}`)
      }
    }}
    else if (this.configuration.generator !== undefined){
      this.generators.push(new Generator(this))
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

    this.generators.forEach(generator => {
      generator.on('data', quad => {
        writer.addQuad(quad)
        quadCount ++
        this.emit('generatorResult', quadCount)
      })
      generator.on('end', _ => {
        generatorCount++
        if (generatorCount === iteratorCount) {
          this.emit('end', iteratorCount, quadCount)
        }
      })
    });

    this.iterator.on('data', $this => {
      this.generators.forEach(generator => {
        generator.run($this);
      });
      this.emit('iteratorResult', $this)
    });

    this.iterator.on('end', count => {
      iteratorCount = count
    })
    this.iterator.on('error', e => {
      this.emit('error', e)
    })
    this.iterator.run()
  }
}

export default Stage;
