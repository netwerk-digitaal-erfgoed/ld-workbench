import * as fs from 'fs';
import * as yaml from 'js-yaml';

export default function parseYamlFile(filePath: string): object {
  // Check if the file exists and is a file
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Read the YAML file
  const yamlContent = fs.readFileSync(filePath, 'utf-8');

  try {
    // Parse YAML to JSON
    return yaml.load(yamlContent) as object;
  } catch (e) {
    throw new Error(
      `Error parsing file: \`${filePath}\`, are you sure it is a YAML file?`
    );
  }
}
