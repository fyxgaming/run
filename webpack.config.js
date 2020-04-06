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

// The mangled names are cached in a special name-cache file. We use this file in the tests
// to access mangled names as if they were not mangled. We also cache this file ourselves
// so that we can reuse the same mangled names for every build.
const nameCachePath = path.join(dist, 'name-cache.json')
let lastNameCacheJson = fs.existsSync(nameCachePath) ? fs.readFileSync(nameCachePath).toString('utf8') : '{}'
const nameCache = JSON.parse(lastNameCacheJson)

// Plugin to save the name cache if it differs from the last known name cache
class SaveNameCache {
  apply (compiler) {
    compiler.hooks.done.tap(SaveNameCache.name, async () => {
      const newNameCacheJson = JSON.stringify(nameCache)
      if (newNameCacheJson !== lastNameCacheJson) {
        lastNameCacheJson = newNameCacheJson
        await fs.writeFile(nameCachePath, newNameCacheJson)
      }
    })
  }
}

// Run library terser settings
const terserPluginConfig = {
  // The nameCache requires parallel to be off
  parallel: false,
  // We don't cache, because otherwise the name cache is lost
  // cache: false,
  terserOptions: {
    ecma: 2015,
    nameCache,
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
  plugins: [config, new SaveNameCache()],
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
  plugins: [config],
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
  plugins: [config],
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
  optimization: { minimize: false },
  plugins: [new webpack.EnvironmentPlugin(process.env)],
  stats: 'errors-only'
}

// ------------------------------------------------------------------------------------------------

module.exports = [browserMin, nodeMin, browser, node, browserTests]
