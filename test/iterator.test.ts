import Iterator from '../src/iterator.js';
import {EventEmitter} from 'events';
import Stage from '../src/stage.js';
import Pipeline from '../src/pipeline.js';
import * as chai from 'chai';
import * as path from 'path';
import chaiAsPromised from 'chai-as-promised';
import {Configuration} from '../src/configuration.js';
import {fileURLToPath} from 'url';
import removeDirectory from '../src/utils/removeDir.js';
import {NamedNode} from '@rdfjs/types';
chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Iterator Class', () => {
  const _filename = fileURLToPath(import.meta.url);
  const _dirname = path.dirname(_filename);
  const dataDirectoryPath = path.join(_dirname, 'pipelines', 'data');

  beforeEach(async () => {
    await removeDirectory(dataDirectoryPath);
  });

  describe('constructor', () => {
    it('should set query, endpoint, engine, $offset, and totalResults properties correctly', () => {
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
      const iterator = new Iterator(stage);
      expect(iterator).to.be.an.instanceOf(Iterator);
      expect(iterator).to.be.an.instanceOf(EventEmitter);
      expect(iterator).to.have.property('query');
      expect(iterator).to.have.property('endpoint');
      expect(iterator).to.have.property('engine');
      expect(iterator).to.have.property('$offset', 0);
      expect(iterator).to.have.property('totalResults', 0);
    });
  });
  describe.skip('run', () => {
    it('should emit "data" and "end" events with the correct $this and numResults', async () => {
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
      const iterator = new Iterator(stage);
      const emittedEvents: {event: string; bindings?: NamedNode}[] = [];
      async function runIteratorWithPromise(): Promise<boolean> {
        return new Promise((resolve, reject) => {
          iterator.addListener('data', bindings => {
            emittedEvents.push({event: 'data', bindings});
          });
          iterator.addListener('end', () => {
            emittedEvents.push({event: 'end'});
            resolve(true);
          });
          iterator.addListener('error', error => {
            reject(error);
          });
          iterator.run();
        });
      }

      await runIteratorWithPromise();
      expect(emittedEvents).to.have.lengthOf(154);
      expect(emittedEvents[0].event).to.equal('data');
      expect(emittedEvents[0].bindings?.termType).to.equal('NamedNode');
      expect(emittedEvents[0].bindings?.value).to.equal(
        'http://dbpedia.org/resource/Iris_virginica'
      );
      expect(emittedEvents[emittedEvents.length - 1].event).to.equal('end');
    });
  });
});
