import Generator from "../Generator.class.js";
import { EventEmitter } from 'events';
import Stage from "../Stage.class.js";
import Pipeline from "../Pipeline.class.js";
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { NamedNode, Store } from "n3";
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
                            endpoint: 'file://static/tests/iris.nt'
                        },
                        generator: {
                            query: 'file://static/example/generator-stage-1.rq'
                        }
                    },
                    {
                        name: 'Stage 2',
                        iterator: {
                            query: 'file://static/example/iterator-stage-2.rq',
                        },
                        generator: {
                            query: 'file://static/example/generator-stage-2.rq',
                            endpoint: 'file://static/tests/wikidata.nt'
                        }
                    }
                ]
            }
            const pipeline = new Pipeline(configuration, {silent: true})
            const stageConfig = configuration.stages[0]
            const stage = new Stage(pipeline, stageConfig)
            const generator = new Generator(stage)
            expect(generator).to.be.an.instanceOf(Generator);
            expect(generator).to.be.an.instanceOf(EventEmitter);
            expect(generator).to.have.property('query');
            expect(generator).to.have.property('engine');
            expect(generator).to.have.property('endpoint');
            expect(generator).to.have.property('source');
        });
    });
    // BUG when both the generator and iterator tests are running, it seems the iterator will never terminate
    describe('run', () => {
        it('Should work in batchSize for pipeline\'s generator - test with store', async function () {
            // when using local test files timeout should be removed
            this.timeout(50000)
            const N3Store = new Store()
            const filePath = 'pipelines/data/example-pipelineBatch.nt';


            const batchConfiguration: LDWorkbenchConfiguration = {
                name: 'Example Pipeline Batch',
                description: 'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
                destination: "file://" + filePath,
                stages: [
                    {
                        name: 'Stage 1',
                        iterator: {
                            query: 'file://static/example/iterator-stage-1.rq',
                            endpoint: 'https://api.triplydb.com/datasets/Triply/iris/services/demo-service/sparql'
                        },
                        generator: {
                            query: 'file://static/example/generator-stage-1.rq',
                            // adjust batchsize for test here
                            batchSize: 7
                        }
                    }
                ]
            }
            const pipelineBatch = new Pipeline(batchConfiguration)
            pipelineBatch.validate()
            const stage = pipelineBatch.stages.get('Stage 1')

            async function runGeneratorWithPromise(): Promise<boolean> {
                return new Promise((resolve, reject) => {
                  pipelineBatch.run().then(() => {
                    
                  }).catch(error => {reject(error)});
                  stage?.generator.addListener('data', (quad) => {
                    N3Store.addQuad(quad)
                  });
                  stage?.generator.addListener('end', (_numResults) => {
                      resolve(true)
                    });
                    stage?.generator.addListener('error', (error) => {
                        reject(error);
                    });
                });
            }
            await runGeneratorWithPromise()
            expect(N3Store.size).to.equal(459)
            expect(N3Store.getQuads(null,null,null,null)[458].subject.id).to.equal('https://triplydb.com/triply/iris/id/floweringPlant/00150')


        })
        it('should emit "data" and "end" events with the correct number of statements', async () => {
            const configuration : LDWorkbenchConfiguration = {
                name: 'Example Pipeline',
                description: 'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
                destination: 'file://pipelines/data/example-pipeline.nt',
                stages: [
                    {
                        name: 'Stage 1',
                        iterator: {
                            query: 'file://static/example/iterator-stage-1.rq',
                            endpoint: 'file://static/tests/iris.nt'
                        },
                        generator: {
                            query: 'file://static/example/generator-stage-1.rq'
                        }
                    },
                    {
                        name: 'Stage 2',
                        iterator: {
                            query: 'file://static/example/iterator-stage-2.rq',
                        },
                        generator: {
                            query: 'file://static/example/generator-stage-2.rq',
                            endpoint: 'file://static/tests/wikidata.nt'
                        }
                    }
                ]
            }
            const pipeline = new Pipeline(configuration, {silent: true})
            const stageConfig = configuration.stages[0]
            const stage = new Stage(pipeline, stageConfig)
            const generator = new Generator(stage);
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
