import version from '../../src/utils/version.js';
import loadConfiguration from '../../src/utils/loadConfiguration.js';
import validate from '../../src/utils/validate.js';
import {
  isConfiguration,
  isFile,
  isFilePathString,
  isPreviousStage,
} from '../../src/utils/guards.js';
import Pipeline from '../../src/pipeline.js';
import Stage, {PreviousStage} from '../../src/stage.js';
import File from '../../src/file.js';
import path from 'path';
import loadPipelines from '../../src/utils/loadPipelines.js';
import chalk from 'chalk';
import assert from 'assert';
import getEndpoint from '../../src/utils/getEndpoint.js';
import {Configuration} from '../../src/configuration.js';
import getEngine from '../../src/utils/getEngine.js';
import {QueryEngine as QueryEngineSparql} from '@comunica/query-sparql';
import {QueryEngine as QueryEngineFile} from '@comunica/query-sparql-file';
import getEngineSource from '../../src/utils/getEngineSource.js';
import {existsSync, rename} from 'fs';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import getSPARQLQuery from '../../src/utils/getSPARQLQuery.js';

chai.use(chaiAsPromised);
const expect = chai.expect;

function testDeepEqualTwoObjects(
  objectOne: object,
  objectTwo: object
): boolean {
  try {
    // lodash could not properly deep equal check
    assert.deepEqual(objectOne, objectTwo);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

describe('Utilities', () => {
  it('should correctly get a version number', () => {
    expect(version()).match(/0.0.0-development/);
  });

  describe('YAML Parser', () => {
    it('should parse a YAML file', () => {
      expect(() =>
        loadConfiguration('./static/example/config.yml')
      ).to.not.throw();
    });
    it('should throw on non-YAML file', () => {
      expect(() => {
        loadConfiguration('./README.md');
      }).to.throw(
        'Error parsing file: `./README.md`, are you sure it is a YAML file?'
      );
    });
    it('should throw on non existing YAML file', () => {
      expect(() => {
        loadConfiguration('./non-existing-file');
      }).to.throw('File not found: ./non-existing-file');
    });
    it('should throw on on directories', () => {
      expect(() => {
        loadConfiguration('./src');
      }).to.throw('File not found: ./src');
    });
  });

  describe('Validation of YAML files', () => {
    it('should correctly detect a valid YAML configuration', () => {
      expect(validate('./static/example/config.yml')).to.equal(null);
    });
    it('should correctly detect a valid configuration using an object', () => {
      const configuration = loadConfiguration('./static/example/config.yml');
      expect(validate(configuration)).to.equal(null);
    });
    it('should correctly detect an invalid YAML configuration', () => {
      expect(validate('./package.json')).to.not.equal(null);
    });
  });
  describe('Type guards', () => {
    it('should assert a configuration', () => {
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
      expect(isConfiguration(configuration)).to.equal(true);
    });
    it('should return true for a valid FilePathString with isFilePathString', () => {
      const validFilePath = 'file://path/to/file.txt';
      const result = isFilePathString(validFilePath);
      expect(result).to.equal(true);
    });

    it('should return false for a string that does not start with "file://" with isFilePathString', () => {
      const invalidFilePath = 'http://example.com/file.txt';
      const result = isFilePathString(invalidFilePath);
      expect(result).to.equal(false);
    });

    it('should return false for an empty string with isFilePathString', () => {
      const emptyString = '';
      const result = isFilePathString(emptyString);
      expect(result).to.equal(false);
    });
    it('should return false for undefined', () => {
      const result1 = isFilePathString(undefined);
      expect(result1).to.equal(false);
    });
    it('should return true for valid PreviousStage object with isPreviousStage', () => {
      const configuration = loadConfiguration('./static/example/config.yml');
      const pipeline = new Pipeline(configuration, {silent: true});
      const stageConfig = configuration.stages[0];
      const stage = new Stage(pipeline, stageConfig);
      const prevStage = new PreviousStage(stage, configuration.stages[0].name);
      const result = isPreviousStage(prevStage);
      expect(result).to.equal(true);
    });
    it('should return false for invalid object with isPreviousStage', () => {
      const invalidObject = {$id: 'Invalid'};
      const result = isPreviousStage(invalidObject);
      expect(result).to.be.equal(false);
    });
    it('should return false for non-object values with isPreviousStage', () => {
      const nonObjectValue = 'string';
      const result = isPreviousStage(nonObjectValue);
      expect(result).to.equal(false);
    });
    it('should return true for valid PreviousStage object with isFile', () => {
      const f = new File(`file://${path.join('./static/example/config.yml')}`);
      const result = isFile(f);
      expect(result).to.equal(true);
    });
    it('should return false for invalid object with isFile', () => {
      const invalidObject = {$id: 'Invalid'};
      const result = isFile(invalidObject);
      expect(result).to.be.equal(false);
    });
    it('should return false for non-object values with isFile', () => {
      const nonObjectValue = 'string';
      const result = isFile(nonObjectValue);
      expect(result).to.equal(false);
    });
  });
  it('should load and validate using the wrapper', () => {
    expect(
      isConfiguration(loadConfiguration('./static/example/config.yml'))
    ).to.equal(true);
    expect(() => isConfiguration(loadConfiguration('./package.json'))).to.throw(
      'The YAML file `./package.json` is not a valid LD Workbench configuration file.'
    );
  });
  describe('loadPipelines', () => {
    it('should throw if configuration file & directory could not be found', () => {
      const nonExistentConfFile = 'fileDoesNotExist.yml';
      const nonExistentDirWithFile = './dirDoesNotExist/' + nonExistentConfFile;
      expect(() => loadPipelines(nonExistentConfFile)).to.throw(
        `Configuration directory/file ${chalk.italic(
          nonExistentConfFile
        )} could not be found.\nIf this is your first run of LDWorkbench, you might want to use \`npx @netwerk-digitaal-erfgoed/ld-workbench@latest --init\` to set up an example workbench project.`
      );
      expect(() => loadPipelines(nonExistentDirWithFile)).to.throw(
        `Configuration directory/file ${chalk.italic(
          nonExistentDirWithFile
        )} could not be found.\nIf this is your first run of LDWorkbench, you might want to use \`npx @netwerk-digitaal-erfgoed/ld-workbench@latest --init\` to set up an example workbench project.`
      );
    });
    it('should throw if directory has no .yml configuration file', () => {
      const dirWithoutConfFile = './test/utils/static/dirWithoutYmlFile';
      expect(() => loadPipelines(dirWithoutConfFile)).to.throw(
        `No configuration files found matching pattern ${chalk.italic(
          `${dirWithoutConfFile}/**/*.yml`
        )}`
      );
    });
    it('should load multiple configuration files in directory', () => {
      const pipelines = loadPipelines('./test/utils/static/correct');
      const loadedElements = [...pipelines];
      const testElements = [
        [
          'Example Pipeline A',
          {
            name: 'Example Pipeline A',
            description:
              'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
            destination: 'file:///pipelines/data/example-pipeline.nt',
            stages: [
              {
                name: 'Stage 1A',
                iterator: {
                  query: 'file:///static/example/iterator-stage-1.rq',
                  endpoint: 'file:///static/tests/iris.nt',
                },
                generator: [
                  {query: 'file:///static/example/generator-stage-1-1.rq'},
                ],
              },
            ],
          },
        ],
        [
          'Example Pipeline B',
          {
            name: 'Example Pipeline B',
            description:
              'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
            destination: 'file:///pipelines/data/example-pipeline.nt',
            stages: [
              {
                name: 'Stage 1B',
                iterator: {
                  query: 'file:///static/example/iterator-stage-1.rq',
                  endpoint: 'file:///static/tests/iris.nt',
                },
                generator: [
                  {query: 'file:///static/example/generator-stage-1-1.rq'},
                ],
              },
            ],
          },
        ],
      ];
      expect(testDeepEqualTwoObjects(loadedElements, testElements)).to.equal(
        true
      );
    });
    it('should load single configuration file in directory', () => {
      const pipeline = loadPipelines('./test/utils/static/correct/conf1.yml');
      const loadedElement = [...pipeline];
      const testElement = [
        [
          'Example Pipeline A',
          {
            name: 'Example Pipeline A',
            description:
              'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
            destination: 'file:///pipelines/data/example-pipeline.nt',
            stages: [
              {
                name: 'Stage 1A',
                iterator: {
                  query: 'file:///static/example/iterator-stage-1.rq',
                  endpoint: 'file:///static/tests/iris.nt',
                },
                generator: [
                  {query: 'file:///static/example/generator-stage-1-1.rq'},
                ],
              },
            ],
          },
        ],
      ];
      expect(testDeepEqualTwoObjects(loadedElement, testElement)).to.equal(
        true
      );
    });
    it('should log duplicate names in configuration file', () => {
      const originalConsoleError = console.warn;
      let capturedConsoleError = '';
      console.warn = (message: string) => {
        capturedConsoleError += message + '\n';
      };
      loadPipelines('./test/utils/static/duplicate');
      console.warn = originalConsoleError;
      expect(capturedConsoleError).to.contain(
        chalk.yellow(
          `Warning: skipping a duplicate configuration from file ${chalk.italic(
            './test/utils/static/duplicate/conf2.yml'
          )} with name ${chalk.italic('Duplicate Example Pipeline')}`
        )
      );
    });
  });
  describe('getEndpoint', () => {
    it('should return File when filePath is provided in Stage', () => {
      const filePath = 'file://path/to/file.txt';
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
              endpoint: filePath,
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-1-1.rq',
              },
            ],
          },
        ],
      };
      const pipeline = new Pipeline(config, {silent: true});
      const stageConfig = config.stages[0];
      const stage = new Stage(pipeline, stageConfig);
      const retrievedEndpoint = getEndpoint(stage);
      expect(
        isFile(retrievedEndpoint) &&
          retrievedEndpoint.path === 'file://path/to/file.txt'
      ).to.equal(true);
    });
    it('should return URL when URL is provided in Stage', () => {
      const url = new URL('https://example.com').toString();
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
              endpoint: url,
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-1-1.rq',
              },
            ],
          },
        ],
      };
      const pipeline = new Pipeline(config, {silent: true});
      const stageConfig = config.stages[0];
      const stage = new Stage(pipeline, stageConfig);
      const retrievedEndpoint = getEndpoint(stage);
      expect(
        retrievedEndpoint instanceof URL &&
          retrievedEndpoint.href === 'https://example.com/'
      ).to.equal(true);
    });
    it('should throw error if invalid URL is provided', () => {
      const url = 'invalidExample'; // will be accepted
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
              endpoint: url,
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-1-1.rq',
              },
            ],
          },
        ],
      };
      expect(() => new Pipeline(config, {silent: true})).to.throw(
        'Error in the iterator of stage `Stage 1`: "invalidExample" is not a valid URL'
      );
    });
    it('should throw if stage has undefined endpoint and is first stage', () => {
      const endpoint = undefined;
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
              endpoint,
            },
            generator: [
              {
                query: 'file://static/example/generator-stage-1-1.rq',
              },
            ],
          },
        ],
      };
      expect(() => new Pipeline(config, {silent: true})).to.throw(
        'The first stage of your pipeline must have an endpoint defined for the Iterator.'
      );
    });
    it('should return PreviousStage if stage has undefined endpoint', () => {
      const url = new URL('https://example.com').toString();
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
              endpoint: url,
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
      const stage = new Stage(pipeline, config.stages[1]);
      const retrievedEndpoint = getEndpoint(stage);
      expect(isPreviousStage(retrievedEndpoint)).to.equal(true);
    });
  });
  describe('getEngine', () => {
    it('should return QueryEngineSparql when input is URL', () => {
      const url = new URL('https://www.example.com/endpoint');
      const result = getEngine(url);
      expect(result instanceof QueryEngineSparql).to.equal(true);
    });
    it('should return QueryEngineFile when input is File', () => {
      const file = new File('file://exampleFile.txt');
      const result = getEngine(file);
      expect(result instanceof QueryEngineFile).to.equal(true);
    });
    it('should return QueryEngineFile when input is PreviousStage', () => {
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
      const result = getEngine(previousStage);
      expect(result instanceof QueryEngineFile).to.equal(true);
    });
  });
  describe('getEngineSource', () => {
    it('should return generic source when input is File', () => {
      const f = new File(`file://${path.join('./static/example/config.yml')}`);
      expect(getEngineSource(f)).to.deep.equal({value: f.toString()});
    });
    it('should return URL source when input is URL', () => {
      const url = new URL('https://www.example.com');
      expect(getEngineSource(url)).to.deep.equal({
        type: 'sparql',
        value: url.toString(),
      });
    });
    it('should return engine source string when input is PreviousStage with destinationPath', async () => {
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
      const stage2: Stage = new Stage(pipeline, config.stages[1]);
      const stagesSoFar = Array.from(stage2.pipeline.stages.keys());
      const previousStage = new PreviousStage(stage2, stagesSoFar.pop()!);
      const engineSource = getEngineSource(previousStage);
      expect(
        engineSource.value ===
          path.join(
            process.cwd(),
            '/pipelines/data/example-pipeline/stage-1.nt'
          )
      ).to.equal(true);
    });
    describe('should throw', () => {
      beforeEach(() => {
        const configuration = loadConfiguration('./static/example/config.yml');
        const pipeline = new Pipeline(configuration, {silent: true});
        const stage: Stage = new Stage(pipeline, configuration.stages[1]);
        const stagesSoFar = Array.from(stage.pipeline.stages.keys());
        const previousStage = new PreviousStage(stage, stagesSoFar.pop()!);
        const loadedPreviousStage = previousStage.load();
        const destPath = loadedPreviousStage?.destinationPath;
        const editedDesPath = destPath + '123';
        if (destPath !== undefined) {
          if (existsSync(destPath)) {
            rename(destPath, editedDesPath, err => {
              if (err !== null) {
                throw err;
              }
            });
          }
        } else {
          throw new Error('Test Failed, no destination path found');
        }
      });
      afterEach(() => {
        const configuration = loadConfiguration('./static/example/config.yml');
        const pipeline = new Pipeline(configuration, {silent: true});
        const stage: Stage = new Stage(pipeline, configuration.stages[1]);
        const stagesSoFar = Array.from(stage.pipeline.stages.keys());
        const previousStage = new PreviousStage(stage, stagesSoFar.pop()!);
        const loadedPreviousStage = previousStage.load();
        const destPath = loadedPreviousStage?.destinationPath;
        const editedDesPath = destPath + '123';
        if (existsSync(editedDesPath)) {
          rename(editedDesPath, destPath, err => {
            if (err !== null) {
              throw err;
            }
          });
        }
      });
      it('should throw when input is PreviousStage and destinationPath does not exist', () => {
        const configuration = loadConfiguration('./static/example/config.yml');
        const pipeline = new Pipeline(configuration, {silent: true});
        const stage: Stage = new Stage(pipeline, configuration.stages[1]);
        const stagesSoFar = Array.from(stage.pipeline.stages.keys());
        const previousStage = new PreviousStage(stage, stagesSoFar.pop()!);
        const loadedPreviousStage = previousStage.load();
        const destPath = loadedPreviousStage?.destinationPath;

        expect(() => getEngineSource(previousStage)).to.throw(
          `The result from stage "${loadedPreviousStage?.name}" (${destPath}) is not available, make sure to run that stage first`
        );
      });
    });
  });
  describe('getSPARQLQuery', () => {
    it('should return SPARQL query when input is filepath with query file', () => {
      const queryFile = 'file://static/example/iterator-stage-1.rq';
      const result = getSPARQLQuery(queryFile, 'select');
      expect(result.queryType).to.equal('SELECT');
      expect(result.limit).to.equal(10);
      expect(result.prefixes.dbo).to.equal('http://dbpedia.org/ontology/');
    });
    it('should return SPARQL query when input is string with query', () => {
      const queryString = `prefix dbo: <http://dbpedia.org/ontology/>
      prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      select * where {
        $this a/rdfs:subClassOf* dbo:Plant
      } limit 10
      `;
      const result = getSPARQLQuery(queryString, 'select');
      expect(result.queryType).to.equal('SELECT');
      expect(result.limit).to.equal(10);
      expect(result.prefixes.dbo).to.equal('http://dbpedia.org/ontology/');
    });
    it('should throw when filepath is given and does not exist', () => {
      const nonExistentFile = 'file://./does/not/exits.txt';
      expect(
        getSPARQLQuery.bind(getSPARQLQuery, nonExistentFile, 'construct')
      ).to.throw(
        `File not found: ${chalk.italic(
          nonExistentFile.replace('file://', '')
        )}`
      );
    });

    it('should throw if query is not a SPARQL query', () => {
      const sqlQuery = `SELECT first_name, last_name, birthdate
                        FROM employees
                        WHERE department = 'IT'
                        ORDER BY last_name, first_name;
      `;
      let failed: boolean;
      try {
        getSPARQLQuery(sqlQuery, 'select');
        failed = false;
      } catch (error) {
        // @ts-expect-error error has no type so we check if hash is invalid
        if (error.hash.token === 'INVALID') {
          failed = true;
        } else {
          failed = false;
          console.log(error);
        }
      }
      expect(failed).to.equal(true);
    });

    it('should throw for incorrect syntax SPARQL query', () => {
      const incorrectQuery = `SELECT ?subject ?predicate ?object
          WHERE {
            ?subject ?predicate ?object
            FILTER (?object > 100)
          `;
      expect(() => getSPARQLQuery(incorrectQuery, 'select')).to.throw();
    });
    it('should throw for empty string', () => {
      expect(() => getSPARQLQuery('', 'select')).to.throw(
        'Unexpected querytype undefined'
      );
    });
    it('should throw for UPDATE SPARQL query', () => {
      const updateQuery = `PREFIX ex: <http://example.org/>

          DELETE {
            ex:City1 ex:hasPopulation ?newPopulation.
          }
          WHERE {
            ex:City1 ex:hasPopulation ?oldPopulation.
            FILTER (?oldPopulation = "some_old_value")
          }
          `;
      expect(() => getSPARQLQuery(updateQuery, 'select')).to.throw(
        'Unexpected querytype update'
      );
    });
    it('should throw for ASK SPARQL query', () => {
      const askQuery = `PREFIX ex: <http://example.org/>

          ASK
          WHERE {
            ex:City1 ex:hasPopulation ?population.
            FILTER (?population > 1000000)
          }
          `;
      expect(() => getSPARQLQuery(askQuery, 'select')).to.throw(
        'Unexpected querytype ASK'
      );
    });
    it('should throw for DESCRIBE SPARQL query', () => {
      const describeQuery = `PREFIX ex: <http://example.org/>

          DESCRIBE ex:City1
          `;
      expect(() => getSPARQLQuery(describeQuery, 'select')).to.throw(
        'Unexpected querytype DESCRIBE'
      );
    });
  });
});
