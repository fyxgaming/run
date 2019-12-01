const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const path = require('path')
const fs = require('fs')
const packageJson = require('./package.json')

if (!fs.existsSync('./dist')) fs.mkdirSync('./dist')
fs.copyFileSync(require.resolve('bsv/bsv.min.js'), './dist/bsv.browser.min.js')

const methodsToObfuscate = [
  // index.js
  '_sign',
  '_setupBsv',
  'checkActive',

  // util.js
  'checkOwner',
  'checkSatoshis',
  'checkRunTransaction',
  'extractRunData',
  'outputType',
  'codeText',
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

  // api.js
  'broadcastUrl',
  'broadcastData',
  'fetchUrl',
  'fetchResp',
  'utxosUrl',
  'utxosResp',
  '_correctForServerUtxoIndexDelay',

  // code.js
  'banNondeterministicGlobals',
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

  // api.js
  'txCacheExpiration',
  'txCacheMaxSize',
  'txCache',
  'requests',
  'broadcastCacheTime',
  'broadcastCache',
  'lastFetchedTime',

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

  // code.js
  'stringProps',
  'extractProps',

  // transaction.js
  'onReadyForPublish',

  // syncer.js
  'spentJigs',
  'spentLocations'
]

const obfuscatePlugin = {
  apply: (compiler) => {
    compiler.hooks.afterEmit.tap('ObfuscatePlugin', compilation => {
      const path = compilation.outputOptions.path + compilation.outputOptions.filename
      if (!path.endsWith('.min.js')) return

      let text = fs.readFileSync(path, 'utf8')

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

      const replacements = {}

      methodsToObfuscate.forEach(method => {
        replacements[method] = nextRandomName()
        const before = text
        text = text.replace(new RegExp(`${method}\\(`, 'g'), `${replacements[method]}(`)
        text = text.replace(new RegExp(`${method}\\:`, 'g'), `${replacements[method]}:`)
        if (text === before) console.warn(`Warning: ${method} was not obfuscated`)
      })

      propertiesToObfuscate.forEach(property => {
        replacements[property] = nextRandomName()
        const before = text
        text = text.replace(new RegExp(`\\.${property}`, 'g'), `.${replacements[property]}`)
        text = text.replace(new RegExp(`${property}\\:`, 'g'), `${replacements[property]}:`)
        if (text === before) console.warn(`Warning: ${property} was not obfuscated`)
      })

      globalsToObfuscate.forEach(property => {
        replacements[property] = nextRandomName()
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
      fs.writeFileSync(compilation.outputOptions.path + 'obfuscation-map.json', JSON.stringify(replacements, null, 2), 'utf8')
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
            reserved: ['Jig', 'Token', 'expect']
          }
        }
      })
    ]
  },
  externals: {
    bsv: 'bsv',
    vm: 'vm'
  },
  plugins: [
    new webpack.DefinePlugin({
      TEST_COVER: false,
      RUN_VERSION: JSON.stringify(packageJson.version)
    }),

    // In prod builds, we override RUN_VERSION using the define plugin above,
    // so we don't need to compile package.json.
    new webpack.IgnorePlugin(/package\.json/),

    obfuscatePlugin
  ],
  stats: 'errors-only'
}

const node = {
  ...browser,
  target: 'node',
  output: {
    filename: 'run.node.min.js',
    path: path.join(__dirname, './dist/'),
    libraryTarget: 'commonjs2'
  },
  externals: {
    bsv: 'bsv',
    'vm-browserify': 'vm-browserify'
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

module.exports = [browser, node, browserUnminified, nodeUnminified]
