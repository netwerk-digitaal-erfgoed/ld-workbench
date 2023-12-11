import type { NamedNode } from "@rdfjs/types";
import sparqljs from 'sparqljs'
import { type SelectQuery, type ConstructQuery } from 'sparqljs'
const { Generator } = sparqljs

// TODO should validate the SPARQL query

/**
 * 
 * @param query SPARQL construct/Select query template with $this
 * @param arrayOfNamedNodes an array of named nodes
 * @returns a batch SPARQL query 
 */

// REVIEW
// BUG in this implementation we cannot append and unionize several construct queries
// BUG this results in a failing query
// BUG moreover, the ?name is not unique, meaning there would be no way to construct the individual triples
/**
 *  RESULT: 
CONSTRUCT {
  <https://triplydb.com/triply/iris/id/floweringPlant/00118> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00118> <https://schema.org/additionalType> <http://vocab.getty.edu/aat/300343602>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00118> <https://schema.org/name> ?name.
}
WHERE {
  <https://triplydb.com/triply/iris/id/floweringPlant/00118> <http://www.w3.org/2000/01/rdf-schema#label> ?name.
  FILTER((LANG(?name)) = "en")
}
UNION # this is impossible in SPARQL
CONSTRUCT {
  <https://triplydb.com/triply/iris/id/floweringPlant/00119> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00119> <https://schema.org/additionalType> <http://vocab.getty.edu/aat/300343602>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00119> <https://schema.org/name> ?name.
}
WHERE {
  <https://triplydb.com/triply/iris/id/floweringPlant/00119> <http://www.w3.org/2000/01/rdf-schema#label> ?name.
  FILTER((LANG(?name)) = "en")
}
 * THIS QUERY IS ALSO INCORRECT

PREFIX sdo: <https://schema.org/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT
{
  <https://triplydb.com/triply/iris/id/floweringPlant/00138> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00138> <https://schema.org/additionalType> <http://vocab.getty.edu/aat/300343602>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00138> <https://schema.org/name> ?name.

  <https://triplydb.com/triply/iris/id/floweringPlant/00139> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00139> <https://schema.org/additionalType> <http://vocab.getty.edu/aat/300343602>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00139> <https://schema.org/name> ?name.

  <https://triplydb.com/triply/iris/id/floweringPlant/00140> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00140> <https://schema.org/additionalType> <http://vocab.getty.edu/aat/300343602>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00140> <https://schema.org/name> ?name.

  <https://triplydb.com/triply/iris/id/floweringPlant/00141> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00141> <https://schema.org/additionalType> <http://vocab.getty.edu/aat/300343602>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00141> <https://schema.org/name> ?name.

  <https://triplydb.com/triply/iris/id/floweringPlant/00142> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00142> <https://schema.org/additionalType> <http://vocab.getty.edu/aat/300343602>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00142> <https://schema.org/name> ?name.

  <https://triplydb.com/triply/iris/id/floweringPlant/00143> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00143> <https://schema.org/additionalType> <http://vocab.getty.edu/aat/300343602>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00143> <https://schema.org/name> ?name.

  <https://triplydb.com/triply/iris/id/floweringPlant/00144> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00144> <https://schema.org/additionalType> <http://vocab.getty.edu/aat/300343602>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00144> <https://schema.org/name> ?name.

  <https://triplydb.com/triply/iris/id/floweringPlant/00145> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00145> <https://schema.org/additionalType> <http://vocab.getty.edu/aat/300343602>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00145> <https://schema.org/name> ?name.

  <https://triplydb.com/triply/iris/id/floweringPlant/00146> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00146> <https://schema.org/additionalType> <http://vocab.getty.edu/aat/300343602>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00146> <https://schema.org/name> ?name.

  <https://triplydb.com/triply/iris/id/floweringPlant/00147> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00147> <https://schema.org/additionalType> <http://vocab.getty.edu/aat/300343602>.
  <https://triplydb.com/triply/iris/id/floweringPlant/00147> <https://schema.org/name> ?name.
}

WHERE {
  <https://triplydb.com/triply/iris/id/floweringPlant/00138> <http://www.w3.org/2000/01/rdf-schema#label> ?name.
  FILTER((LANG(?name)) = "en")
  
  <https://triplydb.com/triply/iris/id/floweringPlant/00139> <http://www.w3.org/2000/01/rdf-schema#label> ?name.
  FILTER((LANG(?name)) = "en")
} }
UNION

WHERE {
  <https://triplydb.com/triply/iris/id/floweringPlant/00140> <http://www.w3.org/2000/01/rdf-schema#label> ?name.
  FILTER((LANG(?name)) = "en")
}
UNION

WHERE {
  <https://triplydb.com/triply/iris/id/floweringPlant/00141> <http://www.w3.org/2000/01/rdf-schema#label> ?name.
  FILTER((LANG(?name)) = "en")
}
UNION

WHERE {
  <https://triplydb.com/triply/iris/id/floweringPlant/00142> <http://www.w3.org/2000/01/rdf-schema#label> ?name.
  FILTER((LANG(?name)) = "en")
}
UNION

WHERE {
  <https://triplydb.com/triply/iris/id/floweringPlant/00143> <http://www.w3.org/2000/01/rdf-schema#label> ?name.
  FILTER((LANG(?name)) = "en")
}
UNION

WHERE {
  <https://triplydb.com/triply/iris/id/floweringPlant/00144> <http://www.w3.org/2000/01/rdf-schema#label> ?name.
  FILTER((LANG(?name)) = "en")
}
UNION

WHERE {
  <https://triplydb.com/triply/iris/id/floweringPlant/00145> <http://www.w3.org/2000/01/rdf-schema#label> ?name.
  FILTER((LANG(?name)) = "en")
}
UNION

WHERE {
  <https://triplydb.com/triply/iris/id/floweringPlant/00146> <http://www.w3.org/2000/01/rdf-schema#label> ?name.
  FILTER((LANG(?name)) = "en")
}
UNION

WHERE {
  <https://triplydb.com/triply/iris/id/floweringPlant/00147> <http://www.w3.org/2000/01/rdf-schema#label> ?name.
  FILTER((LANG(?name)) = "en")
}
--> each ?name would need to be uniquely matched to the name

 */
function getBatchSPARQLQueryString(query: SelectQuery | ConstructQuery, arrayOfNamedNodes: NamedNode[]): string {
    let batchQuery: string = ''
    for (let index = 0; index < arrayOfNamedNodes.length; index++) {
        const value = arrayOfNamedNodes[index].value;
        const generator = new Generator();
        console.log(query.prefixes)
        if (index === 0) {
            batchQuery += generator.stringify(query).replaceAll(
                /[?$]\bthis\b/g,
                `<${value}>`
            );
        } else {
            query.prefixes = {} // clearing prefixes
            batchQuery += "\nUNION\n" + generator.stringify(query).replaceAll(
                /[?$]\bthis\b/g,
                `<${value}>`
            );
        }
    }

    // // BUG trying to fix this with string manipulation, but this could result in errors
    // // Also each variable should be uniquely matched

    // // Regular expression to extract CONSTRUCT { ... } patterns
    // const constructPatternRegex = /CONSTRUCT\s*{([^}]*)}/gs;

    // // Regular expression to extract WHERE { ... } patterns
    // const wherePatternRegex = /WHERE\s*{([^}]*)}/gs;

    // // Extract CONSTRUCT patterns from the query string
    // const constructMatches = batchQuery.match(constructPatternRegex);

    // // Remove CONSTRUCT patterns from the query string
    // const queryStringWithoutConstruct = batchQuery.replace(constructPatternRegex, '');

    // // Extract WHERE patterns from the query string
    // const whereMatches = queryStringWithoutConstruct.match(wherePatternRegex);

    // // Process matched CONSTRUCT patterns
    // const cleanedConstructMatches = constructMatches?.map(match => match.replace(/CONSTRUCT\s*{([\s\S]*)}/, '$1')).join('')

    // // Process matched WHERE patterns
    // const cleanedWhereMatches = whereMatches?.map(match => match.replace(/WHERE\s*{([\s\S]*)}/, '$1')).join('')

    // batchQuery = `CONSTRUCT\n{${cleanedConstructMatches}}\nWHERE{${cleanedWhereMatches}}`

    // console.log('🪵  | file: getBatchSPARQLQueryString.ts:191 | batchQuery:', batchQuery)
    return batchQuery
}

export default getBatchSPARQLQueryString