/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const process = require("process");
const webpack = require("webpack");

module.exports = {
  entry: "./src/index.ts",
  mode: "production",
  output: {
    filename: "lib.js",
    path: path.resolve(__dirname, "dist", "bundle"),
    library: "Malloy",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      url: require.resolve("./src/polyfill/url"),
    },
  },
  optimization: {
    usedExports: true,
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": JSON.stringify(process.env),
    }),
    new webpack.ProvidePlugin({
      URL: ["url", "URL"],
    }),
  ],
};
