import File from './file.js';
import * as querystring from 'node:querystring';
import path from 'path';
import N3, {DataFactory} from 'n3';
import rdfDereferencer from 'rdf-dereference';
import {pipeline} from 'node:stream/promises';
import got, {TimeoutError} from 'got';
import {PassThrough} from 'node:stream';
import {QueryEngine} from '@comunica/query-sparql';
import pRetry from 'p-retry';
import EventEmitter from 'node:events';
import type {NamedNode} from '@rdfjs/types';
import namedNode = DataFactory.namedNode;

interface Events {
  imported: [numOfTriples: number];
  end: [numOfTriples: number];
}

export class Importer extends EventEmitter<Events> {
  public readonly graph: NamedNode;
  constructor(
    private readonly store: GraphStore,
    public readonly file: File,
    private readonly queryEngine: QueryEngine = new QueryEngine()
  ) {
    super();
    this.graph = namedNode(
      'import:' + querystring.escape(path.basename(file.toString()))
    );
  }

  public async run() {
    if (undefined !== this.store.options.storeUrl) {
      await this.importWithGraphStoreProtocol(this.store.options.storeUrl);
      await this.dataLoaded();
    } else {
      throw new Error('Not supported');
    }
  }

  /**
   * Wait for data to be available in the SPARQL store.
   */
  private async dataLoaded() {
    const query = `SELECT * FROM <${this.graph.value}> WHERE { ?s ?p ?o } LIMIT 1`;
    await pRetry(
      async () => {
        const result = await this.queryEngine.queryBindings(query, {
          sources: [
            {
              type: 'sparql',
              value: this.store.options.queryUrl.toString(),
            },
          ],
        });
        const results = await result.toArray();
        if (results.length === 0) {
          throw new Error(`No data loaded (based on query ${query})`);
        }
      },
      {retries: 5}
    );
  }

  public async importWithGraphStoreProtocol(url: URL) {
    const graphUrl = new URL(url.toString());
    graphUrl.searchParams.set('graph', this.graph.value);

    const {data} = await rdfDereferencer.default.dereference(
      this.file.toString(),
      {localFiles: true}
    );

    let numOfTriples = 0;
    data.on('data', () => {
      numOfTriples++;
      if (numOfTriples % 1000 === 0) {
        this.emit('imported', numOfTriples);
      }
    });

    const writer = new N3.StreamWriter({format: 'N-Triples'});
    const request = got.stream.put(graphUrl.toString(), {
      headers: {
        'Content-Type': 'application/n-triples',
      },
      maxRedirects: 0,
      timeout: {
        response: 1000,
      },
    });

    try {
      await pipeline(
        data,
        writer,
        request,
        new PassThrough() // Catch response errors.
      );
    } catch (e) {
      if (!(e instanceof TimeoutError)) {
        // Ignore TimeoutErrors because some graph stores, such as Oxigraph, don’t correctly respond to the streaming request.
        throw e;
      }
    }

    this.emit('end', numOfTriples);
  }

  public get url() {
    return this.store.options.queryUrl;
  }
}

export class GraphStore {
  constructor(
    public readonly options: {queryUrl: URL; storeUrl?: URL; updateUrl?: URL}
  ) {
    if (undefined === options.storeUrl && undefined === options.updateUrl) {
      throw new Error('Store must have at least one of storeUrl or updateUrl');
    }
  }
}
