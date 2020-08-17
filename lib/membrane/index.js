/**
 * index.js
 *
 * The primary types of membranes used by Run
 */

const AdminMembrane = require('./admin')
const BaseMembrane = require('./base')
const NativeMembrane = require('./native')
const ReadOnlyMembrane = require('./readonly')
const ErroredMembrane = require('./errored')
const EncapsulationMembrane = require('./encapsulation')

// ------------------------------------------------------------------------------------------------
// JIG_MEMBRANE
// ------------------------------------------------------------------------------------------------

const JIG_MEMBRANE =
    new AdminMembrane(
      new ErroredMembrane(
        new EncapsulationMembrane(
          new BaseMembrane()
        )
      )
    )

// ------------------------------------------------------------------------------------------------
// JIG_CODE_MEMBRANE
// ------------------------------------------------------------------------------------------------

const JIG_CODE_MEMBRANE =
    new AdminMembrane(
      new ErroredMembrane(
        new EncapsulationMembrane(
          new BaseMembrane()
        )
      )
    )

// ------------------------------------------------------------------------------------------------
// ARBITRARY_CODE_MEMBRANE
// ------------------------------------------------------------------------------------------------

// Arbitrary code membranes do not have private variables
const ARBITRARY_CODE_MEMBRANE =
    new AdminMembrane(
      new ErroredMembrane(
        new BaseMembrane()
      )
    )

// ------------------------------------------------------------------------------------------------
// NATIVE_CODE_MEMBRANE
// ------------------------------------------------------------------------------------------------

const NATIVE_CODE_MEMBRANE =
    new AdminMembrane(
      new NativeMembrane(
        new ReadOnlyMembrane(
          new BaseMembrane()
        )
      )
    )

// ------------------------------------------------------------------------------------------------

module.exports = {
  _JIG_MEMRANE: JIG_MEMBRANE,
  _JIG_CODE_MEMBRANE: JIG_CODE_MEMBRANE,
  _ARBITRARY_CODE_MEMBRANE: ARBITRARY_CODE_MEMBRANE,
  _NATIVE_CODE_MEMBRANE: NATIVE_CODE_MEMBRANE
}
