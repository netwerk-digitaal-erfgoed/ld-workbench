import Generator from "../Generator.class.js";
import { EventEmitter } from 'events';
import Stage from "../Stage.class.js";
import Pipeline from "../Pipeline.class.js";
import * as chai from 'chai'
import * as fs from "fs"
import chaiAsPromised from 'chai-as-promised'
import { NamedNode } from "n3";
import type { LDWorkbenchConfiguration } from "../LDWorkbenchConfiguration.js";
chai.use(chaiAsPromised)
const expect = chai.expect

describe('Generator Class', () => {
    describe('constructor', () => {
        it('should set query, engine, endpoint, and source properties correctly', () => {
            const configuration: LDWorkbenchConfiguration = {
                name: 'Example Pipeline',
                description: 'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
                destination: 'file://pipelines/data/example-pipeline.nt',
                stages: [
                  {
                    name: 'Stage 1',
                    iterator: {
                      query: 'file://static/example/iterator-stage-1.rq',
                      endpoint: 'https://api.triplydb.com/datasets/Triply/iris/services/demo-service/sparql'
                    },
                    generator:
                      [{
                        query: 'file://static/example/generator-stage-1-1.rq'}]
                  },
                  {
                    name: 'Stage 2',
                    iterator: {
                      query: 'file://static/example/iterator-stage-2.rq'
                    },
                    generator:
                      [{
                        query: 'file://static/example/generator-stage-2.rq',
                        endpoint: 'https://query.wikidata.org/sparql'
                      }]
                  }
                ]
              }
            const pipeline = new Pipeline(configuration, {silent: true})
            const stageConfig = configuration.stages[0]
            const stage = new Stage(pipeline, stageConfig, )
            const generator = new Generator(stage, 0)
            expect(generator).to.be.an.instanceOf(Generator);
            expect(generator).to.be.an.instanceOf(EventEmitter);
            expect(generator).to.have.property('query');
            expect(generator).to.have.property('engine');
            expect(generator).to.have.property('endpoint');
            expect(generator).to.have.property('source');
        });
    });
    // BUG when both the generator and iterator tests are running, it seems the iterator will never terminate
    describe.skip('run', () => {
        it('Should work with multiple generators for one pipeline', async function (){
            this.timeout(5000)

            const config: LDWorkbenchConfiguration = {
                name: 'Example Pipeline',
                description: 'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
                destination: 'file://pipelines/data/example-pipeline.nt',
                stages: [
                  {
                    name: 'Stage 1',
                    iterator: {
                      query: 'file://static/example/iterator-stage-1.rq',
                      endpoint: 'https://api.triplydb.com/datasets/Triply/iris/services/demo-service/sparql'
                    },
                    generator:
                      [{
                        query: 'file://static/example/generator-stage-1-1.rq'},{
                        query: 'file://static/example/generator-stage-1-2.rq'
                      }]
                  },
                  {
                    name: 'Stage 2',
                    iterator: {
                      query: 'file://static/example/iterator-stage-2.rq'
                    },
                    generator:
                      [{
                        query: 'file://static/example/generator-stage-2.rq',
                        endpoint: 'https://query.wikidata.org/sparql'
                      }]
                  }
                ]
              }

              const pipelineParallelGenerators = new Pipeline(config, {silent: true})
              await pipelineParallelGenerators.run().then(() => {
                expect(fs.existsSync("pipelines/data/example-pipeline.nt")).to.equal(true)
                const file = fs.readFileSync("pipelines/data/example-pipeline.nt", 'utf-8')
                const lines = file.split('\n')
                // @mightymax it seems the file isn't always the same size -> same bug related to File class?
                expect(lines.length).to.equal(741)
              }).catch( e => { throw e } )

        })
        it.skip('should emit "data" and "end" events with the correct number of statements', async () => {
            const configuration: LDWorkbenchConfiguration = {
                name: 'Example Pipeline',
                description: 'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
                destination: 'file://pipelines/data/example-pipeline.nt',
                stages: [
                  {
                    name: 'Stage 1',
                    iterator: {
                      query: 'file://static/example/iterator-stage-1.rq',
                      endpoint: 'https://api.triplydb.com/datasets/Triply/iris/services/demo-service/sparql'
                    },
                    generator:
                      [{
                        query: 'file://static/example/generator-stage-1-1.rq'}]
                  },
                  {
                    name: 'Stage 2',
                    iterator: {
                      query: 'file://static/example/iterator-stage-2.rq'
                    },
                    generator:
                      [{
                        query: 'file://static/example/generator-stage-2.rq',
                        endpoint: 'https://query.wikidata.org/sparql'
                      }]
                  }
                ]
              }
            const pipeline = new Pipeline(configuration, {silent: true})
            const stageConfig = configuration.stages[0]
            const stage = new Stage(pipeline, stageConfig)
            const generator = new Generator(stage, 0);
            const emittedEvents: any[] = [];

            const testNamedNode = new NamedNode('https://triplydb.com/triply/iris/id/floweringPlant/00106');

            async function runGeneratorWithPromise(): Promise<boolean> {
                return new Promise((resolve, reject) => {
                    generator.addListener('data', (quad) => {
                        emittedEvents.push({ event: 'data', quad });
                    });
                    generator.addListener('end', (numResults) => {
                        emittedEvents.push({ event: 'end', numResults });
                        resolve(true);
                    });
                    generator.addListener('error', (error) => {
                        reject(error);
                    });
                    generator.run(testNamedNode);
                });
            }

            await runGeneratorWithPromise()
            expect(emittedEvents).to.have.lengthOf(4);
            expect(emittedEvents[0].event).to.equal('data');
            expect(emittedEvents[0].quad._subject.id).to.equal('https://triplydb.com/triply/iris/id/floweringPlant/00106')
            expect(emittedEvents[0].quad._predicate.id).to.equal('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
            expect(emittedEvents[0].quad._object.id).to.equal('https://schema.org/Thing')
            expect(emittedEvents[emittedEvents.length - 1].event).to.equal('end');
            expect(emittedEvents[emittedEvents.length - 1].numResults).to.equal(3);
        });
    });
});
