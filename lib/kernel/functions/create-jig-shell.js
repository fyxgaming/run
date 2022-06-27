const { _JIGS, _BERRIES } = require('../misc')
const Editor = require('../editor')
const Rules = require('../rules')
const Membrane = require('../membrane')
const Sandbox = require('../sandbox')
const { _sudo } = require('../admin')

function createJigShell (location, state) {
  switch (state.kind) {
    case 'code': return createCodeShell(location, state)
    case 'jig': return createInstanceShell(location, state)
    case 'berry': return createBerryShell(location, state)
    default: throw new Error(`Unknown kind: ${state.kind}`)
  }
}

function createCodeShell (location, state) {
  const C = Editor._createCode()
  _sudo(() => { C.location = location })
  return C
}

function createInstanceShell (location, state) {
  const initialized = true
  const props = new Sandbox._intrinsics.Object()
  const rules = Rules._jigObject(initialized)
  const jig = new Membrane(props, rules)
  _JIGS.add(jig)
  return jig
}

function createBerryShell (location, state) {
  const initialized = true
  const props = new Sandbox._intrinsics.Object()
  const rules = Rules._berryObject(initialized)
  const berry = new Membrane(props, rules)
  _BERRIES.add(berry)
}

module.exports = createJigShell
