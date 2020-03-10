/**
 * evaluator.js
 *
 * Default implementation of the Evaluator API
 */

const ses = require('ses')

// ------------------------------------------------------------------------------------------------
// DeterministicEvaluator
// ------------------------------------------------------------------------------------------------

/**
 * An evaluator that deterministically evaluates code the same in every environment.
 *
 * It turns off non-deterministic intrinsics, like Math.random and Date. It also uses SES to
 * create a secure subset of JavaScript that is the same in every environment.
 */
class DeterministicEvaluator {
  constructor () {
    this.realm = ses.makeSESRootRealm()

    // We override console so that console.log in sandboxed code is relogged outside
    const consoleCode = 'Object.assign(...Object.entries(c).map(([k, f]) => ({ [k]: (...a) => f(...a) })))'
    this.console = this.realm.evaluate(consoleCode, { c: console })

    // The realms-shim requires a body for sandboxing. If it doesn't exist, create one.
    if (typeof window !== 'undefined' && !window.document.body) {
      window.document.body = document.createElement('body')
    }
  }

  evaluate (code, environment = {}) {
    if (typeof code !== 'string') throw new Error(`Code must be a string. Received: ${code}`)
    if (typeof environment !== 'object') throw new Error(`Environment must be an object. Received: ${environment}`)

    const environmentCopy = Object.assign({}, environment)

    // Disable each non-deterministic intrinsic
    DeterministicEvaluator.nonDeterministicIntrinsics.forEach(key => {
      if (!(key in environment)) environmentCopy[key] = undefined
    })

    // Create the globals object in the SES realm so it doesn't expose ours
    const globals = this.realm.evaluate('({})')

    // Get a unique name for the globals that is not used in our environment
    const globalsName = this.findUnusedNameForGlobals(environment)

    // Set the globals in our environment
    environmentCopy[globalsName] = globals

    // Execute the code in strict mode
    const script = `with(${globalsName}){'use strict';${code}}`
    const result = this.realm.evaluate(script, environmentCopy)

    return { result, globals }
  }

  findUnusedNameForGlobals (environment) {
    let num = 0
    while (true) {
      const name = `$globals${num++}`
      if (!(name in environment)) return name
    }
  }
}

/**
 * Non-deterministic globals that will be banned
 */
DeterministicEvaluator.nonDeterministicIntrinsics = [
  'Date',
  'Math',
  'eval',
  'XMLHttpRequest',
  'FileReader',
  'WebSocket',
  'setTimeout',
  'setInterval'
]

// ------------------------------------------------------------------------------------------------

module.exports = DeterministicEvaluator
