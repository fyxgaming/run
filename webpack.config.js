/**
 * webpack.config.js
 *
 * All the settings to build variants using webpack
 */

const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const glob = require('glob')
const pkg = require('./package')
const { addUserKeystoEnvironment } = require('./test/env/keys')

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
// Terser options
// ------------------------------------------------------------------------------------------------

// Reserved variables, usually for sandboxing reasons
const reservedNames = [
  // Jig and berry names and dependencies must be preserved
  'Jig', 'Berry', 'Context', 'JigControl', 'BerryControl',
  // TokenSet/TokenMap dependency names must be preserved
  'internal', 'uniqueKey', 'TokenMap'
]

// Reserved words that should not be mangled in minified builds
const reservedProperties = [
  // These come from node_modules. Best to be safe.
  '_read', '_lengthRetrievers', '_obj', '__methods',
  // These are bsv library properties that we use and should not be mangled
  '_hash', '_getHash', '_getInputAmount', '_estimateFee', '_getOutputAmount'
]

// Run library terser settings
const terserPluginConfig = {
  // The nameCache requires parallel to be off
  parallel: false,
  // We don't cache, because otherwise the name cache is lost
  cache: false,
  terserOptions: {
    ecma: 2015,
    nameCache: {},
    mangle: {
      reserved: reservedNames,
      // The AbortSignal name is required for node-fetch and abort-controller to work together
      keep_classnames: /AbortSignal/,
      // All private properties (methods, variables) that the end user is not expected to interact
      // with should be prefixed with _. The terser will mangle these properties. We will make
      // specific exceptions where it is problematic.
      properties: {
        regex: /^_.*$/,
        reserved: reservedProperties
      }
    }
  }
}

// Compiled tests terser settings
const terserTestPluginConfig = {
  parallel: false,
  cache: false,
  terserOptions: {
    ecma: 2015,
    // The tests need similar mangling as the main library. For example, if a test accesses an
    // internal property like mockchain._height, _height will be manged in the final build, so
    // the test should also be mangled the same way. We use the name cache for this.
    nameCache: terserPluginConfig.terserOptions.nameCache,
    mangle: {
      reserved: reservedNames,
      properties: {
        regex: /^_.*$/,
        reserved: reservedProperties
      }
    },
    // Keep code as close to the original as possible for debugging
    compress: false,
    output: {
      beautify: true,
      comments: true
    },
    // Don't mangle test classes and functions, because it also debugging harder
    keep_classnames: true,
    keep_fnames: true
  }
}

// ------------------------------------------------------------------------------------------------
// Browser Minified
// ------------------------------------------------------------------------------------------------

const browserMin = {
  entry,
  output: {
    filename: `${name}.browser.min.js`,
    path: dist,
    library,
    libraryTarget: 'umd'
  },
  resolve: {
    mainFields: ['browser', 'main', 'module'],
    extensions: ['.js', '.mjs', '.wasm', '.json']
  },
  externals: {
    bsv: 'bsv'
  },
  optimization: {
    minimizer: [
      new TerserPlugin(terserPluginConfig)
    ]
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
  output: {
    filename: `${name}.node.min.js`,
    path: dist,
    libraryTarget: 'commonjs2'
  },
  resolve: {
    mainFields: ['main', 'module'],
    extensions: ['.js', '.mjs', '.wasm', '.json']
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

addUserKeystoEnvironment()

const browserTests = {
  target: 'web',
  entry: entries,
  output: { filename: `${name}.browser.tests.js`, path: dist },
  node: { fs: 'empty' },
  externals: { mocha: 'Mocha', chai: 'chai', bsv: 'bsv', target: library },
  optimization: {
    minimizer: [
      new TerserPlugin(terserTestPluginConfig)
    ]
  },
  plugins: [new webpack.EnvironmentPlugin(process.env)],
  stats: 'errors-only'
}

// ------------------------------------------------------------------------------------------------
// Node Tests
// ------------------------------------------------------------------------------------------------

const nodeTests = {
  ...browserTests,
  target: 'node',
  output: { filename: `${name}.node.tests.js`, path: dist, libraryTarget: 'commonjs2' },
  externals: { mocha: 'mocha', chai: 'chai', bsv: 'bsv', target: './run.node.min' },
  node: { fs: 'empty' }
}

// ------------------------------------------------------------------------------------------------

module.exports = [browserMin, nodeMin, browser, node, browserTests, nodeTests]
