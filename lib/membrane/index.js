/**
 * index.js
 *
 * The primary types of membranes used by Run
 */

const AdminMembrane = require('./admin')
const BaseMembrane = require('./base')
const NativeMembrane = require('./native')
const ReadOnlyMembrane = require('./readonly')

// ------------------------------------------------------------------------------------------------
// JIG_MEMBRANE
// ------------------------------------------------------------------------------------------------

const JIG_MEMBRANE =
    new AdminMembrane(
      new BaseMembrane()
    )

// ------------------------------------------------------------------------------------------------
// CODE_MEMBRANE
// ------------------------------------------------------------------------------------------------

const CODE_MEMBRANE =
    new AdminMembrane(
      new BaseMembrane()
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
  _CODE_MEMBRANE: CODE_MEMBRANE,
  _NATIVE_CODE_MEMBRANE: NATIVE_CODE_MEMBRANE
}
