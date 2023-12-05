import Stage from "../Stage.class.js";
import Pipeline from '../Pipeline.class.js';
import kebabcase from 'lodash.kebabcase'
import Iterator from '../Iterator.class.js';
import Generator from '../Generator.class.js';
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import parseYamlFile from "../../utils/parseYamlFile.js";
import path from "path";

chai.use(chaiAsPromised)
const expect = chai.expect

describe('Stage Class', () => {
    describe('constructor', () => {
        it('should set properties correctly', () => {
            const configuration = parseYamlFile('./static/example/config.yml')
            const pipeline = new Pipeline(configuration)
            const stageConfig = configuration.stages[0]
            const stage = new Stage(pipeline, stageConfig)
            expect(stage).to.be.an.instanceOf(Stage);
            expect(stage).to.have.property('destination');
            expect(stage).to.have.property('iterator');
            expect(stage).to.have.property('generator');
            expect(stage.iterator).to.be.an.instanceOf(Iterator);
            expect(stage.generator).to.be.an.instanceOf(Generator);
            expect(stage.pipeline).to.be.an.instanceOf(Pipeline);
            expect(stage).to.have.property('pipeline', pipeline);
            expect(stage).to.have.property('configuration');
        });
    });

    describe('destinationPath', () => {
        it('should return the correct destination path', () => {
            const configuration = parseYamlFile('./static/example/config.yml')
            const pipeline = new Pipeline(configuration)
            const stageConfig = configuration.stages[0]
            const stage = new Stage(pipeline, stageConfig);
            const expectedPath = path.join(pipeline.dataDir, kebabcase(stageConfig.name) + '.nt')
            expect(stage.destinationPath).to.equal(expectedPath.replace('file://', ''));
        });
    });

    describe('name', () => {
        it('should return the correct stage name', () => {
            const configuration = parseYamlFile('./static/example/config.yml')
            const pipeline = new Pipeline(configuration)
            const stageConfig = configuration.stages[0]
            const stage = new Stage(pipeline, stageConfig);
            expect(stage.name).to.equal(stageConfig.name);
        });
    });

    describe.skip('run', () => {
        it('should run the stage correctly', async function () {
            this.timeout(5000)
            const configuration = parseYamlFile('./static/example/config.yml')
            const pipeline = new Pipeline(configuration)
            const stageConfig = configuration.stages[0]
            const stage = new Stage(pipeline, stageConfig);

            const emittedEvents: any[] = [];
            async function runStageWithPromise(): Promise<boolean> {
                return new Promise((resolve, reject) => {
                    // @mightymax seems to never emit generatorResult, added it as comment to Stage class, but will need to uncomment the timeout in this test above ^
                    stage.addListener('generatorResult', (count) => {
                        emittedEvents.push({ event: 'generatorResult', count });
                    });
                    stage.addListener('iteratorResult', (namedNode) => {
                        console.log('🪵  | file: Stage.class.test.ts:70 | stage.addListener | namedNode:', namedNode)
                        emittedEvents.push({ event: 'iteratorResult', namedNode });
                    });
                    stage.addListener('end', (iteratorCount, statements) => {
                        emittedEvents.push({ event: 'end', iteratorCount, statements });
                        resolve(true);
                    });
                    stage.addListener('error', (error) => {
                        reject(error);
                    });
                    stage.run();
                });
            }
            await runStageWithPromise()
            expect(emittedEvents[0].event).to.equal('iteratorResult')
            expect(emittedEvents[0].namedNode.termType).to.equal('NamedNode')
            expect(emittedEvents[0].namedNode.value).to.equal('http://dbpedia.org/resource/Iris_virginica')
            expect(emittedEvents[emittedEvents.length -1].event).to.equal('end')
            expect(emittedEvents[emittedEvents.length -1].iteratorCount).to.equal(153)
            expect(emittedEvents[emittedEvents.length -1].statements).to.equal(459)
            expect(emittedEvents.length).to.equal(154)
        });
    });
});
