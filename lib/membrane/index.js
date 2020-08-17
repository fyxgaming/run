/**
 * index.js
 *
 * The membrane combinations used in run
 */

const AdminMembrane = require('./admin')
const BaseMembrane = require('./base')
const CodeMembrane = require('./code')
const ErroredMembrane = require('./errored')
const NativeCodeMembrane = require('./native')
const OwnerMembrane = require('./owner')
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
          new OwnerMembrane(
            new PrivateMembrane(
              new RecorderMembrane(
                new BaseMembrane()
              )
            )
          )
        )
      )
    )

const JIG_CLASS_MEMBRANE =
    new AdminMembrane(
      new ErroredMembrane(
        new UserMembrane(
          new OwnerMembrane(
            new PrivateMembrane(
              new CodeMembrane(
                new RecorderMembrane(
                  new BaseMembrane()
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
          new OwnerMembrane(
            new CodeMembrane(
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
