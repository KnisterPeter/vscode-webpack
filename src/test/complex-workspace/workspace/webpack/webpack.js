// @ts-check
const path = require("path");

const root = path.dirname(__dirname);

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
  context: root,
  entry: "./src/index.ts",
  output: {
    path: path.resolve(root, "out"),
    filename: "bundle.js",
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
};
