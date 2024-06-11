# LD Workbench

LD Workbench is a command-line tool for transforming large RDF datasets using pure SPARQL.

This project is currently in a Proof-of-Concept phase.

## Approach

The main design principes are scalability and extensibility.

### Scalability 

LD Workbench is **scalable** due to its iterator/generator approach:

* the **iterator** component fetches URIs using a SPARQL SELECT query, paginating results using SPARQL `OFFSET` and `LIMIT` (binding each URI to a `$this` variable)
* the **generator** component then runs a SPARQL CONSTRUCT query for each URI ([pre-binding](https://www.w3.org/TR/shacl/#pre-binding) `$this` to the URI), which returns the transformed result.  

### Extensible 

LD Workbench is **extensible** because it uses pure SPARQL queries (instead of code) for configuring transformation pipelines.
Each pipeline is a sequence of stages; each stage consists of an iterator and generator.

## Usage

To get started with LD Workbench, first install [NodeJS](https://nodejs.org), then run:

```sh
npx @netwerk-digitaal-erfgoed/ld-workbench@latest --init
````

This creates an example LD Workbench pipeline in the `pipelines/configurations/example` directory
and runs that pipeline right away. The output is written to `pipelines/data`.

To run the pipeline again:

```sh
npx @netwerk-digitaal-erfgoed/ld-workbench@latest
```

Your workbench is now ready for use. You can continue by creating your own pipeline configurations. 

### Configuration

An LD Workbench pipeline is defined with a YAML configuration file, validated by a [JSON Schema](https://json-schema.app/view/%23?url=https%3A%2F%2Fraw.githubusercontent.com%2Fnetwerk-digitaal-erfgoed%2Fld-workbench%2Fmain%2Fstatic%2Fld-workbench.schema.json).

A pipeline must have a name, one or more stages, and optionally a description. Multiple pipelines can be configured as long as they have unique names. See the [example configuration file](https://github.com/netwerk-digitaal-erfgoed/ld-workbench/blob/main/static/example/config.yml) for a boilerplate configuration file.

#### Example YAML File For Configuration Options

```yaml
name: MyPipeline
description: Example pipeline configuration
destination: output/result.ttl
stages:
  - name: Stage1
    iterator:
      query: "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 100"
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
