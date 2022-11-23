import { MalloyStateless } from "@malloydata/stateless-lib";
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
