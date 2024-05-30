import Generator from '../Generator.class.js';
import {EventEmitter} from 'events';
import Stage from '../Stage.class.js';
import Pipeline from '../Pipeline.class.js';
import * as chai from 'chai';
import * as path from 'path';
import chaiAsPromised from 'chai-as-promised';
import {NamedNode} from 'n3';
import * as fs from 'fs';
import type {LDWorkbenchConfiguration} from '../LDWorkbenchConfiguration.js';
import {fileURLToPath} from 'url';
import removeDirectory from '../../utils/removeDir.js';
import {Quad} from '@rdfjs/types';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Generator Class', () => {
  const _filename = fileURLToPath(import.meta.url);
  const _dirname = path.dirname(_filename);
  const dataDirectoryPath = path.join(_dirname, 'pipelines', 'data');

  before(async () => {
    // Remove the data directory before running tests
    await removeDirectory(dataDirectoryPath);
  });

  describe('constructor', () => {
    it('should set query, engine, endpoint, and source properties correctly', () => {
      const configuration: LDWorkbenchConfiguration = {
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
      const generator = new Generator(stage, 0);
      expect(generator).to.be.an.instanceOf(Generator);
      expect(generator).to.be.an.instanceOf(EventEmitter);
      expect(generator).to.have.property('query');
      expect(generator).to.have.property('engine');
      expect(generator).to.have.property('endpoint');
    });
  });
  describe('run', () => {
    it('Should work with multiple generators in parallel for one pipeline', async () => {
      const filePath = 'pipelines/data/example-pipelineParallel.nt';

      const config: LDWorkbenchConfiguration = {
        name: 'Example Pipeline',
        description:
          'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
        destination: 'file://' + filePath,
        stages: [
          {
            name: 'Stage 1',
            iterator: {
              query: 'file://static/example/iterator-stage-1.rq',
              endpoint: 'file://static/tests/iris.nt',
            },
            generator: [
              {query: 'file://static/example/generator-stage-1-1.rq'},
              {query: 'file://static/example/generator-stage-1-2.rq'},
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
      // read file after pipeline has finished
      const pipelineParallelGenerators = new Pipeline(config, {silent: true});
      await pipelineParallelGenerators.run();
      const file = fs.readFileSync(filePath, {encoding: 'utf-8'});
      const fileLines = file.split('\n').sort();
      expect(fileLines.length).to.equal(741);
      expect(fileLines[0]).to.equal('');
      expect(fileLines[1]).to.equal(
        '<http://dbpedia.org/resource/Iris_setosa> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing> .'
      );
      expect(fileLines[fileLines.length - 1]).to.equal(
        '<https://triplydb.com/triply/iris/id/floweringPlant/00150> <https://schema.org/name> "Instance 150 of the Iris Virginica"@en .'
      );
    });
    it("Should work in batchSize for pipeline's generator", async () => {
      const filePath = 'pipelines/data/example-pipelineBatch.nt';

      const batchConfiguration: LDWorkbenchConfiguration = {
        name: 'Example Pipeline Batch',
        description:
          'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
        destination: 'file://' + filePath,
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
                // adjust batchsize for test here
                batchSize: 7,
              },
            ],
          },
        ],
      };
      const pipelineBatch = new Pipeline(batchConfiguration, {silent: true});
      pipelineBatch
        .run()
        .then(() => {
          // read file after pipeline has finished
          const file = fs.readFileSync(filePath, {encoding: 'utf-8'});
          const fileLines = file.split('\n').sort();
          expect(fileLines.length).to.equal(460);
          expect(fileLines[0]).to.equal('');
          expect(fileLines[1]).to.equal(
            '<http://dbpedia.org/resource/Iris_setosa> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing> .'
          );
          expect(fileLines[fileLines.length - 1]).to.equal(
            '<https://triplydb.com/triply/iris/id/floweringPlant/00150> <https://schema.org/name> "Instance 150 of the Iris Virginica"@en .'
          );
        })
        .catch(error => {
          throw error;
        });
    });
    it.skip('should emit "data" and "end" events with the correct number of statements', async () => {
      const configuration: LDWorkbenchConfiguration = {
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
      const generator = new Generator(stage, 0);
      const emittedEvents: {event: string; quad?: Quad; numResults?: number}[] =
        [];

      const testNamedNode = new NamedNode(
        'https://triplydb.com/triply/iris/id/floweringPlant/00106'
      );

      async function runGeneratorWithPromise(): Promise<boolean> {
        return new Promise((resolve, reject) => {
          generator.addListener('data', quad => {
            emittedEvents.push({event: 'data', quad});
          });
          generator.addListener('end', numResults => {
            emittedEvents.push({event: 'end', numResults});
            resolve(true);
          });
          generator.addListener('error', error => {
            reject(error);
          });
          generator.run(testNamedNode);
        });
      }

      await runGeneratorWithPromise();
      expect(emittedEvents).to.have.lengthOf(4);
      expect(emittedEvents[0].event).to.equal('data');
      expect(emittedEvents[0].quad?.subject.value).to.equal(
        'https://triplydb.com/triply/iris/id/floweringPlant/00106'
      );
      expect(emittedEvents[0].quad?.predicate.value).to.equal(
        'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
      );
      expect(emittedEvents[0].quad?.object.value).to.equal(
        'https://schema.org/Thing'
      );
      expect(emittedEvents[emittedEvents.length - 1].event).to.equal('end');
      expect(emittedEvents[emittedEvents.length - 1].numResults).to.equal(3);
    });
  });
});
