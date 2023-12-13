import type { NamedNode, BlankNode, Variable } from "@rdfjs/types";
import type { SelectQuery, ConstructQuery } from "sparqljs";
import sparqljs  from 'sparqljs'
import { v4 as uuidv4 } from 'uuid';
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

class UniqueUUIDMap {
  private readonly map = new Map<string, string>();

  getOrCreateUUID(value: string): string {
    if (this.map.has(value)) {
      // If the value has been encountered before, return the existing UUID
      return this.map.get(value)!;
    } else {
      // If it's a new value, generate a new UUID and store it in the map
      const newUUID = uuidv4();
      this.map.set(value, newUUID);
      return newUUID;
    }
  }
}

const isSubject = (S: sparqljs.IriTerm | BlankNode | Variable ): S is sparqljs.IriTerm | BlankNode | Variable => {
  return (
    typeof S === 'object' &&
    S !== null &&
    'termType' in S &&
    'value' in S
  );
};
const isObject = (O: sparqljs.Term): O is sparqljs.Term => {
  return (
    typeof O === 'object' &&
    O !== null &&
    'termType' in O &&
    'value' in O
  );
};

function getBatchSPARQLQueryString(query: SelectQuery | ConstructQuery, arrayOfNamedNodes: NamedNode[]): string {
    let batchQuery: string = ''
    /**
     * 
     * [x] the query.template contains the contruct elements, each Variable that is the same variable and is not "this" should get a unique UUID
     *    [ ] test for nested construct queries - most likely will fail with current approach
     * [ ] figure out how the UNIONS work
     * [ ] do the same for query.where OR make UNIONs for the where clauses
     */

    // REVIEW approach feels to specific for given query, not generic enough
    for (let index = 0; index < arrayOfNamedNodes.length; index++) {
      // Manipulate the AST to create the batch query
      if (query.queryType === "CONSTRUCT" && (query.template !== undefined) && (query.where !== undefined)){
        // go over variables of the CONSTRUCT template
        // TODO should test for nested queries
        const values = new UniqueUUIDMap
        for (let index = 0; index < query.template.length; index++){
          const SPO = query.template[index]
          let sub = SPO.subject as unknown as any
          let obj = SPO.object as unknown as any
          if (isSubject(sub)  && (sub.value !== "this")){
            sub = { ...sub, value: values.getOrCreateUUID(sub.value)}
          }  
          if (isObject(obj) && (obj.value !== "this")){
            obj = { ...obj, value: values.getOrCreateUUID(obj.value)}
          }

          query.template[index] = {...SPO, subject: (sub ?? SPO.subject), object: (obj ?? SPO.object) }
          console.log('🪵  | file: getBatchSPARQLQueryString.ts:199 | getBatchSPARQLQueryString |   query.template[index]:',   query.template[index])

        }

        /**
         * query.where
         * 
          [
            { type: 'bgp', triples: [ [Object] ] },
            {
              type: 'filter',
              expression: { type: 'operation', operator: '=', args: [Array] }
            }
          ]
         */
         const triples = (query.where[0] as any).triples // triples is in the object but seems to not be retrievable
         console.log('🪵  | file: getBatchSPARQLQueryString.ts:226 | getBatchSPARQLQueryString | triples:', triples)

         const args = (query.where[1] as any).expression.args
         console.log('🪵  | file: getBatchSPARQLQueryString.ts:229 | getBatchSPARQLQueryString | args:', args)

      }
      const value = arrayOfNamedNodes[index].value;
        const generator = new Generator();
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