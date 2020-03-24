/**
 * webpack.config.js
 *
 * All the settings to build variants using webpack
 */

const webpack = require('webpack')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
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

// Create dist folder
if (!fs.existsSync(dist)) fs.mkdirSync(dist)

// Copy the browser build of the bsv library
if (!fs.existsSync('./dist/bsv.browser.min.js')) {
  execSync('npm explore bsv -- npm run build-bsv')
  fs.copyFileSync(require.resolve('bsv/bsv.min.js'), './dist/bsv.browser.min.js')
}

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
  externals: {
    bsv: 'bsv'
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
  target: 'web',
  entry: entries,
  output: { filename: `${name}.browser.tests.js`, path: dist },
  node: { fs: 'empty' },
  externals: { mocha: 'Mocha', chai: 'chai', bsv: 'bsv', target: library },
  optimization: { minimize: false },
  plugins: [new webpack.EnvironmentPlugin(process.env)],
  stats: 'errors-only'
}

// ------------------------------------------------------------------------------------------------

module.exports = [browserMin, nodeMin, browser, node, browserTests]
