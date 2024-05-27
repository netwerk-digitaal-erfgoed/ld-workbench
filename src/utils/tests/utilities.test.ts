import version from '../version.js';
import loadConfiguration from '../loadConfiguration.js';
import validate from '../validate.js';
import {
  isConfiguration,
  isFile,
  isFilePathString,
  isPreviousStage,
} from '../guards.js';
import Pipeline from '../../lib/Pipeline.class.js';
import Stage from '../../lib/Stage.class.js';
import PreviousStage from '../../lib/PreviousStage.class.js';
import File from '../../lib/File.class.js';
import path from 'path';
import loadPipelines from '../loadPipelines.js';
import chalk from 'chalk';
import assert from 'assert';
import getEndpoint from '../getEndpoint.js';
import type {LDWorkbenchConfiguration} from '../../lib/LDWorkbenchConfiguration.js';
import getEngine from '../getEngine.js';
import {QueryEngine as QueryEngineSparql} from '@comunica/query-sparql';
import {QueryEngine as QueryEngineFile} from '@comunica/query-sparql-file';
import getEngineSource from '../getEngineSource.js';
import {existsSync, rename} from 'fs';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import getSPARQLQuery from '../getSPARQLQuery.js';
import getSPARQLQueryString from '../getSPARQLQueryString.js';
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
        )} could not be found.\nIf this is your first run of LDWorkbench, you might want to use \`npx ld-workbench --init\` to setup an example workbench project.`
      );
      expect(() => loadPipelines(nonExistentDirWithFile)).to.throw(
        `Configuration directory/file ${chalk.italic(
          nonExistentDirWithFile
        )} could not be found.\nIf this is your first run of LDWorkbench, you might want to use \`npx ld-workbench --init\` to setup an example workbench project.`
      );
    });
    it('should throw if directory has no .yml configuration file', () => {
      const dirWithoutConfFile = './src/utils/tests/static/dirWithoutYmlFile';
      expect(() => loadPipelines(dirWithoutConfFile)).to.throw(
        `No configuration files found matching pattern ${chalk.italic(
          `${dirWithoutConfFile}/**/*.yml`
        )}`
      );
    });
    it('should load multiple configuration files in directory', () => {
      const pipelines = loadPipelines('./src/utils/tests/static/correct');
      const loadedElements = [...pipelines];
      const testElements = [
        [
          'Example Pipeline A',
          {
            name: 'Example Pipeline A',
            description:
              'This is an example pipeline. It uses files that are available in this repository  and SPARQL endpoints that should work.\n',
            destination: 'file://pipelines/data/example-pipeline.nt',
            stages: [
              {
                name: 'Stage 1A',
                iterator: {
                  query: 'file://static/example/iterator-stage-1.rq',
                  endpoint: 'file://static/tests/iris.nt',
                },
                generator: [
                  {query: 'file://static/example/generator-stage-1-1.rq'},
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
            destination: 'file://pipelines/data/example-pipeline.nt',
            stages: [
              {
                name: 'Stage 1B',
                iterator: {
                  query: 'file://static/example/iterator-stage-1.rq',
                  endpoint: 'file://static/tests/iris.nt',
                },
                generator: [
                  {query: 'file://static/example/generator-stage-1-1.rq'},
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
      const pipeline = loadPipelines('./src/utils/tests/static/single');
      const loadedElement = [...pipeline];
      const testElement = [
        [
          'Example Pipeline',
          {
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
                  {query: 'file://static/example/generator-stage-1-1.rq'},
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
      loadPipelines('./src/utils/tests/static/duplicate');
      console.warn = originalConsoleError;
      expect(capturedConsoleError).to.contain(
        chalk.yellow(
          `Warning: skipping a duplicate configuration from file ${chalk.italic(
            './src/utils/tests/static/duplicate/conf2.yml'
          )} with name ${chalk.italic('Duplicate Example Pipeline')}`
        )
      );
    });
  });
  describe('getEndpoint', () => {
    it('should return File when filePath is provided in Stage', () => {
      const filePath = 'file://path/to/file.txt';
      const config: LDWorkbenchConfiguration = {
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
      const config: LDWorkbenchConfiguration = {
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
      const config: LDWorkbenchConfiguration = {
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
      // getEndpoint is use in Stage's Iterator, and it will throw there.
      expect(() => new Stage(pipeline, stageConfig)).to.throw(
        'Error in the iterator of stage `Stage 1`: "invalidExample" is not a valid URL'
      );
    });
    it("should work with URL's prepended with 'sparql@'", () => {
      const url =
        'sparql@https://www.goudatijdmachine.nl/sparql/repositories/nafotocollectie'; // will be accepted
      const config: LDWorkbenchConfiguration = {
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
      // getEndpoint is use in Stage's Iterator, and it will throw there.
      expect(() => new Stage(pipeline, stageConfig)).to.not.throw();
    });
    it('should throw if stage has undefined endpoint and is first stage', () => {
      const endpoint = undefined;
      const config: LDWorkbenchConfiguration = {
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
      const pipeline = new Pipeline(config, {silent: true});
      const stageConfig = config.stages[0];
      expect(() => new Stage(pipeline, stageConfig)).to.throw(
        'Error in the iterator of stage `Stage 1`: no destination defined for the iterator and no previous stage to use that result'
      );
    });
    it('should return PreviousStage if stage has undefined endpoint', () => {
      const url = new URL('https://example.com').toString();
      const config: LDWorkbenchConfiguration = {
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
      pipeline.validate();
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
      const config: LDWorkbenchConfiguration = {
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
      pipeline.validate();
      const stage: Stage = new Stage(pipeline, config.stages[1]);
      const stagesSoFar = Array.from(stage.pipeline.stages.keys());
      const previousStage = new PreviousStage(stage, stagesSoFar.pop()!);
      const result = getEngine(previousStage);
      expect(result instanceof QueryEngineFile).to.equal(true);
    });
  });
  describe('getEngineSource', () => {
    it('should return string when input is File', () => {
      const f = new File(`file://${path.join('./static/example/config.yml')}`);
      expect(typeof getEngineSource(f) === 'string').to.equal(true);
    });
    it('should return string when input is URL', () => {
      const url = new URL('https://www.example.com');
      expect(typeof getEngineSource(url) === 'string').to.equal(true);
    });
    it('should return engine source string when input is PreviousStage with destinationPath', async () => {
      const config: LDWorkbenchConfiguration = {
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
      pipeline.validate();
      const stage2: Stage = new Stage(pipeline, config.stages[1]);
      const stagesSoFar = Array.from(stage2.pipeline.stages.keys());
      const previousStage = new PreviousStage(stage2, stagesSoFar.pop()!);
      const engineSource = getEngineSource(previousStage);
      expect(
        engineSource ===
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
        pipeline.validate();
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
        pipeline.validate();
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
        pipeline.validate();
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
    describe('should throw if CONSTRUCT query contains minus, service, values', () => {
      it('should throw for minus', () => {
        const minusQuery = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX ex: <http://example.org/>
        
        CONSTRUCT {
          ?city rdf:type ex:City.
        }
        WHERE {
          ?city rdf:type ex:City.
          MINUS { ?city ex:isCapitalOf ?country. }
        }
        
        `;
        expect(() => getSPARQLQuery(minusQuery, 'construct')).to.throw(
          'SPARQL construct queries must not contain a MINUS clause'
        );
      });
      it('should throw for service', () => {
        const serviceQuery = `PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX ex: <http://example.org/>
        
        CONSTRUCT {
          ?person foaf:name ?name.
          ?person ex:hasEmail ?email.
        }
        WHERE {
          ?person foaf:name ?name.
          SERVICE <http://remote-endpoint.example/sparql> {
            ?person ex:hasEmail ?email.
          }
        }        
        `;
        expect(() => getSPARQLQuery(serviceQuery, 'construct')).to.throw(
          'SPARQL construct queries must not contain a SERVICE clause'
        );
      });
      it('should throw for values', () => {
        const valuesQuery = `PREFIX ex: <http://example.org/>

        CONSTRUCT {
          ?city ex:hasPopulation ?population.
        }
        WHERE {
          VALUES ?city { ex:City1 ex:City2 ex:City3 }
          ?city ex:hasPopulation ?population.
        }        
        `;
        expect(() => getSPARQLQuery(valuesQuery, 'construct')).to.throw(
          'SPARQL construct queries must not contain a VALUES clause'
        );
      });
    });
    describe('should throw if CONSTRUCT query contains optional, union, group, graph with minus, service, values', () => {
      it('should throw for minus with optional', () => {
        const minusOptionalQuery = `PREFIX ex: <http://example.org/>

        CONSTRUCT {
          ?city ex:hasPopulation ?population.
        }
        WHERE {
          ?city ex:hasPopulation ?population.
          
          OPTIONAL {
            MINUS {
              ?city ex:hasPopulation ?otherPopulation.
              FILTER (?population = ?otherPopulation)
            }
          }
        }        
        `;
        expect(() => getSPARQLQuery(minusOptionalQuery, 'construct')).to.throw(
          'SPARQL construct queries must not contain a MINUS clause'
        );
      });
      it('should throw for service with union', () => {
        const serviceUnionQuery = `PREFIX ex: <http://example.org/>

        CONSTRUCT {
          ?place ex:hasPopulation ?population.
        }
        WHERE {
          {
            ?place a ex:City.
            ?place ex:hasPopulation ?population.
          }
          UNION
          {
            SERVICE <http://external-endpoint.example/sparql> {
              ?place a ex:Country.
              ?place ex:hasPopulation ?population.
            }
          }
        }
        
        `;
        expect(() => getSPARQLQuery(serviceUnionQuery, 'construct')).to.throw(
          'SPARQL construct queries must not contain a SERVICE clause'
        );
      });
      it('should throw for minus with group by', () => {
        const minusGroupByQuery = `PREFIX ex: <http://example.org/>

        CONSTRUCT {
          ?cityType ex:averagePopulation ?averagePopulation.
        }
        WHERE {
          {
            SELECT ?cityType (AVG(?population) as ?averagePopulation)
            WHERE {
              ?city ex:hasType ?cityType.
              ?city ex:hasPopulation ?population.
            }
            GROUP BY ?cityType
          }
          MINUS
          {
            SELECT ?cityType
            WHERE {
              ?city ex:hasType ?cityType.
              FILTER NOT EXISTS {
                ?city ex:hasPopulation ?population.
              }
            }
          }
        }        
        `;
        expect(() => getSPARQLQuery(minusGroupByQuery, 'construct')).to.throw(
          'SPARQL construct queries must not contain a MINUS clause'
        );
      });
      it('should throw for values', () => {
        const valuesGraphQuery = `PREFIX ex: <http://example.org/>

        CONSTRUCT {
          ?city ex:hasPopulation ?population.
        }
        WHERE {
          GRAPH ?graph {
            VALUES (?city ?population) {
              (ex:City1 10000)
              (ex:City2 15000)
              (ex:City3 20000)
            }
        
            ?city ex:hasPopulation ?population.
          }
        }
        `;
        expect(() => getSPARQLQuery(valuesGraphQuery, 'construct')).to.throw(
          'SPARQL construct queries must not contain a VALUES clause'
        );
      });
    });
  });
  describe('getSPARQLQueryString', () => {
    it('should return query string for correct SELECT/CONSTRUCT SPARQL query', () => {
      const selectQuery = `PREFIX ex: <http://example.org/>

      SELECT ?city ?population
      WHERE {
        ?city ex:hasPopulation ?population.
      }
      `;
      const constructQuery = `PREFIX ex: <http://example.org/>

      CONSTRUCT {
        ?city ex:hasPopulation ?population.
      }
      WHERE {
        ?city ex:hasPopulation ?population.
      }
      `;

      const expectedSelectQuery = `PREFIX ex: <http://example.org/>
SELECT ?city ?population WHERE { ?city ex:hasPopulation ?population. }`;
      const expectedConstructQuery = `PREFIX ex: <http://example.org/>
CONSTRUCT { ?city ex:hasPopulation ?population. }
WHERE { ?city ex:hasPopulation ?population. }`;

      const selectStr = getSPARQLQueryString(
        getSPARQLQuery(selectQuery, 'select')
      );
      const constructStr = getSPARQLQueryString(
        getSPARQLQuery(constructQuery, 'construct')
      );

      expect(selectStr).to.equal(expectedSelectQuery);
      expect(constructStr).to.equal(expectedConstructQuery);
    });
    describe('should throw error for incorrect SPARQL queries', () => {
      it('should throw for incorrect syntax SPARQL query', () => {
        const incorrectQuery = `SELECT ?subject ?predicate ?object
        WHERE {
          ?subject ?predicate ?object
          FILTER (?object > 100)
        `;
        expect(() =>
          getSPARQLQueryString(getSPARQLQuery(incorrectQuery, 'select'))
        ).to.throw();
      });
      it('should throw for empty string', () => {
        expect(() =>
          getSPARQLQueryString(getSPARQLQuery('', 'select'))
        ).to.throw('Unexpected querytype undefined');
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
        expect(() =>
          getSPARQLQueryString(getSPARQLQuery(updateQuery, 'select'))
        ).to.throw('Unexpected querytype update');
      });
      it('should throw for ASK SPARQL query', () => {
        const askQuery = `PREFIX ex: <http://example.org/>

        ASK
        WHERE {
          ex:City1 ex:hasPopulation ?population.
          FILTER (?population > 1000000)
        }
        `;
        expect(() =>
          getSPARQLQueryString(getSPARQLQuery(askQuery, 'select'))
        ).to.throw('Unexpected querytype ASK');
      });
      it('should throw for DESCRIBE SPARQL query', () => {
        const describeQuery = `PREFIX ex: <http://example.org/>

        DESCRIBE ex:City1
        `;
        expect(() =>
          getSPARQLQueryString(getSPARQLQuery(describeQuery, 'select'))
        ).to.throw('Unexpected querytype DESCRIBE');
      });
    });
  });
});
