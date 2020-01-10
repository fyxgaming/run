/**
 * webpack.config.js
 *
 * All the settings to build run variants using webpack
 */

const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const packageJson = require('./package.json')

// Create the dist directory if necessary
if (!fs.existsSync('./dist')) fs.mkdirSync('./dist')

// Create and copy the browser build of the bsv library if necessary
if (!fs.existsSync('./dist/bsv.browser.min.js')) {
  execSync('npm explore bsv -- npm run build-bsv')
  fs.copyFileSync(require.resolve('bsv/bsv.min.js'), './dist/bsv.browser.min.js')
}

const methodsToObfuscate = [
  // index.js
  '_checkActive',

  // util.js
  'checkOwner',
  'checkSatoshis',
  'checkRunTransaction',
  'extractRunData',
  'outputType',
  'getNormalizedSourceCode',
  'deployable',
  'encryptRunData',
  'decryptRunData',
  'richObjectToJson',
  'jsonToRichObject',
  'extractJigsAndCodeToArray',
  'injectJigsAndCodeFromArray',
  'deepTraverse',
  'activeRunInstance',
  'sameJig',
  'networkSuffix',

  // blockchain.js
  'broadcastUrl',
  'broadcastData',
  'fetchUrl',
  'fetchResp',
  'utxosUrl',
  'utxosResp',
  '_dedupUtxos',
  'correctForServerUtxoIndexingDelay',
  'fetched',
  'broadcasted',

  // code.js
  'isSandbox',
  'getInstalled',
  'installFromTx',
  'installJig',
  // 'sandbox',

  // syncer.js
  'fastForward',
  'finish',
  'publishNext',
  'publish',

  // transaction.js
  'storeCode',
  'storeAction',
  // 'begin',
  // 'end',
  'setProtoTxAndCreator',
  'buildBsvTransaction',

  // owner.js
  '_fromPrivateKey',
  '_fromPublicKey',
  '_fromAddress',
  '_queryLatest',
  '_removeErrorRefs',
  '_update',

  // state.js
  '_estimateSize'
]

const propertiesToObfuscate = [
  // index.js
  // 'code',
  // 'transaction',
  '_util',

  // code.js
  'intrinsics',
  'proxies',
  'enforce',
  'stack',
  'reads',
  'creates',
  'saves',
  'callers',
  'locals',
  // 'error', - interfers with console.error

  // blockchain.js
  'requests',
  'broadcasts',
  'expiration',
  'indexingDelay',
  'fetchedTime',

  // mockchain.js
  'unspentOutputs',
  'transactions',
  'blockHeight',
  'installs',

  // transaction.js
  'syncer',
  'protoTx',
  'beginCount',
  'cachedTx',

  // syncer.js
  'syncListeners',
  'onBroadcastListeners',
  'lastPosted',
  'queued',

  // state.js
  'sizeBytes',
  'maxSizeBytes'
]

const globalsToObfuscate = [
  // util.js,
  'control',
  'ProtoTransaction',
  'PROTOCOL_VERSION',
  'SerialTaskQueue',

  // code.js
  'stringProps',
  'extractProps',

  // transaction.js
  'onReadyForPublish',

  // syncer.js
  'spentJigs',
  'spentLocations'
]

// Generate the obfuscation map
const replacements = {}
const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')
let n = 1
function nextRandomName () {
  let name = 'aa'
  let rem = n
  while (rem > 0) {
    name = name + alphabet[rem % alphabet.length]
    rem = Math.floor(rem / alphabet.length)
  }
  n += 1
  return name
}
const allPropertiesToObfuscate = methodsToObfuscate.concat(propertiesToObfuscate).concat(globalsToObfuscate)
allPropertiesToObfuscate.forEach(prop => { replacements[prop] = nextRandomName() })
fs.writeFileSync('./dist/obfuscation-map.json', JSON.stringify(replacements, null, 2), 'utf8')

const obfuscatePlugin = {
  apply: (compiler) => {
    compiler.hooks.afterEmit.tap('ObfuscatePlugin', compilation => {
      const path = compilation.outputOptions.path + compilation.outputOptions.filename
      if (!path.endsWith('.min.js')) return

      let text = fs.readFileSync(path, 'utf8')

      methodsToObfuscate.forEach(method => {
        const before = text
        text = text.replace(new RegExp(`${method}\\(`, 'g'), `${replacements[method]}(`)
        text = text.replace(new RegExp(`${method}\\:`, 'g'), `${replacements[method]}:`)
        if (text === before) console.warn(`Warning: ${method} was not obfuscated`)
      })

      propertiesToObfuscate.forEach(property => {
        const before = text
        text = text.replace(new RegExp(`\\.${property}`, 'g'), `.${replacements[property]}`)
        text = text.replace(new RegExp(`${property}\\:`, 'g'), `${replacements[property]}:`)
        if (text === before) console.warn(`Warning: ${property} was not obfuscated`)
      })

      globalsToObfuscate.forEach(property => {
        const before = text
        text = text.replace(new RegExp(`${property}`, 'g'), `${replacements[property]}`)
        if (text === before) console.warn(`Warning: ${property} was not obfuscated`)
      })

      text = text.replace(`\n/*!
      * The buffer module from node.js, for the browser.
      *
      * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
      * @license  MIT
      */\n`, '')
      text = text.replace(`\n/*!
      * Determine if an object is a Buffer
      *
      * @author   Feross Aboukhadijeh <https://feross.org>
      * @license  MIT
      */\n`, '')

      fs.writeFileSync(path, text, 'utf8')
    })
  }
}

const browser = {
  entry: path.join(__dirname, './lib'),
  output: {
    filename: 'run.browser.min.js',
    path: path.join(__dirname, './dist/'),
    library: 'Run'
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: {
            reserved: ['Jig', 'util', 'Token', 'expect']
          }
        }
      })
    ]
  },
  externals: {
    bsv: 'bsv'
  },
  plugins: [
    new webpack.DefinePlugin({
      TEST_MODE: '"default"',
      RUN_VERSION: JSON.stringify(packageJson.version)
    }),
    obfuscatePlugin
  ],
  stats: 'errors-only'
}

const node = {
  ...browser,
  target: 'node',
  resolve: { mainFields: ['main', 'module'] },
  output: {
    filename: 'run.node.min.js',
    path: path.join(__dirname, './dist/'),
    libraryTarget: 'commonjs2'
  },
  externals: {
    bsv: 'bsv'
  }
}

const browserUnminified = {
  ...browser,
  output: {
    filename: 'run.browser.js',
    path: path.join(__dirname, './dist/'),
    library: 'Run'
  },
  optimization: { minimize: false }
}

const nodeUnminified = {
  ...node,
  output: {
    filename: 'run.node.js',
    path: path.join(__dirname, './dist/'),
    libraryTarget: 'commonjs2'
  },
  optimization: { minimize: false }
}

const tests = {
  entry: path.join(__dirname, './test'),
  output: {
    filename: 'run.tests.js',
    path: path.join(__dirname, './dist/')
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

module.exports = [browser, node, browserUnminified, nodeUnminified, tests]
