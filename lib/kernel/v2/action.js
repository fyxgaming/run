/**
 * actions.js
 *
 * The actions that may be stored in the record.
 */

const Membrane = require('./membrane')
const { _jigInMapKeys } = require('../../util/misc2')
const { _text, _sourceCode, _parent } = require('../../util/type')
const { _BINDINGS } = require('../../util/bindings')
const { _assert } = require('../../util/misc')
const Snapshot = require('../../util/snapshot')
const Log = require('../../util/log')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Action'

// ------------------------------------------------------------------------------------------------
// _deploy
// ------------------------------------------------------------------------------------------------

function _deploy (record, Cs) {
  Log._info(TAG, 'Deploy', Cs.map(C => _text(C)).join(', '))

  const args = []
  const inputs = new Map()
  const outputs = new Map()
  const refs = new Map()

  // Spend parent inputs
  Cs.forEach(C => {
    // Utility classes don't need to be spent
    if (C.options && C.options.utility) return

    // No parent, no spend
    const Parent = _parent(C)
    if (!Parent) return

    // If the parent is new, no spend
    if (Cs.includes(Parent)) return

    // If we already spent the parent, no spend
    if (_jigInMapKeys(outputs, Parent)) return

    // Spend!
    const snapshot = new Snapshot(Parent)
    inputs.set(Parent, snapshot)
    outputs.set(Parent, snapshot)
  })

  // Create the arguments for the deploy action
  Cs.forEach(C => {
    const src = _sourceCode(C)
    const props = Membrane._sudo(() => Object.assign({}, C))

    // Remove bindings from the props because they won't be deployed
    _BINDINGS.forEach(x => delete props[x])

    // Make sure there are no presets
    _assert(!props.presets)

    args.push(src)
    args.push(props)

    const snapshot = new Snapshot(C)
    outputs.set(C, snapshot)
  })

  // Store the action
  record._addAction('deploy', args, inputs, outputs, refs)
}

// ------------------------------------------------------------------------------------------------

module.exports = { _deploy }
