import Iterator from "../Iterator.class.js";
import { EventEmitter } from 'events';
import Stage from "../Stage.class.js";
import Pipeline from "../Pipeline.class.js";
import parseYamlFile from "../../utils/parseYamlFile.js";
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)
const expect = chai.expect

describe('Iterator Class', () => {
    describe('constructor', () => {
        it('should set query, endpoint, engine, $offset, and totalResults properties correctly', () => {
            const configuration = parseYamlFile('./static/example/config.yml')
            const pipeline = new Pipeline(configuration)
            const stageConfig = configuration.stages[0]
            const stage = new Stage(pipeline, stageConfig)
            const iterator = new Iterator(stage);
            expect(iterator).to.be.an.instanceOf(Iterator);
            expect(iterator).to.be.an.instanceOf(EventEmitter);
            expect(iterator).to.have.property('query');
            expect(iterator).to.have.property('endpoint');
            expect(iterator).to.have.property('engine');
            expect(iterator).to.have.property('source');
            expect(iterator).to.have.property('$offset', 0);
            expect(iterator).to.have.property('totalResults', 0);
        });
    });
    // BUG when both the generator and iterator tests are running, it seems the iterator will never terminate
    describe.skip('run', () => {
        it('should emit "data" and "end" events with the correct $this and numResults', async () => {
            const configuration = parseYamlFile('./static/example/config.yml')
            const pipeline = new Pipeline(configuration)
            const stageConfig = configuration.stages[0]
            const stage = new Stage(pipeline, stageConfig)
            const iterator = new Iterator(stage);
            const emittedEvents: any = []
            async function runIteratorWithPromise(): Promise<boolean> {
                return new Promise((resolve, reject) => {
                    iterator.addListener('data', (bindings) => {
                        emittedEvents.push({ event: 'data', bindings });
                    });
                    iterator.addListener('end', () => {
                        emittedEvents.push({ event: 'end' });
                        resolve(true);
                    });
                    iterator.addListener('error', (error) => {
                        reject(error);
                    });
                    iterator.run();
                });
            }

            await runIteratorWithPromise()
            expect(emittedEvents).to.have.lengthOf(154);
            expect(emittedEvents[0].event).to.equal('data');
            expect(emittedEvents[0].bindings.termType).to.equal('NamedNode')
            expect(emittedEvents[0].bindings.value).to.equal('http://dbpedia.org/resource/Iris_virginica')
            expect(emittedEvents[emittedEvents.length - 1].event).to.equal('end');

        });
    });
});
