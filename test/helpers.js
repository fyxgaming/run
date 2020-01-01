/**
 * helpers.js
 *
 * Helper functions used across test modules
 */

const process = require('process')
const { expect } = require('chai')

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

// The test mode determines the Run build. It is either an environment variable or a webpack define.
// We override global.TEST_MODE so that we can just use TEST_MODE.
global.TEST_MODE = process.env.TEST_MODE

// Provides the Run build for tests
// The same tests run in different environments (node, browser) and with different Run builds
// (lib, dist). This module outputs the appropriate instance for the test environment.
let Run = null

if (TEST_MODE === 'lib') Run = require('../lib')
if (TEST_MODE === 'cover') Run = require('../lib')
if (TEST_MODE === 'dist') Run = require('../dist/run.node.min')
if (TEST_MODE === 'webpack') Run = require('run')

// We check if _util is defined on Run to see if Run was obfuscated. If it was, we return a proxy
// that allows tests to access the original properties as if they were unobfuscated.
const needsUnobfuscation = typeof Run._util === 'undefined'

// Wraps an object to unobfuscate its properties for testing in obfuscated builds
function unobfuscate (obj) {
  if (!needsUnobfuscation) return obj

  const obfuscationMap = require('../dist/obfuscation-map.json')

  const handler = {
    get: (target, prop) => {
      // If we're getting a constructor, we can simply reproxy and return it here
      if (prop === 'constructor') return new Proxy(target.constructor, handler)

      // If the obfuscation map has the key, use its transalted version
      const key = typeof obfuscationMap[prop] === 'string' ? obfuscationMap[prop] : prop
      const val = target[key]

      // If val is null, we can return it directly
      if (!val) return val

      // Regular functions get bound to the target not the proxy for better reliability
      if (typeof val === 'function' && !val.prototype) return val.bind(target)

      // Jigs don't need to be proxied and cause problems when they are
      if (val.constructor && val.constructor.name === 'Jig') return val

      // Read-only non-confurable properties cannot be proxied
      const descriptor = Object.getOwnPropertyDescriptor(target, key)
      if (descriptor && descriptor.writable === false && descriptor.configurable === false) return val

      // Objects get re-proxied so that their sub-properties are unobfuscated
      if (typeof val === 'object' && prop !== 'prototype') return new Proxy(val, handler)

      // All other objects we return directly
      return val
    },

    set: (target, prop, value) => {
      // Sets are applied to the obfuscated properties if they exist
      const key = prop in obfuscationMap ? obfuscationMap[prop] : prop
      target[key] = value
      return true
    },

    construct: (T, args) => {
      // If we construct from a type, the new instance gets proxied to be unobfuscated too
      return new Proxy(new T(...args), handler)
    }
  }

  return new Proxy(obj, handler)
}

Run = unobfuscate(Run)

function createRun (options = { }) {
  const network = options.network || 'mock'
  const blockchain = network !== 'mock' ? 'star' : undefined
  const purse = network === 'mock' ? undefined : testPurses[network][0]
  const sandbox = TEST_MODE === 'cover' ? /^((?!Jig|Token).)*$/ : true
  const run = new Run({ network, purse, sandbox, logger: null, blockchain, ...options })
  return run
}

async function hookPay (run, ...enables) {
  enables = new Array(run.syncer.queued.length).fill(true).concat(enables)
  const orig = run.purse.pay.bind(run.purse)
  run.purse.pay = async (tx) => {
    if (!enables.length) { return orig(tx) }
    if (enables.shift()) { return orig(tx) } else { return tx }
  }
}

let action = null

function hookStoreAction (run) {
  const origAction = run.transaction.storeAction.bind(run.transaction)
  run.transaction.storeAction = (target, method, args, inputs, outputs, reads, before, after, proxies) => {
    origAction(target, method, args, inputs, outputs, reads, before, after, proxies)
    target = proxies.get(target)
    inputs = new Set(Array.from(inputs.keys()).map(i => proxies.get(i)))
    outputs = new Set(Array.from(outputs.keys()).map(o => proxies.get(o)))
    reads = new Set(Array.from(reads.keys()).map(o => proxies.get(o)))
    action = { target, method, args, inputs, outputs, reads }
  }
  return run
}

function expectAction (target, method, args, inputs, outputs, reads) {
  expect(action.target).to.equal(target)
  expect(action.method).to.equal(method)
  expect(action.args).to.deep.equal(args)
  expect(action.inputs.size).to.equal(inputs.length)
  Array.from(action.inputs.values()).forEach((i, n) => expect(i).to.equal(inputs[n]))
  expect(action.outputs.size).to.equal(outputs.length)
  Array.from(action.outputs.values()).forEach((o, n) => expect(o).to.equal(outputs[n]))
  expect(action.reads.size).to.equal(reads.length)
  Array.from(action.reads.values()).forEach((x, n) => expect(x).to.equal(reads[n]))
  action = null
}

function expectNoAction () {
  if (action) throw new Error('Unexpected transaction')
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

module.exports = {
  Run,
  Jig: Run.Jig,
  unobfuscate,
  createRun,
  hookPay,
  hookStoreAction,
  expectAction,
  expectNoAction,
  deploy
}
