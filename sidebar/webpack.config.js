const webpack = require('webpack');
const dotenv = require('dotenv');
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require('path');

dotenv.config();

module.exports = {
  entry: "./src/bootstrap.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "./src/bootstrap.js",
    publicPath: process.env.PUBLIC_PATH,
  },
  module: {
    rules: [
      {
        test: /\.(j|t)sx?$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['solid', '@babel/typescript']
          }
        }
      },
      {
        test: /\.css$/i,
        use: ["style-loader", {
          loader: "css-loader", options: {
            modules: {
              auto: true,
              localIdentName: "[path][name]__[local]--[hash:base64:5]",
            },
          }
        }],
      },
    ],
  },
  resolve: {
    extensions: ['*', '.js', '.jsx', '.ts', '.tsx'],
  },
  experiments: {
    asyncWebAssembly: true
  },
  mode: "development",
  plugins: [
    new CopyWebpackPlugin(['static']),
    new webpack.EnvironmentPlugin(['PUBLIC_PATH', 'GITHUB_RUN_NUMBER'])
  ],
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*',
    },
    hot: true,
  },
};
