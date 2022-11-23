import { Malloy, MalloyModel, PreparedQuery } from "@malloydata/malloy";

type SQLStatement = string;
type MalloyModelTextDefinition = string;

type ModelResponse = {
  model: MalloyModel;
};

/**
 * The MalloyStateless is a library that uses Malloy to fulfill the
 * Malloy V8 Service interface.
 * The library has 3 goals:
 *  - Give the list of necessary tables to generate a full model
 *  - Build a new model using the model text definition and the table schemas
 *  - Generate the necessary BigQuery SQL using a malloy model and a malloy query
 */
export class MalloyStateless {
  /**
   * Return the list of tables required by the model
   */
  static getTableList(malloyDocument: MalloyModelTextDefinition): string[] {
    /**
     * Create the parse representation of the document ( malloy model text definition )
     */
    const parse = Malloy.parse({
      source: malloyDocument,
    });

    /**
     * Extract the Malloy Translator
     */
    const translator = parse._translator;

    /**
     * Process ( compile ) the model definition to generate the necessary abstraction,
     * include the list of table schemas we need.
     */
    const result = translator.translate();

    /**
     * Return the list of table the model needs schema information
     */
    return result?.tables || [];
  }

  /**
   * Generate the Malloy model from a document ( model text definition ) and the database schemas
   */
  static generateMalloyModel(document: string, schemas: any): ModelResponse {
    /**
     * Create the parse representation of the document ( malloy model text definition )
     */
    const parse = Malloy.parse({
      source: document,
    });

    /**
     * Process ( compile ) the model definition to generate the necessary abstraction,
     * include the list of table schemas we need.
     */
    const translator = parse._translator;

    /**
     * Update the translator with the schema definitions
     */
    translator.update({
      tables: schemas,
    });

    /**
     * Force a re-evaluation, now with the schemas and extract the necessary
     * parts to build the model
     */
    const result = translator.translate(translator.modelDef);
    const queryList = result.translated?.queryList || [];
    const sqlBlocks = result.translated?.sqlBlocks || [];

    /**
     * Build the Malloy model
     */
    const model = new MalloyModel(translator.modelDef, queryList, sqlBlocks);

    /**
     * REturn the model as part of the response object
     */
    return {
      model,
    };
  }

  /**
   * Use the Malloy model to generate the SQL for a malloy query
   */
  static generateSQLQuery(model: MalloyModel, query: string): SQLStatement {
    /**
     * Compile the query to a parse object
     */
    const parse = Malloy.parse({
      source: query,
    });

    /**
     * Now, use the existent model to inject the necessary definitions
     * to generate the query.
     */
    const result = parse._translator.translate(model._modelDef);

    /**
     * Extract the list of queries
     */
    const queryList = result.translated?.queryList;

    /**
     * If the query can be parsed and it is using the model correctly
     * it will exist as the first object inside the query list.
     */
    if (queryList && queryList[0]) {
      const queryListItem = queryList[0];

      /**
       * Build a new PreparedQuery to extract the SQL from it
       */
      const preparedQuery = new PreparedQuery(queryListItem, model._modelDef);

      /**
       * Return the SQL for the query
       */
      return preparedQuery.preparedResult.sql;
    }

    /**
     * Throw an exception because we couldn't generate the SQL.
     * We need a better error information here, so the user can try to
     * recover. Maybe it is a query definition that need to change.
     */
    throw new Error("It was not possible to generate the SQL query");
  }
}