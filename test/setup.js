/**
 * setup.js
 * 
 * Configures the tests
 */

const process = require('process')

// ------------------------------------------------------------------------------------------------
// SETUP RUN
// ------------------------------------------------------------------------------------------------

// The same tests execute across many different builds of Run. To keep the test files simple, we
// hook the global "require" function so that test files can simply do require('run') and get the
// appropriate build.

global.TEST_MODE = process.env.TEST_MODE

let Run = null

if (TEST_MODE === 'lib') Run = require('../lib')
if (TEST_MODE === 'dist') Run = require('../dist/run.node.min')
if (TEST_MODE === 'webpack') Run = require('run')

const obfuscationMap = require('../dist/obfuscation-map.json')

function unobfuscateRun(Run) {
  if (typeof Run._util !== 'undefined') return Run
  const handler = {
    get: (target, prop) => {
      const val = prop in obfuscationMap? target[obfuscationMap[prop]] : target[prop]
      return prop !== 'prototype' && typeof val === 'object' ? new Proxy(val, handler) : val
    }
  }
  return new Proxy(Run, handler)
}

Run = unobfuscateRun(Run)

// ------------------------------------------------------------------------------------------------
// PURSES
// ------------------------------------------------------------------------------------------------

const testPurses = {
  main: [
    'L3qpvEdCa4h7qxuJ1xqQwNQV2dfDR8YB57awpcbnBpoyGMAZEGLq', // 1DnxveABdMVKASzbCCUsibc29CwE7Kx9zZ
    'KxCNcuTavkKd943xAypLjRKufmdXUaooZzWoB4piRRvJK74LYwCR' // 1DurgtJhiT5oTYy6kL6QTSNiQB4DWuo3j8
  ],
  test: [
    'cT7uSf2Q4nFDWoqQtSBaKHnQsuWVdcvxZMiuCs3nkwYh94xctaFg', // mpBU73vq9ajhkXknP1sNGe6wjXH7QtwmWm
    'cTyDeBV8w9XQvaVvPY448rJVAScbu56X64tyEq6f6gdChgGw6aVq', // mhjSrMHzs97CCvhPtBn1qbfuJqqfmMzWQ4
    'cQP1h2zumWrCr2zxciuNeho61QUGtQ4zBKWFauk7WEhFb8kvjRTh' // n34P4t4K6bJtc6qfGU2pqcRix8mUACdNyJ
  ],
  stn: [
    'cT7uSf2Q4nFDWoqQtSBaKHnQsuWVdcvxZMiuCs3nkwYh94xctaFg', // mpBU73vq9ajhkXknP1sNGe6wjXH7QtwmWm
    'cTyDeBV8w9XQvaVvPY448rJVAScbu56X64tyEq6f6gdChgGw6aVq' // mhjSrMHzs97CCvhPtBn1qbfuJqqfmMzWQ4
  ]
}

// ------------------------------------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------------------------------------

function createRun (options = { }) {
  const network = options.network || 'mock'
  const blockchain = network !== 'mock' ? 'star' : undefined
  const purse = network === 'mock' ? undefined : testPurses[network][0]
  const sandbox = TEST_MODE === 'cover' ? /^((?!Jig|Token).)*$/ : true
  const run = new Run({ network, purse, sandbox, logger: null, blockchain, ...options })
  if (network !== 'mock') jest.setTimeout(30000)
  return run
}

async function hookPay (run, ...enables) {
  const syncerKey = getObfuscatedKey('syncer')
  const queuedKey = getObfuscatedKey('queued')
  enables = new Array(run[syncerKey][queuedKey].length).fill(true).concat(enables)
  const orig = run.purse.pay.bind(run.purse)
  run.purse.pay = async (tx) => {
    if (!enables.length) { return orig(tx) }
    if (enables.shift()) { return orig(tx) } else { return tx }
  }
}

async function deploy (Class) {
  const app = 'Star ▸ Library'
  const networks = [['test', 'Testnet'], ['main', 'Mainnet']]

  let properties = ''

  for (const [network, suffix] of networks) {
    const run = createRun({ network, app })
    const origin = `origin${suffix}`
    const location = `location${suffix}`
    const owner = `owner${suffix}`

    run.transaction.begin()
    delete Class[origin]
    delete Class[location]
    delete Class[owner]
    Run.code.flush()
    run.deploy(Class)
    run.transaction.end()
    await run.sync()

    properties += `${Class.name}.${origin}= '${Class[origin]}'\n`
    properties += `${Class.name}.${location}= '${Class[location]}'\n`
    properties += `${Class.name}.${owner}= '${Class[owner]}'\n`
  }

  console.log(properties)
}

module.exports = { createRun, hookPay, deploy, Run, Jig: Run.Jig }
