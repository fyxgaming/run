/**
 * webpack.config.js
 *
 * Settings to package the tests for the browser using webpack
 */

const webpack = require('webpack')
const path = require('path')

const tests = {
  entry: path.join(__dirname, '.'),
  output: {
    filename: 'run.tests.js',
    path: path.join(__dirname, '../dist/')
  },
  externals: {
    bsv: 'bsv',
    run: 'Run',
    mocha: 'Mocha',
    chai: 'chai'
  },
  plugins: [
    new webpack.DefinePlugin({
      TEST_MODE: '"webpack"'
    })
  ],
  optimization: {
    minimize: false
  },
  stats: 'errors-only'
}

module.exports = tests
