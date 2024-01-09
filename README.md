# LD Workbench

LD Workbench is a transformation tool for linked data that is designed to use SPARQL as its main configuration language.

LD Workbench is a Command Line Interface (CLI) application. LD Workbench is tested in Linux Bash, macOS Z shell, and Windows PowerShell.

This project is currently in a Proof-of-Concept phase. Feel free to watch our progress, but please do not use this project in a production setting.

## Approach

A *pipeline* is the sequence of *stages*.

Each *stage* consists of two components: an *iterator* and a *generator*.

The *iterator* component is configured by a SPARQL Select query. This query binds a sequence of RDF terms to a variable called `$this`. This sequence forms an iterator over a potentially large data collection. In the absence of a good approach for streaming through large data collections, the SPARQL standard allows us to apply 'pagination' through a large collection by using the Offset and Limit keywords.

Every binding for variable `$this` is used to parameterize a SPARQL Construct query; this is the *generator* component. Parameterization follows [SPARQL pre-binding](https://www.w3.org/TR/shacl/#pre-binding) according to the SHACL standard. Each SPARQL Construct query returns RDF triples that are part of the transformed result.

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
| Iterator                         | query              | Path (prefixed with "file://") or SPARQL Query that makes the iterator using SPARQL select.                        | Yes      |
|                                  | endpoint           | The SPARQL endpoint for the iterator. If it starts with "file://", a local RDF file is queried. If omitted, the result of the previous file is used. | No       |
|                                  | batchSize          | Overrule the iterator's behavior of fetching 10 results per request, regardless of any limits in your query.       | No       |
|                                  | delay              | Human-readable time delay for the iterator's SPARQL endpoint requests (e.g., '5ms', '100 milliseconds', '1s').   | No       |
| Generator                        | query              | Path (prefixed with "file://") or SPARQL Query that makes the generator using SPARQL construct.                    | Yes      |
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
   npx @netwerk-digitaal-ergoed/ld-workbench --init
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

## Publishing to NPM

To trigger a published release event in GitHub Actions, you need to create a release on your GitHub repository. Here are the general steps:

1. Navigate to the [LDWorkbench GitHub repository](https://github.com/netwerk-digitaal-erfgoed/ld-workbench).

2. Click on the "Releases" tab or visit <https://github.com/netwerk-digitaal-erfgoed/ld-workbench/releases>.

3. Click the "Draft a new release" button if you haven't created a release yet.

4. Fill in the necessary information for your release, such as the tag version, release title, and release description.

5. Optionally, attach any assets (e.g. release notes).

6. Click the "Publish release" button.

By publishing the release, you will trigger the "release" event in GitHub Actions, which can then execute the workflow specified [here](https://github.com/netwerk-digitaal-erfgoed/ld-workbench/blob/main/.github/workflows/npmjs.yml).
