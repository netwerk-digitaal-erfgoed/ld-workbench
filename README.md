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

To keep your workbench workspace clean, create a folder for each pipeline that contains the configuration and the SPARQL Select and Construct queries. The application uses the folder `pipelines/configurations` by default to look for YAML configurations of pipelines, so it is easiest to save your configuration there.

You file structure may look like this:

```
your-working-dir
|-- pipelines
|   |-- configurations
|   |   |-- my-pipeline
|   |   |   |-- configuration.yaml
|   |   |   |-- select.rq
|   |   |   |-- construct.rq
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
