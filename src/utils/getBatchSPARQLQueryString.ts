import type { NamedNode } from "@rdfjs/types";
import sparqljs from 'sparqljs'
import { type SelectQuery, type ConstructQuery } from 'sparqljs'
const { Generator } = sparqljs

/**
 * 
 * @param query SPARQL construct/Select query template with $this
 * @param arrayOfNamedNodes an array of named nodes
 * @returns a batch SPARQL query 
 */
function getBatchSPARQLQueryString(query: SelectQuery | ConstructQuery, arrayOfNamedNodes: NamedNode[]): string {
  let batchQuery: string = ''
  for (let index = 0; index < arrayOfNamedNodes.length; index++) {
    const value = arrayOfNamedNodes[index].value;
    const generator = new Generator();
    console.log(query.prefixes)
    if (index === 0){
        batchQuery += generator.stringify(query).replaceAll(
            /[?$]\bthis\b/g,
            `<${value}>`
            );
        }else{
            query.prefixes = {} // clearing prefixes
            console.log(query.prefixes)
            batchQuery += " UNION " + generator.stringify(query).replaceAll(
                /[?$]\bthis\b/g,
            `<${value}>`
            );
    }
  }
  
  return batchQuery
}

export default getBatchSPARQLQueryString