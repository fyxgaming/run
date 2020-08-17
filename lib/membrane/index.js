/**
 * index.js
 *
 * The primary types of membranes used by Run
 */

const AdminMembrane = require('./admin')
const BaseMembrane = require('./base')
const CodeMembrane = require('./code')
const ErroredMembrane = require('./errored')
const NativeCodeMembrane = require('./native')
const PrivateMembrane = require('./private')
const ReadOnlyMembrane = require('./readonly')

// ------------------------------------------------------------------------------------------------
// Jig membrane
// ------------------------------------------------------------------------------------------------

const JIG_MEMBRANE =
    new AdminMembrane(
      new ErroredMembrane(
        new PrivateMembrane(
          new BaseMembrane()
        )
      )
    )

// ------------------------------------------------------------------------------------------------
// Jig class membrane
// ------------------------------------------------------------------------------------------------

const JIG_CLASS_MEMBRANE =
    new AdminMembrane(
      new ErroredMembrane(
        new PrivateMembrane(
          new CodeMembrane(
            new BaseMembrane()
          )
        )
      )
    )

// ------------------------------------------------------------------------------------------------
// Sidekick code membrane
// ------------------------------------------------------------------------------------------------

// Sidekick code does not support private variables
const SIDEKICK_CODE_MEMBRANE =
    new AdminMembrane(
      new ErroredMembrane(
        new CodeMembrane(
          new BaseMembrane()
        )
      )
    )

// ------------------------------------------------------------------------------------------------
// Native code membrane
// ------------------------------------------------------------------------------------------------

const NATIVE_CODE_MEMBRANE =
    new AdminMembrane(
      new NativeCodeMembrane(
        new ReadOnlyMembrane(
          new BaseMembrane()
        )
      )
    )

// ------------------------------------------------------------------------------------------------

module.exports = {
  _JIG_MEMRANE: JIG_MEMBRANE,
  _JIG_CLASS_MEMBRANE: JIG_CLASS_MEMBRANE,
  _SIDEKICK_CODE_MEMBRANE: SIDEKICK_CODE_MEMBRANE,
  _NATIVE_CODE_MEMBRANE: NATIVE_CODE_MEMBRANE
}
