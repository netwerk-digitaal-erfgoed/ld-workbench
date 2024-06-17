import sparqljs, {type SparqlQuery} from 'sparqljs';
const {Generator} = sparqljs;

const generator = new Generator();

export abstract class BaseQuery {
  protected constructor(protected readonly query: SparqlQuery) {}

  protected abstract validate(): void;

  public toString = () => generator.stringify(this.query);
}
