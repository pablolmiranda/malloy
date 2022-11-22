export default {
  "duckdb:carriers": {
    type: "struct",
    name: "duckdb:carriers",
    dialect: "duckdb",
    structSource: {
      type: "table",
      tablePath: "duckdb:carriers",
    },
    structRelationship: {
      type: "basetable",
      connectionName: "duckdb",
    },
    fields: [
      {
        type: "string",
        name: "code",
      },
      {
        type: "string",
        name: "nickname",
      },
    ],
  },
  "duckdb:airports": {
    type: "struct",
    name: "duckdb:airports",
    dialect: "duckdb",
    structSource: {
      type: "table",
      tablePath: "duckdb:airports",
    },
    structRelationship: {
      type: "basetable",
      connectionName: "duckdb",
    },
    fields: [
      {
        type: "string",
        name: "code",
      },
      {
        type: "string",
        name: "city",
      },
    ],
  },
  "duckdb:flights": {
    type: "struct",
    name: "duckdb:flights",
    dialect: "duckdb",
    structSource: {
      type: "table",
      tablePath: "duckdb:flights",
    },
    structRelationship: {
      type: "basetable",
      connectionName: "duckdb",
    },
    fields: [
      {
        type: "string",
        name: "carrier",
      },
      {
        type: "string",
        name: "origin",
      },
      {
        type: "string",
        name: "destination",
      },
      {
        type: "string",
        name: "flight_num",
      },
      {
        type: "number",
        name: "flight_time",
      },
      {
        type: "string",
        name: "tail_num",
      },
      {
        type: "timestamp",
        name: "dep_time",
      },
      {
        type: "timestamp",
        name: "arr_time",
      },
      {
        type: "number",
        name: "dep_delay",
      },
      {
        type: "number",
        name: "arr_delay",
      },
      {
        type: "number",
        name: "taxi_out",
      },
      {
        type: "number",
        name: "taxi_in",
      },
      {
        type: "number",
        name: "distance",
      },
      {
        type: "string",
        name: "cancelled",
      },
      {
        type: "string",
        name: "diverted",
      },
      {
        type: "number",
        name: "id2",
      },
    ],
  },
};
