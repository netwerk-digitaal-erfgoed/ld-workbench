import Stage, {PreviousStage} from '../src/stage.js';
import Pipeline from '../src/pipeline.js';
import kebabcase from 'lodash.kebabcase';
import Iterator from '../src/iterator.js';
import Generator from '../src/generator.js';
import * as chai from 'chai';
import * as path from 'path';
import chaiAsPromised from 'chai-as-promised';
import type {Configuration} from '../src/configuration.js';
import {fileURLToPath} from 'url';
import removeDirectory from '../src/utils/removeDir.js';
import {NamedNode} from '@rdfjs/types';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Stage Class', () => {
  const _filename = fileURLToPath(import.meta.url);
  const _dirname = path.dirname(_filename);
  const dataDirectoryPath = path.join(_dirname, 'pipelines', 'data');

  beforeEach(async () => {
    await removeDirectory(dataDirectoryPath);
  });

  describe('constructor', () => {
    it('should set properties correctly', () => {
      const configuration: Configuration = {
        name: 'Example Pipeline',
        description:
          'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
        destination: 'file://pipelines/data/example-pipeline.nt',
        stages: [
          {
            name: 'Stage 1',
            iterator: {
              query: 'file://static/example/iterator-stage-1.rq',
              endpoint: 'file://static/tests/iris.nt',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-1-1.rq',
              },
            ],
          },
          {
            name: 'Stage 2',
            iterator: {
              query: 'file://static/example/iterator-stage-2.rq',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-2.rq',
                endpoint: 'file://static/tests/wikidata.nt',
              },
            ],
          },
        ],
      };
      const pipeline = new Pipeline(configuration, {silent: true});
      const stageConfig = configuration.stages[0];
      const stage = new Stage(pipeline, stageConfig);
      expect(stage).to.be.an.instanceOf(Stage);
      expect(stage).to.have.property('destination');
      expect(stage).to.have.property('iterator');
      expect(stage).to.have.property('generators');
      expect(stage.iterator).to.be.an.instanceOf(Iterator);
      expect(stage.generators[0]).to.be.an.instanceOf(Generator);
      expect(stage.pipeline).to.be.an.instanceOf(Pipeline);
      expect(stage).to.have.property('pipeline', pipeline);
      expect(stage).to.have.property('configuration');
    });
  });

  describe('destinationPath', () => {
    it('should return the correct destination path', () => {
      const configuration: Configuration = {
        name: 'Example Pipeline',
        description:
          'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
        destination: 'file://pipelines/data/example-pipeline.nt',
        stages: [
          {
            name: 'Stage 1',
            iterator: {
              query: 'file://static/example/iterator-stage-1.rq',
              endpoint: 'file://static/tests/iris.nt',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-1-1.rq',
              },
            ],
          },
          {
            name: 'Stage 2',
            iterator: {
              query: 'file://static/example/iterator-stage-2.rq',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-2.rq',
                endpoint: 'file://static/tests/wikidata.nt',
              },
            ],
          },
        ],
      };
      const pipeline = new Pipeline(configuration, {silent: true});
      const stageConfig = configuration.stages[0];
      const stage = new Stage(pipeline, stageConfig);
      const expectedPath = path.join(
        pipeline.dataDir,
        kebabcase(stageConfig.name) + '.nt'
      );
      expect(stage.destinationPath).to.equal(
        expectedPath.replace('file://', '')
      );
    });
  });

  describe('name', () => {
    it('should return the correct stage name', () => {
      const configuration: Configuration = {
        name: 'Example Pipeline',
        description:
          'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
        destination: 'file://pipelines/data/example-pipeline.nt',
        stages: [
          {
            name: 'Stage 1',
            iterator: {
              query: 'file://static/example/iterator-stage-1.rq',
              endpoint: 'file://static/tests/iris.nt',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-1-1.rq',
              },
            ],
          },
          {
            name: 'Stage 2',
            iterator: {
              query: 'file://static/example/iterator-stage-2.rq',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-2.rq',
                endpoint: 'file://static/tests/wikidata.nt',
              },
            ],
          },
        ],
      };
      const pipeline = new Pipeline(configuration, {silent: true});
      const stageConfig = configuration.stages[0];
      const stage = new Stage(pipeline, stageConfig);
      expect(stage.name).to.equal(stageConfig.name);
    });
  });

  describe.skip('run', () => {
    it('should run the stage correctly', async () => {
      const configuration: Configuration = {
        name: 'Example Pipeline',
        description:
          'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
        destination: 'file://pipelines/data/example-pipeline.nt',
        stages: [
          {
            name: 'Stage 1',
            iterator: {
              query: 'file://static/example/iterator-stage-1.rq',
              endpoint: 'file://static/tests/iris.nt',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-1-1.rq',
              },
            ],
          },
          {
            name: 'Stage 2',
            iterator: {
              query: 'file://static/example/iterator-stage-2.rq',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-2.rq',
                endpoint: 'file://static/tests/wikidata.nt',
              },
            ],
          },
        ],
      };
      const pipeline = new Pipeline(configuration, {silent: true});
      const stageConfig = configuration.stages[0];
      const stage = new Stage(pipeline, stageConfig);

      const iteratorEvents: Array<{
        event: 'iteratorResult';
        namedNode: NamedNode;
      }> = [];
      const generatorEvents: Array<{event: 'generatorResult'; count: number}> =
        [];
      const endEvents: Array<{
        event: 'end';
        iteratorCount: number;
        statements: number;
      }> = [];

      async function runStageWithPromise(): Promise<boolean> {
        return new Promise((resolve, reject) => {
          stage.addListener('generatorResult', count => {
            generatorEvents.push({event: 'generatorResult', count});
          });
          stage.addListener('iteratorResult', namedNode => {
            iteratorEvents.push({event: 'iteratorResult', namedNode});
          });
          stage.addListener('end', (iteratorCount, statements) => {
            endEvents.push({event: 'end', iteratorCount, statements});
            resolve(true);
          });
          stage.addListener('error', error => {
            reject(error);
          });
          stage.run();
        });
      }

      await runStageWithPromise();
      expect(iteratorEvents[0].event).to.equal('iteratorResult');
      expect(iteratorEvents[0].namedNode.termType).to.equal('NamedNode');
      expect(iteratorEvents[0].namedNode.value).to.equal(
        'http://dbpedia.org/resource/Iris_virginica'
      );
      expect(iteratorEvents.length).to.equal(153);
      expect(generatorEvents[0].event).to.equal('generatorResult');
      expect(generatorEvents[0].count).to.equal(1);
      expect(generatorEvents.length).to.equal(459);
      expect(endEvents[0].event).to.equal('end');
      expect(endEvents[0].iteratorCount).to.equal(153);
      expect(endEvents[0].statements).to.equal(459);
      expect(endEvents.length).to.equal(1);
    });
  });
});

describe('PreviousStage Class', () => {
  describe('constructor', () => {
    it('should set properties correctly', () => {
      const config: Configuration = {
        name: 'Example Pipeline',
        description:
          'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
        destination: 'file://pipelines/data/example-pipeline.nt',
        stages: [
          {
            name: 'Stage 1',
            iterator: {
              query: 'file://static/example/iterator-stage-1.rq',
              endpoint: 'file://static/tests/iris.nt',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-1-1.rq',
              },
            ],
          },
          {
            name: 'Stage 2',
            iterator: {
              query: 'file://static/example/iterator-stage-2.rq',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-2.rq',
                endpoint: 'file://static/tests/wikidata.nt',
              },
            ],
          },
        ],
      };
      const pipeline = new Pipeline(config, {silent: true});
      const stage: Stage = new Stage(pipeline, config.stages[1]);
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
      const config: Configuration = {
        name: 'Example Pipeline',
        description:
          'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
        destination: 'file://pipelines/data/example-pipeline.nt',
        stages: [
          {
            name: 'Stage 1',
            iterator: {
              query: 'file://static/example/iterator-stage-1.rq',
              endpoint: 'file://static/tests/iris.nt',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-1-1.rq',
              },
            ],
          },
          {
            name: 'Stage 2',
            iterator: {
              query: 'file://static/example/iterator-stage-2.rq',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-2.rq',
                endpoint: 'file://static/tests/wikidata.nt',
              },
            ],
          },
        ],
      };
      const pipeline = new Pipeline(config, {silent: true});
      const stage: Stage = new Stage(pipeline, config.stages[0]);
      const stagesSoFar = Array.from(stage.pipeline.stages.keys());
      const previousStage = new PreviousStage(stage, stagesSoFar.pop()!);
      expect(() => previousStage.load()).to.throw(
        'no endpoint was defined, but there is also no previous stage to use'
      );
    });

    it('should return the previous stage correctly', () => {
      const config: Configuration = {
        name: 'Example Pipeline',
        description:
          'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
        destination: 'file://pipelines/data/example-pipeline.nt',
        stages: [
          {
            name: 'Stage 1',
            iterator: {
              query: 'file://static/example/iterator-stage-1.rq',
              endpoint: 'file://static/tests/iris.nt',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-1-1.rq',
              },
            ],
          },
          {
            name: 'Stage 2',
            iterator: {
              query: 'file://static/example/iterator-stage-2.rq',
              endpoint: 'file://static/tests/iris.nt',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-2.rq',
                endpoint: 'file://static/tests/wikidata.nt',
              },
            ],
          },
        ],
      };
      const pipeline = new Pipeline(config, {silent: true});
      const stageTwo: Stage = new Stage(pipeline, config.stages[1]);
      const stagesSoFar = Array.from(stageTwo.pipeline.stages.keys());
      const previousStage = new PreviousStage(stageTwo, stagesSoFar.pop()!); // should be stage one
      const stage2 = pipeline.stages.get('Stage 2')!;
      const testPreviousStage = pipeline.getPreviousStage(stage2);
      expect(previousStage.load()).to.equal(testPreviousStage);
    });
  });

  describe('is', () => {
    it('should return true for a valid PreviousStage instance', () => {
      const config: Configuration = {
        name: 'Example Pipeline',
        description:
          'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
        destination: 'file://pipelines/data/example-pipeline.nt',
        stages: [
          {
            name: 'Stage 1',
            iterator: {
              query: 'file://static/example/iterator-stage-1.rq',
              endpoint: 'file://static/tests/iris.nt',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-1-1.rq',
              },
            ],
          },
          {
            name: 'Stage 2',
            iterator: {
              query: 'file://static/example/iterator-stage-2.rq',
              endpoint: 'file://static/tests/iris.nt',
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-2.rq',
                endpoint: 'file://static/tests/wikidata.nt',
              },
            ],
          },
        ],
      };
      const pipeline = new Pipeline(config, {silent: true});
      const stage: Stage = new Stage(pipeline, config.stages[1]);
      const stagesSoFar = Array.from(stage.pipeline.stages.keys());
      const previousStage = new PreviousStage(stage, stagesSoFar.pop()!);
      previousStage.load();
      const result = PreviousStage.is(previousStage);
      expect(result).to.equal(true);
    });

    it('should return false for an invalid instance', () => {
      const invalidInstance = {$id: 'invalid'};
      const result = PreviousStage.is(invalidInstance);
      expect(result).to.equal(false);
    });
  });
});
