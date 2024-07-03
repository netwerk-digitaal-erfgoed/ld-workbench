import {GenericContainer, StartedTestContainer, Wait} from 'testcontainers';
import loadPipelines from '../src/utils/loadPipelines.js';
import Pipeline from '../src/pipeline.js';
import fs from 'fs';

describe('Import', () => {
  let sparqlStore: StartedTestContainer;

  beforeAll(async () => {
    sparqlStore = await new GenericContainer('oxigraph/oxigraph:0.4.0-alpha.7')
      .withExposedPorts(7878)
      .withWaitStrategy(Wait.forLogMessage('Listening')) // Waiting for the port does not work.
      .start();
  }, 30_000);

  it('imports an RDF file to a SPARQL store', async () => {
    const [[, configuration]] = loadPipelines(
      './test/fixtures/import/config.yml'
    ).entries();

    // Replace port.
    configuration.stores![0].queryUrl = `http://localhost:${sparqlStore.getMappedPort(
      7878
    )}/query`;
    configuration.stores![0].storeUrl = `http://localhost:${sparqlStore.getMappedPort(
      7878
    )}/store?no_transaction&lenient`;
    configuration.stages![0].iterator.importTo =
      configuration.stores![0].queryUrl;
    const pipeline = new Pipeline(configuration, {silent: true});

    await pipeline.run();

    const file = fs.readFileSync('pipelines/data/import/statements.nt', {
      encoding: 'utf-8',
    });
    const numOfTriples = file.split('\n').length - 1;
    expect(numOfTriples).toEqual(153);
  }, 15_000);

  afterAll(async () => {
    await sparqlStore.stop();
  });
});
