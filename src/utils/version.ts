import fs from 'fs';
import {fileURLToPath} from 'url';
import * as path from 'path';
export default function version(): string {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const filename = path.resolve(path.join(dirname, '..', '..', 'package.json'));
  const {version} = JSON.parse(fs.readFileSync(filename, 'utf-8'));
  return version;
}
