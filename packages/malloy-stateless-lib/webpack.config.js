/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const process = require("process");
const noop = require("lodash/noop");
const BundleAnalyzerPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const webpack = require('webpack');

const bundleAnalyzer =
  process.env["NODE_ENV"] === "development" ? new BundleAnalyzerPlugin() : noop;

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
  },
  optimization: {
    usedExports: true,
  },
  plugins: [
    bundleAnalyzer,
    // new webpack.ProvidePlugin({
    //   // process: "process/browser",
    // }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env)
    })
  ],
};
