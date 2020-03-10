/**
 * The API for code evaluators used by Run.
 *
 * An evaluator takes a source code string and a set of dependencies and executes the code. This
 * usually producing a live object that may be used. Think eval() but with dependencies.
 */
class Evaluator {
  /**
     * Executes the code in the given environment.
     *
     * The properties in environment should be in scope for the code. The last statement's value
     * should also be returned to the user. This method is like Node's vm.evaluate().
     *
     * @param {string} code Source code string
     * @param {?object} environment Objects in scope
     * @returns {*} The final statement's value
     */
  evaluate (code, environment = {}) {
    throw new Error('Not implemented')
  }
}

module.exports = Evaluator
