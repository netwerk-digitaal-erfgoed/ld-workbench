import sparqljs, {Query} from 'sparqljs';
import {NamedNode} from '@rdfjs/types';
const {Generator} = sparqljs;

const generator = new Generator();

export abstract class BaseQuery {
  protected constructor(protected readonly query: Query) {}

  protected abstract validate(): void;

  public toString = () => generator.stringify(this.query);

  public withDefaultGraph(graph?: NamedNode): this {
    if (undefined !== graph) {
      this.query.from = {default: [graph], named: []};
    }
    return this;
  }
}
