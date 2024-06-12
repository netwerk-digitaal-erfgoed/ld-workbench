# Contributing to LD Workbench

First off, thank you for taking the time to contribute!

## Local development

For local development, this should get you going:

```sh
git clone https://github.com/netwerk-digitaal-erfgoed/ld-workbench.git
cd ld-workbench
npm i
npm run compile
npm run ld-workbench -- --config static/example
```

The configuration of this project is validated and defined by [JSON Schema](https://json-schema.org). The schema is located in `./static/ld-workbench-schema.json`. To create the types from this schema, run `npm run util:json-schema-to-typescript`. This will regenerate `./src/types/LDWorkbenchConfiguration.d.ts`, do not modify this file by hand.

## Committing changes

This repository follows [Semantic Versioning](https://semver.org). Tags and [releases](/releases) are
[created automatically](.github/workflows/release.yml) based on commit messages. So please make sure to follow
the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/#summary) when committing
changes.
