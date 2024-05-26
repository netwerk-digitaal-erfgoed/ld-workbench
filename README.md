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

## Configuration

An LD Workbench pipeline is defined with a YAML configuration file. The configuration is validated by a JSON Schema. The schema is part of this repository ([link](https://github.com/netwerk-digitaal-erfgoed/ld-workbench/blob/main/static/ld-workbench.schema.json)). The YAML and JSON Schema combination is tested to work in the VSCode editor.

A pipeline must have a name, one or more stages, and optionally a description. Multiple pipelines can be configured as long as they have unique names. See the [example configuration file](https://github.com/netwerk-digitaal-erfgoed/ld-workbench/blob/main/static/example/config.yml) for a boilerplate configuration file. A visualization of the schema gives more insights on required and optional properties can be [found here](https://json-schema.app/view/%23?url=https%3A%2F%2Fraw.githubusercontent.com%2Fnetwerk-digitaal-erfgoed%2Fld-workbench%2Fmain%2Fstatic%2Fld-workbench.schema.json).

### Example YAML File For Configuration Options

```yaml
name: MyPipeline
description: Example pipeline configuration
destination: output/result.ttl
stages:
  - name: Stage1
    iterator:
      query: "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 100"
      endpoint: "http://example.com/sparql-endpoint"
      delay: "150 ms"
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

### Configuration Options Table

| Section                          | Variable           | Description                                                                                                         | Required |
|----------------------------------|--------------------|---------------------------------------------------------------------------------------------------------------------|----------|
| General Configuration File       | name               | The name of your pipeline, it must be unique over all your configurations.                                          | Yes      |
|                                  | description        | An optional description for your pipeline.                                                                          | No       |
|                                  | destination        | The file where the final result of your pipeline is saved.                                                          | No       |
| Stage                            | name               | The name of your pipeline step, it must be unique within one configuration.                                         | Yes      |
|                                  | destination        | The file where the results are saved. This is not a required property; if omitted, a temporary file will be created automatically. | No       |
| Iterator                         | query              | Path (prefixed with "file://") of SPARQL Query `.rq` file or SPARQL Query string that makes the iterator using SPARQL select.                        | Yes      |
|                                  | endpoint           | The SPARQL endpoint for the iterator. If it starts with "file://", a local RDF file is queried. If omitted, the result of the previous stage is used. | No       |
|                                  | batchSize          | Overrule the iterator's behavior of fetching 10 results per request, regardless of any limits in your query.       | No       |
|                                  | delay              | Human-readable time delay for the iterator's SPARQL endpoint requests (e.g., '5ms', '100 milliseconds', '1s').   | No       |
| Generator                        | query              | Path (prefixed with "file://") of SPARQL Query `.rq` file or SPARQL Query string that makes the generator using SPARQL construct.                    | Yes      |
|                                  | endpoint           | The SPARQL endpoint for the generator. If it starts with "file://", a local RDF file is queried. If omitted, the endpoint of the Iterator is used. | No       |
|                                  | batchSize          | Overrule the generator's behavior of fetching results for 10 bindings of $this per request.                          | No       |

## Installation

1. Install Node.js 20.10.0 or larger, by going to <https://nodejs.org> and following the instructions for your OS.

   Run the following command to test whether the installation succeeded:

   ```sh
   npm --version
   node --version
   ```

2. Install LD Workbench:

   ```sh
   npx @netwerk-digitaal-erfgoed/ld-workbench --init
   ```

   Your workbench is now ready for use.

## Usage

Once installed, an example workbench is present that can be run with the following command:

```sh
npx @netwerkdigitaalergoed/ld-workbench
```

### Configuring a workbench pipeline

To keep your workbench workspace clean, create a folder for each pipeline that contains the configuration and the SPARQL Select and Construct queries. Use the `static` directory for this.

Here is an example of how your file structure may look:

```sh
ld-workbench
|-- static
|   |-- my-pipeline
|   |   |-- configuration.yaml
|   |   |-- select.rq
|   |   |-- construct.rq
```

## Development

For local development, the following command should get you going:

```sh
git clone https://github.com/netwerk-digitaal-erfgoed/ld-workbench.git
cd ld-workbench
npm i
npm run build
```

To start the CLI tool you can use this command:

```sh
npm run ld-workbench -- --configDir static/example
```

Since this project is written in Typescript, your code needs to be transpiled to Javascript before you can run it (using `npm run build`). With `npm run dev` the transpiler will watch changes in the Typescript code an transpiles on each change.

The configuration of this project is validated and defined by [JSON Schema](https://json-schema.org). The schema is located in `./static/ld-workbench-schema.json`. To create the types from this schema, run `npm run util:json-schema-to-typescript`. This will regenerate `./src/types/LDWorkbenchConfiguration.d.ts`, do not modify this file by hand.

## Workflow & Class Descriptions

### Workflow

This figure represents the workflow of the LD Workbench application:

![Workflow of the LD-Workbench application](static/figures/diagram.svg)

A Pipeline can have multiple Stages, specified in the configuration file. A Stage has one Iterator and can have multiple Generators in it's configuration. An Iterator has to be connected to a SPARQL endpoint, when none is specified for the Generator(s), the Generator reuses the same SPARQL endpoint to generate linked data, when a different endpoint is specified in the Generator's configuration, this endpoint is used instead.

### Class Desscriptions

#### Pipeline

The Pipeline class orchistrates the data transformation process for each class, there can only be one pipeline, which is represented by the configuration file that is provided to the LD Workbench application. A Pipeline recursively runs each Stage specified in its configuration file, which generates data according to the configured iterator's and generator's SPARQL queries.

#### Stage

The Stage class initiates the Iterator and Generator(s), and uses an event stream to listen to incoming Iterator/Generator, end, and error events coming from the Iterator and Generator. The class itself also emits an end event, meaning the Iterator has finished its iterations and the generator(s) have generated the related data.

##### Previous Stage

The Previous Stage class is used to provide information from the stage that occurred before the current stage, for example the information about the endpoint from a previous stage.

#### Iterator

The Iterator class uses a SPARQL Select query to retrieve the `$this` target results from the endpoint. The result from the Iterator class is provided to the Generator class through an event emitter.

#### Generator Stage

The Generator class uses a SPARQL Construct query, pre-binded with the `$this` target from the Iterator, to retrieve the constructed triples from the endpoint. The result from the Generator class is provided to the Stage class through an event emitter.

#### Output Classes

##### File Class

The File class allows a file to be created from the Stage's `destinationPath` read and write streams, resulting in the creation of a local file with the generated results.

##### TriplyDB Class

The TriplyDB class serves as an example on how to LD Workbench could be used to upload generated data to a Triple Store. The class uses the `@triply/triplydb` package to upload the generated triples to a remote Triple Store like TriplyDB.

## CI/CD

This repository uses GitHub Actions for the CI, the configuration that concerns automated tests can be found in the [github-ci.yml file](https://github.com/netwerk-digitaal-erfgoed/ld-workbench/blob/main/.github/workflows/github-ci.yml).

To run the tests locally run the `npm test` command, for examples see files ending with `'*.test.ts'`.
