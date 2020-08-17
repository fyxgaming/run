/**
 * index.js
 *
 * The membrane combinations used in run
 */

const AdminMembrane = require('./admin')
const BaseMembrane = require('./base')
const CodeMembrane = require('./code')
const ErroredMembrane = require('./errored')
const JigMembrane = require('./jig')
const MethodMembrane = require('./method')
const NativeCodeMembrane = require('./native')
const OwnershipMembrane = require('./ownership')
const PrivateMembrane = require('./private')
const ReadOnlyMembrane = require('./readonly')
const RecorderMembrane = require('./recorder')
const UserMembrane = require('./user')

// ------------------------------------------------------------------------------------------------
// Membranes
// ------------------------------------------------------------------------------------------------

const JIG_MEMBRANE =
    new AdminMembrane(
      new ErroredMembrane(
        new UserMembrane(
          new PrivateMembrane(
            new JigMembrane(
              new OwnershipMembrane(
                new MethodMembrane(
                  new RecorderMembrane(
                    new BaseMembrane()
                  )
                ))
            )
          )
        )
      )
    )

const JIG_CLASS_MEMBRANE =
    new AdminMembrane(
      new ErroredMembrane(
        new UserMembrane(
          new PrivateMembrane(
            new CodeMembrane(
              new OwnershipMembrane(
                new MethodMembrane(
                  new RecorderMembrane(
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
    new AdminMembrane(
      new ErroredMembrane(
        new UserMembrane(
          new CodeMembrane(
            new OwnershipMembrane(
              new RecorderMembrane(
                new BaseMembrane()
              )
            )
          )
        )
      )
    )

const NATIVE_CODE_MEMBRANE =
    new AdminMembrane(
      new NativeCodeMembrane(
        new ReadOnlyMembrane(
          new RecorderMembrane(
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
