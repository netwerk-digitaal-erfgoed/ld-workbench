import Generator from "../Generator.class.js";
import { EventEmitter } from 'events';
import Stage from "../Stage.class.js";
import parseYamlFile from "../../utils/parseYamlFile.js";
import Pipeline from "../Pipeline.class.js";
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { NamedNode } from "n3";
chai.use(chaiAsPromised)
const expect = chai.expect

describe('Generator Class', () => {
    describe('constructor', () => {
        it('should set query, engine, endpoint, and source properties correctly', () => {
            const configuration = parseYamlFile('./static/example/config.yml')
            const pipeline = new Pipeline(configuration)
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
    describe.skip('run', () => {
        it('should emit "data" and "end" events with the correct number of statements', async () => {
            const configuration = parseYamlFile('./static/example/config.yml')
            const pipeline = new Pipeline(configuration)
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
