const Editor = require('../editor')
const Json = require('../json')
const Sandbox = require('../sandbox')
const { _parentName, _setOwnProperty } = require('../misc')
const { _location, _compileLocation } = require('../bindings')
const { _sudo } = require('../admin')

function hydrateJigShell (shell, location, state, jigs) {
  switch (state.kind) {
    case 'code': hydrateCodeShell(shell, location, state, jigs); break
    case 'jig': hydrateInstanceShell(shell, location, state, jigs); break
    case 'berry': hydrateBerryShell(shell, location, state, jigs); break
    default: throw new Error(`Unknown kind: ${state.kind}`)
  }
}

function hydrateCodeShell (shell, location, state, jigs) {
  const txid = location.split('_')[0]

  const props = Json._decode(state.props, {
    _intrinsics: Sandbox._intrinsics,
    _decodeJig: partialLocation => {
      const parts = _location(partialLocation)
      if (parts._native) {
        const C = Editor._lookupNativeCodeByName(parts._native)
        if (!C) throw new Error(`Native code not found: ${parts._native}`)
        return C
      }
      const fullLocation = _compileLocation(Object.assign({ _txid: txid }, parts))
      if (!(fullLocation in jigs)) throw new Error(`Missing ref: ${fullLocation}`)
      return jigs[fullLocation]
    }
  })

  const env = {}

  // TODO: Check the trustlist

  // Setup the parent class if there is one
  const parentName = _parentName(state.src)
  if (parentName) {
    const parentLocation = props.deps[parentName].location
    const parts = _location(parentLocation)
    let Parent = null
    if (parts._native) {
      Parent = Editor._lookupNativeCodeByName(parts._native)
    } else {
      const parentFullLocation = _compileLocation(Object.assign({ _txid: txid }, parts))
      Parent = jigs[parentFullLocation]
    }
    if (!Parent) throw new Error(`Missing parent: ${parentLocation}`)
    env[parentName] = Parent
  }

  // Sandbox and load the code
  const T = Sandbox._evaluate(state.src, env)[0]
  const [S, SGlobal] = Editor._makeSandbox(shell, T)
  const local = false
  Editor._get(shell)._install(S, local)

  // Apply the now loaded props to the code
  _sudo(() => {
    // Delete all the existing keys first. Particularly bindings. Otherwise, ordering bugs.
    // TODO: Needed?
    Object.keys(shell).forEach(key => { delete shell[key] })
    Object.keys(props).forEach(key => _setOwnProperty(shell, key, props[key]))
  })

  // Apply final bindings to the code
  _sudo(() => {
    shell.location = _compileLocation(Object.assign({ _txid: txid }, _location(shell.location)))
    shell.origin = _compileLocation(Object.assign({ _txid: txid }, _location(shell.origin)))
  })

  // Make the deps update the globals in the sandbox as we'd expect
  _sudo(() => {
    const deps = Editor._makeDeps(shell, SGlobal, shell.deps)
    _setOwnProperty(shell, 'deps', deps)
    // Update the globals with the new dependencies using the new deps wrapper.
    Object.keys(props.deps || {}).forEach(prop => {
      shell.deps[prop] = props.deps[prop]
    })
  })
}

function hydrateInstanceShell (shell, location, state, jigs) {
  const txid = location.split('_')[0]

  const props = Json._decode(state.props, {
    _intrinsics: Sandbox._intrinsics,
    _decodeJig: partialLocation => {
      const parts = _location(partialLocation)
      if (parts._native) {
        const C = Editor._lookupNativeCodeByName(parts._native)
        if (!C) throw new Error(`Native code not found: ${parts._native}`)
        return C
      }
      const fullLocation = _compileLocation(Object.assign({ _txid: txid }, parts))
      if (!(fullLocation in jigs)) throw new Error(`Missing ref: ${location}`)
      return jigs[fullLocation]
    }
  })

  // Assign the class onto the jig
  const C = jigs[state.cls.$jig]
  if (!C) throw new Error(`Missing ref: ${state.cls.$jig}`)
  _sudo(() => Object.setPrototypeOf(shell, C.prototype))

  // Apply now loaded props to the jig
  _sudo(() => {
    Object.keys(props).forEach(key => {
      _setOwnProperty(shell, key, props[key])
    })
  })

  // Apply final bindings to the jig
  _sudo(() => {
    shell.location = _compileLocation(Object.assign({ _txid: txid }, _location(shell.location)))
    shell.origin = _compileLocation(Object.assign({ _txid: txid }, _location(shell.origin)))
  })
}

function hydrateBerryShell (shell, location, state, jigs) {
  const txid = location.split('_')[0]

  const props = Json._decode(state.props, {
    _intrinsics: Sandbox._intrinsics,
    _decodeJig: partialLocation => {
      const parts = _location(partialLocation)
      if (parts._native) {
        const C = Editor._lookupNativeCodeByName(parts._native)
        if (!C) throw new Error(`Native code not found: ${parts._native}`)
        return C
      }
      const fullLocation = _compileLocation(Object.assign({ _txid: txid }, parts))
      if (!(fullLocation in jigs)) throw new Error(`Missing ref: ${location}`)
      return jigs[fullLocation]
    }
  })

  // Assign the class onto the berry
  const B = jigs[state.cls.$jig]
  if (!B) throw new Error(`Missing ref: ${state.cls.$jig}`)
  _sudo(() => Object.setPrototypeOf(shell, B.prototype))

  // Apply now loaded props to the berry
  _sudo(() => {
    Object.keys(props).forEach(key => {
      _setOwnProperty(shell, key, props[key])
    })
  })

  // TODO: Need to apply final bindings?
}

module.exports = hydrateJigShell
