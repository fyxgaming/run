/**
 * index.js
 *
 * The membrane combinations used in run
 */

const Admin = require('./admin')
const Bindings = require('./bindings')
const CodeMethods = require('./code')
const Errors = require('./errors')
// const Immutable = require('./immutable')
// const Owner = require('./owner')
// const Privates = require('./private')
// const Recorder = require('./recorder')
const Membrane = require('./membrane')

// TODO
// _checkState(typeof prop !== 'symbol', 'Must not delete symbols')
// _checkState(typeof prop === 'string', 'Must only set string keys')

// ------------------------------------------------------------------------------------------------
// Membranes
// ------------------------------------------------------------------------------------------------

const JIG_MEMBRANE =
    new Admin(
      /*
      new Errors(
        new Bindings(
          new Privates(
            new Recorder(
              new Owner()
            )
          )
        )
      )
      */
    )

const JIG_CODE_MEMBRANE =
    new Admin(
      new Errors(
        new CodeMethods(
          new Bindings(
          /*
            new Privates(
              new Recorder(
                new Owner()
              )
            )
      */
          )
        )
      )
    )

// Owning is necessary here too
// If set, check if owned by another. That is how it works.
// When you have ownership, and you get something, it returns proxy.
// Except if in a current method where it is pending!

const SIDEKICK_CODE_MEMBRANE =
    new Admin(
      new Errors(
        new CodeMethods(
          new Bindings(
          /*
          new Recorder(
              new Owner(
                new Immutable()
              )
            )
      */
          )
        )
      )
    )

const NATIVE_CODE_MEMBRANE =
    new Admin(
      new CodeMethods(
      /*
        new Recorder(
          new Owner(
            new Immutable()
          )
        )
      */
      )
    )

// ------------------------------------------------------------------------------------------------

Membrane._JIG = JIG_MEMBRANE
Membrane._JIG_CODE = JIG_CODE_MEMBRANE
Membrane._SIDEKICK_CODE = SIDEKICK_CODE_MEMBRANE
Membrane._NATIVE_CODE = NATIVE_CODE_MEMBRANE

module.exports = Membrane
