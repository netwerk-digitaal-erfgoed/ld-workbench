# LDWorkbench

LDWorkbench is a Linked Data Transformation tool designed to use only SPARQL as transformation language.

This project is currently in a Proof of Concept phase, feel free to watch our progress, but please do not use this project in a production setup.

## How an LD Workbench pipelines works

A *pipeline* is the set of instructions that are run to transform Linked Data. It consists of *stages* with *iterators* and *generators*.

The idea of this project is to use SPARQL `select` to create an iterator of iri's (defined by *binding* `$this`) from an endpoint or local RDF file. This makes it possible to go over huge datasets by paginating results using SPARQL `offset` and `limit` parameters. Each yield of `$this` is then used as input for a SPARQL `construct` query that will be [pre-binded](https://www.w3.org/TR/shacl/#pre-binding) with `$this`. The generator creates RDF statements that will be part of the endresult of the workbench pipeline.

Each pipeline consists of 1 or more *stages*, where a *stage* is the combination of 1 iterator and 1 generator (more that 1 generator will be implemented later).

A workbench pipeline is defined by a configuration file, stored in [YAML](https://yaml.org). The configuration is validated using a [JSON Schema](https://json-schema.org). The schema [is part of this repository](https://github.com/netwerk-digitaal-erfgoed/ld-workbench/blob/main/static/ld-workbench.schema.json). The easiest way to work with YAML files and JSON Schemas is to use Microsoft's [Visual Studio Code](https://code.visualstudio.com). If you follow the installation instructions and use the `--init` script, your workbench project will contain the correct settings to work with YAML files and JSON Schemas without any extra settings.

A pipeline must have a `name`, 1 or more `stages` and optionaly a `description`. If you have multiple pipelines, each pipepline must have a unique name.  See the [example configuration file](https://github.com/netwerk-digitaal-erfgoed/ld-workbench/blob/main/static/example/config.yml) for a boilerplate configuration file. A visualisation of the schema giving more insights on required and optional properties can be [found here](https://json-schema.app/view/%23?url=https%3A%2F%2Fraw.githubusercontent.com%2Fnetwerk-digitaal-erfgoed%2Fld-workbench%2Fmain%2Fstatic%2Fld-workbench.schema.json).

## Install & Usage

LDWorkbench is a CLI (*Command Line Interface*) application. That means there is no visual window to run the application in, in stead it runs in a shell *terminal*. There are lots of shells, e.g. `bash` on Linux, `zsh` on MacOs and `PowerShell` on Windows. Consult the manual of your OS if you do not know how to start a terminal screen.

The LDWorkbench project runs using Javascript. To run the application you will need to install [Node.js](https://nodejs.org/en). You can downlaod an installer for your platform on their website. To see if you have Node,js installed, run this commandos in your terminal:
```bash
npm --version
node --version
```


Both commands should print the version to your terminal. For Node.js we recommend at least the LTS (*Long Term Support*) version `20.10.0`.

The quickest way to get started with LDWorkbench is to follow these instruction:

```bash
npx ld-workbench --init
```

Your workbench is now ready for use. An example workbench is provided, run it with this command:

```bash
npx ld-workbench
```

### Configuring a workbench pipeline
To keep your workbench workspace clean, we recommend to create a folder for each pipeline that contains the configuration and the SPARQL select and construct queries. The application uses the folder `pipelines/configurations` by default to look for YAML configurations of pipelines, so it is best to save your configuratiosn there.

An example pipeline folders and files structure might look like this:

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
For local development, this script should get you going:
```bash
git clone https://github.com/netwerk-digitaal-erfgoed/ld-workbench.git
cd ld-workbench
npm i
npm run build
```

To start the CLI tool you can use this command:
```bash
npm run ld-workbench -- --configDir static/example
```

Since this project is written in Typescript, your code needs to be traspiled to Javascript before you can run it (using `npm run build`). With `npm run dev` the transpiler will watch changes in the Typescript code an transpiles on each change.

The configuration of this project is validated and defined by [JSON Schema](https://json-schema.org). The schema is located in `./static/ld-workbench-schema.json`. To create the types from this schema, run `npm run util:json-schema-to-typescript`. This will regenerate `./src/types/LDWorkbenchConfiguration.d.ts`, do not modify this file by hand.

