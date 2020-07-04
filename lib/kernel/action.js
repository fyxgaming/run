/**
 * action.js
 *
 * Record actions
 */

const Log = require('./log')
const { _parent, _hasOwnProperty, _sourceCode } = require('./misc')
const { _BINDINGS } = require('./bindings')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Actions'

// ------------------------------------------------------------------------------------------------
// _upgrade
// ------------------------------------------------------------------------------------------------

function _upgrade (record, C, snapshot) {
  Log._info(TAG, 'Upgrade')

  const Membrane = require('./membrane')

  // Spend parent classes if they are owner-sealed
  const Parent = _parent(C)
  if (Parent) {
    const parentSealed = _hasOwnProperty(Parent, 'sealed') ? Parent.sealed : 'owner'
    switch (parentSealed) {
      case true: throw new Error('Parent class sealed')
      case false: break
      case 'owner': record._spend(Parent); break
      default: throw new Error(`Invalid sealed: ${parentSealed}`)
    }
  }

  const src = _sourceCode(C)
  const props = Membrane._sudo(() => Object.assign({}, C))

  // Remove bindings from the props because they won't be deployed
  _BINDINGS.forEach(x => delete props[x])

  const data = [C, src, props]

  record._spend(C, snapshot)

  record._cmd('upgrade', data)
}

// ------------------------------------------------------------------------------------------------

module.exports = { _upgrade }
