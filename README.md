# LD Workbench

LD Workbench is a command-line tool for transforming large RDF datasets using pure [SPARQL](https://www.w3.org/TR/sparql11-query/).

> [!NOTE]
> Although LD Workbench is stable, we consider it a proof of concept.
> Please use the software and report any [issues](https://github.com/netwerk-digitaal-erfgoed/ld-workbench/issues) you encounter.

## Approach

### Components

Users define LD Workbench **pipelines**. An LD Workbench pipeline reads data from SPARQL endpoints,
transforms it using SPARQL queries, and writes the result to a file or triple store.

A pipeline consists of one or more **stages**. Each stage has:

- an **iterator**, which selects URIs from a dataset using a paginated SPARQL SELECT query,
  binding each URI to a `$this` variable 
- one or more **generators**, which generate triples about each URI using SPARQL CONSTRUCT queries.

Stages can be chained together, with the output of one stage becoming the input of the next.
The output of each stage combined becomes the final output of the pipeline.

### Design principles

The main design principes are scalability and extensibility.

LD Workbench is **scalable** due to its iterator/generator approach,
which separates the selection of URIs from the generation of triples.

LD Workbench is **extensible** because it uses pure SPARQL queries (instead of code or a DSL) for configuring transformation pipelines.
The [SPARQL query language](https://www.w3.org/TR/sparql11-query/) is a widely supported W3C standard,
so users will not be locked into a proprietary tool or technology.

## Usage

To get started with LD Workbench, you can either use the NPM package or a Docker image.

To use the NPM package, install [Node.js](https://nodejs.org), then run:

```sh
npx @netwerk-digitaal-erfgoed/ld-workbench@latest --init
````

Alternatively, to run the Docker image,
first create a directory to store your pipeline configurations,
then run the Docker image 
(mounting the `pipelines/` directory with `-v`, using `-it` for an interactive and colorful console):

```sh
mkdir pipelines
docker run -it -v $(pwd)/pipelines:/pipelines ghcr.io/netwerk-digitaal-erfgoed/ld-workbench:latest
```

This creates an example LD Workbench pipeline in the `pipelines/configurations/example` directory
and runs that pipeline right away. The output is written to `pipelines/data`.

To run the pipeline again:

```sh
npx @netwerk-digitaal-erfgoed/ld-workbench@latest
```

Your workbench is now ready for use. You can continue by creating your own pipeline configurations. 

### Configuration

An LD Workbench pipeline is defined with a YAML configuration file, validated by a [JSON Schema](https://json-schema.app/view/%23?url=https%3A%2F%2Fraw.githubusercontent.com%2Fnetwerk-digitaal-erfgoed%2Fld-workbench%2Fmain%2Fstatic%2Fld-workbench.schema.json).

A pipeline must have a name, one or more stages, and optionally a description. Multiple pipelines can be configured as long as they have unique names. 
See the [example configuration file](https://github.com/netwerk-digitaal-erfgoed/ld-workbench/blob/main/static/example/config.yml) for a boilerplate configuration file.
You can find more examples in the [ld-workbench-configuration](https://github.com/netwerk-digitaal-erfgoed/ld-workbench-configuration) repository.

#### Iterator

Each stage has a single iterator.
The iterator selects URIs from a dataset that match certain criteria.
The iterator SPARQL SELECT query must return a `$this` binding for each URI that will be passed to the generator(s).

The query can be specified either inline:

```yaml
# config.yml
stages:
  - name: Stage1
    iterator:
      query: "SELECT $this WHERE { $this a <https://schema.org/Thing> }"
```

or by referencing a file:

```yaml
# config.yml
stages:
  - name: Stage1
    iterator:
      query: file://iterator.rq
```

```sparql
# iterator.rq
prefix schema: <https://schema.org/>

select $this where {
  $this a schema:Thing .
}
```

> [!TIP]
> LD Workbench paginates iterator queries (using SPARQL `LIMIT/OFFSET`) to support large datasets. 
> However, a large `OFFSET` can be slow on SPARQL endpoints.
> Therefore, prefer creating multiple stages to process subsets (for example each RDF type separately) over processing the entire dataset in a single stage.


#### Generator

A stage has one or more generators, which are run for each individual URI from the iterator. 
A SPARQL CONSTRUCT query takes a `$this` binding from the iterator and generates triples about it.

Just as with the iterator query, the query can be specified either inline or by referencing a file:

```yaml
# config.yml
stages:
  - name: Stage1
    generator:
      - query: "CONSTRUCT { $this a <https://schema.org/CreativeWork> } WHERE { $this a <https://schema.org/Book> }"
```

#### Stores

To query large local files, you may need to load them into a SPARQL store first. Do so by starting a SPARQL store,
for example Oxigraph:

```shell
docker run --rm -v $PWD/data:/data -p 7878:7878 oxigraph/oxigraph --location /data serve --bind 0.0.0.0:7878
```

Then configure the store in your pipeline, configuring at least one store under `stores`
and using the `importTo` parameter to import the `endpoint`’s data to the store,
referencing the store’s `queryUrl`:

```yaml
# config.yml
stores:
  - queryUrl: "http://localhost:7878/query" # SPARQL endpoint for read queries.
    storeUrl: "http://localhost:7878/store" # SPARQL Graph Store HTTP Protocol endpoint. 

stages:
  - name: ...
    iterator:
      query: ...
      endpoint: file://data.nt
      importTo: http://localhost:7878/query
    generator:
      - query: ...
```

The data is loaded into a named graph `<import:filename>`, so in this case `<import:data.nt>`.

#### Example configuration

```yaml
# config.yml
name: MyPipeline
description: Example pipeline configuration
destination: output/result.ttl
stages:
  - name: Stage1
    iterator:
      query: "SELECT $this WHERE { $this a <https://schema.org/Thing> }"
      endpoint: "http://example.com/sparql-endpoint"
    generator:
      - query: "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }"
        batchSize: 50
    destination: output/stage1-result.ttl
  - name: Stage2
    iterator:
      query: file://queries/iteratorQuery.rq
      endpoint: "http://example.com/sparql-endpoint-1"
      batchSize: 200
    generator:
      - query: file://queries/generator1Query.rq
        endpoint: "http://example.com/sparql-endpoint-1"
        batchSize: 200
      - query: file://queries/generator2Query.rq
        endpoint: "http://example.com/sparql-endpoint-2"
        batchSize: 100
    destination: output/stage2-result.ttl
```

#### Configuration options

For a full overview of configuration options, please see the [schema](https://json-schema.app/view/%23?url=https%3A%2F%2Fraw.githubusercontent.com%2Fnetwerk-digitaal-erfgoed%2Fld-workbench%2Fmain%2Fstatic%2Fld-workbench.schema.json).

## Development

If you want to help develop LD Workbench, please see the [CONTRIBUTING.md](CONTRIBUTING.md) file.
