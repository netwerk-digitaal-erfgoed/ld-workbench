import fs from 'fs';
import {fileURLToPath} from 'url';
import * as path from 'path';
import glob from 'glob';

export default function init(): void {
  const $dirname = path.dirname(fileURLToPath(import.meta.url));
  if (fs.existsSync(path.join('pipelines', 'configurations', 'example'))) {
    throw new Error(
      'The --init script found an existing directory "' +
        path.join('pipelines', 'configurations', 'example') +
        '". Make sure this directory does not exist before running this script.'
    );
  }
  fs.mkdirSync(path.join('pipelines', 'data'), {recursive: true});
  fs.mkdirSync(path.join('pipelines', 'configurations', 'example'), {
    recursive: true,
  });
  const filepaths = glob.sync(
    path.join($dirname, '..', '..', 'static', 'example', '*')
  );
  for (const filepath of filepaths) {
    fs.copyFileSync(
      filepath,
      path.join(
        'pipelines',
        'configurations',
        'example',
        path.basename(filepath)
      )
    );
  }
  const yamlFile = path.join(
    'pipelines',
    'configurations',
    'example',
    'config.yml'
  );
  const yaml = fs
    .readFileSync(yamlFile, 'utf-8')
    .replaceAll(/\/static\//g, '/pipelines/configurations/');
  fs.writeFileSync(yamlFile, yaml);

  const yamlSchemasSettings = {
    'yaml.schemas': {
      'node_modules/ld-workbench/static/ld-workbench.schema.json': [
        'pipelines/configurations/**/*.yml',
        'static/example/*.yml',
      ],
    },
  };

  const extensions = [
    'dbaeumer.vscode-eslint',
    'stardog-union.vscode-langserver-sparql',
    'stardog-union.stardog-rdf-grammars',
    'MarkLindeman.turtle-vocab-autocomplete',
  ];

  // setting up VSC/Git settings, if this fails, that's fine:
  try {
    if (!fs.existsSync('.gitignore')) {
      fs.writeFileSync('.gitignore', 'node_modules\n');
    }
    if (!fs.existsSync('.vscode')) fs.mkdirSync('.vscode');
    const settingsFile = path.join('.vscode', 'settings.json');
    const extensionsFile = path.join('.vscode', 'extensions.json');
    if (!fs.existsSync(settingsFile)) {
      fs.writeFileSync(
        settingsFile,
        JSON.stringify(yamlSchemasSettings, undefined, 2)
      );
    } else {
      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
      if (!Object.hasOwn(settings, 'yaml.schemas')) {
        settings['yaml.schemas'] = yamlSchemasSettings['yaml.schemas'];
      } else {
        settings['yaml.schemas'][
          'node_modules/ld-workbench/static/ld-workbench.schema.json'
        ] =
          yamlSchemasSettings['yaml.schemas'][
            'node_modules/ld-workbench/static/ld-workbench.schema.json'
          ];
      }
      fs.writeFileSync(
        settingsFile,
        JSON.stringify(yamlSchemasSettings, undefined, 2)
      );
    }

    if (!fs.existsSync(extensionsFile)) {
      fs.writeFileSync(
        extensionsFile,
        JSON.stringify({recommendations: extensions}, undefined, 2)
      );
    } else {
      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
      if (!Object.hasOwn(settings, 'recommendations')) {
        settings.recommendations = extensions;
      } else {
        settings.recommendations = (
          settings.recommendations as string[]
        ).concat(extensions);
      }
      fs.writeFileSync(
        settingsFile,
        JSON.stringify(settingsFile, undefined, 2)
      );
    }
  } catch (e) {
    // Ignore.
  }
}
