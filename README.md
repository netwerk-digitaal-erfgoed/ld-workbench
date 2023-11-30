# LDWorkbench

LDWorkbench is a Linked Data Transformation tool designed to use only SPARQL as transformation language.

This project is currently in a Proof of Concept phase, feel free to watch our progress, but please do not use this project in a production setup.

## Install & Usage
The quickest way to get started with LDWorkbench is follow these instruction:

```bash
mkdir ldworkbench
cd ldworkbench
npm i git+https://github.com/netwerk-digitaal-erfgoed/ld-workbench.git
npx ldworkbench --init
```

Your workbench is now ready for use. An example workbench is provided, run it with this command:

```bash
npx ldworkbench
```

### Configuring a workbench project


## Development
For local development, these script should get you going:
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

