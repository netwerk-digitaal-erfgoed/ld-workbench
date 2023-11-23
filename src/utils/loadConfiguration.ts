import type { LDWorkbenchConfiguration } from '../lib/LDWorkbenchConfiguration.js';
import parseYamlFile from './parseYamlFile.js';
import validate from './validate.js';

/**
 * This is a wrapper for the YAML Parser and Schema Validator
 * to provide a 1 step loader.
 */
export default function loadConfiguration (filePath: string): LDWorkbenchConfiguration {
  const configuration = parseYamlFile(filePath)
  const errors = validate(configuration)
  if (errors !== null) {
    throw new Error(`The YAML file \`${filePath}\` is not a valid LD Workbench configuration file.`)
  }
  return configuration
}