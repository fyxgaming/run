/**
 * The API for all code evaluators used in Run
 * 
 * Code evaluators take source code as string, and optional dependencies, and turn it into a live
 * object to be used. Think eval() but with dependencies.
 * 
 * Run ships with several evaluators:
 * 
 *      - SES: Most secure, based on Agoric SES, for production
 *      - Global: Least secure, based on eval() and globals, for debugging
 *      - Default: Switches between SES or Global based on an option (default)
 */
class Evaluator {
    constructor (options = {}) {
      this.logger = options.logger
    }

    evaluate() {

    }

    activate() {

    }

    deactivate() {

    }

    checkEvaluateArgs(code, env) {
        if (typeof code !== 'string') throw new Error(`Code must be a string. Received: ${code}`)
        if (typeof env !== 'object') throw new Error(`Environment must be an object. Received: ${env}`)
        if ('$globals' in env) throw new Error('Environment must not contain $globals')
    }
}

module.exports = Evaluator