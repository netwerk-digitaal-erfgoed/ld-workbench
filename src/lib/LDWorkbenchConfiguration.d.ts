/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * JSON Schema for LDWorkbench.
 * It helps with the writing of the configuration needed to run LDWorkbench pipelines.
 */
export interface LDWorkbenchConfiguration {
  /**
   * The name of your pipeline, it must be unique over all your configurations.
   */
  name: string;
  /**
   * An optional description for your pipeline.
   */
  description?: string;
  /**
   * The file where the final result of your pipeline is saved.
   */
  destination?: string;
  /**
   * This is where you define the individual iterator/generator for each step.
   *
   * @minItems 1
   */
  stages: [
    {
      /**
       * The name of your pipeline step, it must be unique within one configuration.
       */
      name: string;
      iterator: {
        /**
         * Path (prefixed with "file://") or SPARQL Query
         * that makes the iterator using SPARQL select.
         */
        query: string;
        /**
         * The SPARQL endpoint for the iterator.
         * If it starts with "file://", a local RDF file is queried.
         * If omitted the result of the previous file is used.
         */
        endpoint?: string;
        /**
         * Overrule the iterator's behavior of fetching 10 results per request, regardless of any limit's in your query.
         */
        batchSize?: number;
      };
      generators?: {
        /**
         * Path (prefixed with "file://") or SPARQL Query
         * that makes the generator using SPARQL construct.
         */
        query: string;
        /**
         * The SPARQL endpoint for the generator.
         * If it starts with "file://", a local RDF file is queried.
         * If ommitted the endpoint of the Iterator is used.
         */
        endpoint?: string;
        /**
         * Overrule the generator's behaviour of fetching results for 10 bindings of $this per request.
         */
        batchSize?: number;
      }[];
      generator?: {
        /**
         * Path (prefixed with "file://") or SPARQL Query
         * that makes the generator using SPARQL construct.
         */
        query: string;
        /**
         * The SPARQL endpoint for the generator.
         * If it starts with "file://", a local RDF file is queried.
         * If omitted the endpoint of the Iterator is used.
         */
        endpoint?: string;
        /**
         * Overrule the generator's behavior of fetching results for 10 bindings of $this per request.
         */
        batchSize?: number;
      };
      /**
       * The file where the results are saved.
       * This is not a required property,
       * if omitted a temporary file will be created automatically.
       */
      destination?: string;
    },
    ...{
      /**
       * The name of your pipeline step, it must be unique within one configuration.
       */
      name: string;
      iterator: {
        /**
         * Path (prefixed with "file://") or SPARQL Query
         * that makes the iterator using SPARQL select.
         */
        query: string;
        /**
         * The SPARQL endpoint for the iterator.
         * If it starts with "file://", a local RDF file is queried.
         * If omitted the result of the previous file is used.
         */
        endpoint?: string;
        /**
         * Overrule the iterator's behavior of fetching 10 results per request, regardless of any limit's in your query.
         */
        batchSize?: number;
      };
      generators?: {
        /**
         * Path (prefixed with "file://") or SPARQL Query
         * that makes the generator using SPARQL construct.
         */
        query: string;
        /**
         * The SPARQL endpoint for the generator.
         * If it starts with "file://", a local RDF file is queried.
         * If ommitted the endpoint of the Iterator is used.
         */
        endpoint?: string;
        /**
         * Overrule the generator's behaviour of fetching results for 10 bindings of $this per request.
         */
        batchSize?: number;
      }[];
      generator?: {
        /**
         * Path (prefixed with "file://") or SPARQL Query
         * that makes the generator using SPARQL construct.
         */
        query: string;
        /**
         * The SPARQL endpoint for the generator.
         * If it starts with "file://", a local RDF file is queried.
         * If omitted the endpoint of the Iterator is used.
         */
        endpoint?: string;
        /**
         * Overrule the generator's behavior of fetching results for 10 bindings of $this per request.
         */
        batchSize?: number;
      };
      /**
       * The file where the results are saved.
       * This is not a required property,
       * if omitted a temporary file will be created automatically.
       */
      destination?: string;
    }[]
  ];
}
