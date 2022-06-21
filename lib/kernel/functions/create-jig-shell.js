const { _JIGS, _BERRIES } = require('../misc')
const Editor = require('../editor')
const Rules = require('../rules')
const Membrane = require('../membrane')
const Sandbox = require('../sandbox')

function createJigShell (state) {
  switch (state.kind) {
    case 'code': return createCodeShell()
    case 'jig': return createInstanceShell()
    case 'berry': return createBerryShell()
    default: throw new Error(`Unknown kind: ${state.kind}`)
  }
}

function createCodeShell () {
  return Editor._createCode()
}

function createInstanceShell () {
  const initialized = true
  const props = new Sandbox._intrinsics.Object()
  const rules = Rules._jigObject(initialized)
  const jig = new Membrane(props, rules)
  _JIGS.add(jig)
  return jig
}

function createBerryShell () {
  const initialized = true
  const props = new Sandbox._intrinsics.Object()
  const rules = Rules._berryObject(initialized)
  const berry = new Membrane(props, rules)
  _BERRIES.add(berry)
}

module.exports = createJigShell
