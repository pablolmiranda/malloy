import { Malloy, MalloyModel, PreparedQuery } from "@malloydata/malloy";
import tableSchemas from "./db_schemas/duckdb";

const modelText = `
source: carriers is table('duckdb:carriers'){
  measure: carrier_count is count()
}

source: airports is table('duckdb:airports'){
  measure: airport_count is count()
}

source: flights is table('duckdb:flights') {
  join_one: carriers on carrier=carriers.code
  join_one: dest is airports on destination=dest.code
  join_one: orig is airports on origin=orig.code

  measure:
    flight_count is count()
    total_distance is distance.sum()
    aircraft_count is count(distinct tail_num)
    dest_count is dest.airport_count
    carrier_count is count(distinct carrier)

  dimension: flight_length is distance?
      pick 'short' when <  200
      pick 'medium' when < 800
      pick 'regional' when < 1500
      else 'long'

  query: by_carrier is {
    group_by: carriers.nickname
    aggregate:
      flight_count
      total_distance
      aircraft_count
      dest_count
  }

  query: by_origin is {
    group_by: orig.code, orig.city
    aggregate:
      flight_count
      dest_count
      carrier_count
  }
}

query: flights ->  {
  group_by: carriers.nickname
  nest: by_month_line_chart is {
    group_by: dep_qtr is dep_time.quarter
    aggregate: flight_count
    group_by: flight_length
  }
}
`;

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
class MalloyStateless {
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

describe("Malloy Stateless library", () => {
  describe("static getNecessaryTables", () => {
    it("should extract the table names defined on the model", () => {
      const tables = MalloyStateless.getTableList(modelText);

      expect(tables).toStrictEqual([
        "duckdb:carriers",
        "duckdb:airports",
        "duckdb:flights",
      ]);
    });
  });

  describe("static generateMalloyModel", () => {
    it("should create a new malloy model", () => {
      const response = MalloyStateless.generateMalloyModel(
        modelText,
        tableSchemas
      );
      expect(response.model).not.toBeNull();
      expect(response.model._modelDef.contents).toEqual({
        carriers: expect.anything(),
        airports: expect.anything(),
        flights: expect.anything(),
      });

      const preparedQuery = response.model.getPreparedQueryByIndex(0);
      expect(preparedQuery).not.toBeNull();
      expect(preparedQuery._query.structRef).toBe("flights");
      expect(typeof preparedQuery.preparedResult.sql).toBe("string");
    });
  });

  describe("static generateSQLQuery", () => {
    it("returns a SQL statement from a malloy model and query", () => {
      const { model } = MalloyStateless.generateMalloyModel(
        modelText,
        tableSchemas
      );

      const query = `
        query: flights -> {
          aggregate: flight_count
        }
      `;

      const sql = MalloyStateless.generateSQLQuery(model, query);
      expect(sql).toMatchSnapshot();
    });
  });
});
