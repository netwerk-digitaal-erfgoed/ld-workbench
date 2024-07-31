import Iterator, {Query} from '../src/iterator.js';
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
import getSPARQLQuery from '../src/utils/getSPARQLQuery.js';
import getEndpoint from '../src/utils/getEndpoint.js';
import File from '../src/file.js';
chai.use(chaiAsPromised);

describe('Iterator Class', () => {
  const _filename = fileURLToPath(import.meta.url);
  const _dirname = path.dirname(_filename);
  const dataDirectoryPath = path.join(_dirname, 'pipelines', 'data');

  beforeEach(async () => {
    await removeDirectory(dataDirectoryPath);
  });

  describe('constructor', () => {
    it('should set query, endpoint, engine, offset, and totalResults properties correctly', () => {
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
      const iterator = new Iterator(
        Query.from(getSPARQLQuery(stageConfig.iterator.query, 'select')),
        getEndpoint(new Stage(pipeline, stageConfig))
      );
      chai.expect(iterator).to.be.an.instanceOf(Iterator);
      chai.expect(iterator).to.be.an.instanceOf(EventEmitter);
      chai.expect(iterator).to.have.property('query');
      chai.expect(iterator).to.have.property('endpoint');
      chai.expect(iterator).to.have.property('engine');
      chai.expect(iterator).to.have.property('offset', 0);
      chai.expect(iterator).to.have.property('totalResults', 0);
    });
  });
  describe('run', () => {
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
      const iterator = new Iterator(
        Query.from(getSPARQLQuery(stageConfig.iterator.query, 'select')),
        getEndpoint(new Stage(pipeline, stageConfig))
      );

      const emittedEvents = await runIterator(iterator);

      chai.expect(emittedEvents).to.have.lengthOf(154);
      chai.expect(emittedEvents[0].event).to.equal('data');
      chai.expect(emittedEvents[0].bindings?.termType).to.equal('NamedNode');
      chai
        .expect(emittedEvents[0].bindings?.value)
        .to.equal('http://dbpedia.org/resource/Iris_virginica');
      chai
        .expect(emittedEvents[emittedEvents.length - 1].event)
        .to.equal('end');
    });

    it('throws error if query returns no results', async () => {
      const query = Query.from(
        getSPARQLQuery(
          'SELECT $this WHERE { $this a <http://example.com/no-matches> }',
          'select'
        )
      );
      const iterator = new Iterator(
        query,
        new File('file://static/tests/iris-small.nt')
      );
      await expect(async () => await runIterator(iterator)).rejects.toThrow(
        'no results for query:\n SELECT ?this WHERE { ?this <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://example.com/no-matches>. }'
      );
    });
  });
});

describe('Query', () => {
  const queryString = 'SELECT ?this WHERE { ?s ?p ?o. }\nLIMIT 30';
  const query = Query.from(getSPARQLQuery(queryString, 'select'));

  it('returns the query as a string', () => {
    expect(query.toString()).toEqual(queryString);
  });

  it('reads the LIMIT from the query', () => {
    expect(query.limit).toEqual(30);
  });

  it('sets the default LIMIT', () => {
    const query = Query.from(getSPARQLQuery('SELECT ?this WHERE {}', 'select'));
    expect(query.limit).toEqual(10);
  });

  it('overrides the LIMIT', () => {
    const query = Query.from(getSPARQLQuery(queryString, 'select'), 500);
    expect(query.limit).toEqual(500);
  });

  it('validates the query', () => {
    expect(() =>
      Query.from(
        getSPARQLQuery('SELECT ?nope WHERE { ?s ?p ?o. }', 'select'),
        500
      )
    ).toThrow(
      'The SPARQL iterator query must select either a variable $this or a wildcard *'
    );
  });
});

async function runIterator(
  iterator: Iterator
): Promise<{event: string; bindings?: NamedNode}[]> {
  const emittedEvents: {event: string; bindings?: NamedNode}[] = [];
  return new Promise((resolve, reject) => {
    iterator.on('data', bindings => {
      emittedEvents.push({event: 'data', bindings});
    });
    iterator.on('end', () => {
      emittedEvents.push({event: 'end'});
      resolve(emittedEvents);
    });
    iterator.on('error', error => {
      reject(error);
    });
    iterator.run();
  });
}
