import chalk from 'chalk';
import fs from 'fs'
import { type SelectQuery, type ConstructQuery, Parser } from 'sparqljs'

type QueryTypes = "select" | "construct"; 

type QueryType<T> = 
    T extends "select" ? SelectQuery :
    T extends "construct" ? ConstructQuery :
    never;

export default function getSPARQLQuery<T extends QueryTypes>(queryStringOrFile: string, type: T): QueryType<T> {
  let query = ''
  if (queryStringOrFile.startsWith('file://')) {
    const file = queryStringOrFile.replace('file://', '')
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      throw new Error(`File not found: ${chalk.italic(file)}`);
    }
    query = fs.readFileSync(file, 'utf-8')
  } else {
    query = queryStringOrFile
  }
  const parsed = (new Parser()).parse(query)
  if (parsed.type !== 'query') {
    throw new Error(`Unexpected querytype ${parsed.type}`)
  }
  if (parsed.queryType.toLowerCase() === type)
    return parsed as QueryType<T>
  else 
    throw new Error(`Unexpected querytype ${parsed.queryType}`)
}
