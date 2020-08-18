/**
 * index.js
 *
 * The membrane combinations used in run
 */

const AdminFastPath = require('./admin')
const BaseMembrane = require('./base')
const CallMethodMembrane = require('./method')
const EnableCodeMethods = require('./code')
const EnableJigMethods = require('./jig')
const EnableNativeMethods = require('./native')
const EnforcePrivateProperties = require('./private')
const EnforceUserRules = require('./user')
const MakeImmutable = require('./immutable')
const OwnershipMembrane = require('./ownership')
const RecordReads = require('./read')
const RecordWrites = require('./write')

// ------------------------------------------------------------------------------------------------
// Membranes
// ------------------------------------------------------------------------------------------------

const JIG_MEMBRANE =
    new AdminFastPath(
      new RecordReads(
        new EnforceUserRules(
          new EnforcePrivateProperties(
            new EnableJigMethods(
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

const JIG_CLASS_MEMBRANE =
    new AdminFastPath(
      new RecordReads(
        new EnforceUserRules(
          new EnforcePrivateProperties(
            new EnableCodeMethods(
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
      new RecordReads(
        new EnforceUserRules(
          new EnableCodeMethods(
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
      new RecordReads(
        new EnableNativeMethods(
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
