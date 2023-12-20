import type { NamedNode, Variable } from "@rdfjs/types";
import type { ConstructQuery, UnionPattern } from "sparqljs";
import sparqljs from 'sparqljs'
import { v4 as uuidv4 } from 'uuid';
const { Generator } = sparqljs

class UniqueUUIDMap {
  private readonly map = new Map<string, string>();

  getOrCreateUUID(value: string): string {
    if (this.map.has(value)) {
      // If the value has been encountered before, return the existing UUID
      return this.map.get(value)!;
    } else {
      // If it's a new value, generate a new UUID and store it in the map
      // SPARQL doesn't allow '-' in variables
      const newUUID = uuidv4().replace(/-/g, '');
      this.map.set(value, newUUID);
      return newUUID;
    }
  }
}

const isVariable = (obj: any): obj is Variable => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    "termType" in obj &&
    obj.termType === "Variable"
  );
};

function isUUID(input: string): boolean {
  const uuidPattern = /^[a-fA-F0-9]{8}[a-fA-F0-9]{4}[a-fA-F0-9]{4}[a-fA-F0-9]{4}[a-fA-F0-9]{12}$/;
  return uuidPattern.test(input);
}

function sparqlAstMutation(obj: any, namedNodeValue: string, variablesMap: UniqueUUIDMap): any {
  if (isVariable(obj)) {
    if(obj.value === "this"){
      obj = {
        ...obj,
        termType: "NamedNode",
        value: namedNodeValue
      } satisfies NamedNode
    } else if (!isUUID(obj.value)){
      obj.value = variablesMap.getOrCreateUUID(obj.value)
    }
  }
  return obj
}

/**
 * This function should make unique variables with UUID for each matching variable in the query and replace $this with a named node in the query
 * @param obj a ConstructQuery object that could contain variables with values (e.g. Triples)
 * @param UUIDMap a hash map that stores unique variables as keys and uses UUID as values - will return UUID if key already exists
 * @param namedNodeValue a named node that should replace $this in the query
 * @return the given input object, making every matching variable unique and replacing $this with the target named node
*/
// eachDeep(obj, (obj) => {sparqlAstMutation(obj, namedNodeValue, variablesMap)})
function recursiveSparqlAstMutations(obj: any, namedNodeValue: string, variablesMap: UniqueUUIDMap): any {
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      // If obj is an array, recursively process each element
      return obj.map((item) => recursiveSparqlAstMutations(item, namedNodeValue, variablesMap));
    } else {
      // If obj is an object, recursively process each property in the object
      const mutatedObject: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          mutatedObject[key] = recursiveSparqlAstMutations(obj[key], namedNodeValue, variablesMap);
        }
      }
      return sparqlAstMutation(mutatedObject, namedNodeValue, variablesMap);
    }
  }
  return obj;
}


function unionizeConstructQueries(queries: ConstructQuery[]): ConstructQuery {
  const prefixes = queries[0].prefixes
  const base = queries[0].base
  // making sure queries have a template
 queries = queries.filter(({ template }) => template);

 const template = queries.flatMap(query => query.template!)
  // making sure queries have a where
  queries = queries.filter(({ where }) => where);
  // creating unionized query for every where clause beyond the first query
  const unionPattern: UnionPattern = {
    type: "union",
    patterns: queries.map(q => ({ type: "group", patterns: q.where! }))
  }
  // adding the union pattern to the batchQuery
  const batchQuery = {
    queryType: "CONSTRUCT" as "CONSTRUCT",
    type: "query" as "query",
    base,
    prefixes,
    where: [unionPattern],
    template,
  }
  return batchQuery
}


/**
 * 
 * @param query SPARQL construct/Select query template with $this
 * @param arrayOfNamedNodes an array of named nodes
 * @returns a batch SPARQL query 
 */
function getBatchSPARQLQueryString(query: ConstructQuery, arrayOfNamedNodes: NamedNode[]): string {
  const generator = new Generator();
  const uniqueQueries: ConstructQuery[] = []
  /**
   *    [ ] test for nested construct queries - Use Iva's example queries
   */

  for (let index = 0; index < arrayOfNamedNodes.length; index++) {
    const variablesMap = new UniqueUUIDMap()
    

    // Manipulate the AST to create the batch query
      const namedNodeValue = arrayOfNamedNodes[index].value;

      // should change the query object's $this and variables to UUID
      const uniqueQuery = recursiveSparqlAstMutations(query, namedNodeValue, variablesMap)

      // each query now should have unique variables for each matching variable and a target named node
      uniqueQueries.push(uniqueQuery)

    }
    const batchQuery = unionizeConstructQueries(uniqueQueries)
    return generator.stringify(batchQuery)
  }

export default getBatchSPARQLQueryString