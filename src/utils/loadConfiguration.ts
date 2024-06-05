import type {LDWorkbenchConfiguration} from '../lib/LDWorkbenchConfiguration.js';
import parseYamlFile from './parseYamlFile.js';
import validate from './validate.js';
import path from 'node:path';
import {dirname} from 'path';

/**
 * This is a wrapper for the YAML Parser and Schema Validator
 * to provide a 1 step loader.
 */
export default function loadConfiguration(
  filePath: string
): LDWorkbenchConfiguration {
  const configuration = parseYamlFile(filePath) as LDWorkbenchConfiguration;
  const errors = validate(configuration);
  if (errors !== null) {
    throw new Error(
      `The YAML file \`${filePath}\` is not a valid LD Workbench configuration file.`
    );
  }

  return mapObject(
    configuration,
    inlineQueryFromFile(configuration.baseDir ?? dirname(filePath))
  ) as LDWorkbenchConfiguration;
}

const mapObject = (obj: object, replacer: (from: string) => string): object => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (typeof value === 'string' && value.startsWith('file://')) {
        return [key, replacer(value)];
      } else if (Array.isArray(value)) {
        return [key, value.map(v => mapObject(v, replacer))];
      } else if (typeof value === 'object') {
        return [key, mapObject(value, replacer)];
      } else {
        return [key, value];
      }
    })
  );
};

const inlineQueryFromFile =
  (directory: string) =>
  (prefixedFilePath: string): string => {
    const filePath = prefixedFilePath.replace('file://', '');

    if (path.isAbsolute(filePath)) {
      return prefixedFilePath;
    }

    return `file://${path.resolve(directory, filePath)}`;
  };
