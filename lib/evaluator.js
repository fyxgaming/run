/**
 * evaluator.js
 *
 * The evaluator runs arbitrary code in a secure sandbox
 */

const ses = require('ses')
const { getIntrinsics, intrinsicNames } = require('./intrinsics')

// ------------------------------------------------------------------------------------------------
// Evaluator
// ------------------------------------------------------------------------------------------------

class Evaluator {
  constructor (options = {}) {
    this.sandbox = typeof options.sandbox !== 'undefined' ? options.sandbox : true
    this.logger = typeof options.logger !== 'undefined' ? options.logger : null

    // The realms-shim requires a body for sandboxing. If it doesn't exist, create one.
    if (typeof window !== 'undefined' && !window.document.body) {
      window.document.body = document.createElement('body')
    }

    this.sandboxEvaluator = new SESEvaluator()
    this.globalEvaluator = new GlobalEvaluator({ logger: this.logger })
    this.intrinsics = this.sandboxEvaluator.intrinsics
  }

  evaluate (code, env) {
    if (this.logger) this.logger.info(`Evaluating code starting with: "${code.slice(0, 20)}"`)
    const evaluator = this.willSandbox(code) ? this.sandboxEvaluator : this.globalEvaluator
    return evaluator.evaluate(code, env)
  }

  willSandbox (code) {
    if (typeof this.sandbox === 'boolean') return this.sandbox
    const nameRegex = /^(function|class)\s+([a-zA-Z0-9_$]+)/
    const match = code.match(nameRegex)
    return match ? this.sandbox.test(match[2]) : false
  }

  activate () { this.globalEvaluator.activate() }
  deactivate () { this.globalEvaluator.deactivate() }
}

// ------------------------------------------------------------------------------------------------
// SESEvaluator
// ------------------------------------------------------------------------------------------------

// Non-deterministic globals will be banned
const nonDeterministicGlobals = [
  'Date',
  'Math',
  'eval',
  'XMLHttpRequest',
  'FileReader',
  'WebSocket',
  'setTimeout',
  'setInterval'
]

/**
 * Secure sandboxer for arbitrary code
 */
class SESEvaluator {
  constructor () {
    this.realm = ses.makeSESRootRealm()

    // Keep track of common intrinsics shared between realms. The SES realm creates
    // these, and we just evaluate a list of them and store them here.
    this.intrinsics = this.realm.evaluate(`(${getIntrinsics.toString()})()`, { intrinsicNames })

    // We also overwrite console so that console.log in sandboxed code is relogged outside
    const consoleCode = 'Object.assign(...Object.entries(c).map(([k, f]) => ({ [k]: (...a) => f(...a) })))'
    this.intrinsics.console = this.realm.evaluate(consoleCode, { c: console })
  }

  evaluate (code, env = {}) {
    if (typeof code !== 'string') throw new Error(`Code must be a string. Received: ${code}`)
    if (typeof env !== 'object') throw new Error(`Environment must be an object. Received: ${env}`)
    if ('$globals' in env) throw new Error('Environment must not contain $globals')

    // Create the globals object in the SES realm so it doesn't expose ours
    const $globals = this.realm.evaluate('({})')

    // Disable each non-deterministic global
    env = Object.assign({}, env)
    nonDeterministicGlobals.forEach(key => {
      if (!(key in env)) env[key] = undefined
    })

    // Create the real env we'll use
    env = Object.assign({}, this.intrinsics, env, { $globals })

    // When a function is anonymous, it will be named the variable it is assigned. We give it
    // a friendly anonymous name to distinguish it from named classes and functions.
    const anon = code.startsWith('class') ? 'AnonymousClass' : 'anonymousFunction'

    // Execute the code in strict mode.
    const script = `with($globals){'use strict';const ${anon}=${code};${anon}}`
    const result = this.realm.evaluate(script, env)

    return [result, $globals]
  }
}

// ------------------------------------------------------------------------------------------------
// GlobalEvaluator
// ------------------------------------------------------------------------------------------------

/**
 * Evaluates code using dependences that are set as globals. This is quite dangerous, but we
 * only use it when sandbox=false, which is intended for testing code coverage and debugging.
 */
class GlobalEvaluator {
  constructor (options = {}) {
    this.logger = options.logger
    this.activated = true
    // We will save the prior globals before overriding them so they can be reverted.
    // This will also store our globals when we deactivate so we can re-activate them.
    this.savedGlobalDescriptors = {}
  }

  evaluate (code, env = {}) {
    if (typeof code !== 'string') throw new Error(`Code must be a string. Received: ${code}`)
    if (typeof env !== 'object') throw new Error(`Environment must be an object. Received: ${env}`)
    if ('$globals' in env) throw new Error('Environment must not contain $globals')

    // When a function is anonymous, it will be named the variable it is assigned. We give it
    // a friendly anonymous name to distinguish it from named classes and functions.
    const anon = code.startsWith('class') ? 'AnonymousClass' : 'anonymousFunction'

    // Set each env as a global
    const options = { configurable: true, enumerable: true, writable: true }
    Object.keys(env).forEach(key => this.setGlobalDescriptor(key, Object.assign({}, options, { value: env[key] })))

    // Turn the code into an object
    const result = eval(`const ${anon} = ${code}; ${anon}`) // eslint-disable-line

    // Wrap global sets so that we update savedGlobalDescriptors
    const wrappedGlobal = new Proxy(global, {
      set: (target, prop, value) => {
        this.setGlobalDescriptor(prop, Object.assign({}, options, { value }))
        return true
      },
      defineProperty: (target, prop, descriptor) => {
        this.setGlobalDescriptor(prop, descriptor)
        return true
      }
    })

    return [result, wrappedGlobal]
  }

  setGlobalDescriptor (key, descriptor) {
    // Save the previous global the first time we override it. Future overrides
    // will throw a warning because now there are two values at the global scope.
    const priorDescriptor = Object.getOwnPropertyDescriptor(global, key)

    if (!(key in this.savedGlobalDescriptors)) {
      this.savedGlobalDescriptors[key] = priorDescriptor
    } else if (!sameDescriptors(descriptor, priorDescriptor)) {
      if (this.logger) {
        const warning = 'There might be bugs with sandboxing disabled'
        const reason = `Two different values were set at the global scope for ${key}`
        this.logger.warn(`${warning}\n\n${reason}`)
      }
    }

    Object.defineProperty(global, key, descriptor)
  }

  activate () {
    if (this.activated) return
    this.swapSavedGlobals()
    this.activated = true
  }

  deactivate () {
    if (!this.activated) return
    this.swapSavedGlobals()
    this.activated = false
  }

  swapSavedGlobals () {
    const swappedGlobalDescriptors = {}

    Object.keys(this.savedGlobalDescriptors).forEach(key => {
      swappedGlobalDescriptors[key] = Object.getOwnPropertyDescriptor(global, key)

      if (typeof this.savedGlobalDescriptors[key] === 'undefined') {
        delete global[key]
      } else {
        Object.defineProperty(global, key, this.savedGlobalDescriptors[key])
      }
    })

    this.savedGlobalDescriptors = swappedGlobalDescriptors
  }
}

// ------------------------------------------------------------------------------------------------
// Helper methods
// ------------------------------------------------------------------------------------------------

function sameDescriptors (a, b) {
  if (typeof a !== typeof b) return false
  const aKeys = Array.from(Object.keys(a))
  const bKeys = Array.from(Object.keys(b))
  if (aKeys.length !== bKeys.length) return false
  return !aKeys.some(key => a[key] !== b[key])
}

// ------------------------------------------------------------------------------------------------

Evaluator.SESEvaluator = SESEvaluator
Evaluator.GlobalEvaluator = GlobalEvaluator
Evaluator.nonDeterministicGlobals = nonDeterministicGlobals

module.exports = Evaluator
