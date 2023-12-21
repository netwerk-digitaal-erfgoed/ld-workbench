import Ajv, { type ValidateFunction, type ErrorObject } from 'ajv';
import parseYamlFile from './parseYamlFile.js';
import { fileURLToPath } from 'url';
import * as path from 'path';

/**
 * Validate an object against a JSON Schema provided as a YAML file.
 * @param configuration - The object to validate.
 * @param schemaFilePath - The path to the YAML file containing the JSON Schema.
 * @returns An array of validation errors if any, otherwise returns the configuration.
 */
export default function validate(filePathOrObject: object | string): ErrorObject[] | null {
  // Parse the YAML schema file
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const filename = path.resolve(path.join(dirname, '..', '..', 'static', 'ld-workbench.schema.json'))
  const schema = parseYamlFile(filename);
  const configuration = typeof filePathOrObject === 'string' 
  ? parseYamlFile(filePathOrObject)
  : filePathOrObject
  
  // Create an Ajv instance
  // @ts-expect-error This expression is constructable, probably an error in the types..
  const ajv = new Ajv();
  
  // Compile the schema
  const validate: ValidateFunction = ajv.compile(schema);

  // Validate the object against the schema
  const valid = validate(configuration);

  if (!valid) {
    // If validation fails, return the errors
    // @ts-expect-error if `valid` is false, the `validate.errors` object is not null
    return validate.errors;
  }

  // If validation succeeds, return null
  return null;
}
