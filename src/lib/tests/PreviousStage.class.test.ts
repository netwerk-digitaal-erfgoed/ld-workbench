import PreviousStage from '../PreviousStage.class.js';
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import type { LDWorkbenchConfiguration } from '../LDWorkbenchConfiguration.js';
import Pipeline from '../Pipeline.class.js';
import Stage from '../Stage.class.js';
chai.use(chaiAsPromised)
const expect = chai.expect

describe('PreviousStage Class', () => {
    describe('constructor', () => {
        it('should set properties correctly', () => {
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
                        generator: [{
                            query: 'file://static/example/generator-stage-1-1.rq'
                        }]
                    },
                    {
                        name: 'Stage 2',
                        iterator: {
                            query: 'file://static/example/iterator-stage-2.rq',
                        },
                        generator: [{
                            query: 'file://static/example/generator-stage-2.rq',
                            endpoint: 'https://query.wikidata.org/sparql'
                        }]
                    }
                ]
            }
            const pipeline = new Pipeline(config, {silent: true})
            pipeline.validate()
            const stage: Stage = new Stage(pipeline, config.stages[1])
            const stagesSoFar = Array.from(stage.pipeline.stages.keys());
            const previousStage = new PreviousStage(stage, stagesSoFar.pop()!);
            expect(previousStage).to.be.an.instanceOf(PreviousStage);
            expect(previousStage).to.have.property('nextStage');
            expect(previousStage).to.have.property('name');
            expect(previousStage.$id).to.equal('PreviousStage');
        });
    });
    describe('load', () => {
        it('should throw an error if the previous stage is not found', () => {
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
                        generator: [{
                            query: 'file://static/example/generator-stage-1-1.rq'
                        }]
                    },
                    {
                        name: 'Stage 2',
                        iterator: {
                            query: 'file://static/example/iterator-stage-2.rq',
                        },
                        generator: [{
                            query: 'file://static/example/generator-stage-2.rq',
                            endpoint: 'https://query.wikidata.org/sparql'
                        }]
                    }
                ]
            }
            const pipeline = new Pipeline(config, {silent: true})
            pipeline.validate()
            const stage: Stage = new Stage(pipeline, config.stages[0])
            const stagesSoFar = Array.from(stage.pipeline.stages.keys());
            const previousStage = new PreviousStage(stage, stagesSoFar.pop()!);
            expect(() => previousStage.load()).to.throw("no endpoint was defined, but there is also no previous stage to use")
        });

        it('should return the previous stage correctly', () => {
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
                        generator: [{
                            query: 'file://static/example/generator-stage-1-1.rq'
                        }]
                    },
                    {
                        name: 'Stage 2',
                        iterator: {
                            query: 'file://static/example/iterator-stage-2.rq',
                            endpoint: 'https://api.triplydb.com/datasets/Triply/iris/services/demo-service/sparql'
                        },
                        generator: [{
                            query: 'file://static/example/generator-stage-2.rq',
                            endpoint: 'https://query.wikidata.org/sparql'
                        }]
                    }
                ]
            }
            const pipeline = new Pipeline(config, {silent: true})
            pipeline.validate()
            const stageTwo: Stage = new Stage(pipeline, config.stages[1])
            const stagesSoFar = Array.from(stageTwo.pipeline.stages.keys());
            const previousStage = new PreviousStage(stageTwo, stagesSoFar.pop()!); // should be stage one
            const stage2 = pipeline.stages.get('Stage 2')!;
            const testPreviousStage = pipeline.getPreviousStage(stage2)
            expect(previousStage.load()).to.equal(testPreviousStage)
        });
    });

    describe('is', () => {
        it('should return true for a valid PreviousStage instance', () => {
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
                            [{ query: 'file://static/example/generator-stage-1-1.rq' }]

                    },
                    {
                        name: 'Stage 2',
                        iterator: {
                            query: 'file://static/example/iterator-stage-2.rq',
                            endpoint: 'https://api.triplydb.com/datasets/Triply/iris/services/demo-service/sparql'
                        },
                        generator: [{
                            query: 'file://static/example/generator-stage-2.rq',
                            endpoint: 'https://query.wikidata.org/sparql'
                        }]
                    }
                ]
            }
            const pipeline = new Pipeline(config, {silent: true})
            pipeline.validate()
            const stage: Stage = new Stage(pipeline, config.stages[1])
            const stagesSoFar = Array.from(stage.pipeline.stages.keys());
            const previousStage = new PreviousStage(stage, stagesSoFar.pop()!);
            previousStage.load()
            const result = PreviousStage.is(previousStage);
            expect(result).to.equal(true);
        });

        it('should return false for an invalid instance', () => {
            const invalidInstance = { $id: 'invalid' }
            const result = PreviousStage.is(invalidInstance);
            expect(result).to.equal(false);
        });
    });
});
