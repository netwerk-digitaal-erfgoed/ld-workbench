import type {Configuration} from '../src/configuration.js';
import Pipeline from '../src/pipeline.js';
import * as chai from 'chai';
import * as path from 'path';
import chaiAsPromised from 'chai-as-promised';
import Stage from '../src/stage.js';
import removeDirectory from '../src/utils/removeDir.js';
import File from '../src/file.js';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Pipeline Class', () => {
  const dataDirectoryPath = path.join('pipelines', 'data');

  beforeAll(async () => {
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
      expect(pipeline).to.be.an.instanceOf(Pipeline);
      expect(pipeline).to.have.property('stages').that.is.a('Map');
      expect(pipeline).to.have.property('dataDir').that.is.a('string');
      expect(pipeline).to.have.property('stageNames').that.is.an('array');
      expect(pipeline).to.have.property('startTime').that.is.an('number');
      expect(pipeline)
        .to.have.property('destination')
        .that.is.an.instanceOf(File);
    });
  });

  describe('getPreviousStage', () => {
    it('should return the previous stage correctly', () => {
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

      const stage1 = pipeline.stages.get('Stage 1')!;
      const stage2 = pipeline.stages.get('Stage 2')!;

      expect(pipeline.getPreviousStage(stage1)).to.equal(undefined);
      expect(pipeline.getPreviousStage(stage2)).to.equal(stage1);
    });
    // BUG error can never be reached - Error: Detected a duplicate name for stage `undefined` in your pipeline: each stage must have a unique name.
    // will be thrown instead
    it.skip('should throw error if stage name is missing', () => {
      const configuration = {
        name: 'Example Pipeline',
        description:
          'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
        destination: 'file://pipelines/data/example-pipeline.nt',
        stages: [
          {
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
      } as unknown as Configuration;
      const pipeline = new Pipeline(configuration, {silent: true});
      const stage2: Stage = new Stage(pipeline, configuration.stages[1]);
      pipeline.getPreviousStage(stage2);
    });
  });

  describe('validate', () => {
    it("should throw an error if the pipeline's configuration has no stages", () => {
      const invalidConfiguration = {
        description:
          'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
        destination: 'file://pipelines/data/example-pipeline.nt',
        stages: [],
      } as unknown as Configuration;
      let failed = false;
      try {
        new Pipeline(invalidConfiguration, {silent: true});
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Your pipeline contains no stages.') {
            failed = true;
          } else {
            throw new Error(
              `This test expected an error with message "Your pipeline contains no stages.", but received: ${error.message}`
            );
          }
        } else {
          throw error;
        }
      }
      expect(failed).to.equal(true);
    });
    it("should throw an error if the pipeline's configuration has no endpoint for the Iterator", () => {
      const invalidConfiguration = {
        description:
          'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
        destination: 'file://pipelines/data/example-pipeline.nt',
        stages: [
          {
            name: 'Stage 1',
            iterator: {
              query: 'file://static/example/iterator-stage-1.rq',
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
              },
            ],
          },
        ],
      } as unknown as Configuration;
      let failed = false;
      try {
        new Pipeline(invalidConfiguration, {silent: true});
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message ===
            'The first stage of your pipeline must have an endpoint defined for the Iterator.'
          ) {
            failed = true;
          } else {
            throw new Error(
              `This test expected an error with message "The first stage of your pipeline must have an endpoint defined for the Iterator.", but received: ${error.message}`
            );
          }
        } else {
          throw error;
        }
      }
      expect(failed).to.equal(true);
    });
    it("should throw an error if the pipeline's configuration has duplicate stage name", () => {
      const configDuplicateStageName: Configuration = {
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
            name: 'Stage 1',
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
      let failed = false;
      try {
        new Pipeline(configDuplicateStageName, {silent: true});
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message ===
            'Detected a duplicate name for stage `Stage 1` in your pipeline: each stage must have a unique name.'
          ) {
            failed = true;
          } else {
            throw new Error(
              `This test expected an error with message "Detected a duplicate name for stage \`Stage 1\` in your pipeline: each stage must have a unique name.", but received: ${error.message}`
            );
          }
        } else {
          throw error;
        }
      }
      expect(failed).to.equal(true);
    });

    it('should succeed if pipeline is valid', () => {
      const configDuplicateStageName: Configuration = {
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
      let failed = false;
      try {
        new Pipeline(configDuplicateStageName, {silent: true});
      } catch (error) {
        failed = true;
        if (error instanceof Error) {
          throw new Error(
            `This test was expected to succeed, but failed with: ${error.message}`
          );
        } else {
          throw error;
        }
      }
      expect(failed).to.equal(false);
    });
  });

  describe('run', () => {
    it('should run the pipeline correctly', async () => {
      try {
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

        await pipeline.run();
      } catch (e) {
        console.log(e);
        throw e;
      }
    });
  });
});
