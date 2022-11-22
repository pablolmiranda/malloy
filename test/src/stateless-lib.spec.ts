import { Malloy, MalloyModel } from "@malloydata/malloy";
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
  static getTableList(malloyDocument: string): string[] {
    const parse = Malloy.parse({
      source: malloyDocument,
    });
    const translator = parse._translator;

    const result = translator.translate();
    console.log(result.translated);

    return result?.tables || [];
  }

  static generateMalloyModel(document: string, schemas: any): ModelResponse {
    const parse = Malloy.parse({
      source: document,
    });
    const translator = parse._translator;
    let result = translator.translate(translator.modelDef);
    translator.update({
      tables: schemas,
    });
    result = translator.translate(translator.modelDef);
    const queryList = result.translated?.queryList || [];
    const sqlBlocks = result.translated?.sqlBlocks || [];

    const model = new MalloyModel(translator.modelDef, queryList, sqlBlocks);

    // console.log(JSON.stringify(model, null, 2));

    return {
      model,
    };
  }

  // static generateBigQuerySQL(malloyModel, malloyQuery): SQLStatement {

  // }
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
    });
  });
});
