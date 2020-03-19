/**
 * webpack.config.js
 *
 * All the settings to build variants using webpack
 */

const webpack = require('webpack')
const path = require('path')
const fs = require('fs')
const glob = require('glob')
const pkg = require('./package')

// ------------------------------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------------------------------

const entry = path.join(__dirname, 'lib')
const dist = path.join(__dirname, 'dist/')
const name = pkg.name
const library = require(entry).name
const config = new webpack.DefinePlugin({ VERSION: JSON.stringify(pkg.version) })

// ------------------------------------------------------------------------------------------------
// Initialization
// ------------------------------------------------------------------------------------------------

if (!fs.existsSync(dist)) fs.mkdirSync(dist)

// ------------------------------------------------------------------------------------------------
// Browser Minified
// ------------------------------------------------------------------------------------------------

const browserMin = {
  entry,
  output: {
    filename: `${name}.browser.min.js`,
    path: dist,
    library
  },
  plugins: [config],
  stats: 'errors-only'
}

// ------------------------------------------------------------------------------------------------
// Node Minified
// ------------------------------------------------------------------------------------------------

const nodeMin = {
  ...browserMin,
  target: 'node',
  resolve: { mainFields: ['main', 'module'] },
  output: {
    filename: `${name}.node.min.js`,
    path: dist,
    libraryTarget: 'commonjs2'
  }
}

// ------------------------------------------------------------------------------------------------
// Browser Original
// ------------------------------------------------------------------------------------------------

const browser = {
  ...browserMin,
  output: {
    filename: `${name}.browser.js`,
    path: dist,
    library
  },
  optimization: { minimize: false }
}

// ------------------------------------------------------------------------------------------------
// Node Original
// ------------------------------------------------------------------------------------------------

const node = {
  ...nodeMin,
  output: {
    filename: `${name}.node.js`,
    path: dist,
    libraryTarget: 'commonjs2'
  },
  optimization: { minimize: false }
}

// ------------------------------------------------------------------------------------------------
// Browser Tests
// ------------------------------------------------------------------------------------------------

const patterns = process.env.SPECS ? JSON.parse(process.env.SPECS) : ['test']
const paths = new Set()
patterns.forEach(x => glob.sync(x).forEach(y => paths.add(y)))
const entries = Array.from(paths).map(x => path.join(process.cwd(), x))
if (!entries.length) throw new Error(`No test files found: ${patterns}`)

const browserTests = {
  entry: entries,
  output: { filename: `${name}.browser.tests.js`, path: dist },
  externals: { mocha: 'Mocha', chai: 'chai', target: library },
  optimization: { minimize: false },
  plugins: [new webpack.EnvironmentPlugin(process.env)],
  stats: 'errors-only'
}

// ------------------------------------------------------------------------------------------------

module.exports = [browserMin, nodeMin, browser, node, browserTests]
