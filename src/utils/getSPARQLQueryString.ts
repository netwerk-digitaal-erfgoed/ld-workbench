import sparqljs from 'sparqljs'
import { type SelectQuery, type ConstructQuery } from 'sparqljs'
const { Generator } = sparqljs

function getSPARQLQueryString(query: SelectQuery | ConstructQuery): string {
  const generator = new Generator();
  return generator.stringify(query);
}

export default getSPARQLQueryString