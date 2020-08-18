/**
 * index.js
 *
 * The membrane combinations used in run
 */

const AdminFastPath = require('./admin')
const BaseMembrane = require('./base')
const CallMethodMembrane = require('./method')
const CodeMethods = require('./code')
const EnforcePrivateProperties = require('./private')
const EnforceUserRules = require('./user')
const MakeImmutable = require('./immutable')
const OwnershipMembrane = require('./ownership')
const RecordReads = require('./read')
const RecordWrites = require('./write')

// ------------------------------------------------------------------------------------------------
// Membranes
// ------------------------------------------------------------------------------------------------

// Membranes are successive boundaries on the underlying object. In general, the order is:
//    - Early out for admin and permanent methods
//    - Track reads
//    - Enforce access rules
//    - Record writes
//    - Perform action

const JIG_MEMBRANE =
    new AdminFastPath(
      new RecordReads(
        new EnforceUserRules(
          new EnforcePrivateProperties(
            new RecordWrites(
              new OwnershipMembrane(
                new CallMethodMembrane(
                  new BaseMembrane()
                )
              )
            )
          )
        )
      )
    )

const JIG_CLASS_MEMBRANE =
    new AdminFastPath(
      new CodeMethods(
        new RecordReads(
          new EnforceUserRules(
            new EnforcePrivateProperties(
              new RecordWrites(
                new OwnershipMembrane(
                  new CallMethodMembrane(
                    new BaseMembrane()
                  )
                )
              )
            )
          )
        )
      )
    )

const SIDEKICK_CODE_MEMBRANE =
    new AdminFastPath(
      new CodeMethods(
        new RecordReads(
          new EnforceUserRules(
            new OwnershipMembrane(
              new RecordWrites(
                new BaseMembrane()
              )
            )
          )
        )
      )
    )

const NATIVE_CODE_MEMBRANE =
    new AdminFastPath(
      new CodeMethods(
        new RecordReads(
          new MakeImmutable(
            new BaseMembrane()
          )
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
