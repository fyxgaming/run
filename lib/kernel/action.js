/**
 * action.js
 *
 * Defines and records actions that happened on jigs
 */

const { _BINDINGS, _location } = require('../util/bindings')
const { _assert, _text, _parent, _hasOwnProperty, _checkState } = require('../util/misc')
const { _deepVisit, _deepClone, _deepReplace } = require('../util/deep')
const { StateError, UnimplementedError } = require('../util/errors')
const { _sudo } = require('../util/admin')
const Log = require('../util/log')
const Proxy2 = require('../util/proxy2')
const Universal = require('./universal')
const Sandbox = require('../util/sandbox')
const SI = Sandbox._intrinsics

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const TAG = 'Action'

// ------------------------------------------------------------------------------------------------
// _Action
// ------------------------------------------------------------------------------------------------

/**
 * Base class for all actions stored in the record
 *
 * If an action has a jig, then it will be spent when callers are authorized.
 */
class _Action {
  constructor (jig) {
    this._jig = jig
  }

  // Friendly string for logging
  toString () { return `${this.constructor.name}` }

  // Name of the opcode in the exec part of the payload
  opcode () { throw new UnimplementedError() }

  // The unserialized data that will be encoded for this particular action
  data () { throw new UnimplementedError() }
}

// ------------------------------------------------------------------------------------------------
// _DeployAction
// ------------------------------------------------------------------------------------------------

class _DeployAction extends _Action {
  constructor () {
    super(null)
    this._srcList = []
    this._propsList = []
  }

  toString () {
    const count = this._srcList.length
    return `Deploy (count: ${count})`
  }

  opcode () {
    return 'DEPLOY'
  }

  data () {
    _assert(this._srcList.length === this._propsList.length)
    const data = []
    for (let i = 0; i < this._srcList.length; i++) {
      const src = this._srcList[i]
      const props = this._propsList[i]
      data.push(src)
      data.push(props)
    }
    return data
  }
}

// ------------------------------------------------------------------------------------------------
// _UpgradeAction
// ------------------------------------------------------------------------------------------------

class _UpgradeAction extends _Action {
  constructor (jig, src, props) {
    super(jig)
    this._src = src
    this._props = props
  }

  toString () {
    return `Upgrade ${_text(this._jig)}`
  }

  opcode () {
    return 'UPGRADE'
  }

  data () {
    const data = []
    data.push(this._jig)
    data.push(this._src)
    data.push(this._props)
    return data
  }
}

// ------------------------------------------------------------------------------------------------
// _DestroyAction
// ------------------------------------------------------------------------------------------------

class _DestroyAction extends _Action {
  toString () {
    return `Destroy ${_text(this._jig)}`
  }

  opcode () {
    return 'DESTROY'
  }

  data () {
    return this._jig
  }
}

// ------------------------------------------------------------------------------------------------
// _AuthAction
// ------------------------------------------------------------------------------------------------

class _AuthAction extends _Action {
  toString () {
    return `Auth ${_text(this._jig)}`
  }

  opcode () {
    return 'AUTH'
  }

  data () {
    return this._jig
  }
}

// ------------------------------------------------------------------------------------------------
// _CallAction
// ------------------------------------------------------------------------------------------------

class _CallAction extends _Action {
  constructor (jig, method, args) {
    super(jig)
    this._method = method
    this._args = args
  }

  toString () {
    return `Call ${_text(this._jig)} ${this._method}`
  }

  opcode () {
    return 'CALL'
  }

  data () {
    const data = []
    data.push(this._jig)
    data.push(this._method)
    data.push(this._args)
    return data
  }
}

// ------------------------------------------------------------------------------------------------
// _NewAction
// ------------------------------------------------------------------------------------------------

class _NewAction extends _Action {
  constructor (classJig, jig, args) {
    super(jig)
    this._jig = jig
    this._classJig = classJig
    this._args = args
  }

  toString () {
    return `New ${_text(this._jig)}`
  }

  opcode () {
    return 'NEW'
  }

  data () {
    const data = []
    data.push(this._classJig)
    data.push(this._args)
    return data
  }
}

// ------------------------------------------------------------------------------------------------
// _deploy
// ------------------------------------------------------------------------------------------------

function _deploy (jigs) {
  const Code = require('./code')
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  _assert(jigs.length)
  _assert(jigs.every(C => C instanceof Code))

  if (Log._debugOn) Log._debug(TAG, 'Deploy', jigs.map(C => _text(C)).join(', '))

  CURRENT_RECORD._capture(() => {
    // Add deploy code to the CREATE set
    jigs.forEach(C => CURRENT_RECORD._create(C))

    // Add parent classes to the AUTH set
    jigs.forEach(jig => authParents(jig))

    // Create the deploy action
    const action = new _DeployAction()

    for (const C of jigs) {
      // Object.assign() will only copy owned class props, not parent props. This is good.
      const src = C.toString()
      const props = _sudo(() => Object.assign({}, C))

      // Remove bindings from the props because they won't be deployed
      _BINDINGS.forEach(x => delete props[x])

      // Presets should also never be present on code jigs
      _assert(!props.presets)

      action._srcList.push(src)
      action._propsList.push(props)

      // Add all jig properties as reads
      addReadRefs(props)
    }

    // Add the action as a top-level action
    CURRENT_RECORD._action(action)
  })
}

// ------------------------------------------------------------------------------------------------
// _upgrade
// ------------------------------------------------------------------------------------------------

function _upgrade (jig, snapshot) {
  const Code = require('./code')
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  _assert(jig instanceof Code)

  if (Log._debugOn) Log._debug(TAG, 'Upgrade', _text(jig))

  // If already destroyed, then we can't auth
  _checkState(!('vdel' in _location(_sudo(() => jig.location))),
    'Cannot upgrade destroyed jig')

  CURRENT_RECORD._capture(() => {
    authParents(jig)

    // Create the deploy action
    const src = jig.toString()
    const props = _sudo(() => Object.assign({}, jig))

    // Remove bindings from the props because they won't be deployed
    _BINDINGS.forEach(x => delete props[x])

    // Presets should also never be present on code jigs
    _assert(!props.presets)

    const action = new _UpgradeAction(jig, src, props)

    // Spend the jig being updated
    CURRENT_RECORD._update(jig, snapshot)

    // Add all jig properties as reads
    addReadRefs(props)

    // Add the action as a top-level action
    CURRENT_RECORD._action(action)
  })
}

// ------------------------------------------------------------------------------------------------
// _destroy
// ------------------------------------------------------------------------------------------------

function _destroy (jig) {
  const Record = require('./record')
  const Code = require('./code')
  const Jig = require('./jig')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  _assert(jig instanceof Code || jig instanceof Jig)

  if (Log._infoOn) Log._info(TAG, 'Destroy', _text(jig))

  // If already destroyed, then nothing to do
  if ('vdel' in _location(_sudo(() => jig.location))) return

  CURRENT_RECORD._capture(() => {
    CURRENT_RECORD._delete(jig)

    // Only add the action if there is not already an action in progress
    if (CURRENT_RECORD._stack.length) return

    const action = new _DestroyAction(jig)
    CURRENT_RECORD._action(action)
  })
}

// ------------------------------------------------------------------------------------------------
// _auth
// ------------------------------------------------------------------------------------------------

function _auth (jig) {
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD
  const Code = require('./code')
  const Jig = require('./jig')

  _assert(jig instanceof Code || jig instanceof Jig)

  if (Log._infoOn) Log._info(TAG, 'Auth', _text(jig))

  // If already destroyed, then we can't auth
  _checkState(!('vdel' in _location(_sudo(() => jig.location))),
    'Cannot auth destroyed jig')

  CURRENT_RECORD._capture(() => {
    CURRENT_RECORD._auth(jig)

    // Only add the action if there is not already an action in progress
    if (CURRENT_RECORD._stack.length) return

    const action = new _AuthAction(jig)
    CURRENT_RECORD._action(action)
  })
}

// ------------------------------------------------------------------------------------------------
// _call
// ------------------------------------------------------------------------------------------------

function _call (jig, method, args, f) {
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  if (Log._infoOn) Log._info(TAG, 'Call', _text(jig), method)

  CURRENT_RECORD._capture(() => {
    // Add jig args as references
    addReadRefs(args)

    // Create the action
    const action = new _CallAction(jig, method, args)

    // Sandwich the action in a push/pop stack update
    CURRENT_RECORD._push(action)
    f()
    CURRENT_RECORD._pop()
  })
}

// ------------------------------------------------------------------------------------------------
// _new
// ------------------------------------------------------------------------------------------------

function _new (classJig, jig, args) {
  const Jig = require('./jig')
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  if (Log._infoOn) Log._info(TAG, 'New', _text(classJig))

  CURRENT_RECORD._capture(() => {
    // Read all classes in the chain since they were part of the creation
    let T = classJig
    while (T !== Jig) {
      CURRENT_RECORD._read(T)
      T = Object.getPrototypeOf(T)
    }

    // Prepare args, deploying code in the process
    const preparedArgs = _prepareArgs(jig, args)

    // Create the action
    const action = new _NewAction(classJig, jig, preparedArgs)

    // Create the new jig
    CURRENT_RECORD._create(jig)

    // Sandwich the action in a push/pop stack update
    CURRENT_RECORD._push(action)
    const ret = jig.init(...preparedArgs)
    _checkState(typeof ret === 'undefined', 'init must not return a value')
    CURRENT_RECORD._pop()

    // Disable this jig from calling ever again
    Proxy2._getHandler(jig)._rules._disabledMethods.push('init')
  })
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function authParents (jig) {
  const Code = require('./code')
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  const Parent = _parent(jig)
  if (!Parent) return

  // Parents up the chain must all approve. This allows modding hierarchies where a company
  // allows other companies to extend their base class but still not create children that might
  // break instanceof checks.
  authParents(Parent)

  const parentCode = Code._editor(Parent)
  if (parentCode._native) return

  const parentSealed = _hasOwnProperty(Parent, 'sealed') ? Parent.sealed : 'owner'
  switch (parentSealed) {
    case 'owner':
      if (!CURRENT_RECORD._creates.includes(Parent)) {
        CURRENT_RECORD._auth(Parent)
      }
      break
    case true:
      throw new StateError('Parent class sealed')
    case false:
      break
    default:
      throw new StateError(`Bad sealed property: ${parentSealed}`)
  }
}

// ------------------------------------------------------------------------------------------------

function addReadRefs (obj) {
  const Universal = require('./universal')
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  _deepVisit(obj, x => {
    if (x instanceof Universal) {
      CURRENT_RECORD._read(x)
      return false
    }
  })
}

// ------------------------------------------------------------------------------------------------

function _prepareArgs (thisArg, args) {
  const Jig = require('./jig')
  const Code = require('./code')

  // If thisArg is already code, make sure its deployed
  if (thisArg instanceof Code) Code._editor(thisArg)._deploy()

  // Clone the value using sandbox intrinsics
  const clonedArgs = _deepClone(args, SI, x => {
    if (typeof x === 'function' && !(x instanceof Universal)) {
      const C = new Code(x)
      Code._editor(C)._deploy()
      return C
    }

    // If x is already code, make sure its deployed
    if (x instanceof Code) Code._editor(x)._deploy()
  })

  // Create a map of all inner jigs in their latest states
  const worldview = new Map() // Origin -> Universal
  _sudo(() => {
    worldview.set(thisArg.origin, thisArg)
    if (thisArg instanceof Jig) worldview.set(thisArg.constructor.origin, thisArg.constructor)
    _deepVisit([thisArg, clonedArgs], x => {
      if (x instanceof Universal) {
        const y = worldview.get(x.origin) || x
        if (x.nonce >= y.nonce) worldview.set(x.origin, y)
      }
    })
  })

  // Also unify the worldview so that the called jig is in harmony with the args.
  // Make sure to preserve thisArg and its class that we might be calling
  _sudo(() => {
    _deepReplace([thisArg, clonedArgs], x => {
      if (x instanceof Universal) return worldview.get(x.origin)
    })
  })

  return clonedArgs
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _Action,
  _DeployAction,
  _UpgradeAction,
  _DestroyAction,
  _AuthAction,
  _CallAction,
  _NewAction,
  _deploy,
  _upgrade,
  _destroy,
  _auth,
  _call,
  _new,
  _prepareArgs
}
