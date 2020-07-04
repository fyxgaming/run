/**
 * action.js
 *
 * Record actions
 */

const Log = require('./log')
const { _assert, _parent, _hasOwnProperty, _sourceCode, _text } = require('./misc')
const { _BINDINGS } = require('./bindings')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Actions'

// ------------------------------------------------------------------------------------------------
// _deploy
// ------------------------------------------------------------------------------------------------

function _deploy (record, ...Cs) {
  const Membrane = require('./membrane')

  _assert(Cs.length)
  _assert(!record._exec.length)

  Log._info(TAG, 'Deploy', Cs.map(C => _text(C)).join(', '))

  const data = []

  // Spend parent inputs
  Cs.forEach(C => {
    // No parent, no spend
    const Parent = _parent(C)
    if (!Parent) return

    // Spend parent classes if they are owner-sealed
    const parentSealed = _hasOwnProperty(Parent, 'sealed') ? Parent.sealed : 'owner'
    switch (parentSealed) {
      case true: throw new Error('Parent class sealed')
      case false: break
      case 'owner': if (!Cs.includes(Parent)) record._spend(Parent); break
      default: throw new Error(`Invalid sealed: ${parentSealed}`)
    }
  })

  // Create the arguments for the deploy action
  Cs.forEach(C => {
    const src = _sourceCode(C)
    const props = Membrane._sudo(() => Object.assign({}, C))

    // Remove bindings from the props because they won't be deployed
    _BINDINGS.forEach(x => delete props[x])

    // Make sure there are no presets
    _assert(!props.presets)

    data.push(src)
    data.push(props)

    record._create(C)
  })

  record._cmd('deploy', data)
}

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

module.exports = { _deploy, _upgrade }
