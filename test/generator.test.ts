import Generator, {Query} from '../src/generator.js';
import {EventEmitter} from 'events';
import Stage from '../src/stage.js';
import Pipeline from '../src/pipeline.js';
import * as chai from 'chai';
import * as path from 'path';
import chaiAsPromised from 'chai-as-promised';
import {NamedNode} from 'n3';
import * as fs from 'fs';
import type {Configuration} from '../src/configuration.js';
import {fileURLToPath} from 'url';
import removeDirectory from '../src/utils/removeDir.js';
import {Quad} from '@rdfjs/types';
import getSPARQLQuery from '../src/utils/getSPARQLQuery.js';

chai.use(chaiAsPromised);

describe('Generator Class', () => {
  const _filename = fileURLToPath(import.meta.url);
  const _dirname = path.dirname(_filename);
  const dataDirectoryPath = path.join(_dirname, 'pipelines', 'data');

  beforeAll(async () => {
    await removeDirectory(dataDirectoryPath);
  });

  describe('constructor', () => {
    it('should set query, engine, endpoint, and source properties correctly', () => {
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
      const generator = new Generator(stage, 0);
      chai.expect(generator).to.be.an.instanceOf(Generator);
      chai.expect(generator).to.be.an.instanceOf(EventEmitter);
      chai.expect(generator).to.have.property('query');
      chai.expect(generator).to.have.property('engine');
      chai.expect(generator).to.have.property('endpoint');
    });
  });
  describe('run', () => {
    it('Should work with multiple generators in parallel for one pipeline', async () => {
      const filePath = 'pipelines/data/example-pipelineParallel.nt';

      const config: Configuration = {
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
      chai.expect(fileLines.length).to.equal(741);
      chai.expect(fileLines[0]).to.equal('');
      chai
        .expect(fileLines[1])
        .to.equal(
          '<http://dbpedia.org/resource/Iris_setosa> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing> .'
        );
      chai
        .expect(fileLines[fileLines.length - 1])
        .to.equal(
          '<https://triplydb.com/triply/iris/id/floweringPlant/00150> <https://schema.org/name> "Instance 150 of the Iris Virginica"@en .'
        );
    });
    it("Should work in batchSize for pipeline's generator", async () => {
      const filePath = 'pipelines/data/example-pipelineBatch.nt';

      const batchConfiguration: Configuration = {
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
      await pipelineBatch.run();
      const file = fs.readFileSync(filePath, {encoding: 'utf-8'});
      const fileLines = file.split('\n').sort();
      chai.expect(fileLines.length).to.equal(460);
      chai.expect(fileLines[0]).to.equal('');
      chai
        .expect(fileLines[1])
        .to.equal(
          '<http://dbpedia.org/resource/Iris_setosa> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing> .'
        );
      chai
        .expect(fileLines[fileLines.length - 1])
        .to.equal(
          '<https://triplydb.com/triply/iris/id/floweringPlant/00150> <https://schema.org/name> "Instance 150 of the Iris Virginica"@en .'
        );
    });
    it.skip('should emit "data" and "end" events with the correct number of statements', async () => {
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
      chai.expect(emittedEvents).to.have.lengthOf(4);
      chai.expect(emittedEvents[0].event).to.equal('data');
      chai
        .expect(emittedEvents[0].quad?.subject.value)
        .to.equal('https://triplydb.com/triply/iris/id/floweringPlant/00106');
      chai
        .expect(emittedEvents[0].quad?.predicate.value)
        .to.equal('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
      chai
        .expect(emittedEvents[0].quad?.object.value)
        .to.equal('https://schema.org/Thing');
      chai
        .expect(emittedEvents[emittedEvents.length - 1].event)
        .to.equal('end');
      chai
        .expect(emittedEvents[emittedEvents.length - 1].numResults)
        .to.equal(3);
    });
  });
});

describe('Query', () => {
  const queryString =
    'CONSTRUCT { ?this <http://example.com/predicate> ?value. }\nWHERE {  }';
  const query = Query.from(getSPARQLQuery(queryString, 'construct'));
  it('returns the query as string', () => {
    expect(query.toString()).toEqual(queryString);
  });

  const invalidQueries = [
    {
      clause: 'MINUS',
      query: `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX ex: <http://example.org/>
    
        CONSTRUCT {
          ?city rdf:type ex:City.
        }
        WHERE {
          ?city rdf:type ex:City.
          MINUS { ?city ex:isCapitalOf ?country. }
        }`,
    },
    {
      clause: 'MINUS',
      query: `PREFIX ex: <http://example.org/>
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
        }`,
    },
    {
      clause: 'SERVICE',
      query: `PREFIX foaf: <http://xmlns.com/foaf/0.1/>
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
        }`,
    },
    {
      clause: 'SERVICE',
      query: `PREFIX ex: <http://example.org/>
        CONSTRUCT {
          ?place ex:hasPopulation ?population.
        }
        WHERE {
          {
            SERVICE <http://external-endpoint.example/sparql> {
              ?place a ex:Country.
              ?place ex:hasPopulation ?population.
            }
          }
        }`,
    },
    {
      clause: 'VALUES',
      query: `PREFIX ex: <http://example.org/>
        CONSTRUCT {
          ?city ex:hasPopulation ?population.
        }
        WHERE {
          VALUES ?city { ex:City1 ex:City2 ex:City3 }
          ?city ex:hasPopulation ?population.
        }`,
    },
    {
      clause: 'VALUES',
      query: `PREFIX ex: <http://example.org/>
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
        }`,
    },
  ];

  describe.each(invalidQueries)('A query with clause ', ({clause, query}) => {
    it(`${clause} is rejected`, () => {
      expect(() => Query.from(getSPARQLQuery(query, 'construct'))).toThrow(
        `SPARQL CONSTRUCT generator query must not contain a ${clause} clause`
      );
    });
  });
});
