import chalk from 'chalk';
import fs from 'fs';
import {
  type SelectQuery,
  type ConstructQuery,
  Parser,
  type Pattern,
} from 'sparqljs';

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
  let query = '';
  if (queryStringOrFile.startsWith('file://')) {
    const file = queryStringOrFile.replace('file://', '');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      throw new Error(`File not found: ${chalk.italic(file)}`);
    }
    query = fs.readFileSync(file, 'utf-8');
  } else {
    query = queryStringOrFile;
  }
  const parsed = new Parser().parse(query);
  if (parsed.type !== 'query') {
    throw new Error(`Unexpected querytype ${parsed.type}`);
  }
  if (parsed.queryType.toLowerCase() === type) {
    const query = parsed as QueryType<T>;
    if (query.queryType === 'CONSTRUCT') {
      checkSPARQLConstructQuery(query.where);
    }
    return query;
  } else throw new Error(`Unexpected querytype ${parsed.queryType}`);
}

/**
 * because we use prebinding, our query must follow the rules as specified by
 * https://www.w3.org/TR/shacl/#pre-binding:
 * - SPARQL queries must not contain a MINUS clause
 * - SPARQL queries must not contain a federated query (SERVICE)
 * - SPARQL queries must not contain a VALUES clause
 * - SPARQL queries must not use the syntax form `AS ?var` for any potentially pre-bound variable
 */
function checkSPARQLConstructQuery(patterns?: Pattern[]): void {
  if (patterns === undefined) return;
  for (const pattern of patterns) {
    if (pattern.type === 'bind') {
      if (pattern.variable.value === 'this') {
        throw new Error(
          'SPARQL queries must not use the syntax form `AS ?this` because it is a pre-bound variable'
        );
      }
    }
    if (pattern.type === 'minus')
      throw new Error(
        'SPARQL construct queries must not contain a MINUS clause'
      );
    if (pattern.type === 'service')
      throw new Error(
        'SPARQL construct queries must not contain a SERVICE clause'
      );
    if (pattern.type === 'values')
      throw new Error(
        'SPARQL construct queries must not contain a VALUES clause'
      );
    if (
      pattern.type === 'optional' ||
      pattern.type === 'union' ||
      pattern.type === 'group' ||
      pattern.type === 'graph'
    ) {
      checkSPARQLConstructQuery(pattern.patterns);
    }
  }
}
