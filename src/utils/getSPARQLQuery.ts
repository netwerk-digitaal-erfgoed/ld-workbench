import chalk from 'chalk';
import fs from 'fs';
import {type SelectQuery, type ConstructQuery, Parser} from 'sparqljs';

type QueryTypes = 'select' | 'construct';

type QueryType<T> = T extends 'select'
  ? SelectQuery
  : T extends 'construct'
    ? ConstructQuery
    : never;

export default function getSPARQLQuery<T extends QueryTypes>(
  queryStringOrFile: string,
  type: T
): QueryType<T> {
  const query = queryStringOrFile.startsWith('file://')
    ? readQueryFromFile(queryStringOrFile)
    : queryStringOrFile;
  const parsed = new Parser().parse(query);
  if (parsed.type !== 'query') {
    throw new Error(`Unexpected querytype ${parsed.type}`);
  }
  if (parsed.queryType.toLowerCase() === type) {
    return parsed as QueryType<T>;
  }

  throw new Error(`Unexpected querytype ${parsed.queryType}`);
}

function readQueryFromFile(file: string): string {
  const fileName = file.replace('file://', '');
  if (!fs.existsSync(fileName) || !fs.statSync(fileName).isFile()) {
    throw new Error(`File not found: ${chalk.italic(fileName)}`);
  }
  return fs.readFileSync(fileName, 'utf-8');
}
