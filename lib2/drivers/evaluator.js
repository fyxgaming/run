const ses = require('ses')
const { Evaluator } = require('../api')

class DeterministicEvaluator extends Evaluator {
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

    return { result, globals: $globals }
  }
}

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
