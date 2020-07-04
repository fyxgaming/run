/**
 * command.js
 *
 * Stores actions as commands in records
 */

const Log = require('./log')
const { _assert, _parent, _hasOwnProperty, _sourceCode, _text } = require('./misc')
const { _BINDINGS } = require('./bindings')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Command'

const _COMMANDS = ['deploy', 'upgrade', 'destroy']

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
  Log._info(TAG, 'Upgrade', _text(C))

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
// _destroy
// ------------------------------------------------------------------------------------------------

function _destroy (record, jig) {
  Log._info(TAG, 'Destroy', _text(jig))

  record._spend(jig)
  record._delete(jig)

  const data = [jig]
  record._cmd('destroy', data)
}

// ------------------------------------------------------------------------------------------------

module.exports = { _COMMANDS, _deploy, _upgrade, _destroy }
