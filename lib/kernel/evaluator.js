/**
 * evaluator.js
 *
 * The evaluator runs arbitrary code in a secure sandbox
 */

const DeterministicRealm = require('@runonbitcoin/sandbox')
const { _codeToGetIntrinsics, Intrinsics } = require('./intrinsics')
const { TokenSet, TokenMap, createSandboxedTokenMap, createSandboxedTokenSet } = require('../util/set')
const { info, warn } = require('../util')

// ------------------------------------------------------------------------------------------------
// Evaluator
// ------------------------------------------------------------------------------------------------

class Evaluator {
  constructor (kernel) {
    this._kernel = kernel

    this.sandboxEvaluator = new SandboxEvaluator()
    this.globalEvaluator = new GlobalEvaluator(kernel)

    if (this.willSandbox(TokenSet.toString())) {
      this.TokenSet = createSandboxedTokenSet(this.sandboxEvaluator)
    } else {
      this.TokenSet = TokenSet
    }

    if (this.willSandbox(TokenMap.toString())) {
      this.TokenMap = createSandboxedTokenMap(this.sandboxEvaluator)
    } else {
      this.TokenMap = TokenMap
    }

    this.deterministicEnv = { Set: this.TokenSet, Map: this.TokenMap }

    const custom = Object.assign({}, this.sandboxEvaluator.intrinsics, this.deterministicEnv)
    this.intrinsics = new Intrinsics().allow(this.sandboxEvaluator.intrinsics).use(custom)

    this._sandboxIntrinsics = this.sandboxEvaluator.intrinsics
  }

  evaluate (code, env = {}) {
    if (typeof code !== 'string') throw new Error(`Code must be a string. Received: ${code}`)
    if (typeof env !== 'object') throw new Error(`Environment must be an object. Received: ${env}`)
    if ('$globals' in env) throw new Error('Environment must not contain $globals')

    info(this._kernel._logger, `Evaluating code starting with: "${code.slice(0, 20)}"`)

    if (this.willSandbox(code)) {
      return this.sandboxEvaluator.evaluate(code, Object.assign({}, this.deterministicEnv, env))
    } else {
    // Don't replace Set and Map when using the global evaluator
      return this.globalEvaluator.evaluate(code, Object.assign({}, env))
    }
  }

  willSandbox (code) {
    if (typeof this._kernel._sandbox === 'boolean') return this._kernel._sandbox
    const nameRegex = /^(function|class)\s+([a-zA-Z0-9_$]+)/
    const match = code.match(nameRegex)
    return match ? this._kernel._sandbox.test(match[2]) : false
  }

  activate () { this.globalEvaluator.activate() }
  deactivate () { this.globalEvaluator.deactivate() }
}

// ------------------------------------------------------------------------------------------------
// SandboxEvaluator
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
class SandboxEvaluator {
  constructor () {
    this.realm = new DeterministicRealm()

    // Keep track of common intrinsics shared between realms. The SES realm creates
    // these, and we just evaluate a list of them and store them here.
    const compartment = this.realm.makeCompartment()
    this.intrinsics = compartment.evaluate(_codeToGetIntrinsics)
  }

  evaluate (code, env = {}) {
    if (typeof code !== 'string') throw new Error(`Code must be a string. Received: ${code}`)
    if (typeof env !== 'object') throw new Error(`Environment must be an object. Received: ${env}`)

    const compartment = this.realm.makeCompartment()

    // Create the globals object in the SES realm so it doesn't expose ours
    const $globals = compartment.evaluate('({})')

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
    // const script = `with($globals){'use strict';const ${anon}=${code};${anon}}`
    // const result = this.realm.evaluate(script, env)
    // return { result, globals: $globals }

    const script = `const ${anon}=${code};${anon}`

    Object.assign(compartment.global, env)

    // Show a nice error when we try to access Date and Math
    const showFriendlyErrorForNondeterministicIntrinsic = name => {
      Object.defineProperty(compartment.global, name, {
        get: () => {
          const hint = `Hint: ${name} is disabled because it is non-deterministic.`
          throw new ReferenceError(`${name} is not defined\n\n${hint}`)
        }
      })
    }
    showFriendlyErrorForNondeterministicIntrinsic('Math')
    showFriendlyErrorForNondeterministicIntrinsic('Date')

    const result = compartment.evaluate(script)

    return [result, compartment.global]
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
  constructor (kernel) {
    this._kernel = kernel
    this.activated = true
    // We will save the prior globals before overriding them so they can be reverted.
    // This will also store our globals when we deactivate so we can re-activate them.
    this.savedGlobalDescriptors = {}
  }

  evaluate (code, env = {}) {
    if (typeof code !== 'string') throw new Error(`Code must be a string. Received: ${code}`)
    if (typeof env !== 'object') throw new Error(`Environment must be an object. Received: ${env}`)

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

    return { result, globals: wrappedGlobal }
  }

  setGlobalDescriptor (key, descriptor) {
    // Save the previous global the first time we override it. Future overrides
    // will throw a warning because now there are two values at the global scope.
    const priorDescriptor = Object.getOwnPropertyDescriptor(global, key)

    if (!(key in this.savedGlobalDescriptors)) {
      this.savedGlobalDescriptors[key] = priorDescriptor
    } else if (!sameDescriptors(descriptor, priorDescriptor)) {
      const warning = 'There might be bugs with sandboxing disabled'
      const reason = `Two different values were set at the global scope for ${key}`
      warn(this._kernel._logger, `${warning}\n\n${reason}`)
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

Evaluator.SandboxEvaluator = SandboxEvaluator
Evaluator.GlobalEvaluator = GlobalEvaluator
Evaluator.nonDeterministicGlobals = nonDeterministicGlobals

module.exports = Evaluator
