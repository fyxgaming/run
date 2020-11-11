/**
 * action.js
 *
 * Defines and records actions that happened on jigs
 */

const { _prepareArgs } = require('./membrane')
const { _BINDINGS, _location } = require('../util/bindings')
const { _assert, _text, _parent, _hasJig, _hasOwnProperty } = require('../util/misc')
const { _deepVisit, _deepClone } = require('../util/deep')
const { StateError, UnimplementedError } = require('../util/errors')
const { _sudo } = require('../util/admin')
const Log = require('../util/log')
const Proxy2 = require('../util/proxy2')

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
 * If an action has a creation, then it will be spent when callers are authorized.
 */
class _Action {
  constructor (creation) {
    this._creation = creation
  }

  // Friendly string for logging
  toString () { return `${this.constructor.name}` }

  // Name of the opcode in the exec part of the payload
  op () { throw new UnimplementedError() }

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

  op () {
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
    return `Upgrade ${_text(this._creation)}`
  }

  op () {
    return 'UPGRADE'
  }

  data () {
    const data = []
    data.push(this._creation)
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
    return `Destroy ${_text(this._creation)}`
  }

  op () {
    return 'DESTROY'
  }

  data () {
    return this._creation
  }
}

// ------------------------------------------------------------------------------------------------
// _AuthAction
// ------------------------------------------------------------------------------------------------

class _AuthAction extends _Action {
  toString () {
    return `Auth ${_text(this._creation)}`
  }

  op () {
    return 'AUTH'
  }

  data () {
    return this._creation
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
    return `Call ${_text(this._creation)} ${this._method}`
  }

  op () {
    return 'CALL'
  }

  data () {
    const data = []
    data.push(this._creation)
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
    this._classJig = classJig
    this._args = args
  }

  toString () {
    return `New ${_text(this._creation)}`
  }

  op () {
    return 'NEW'
  }

  data () {
    const params = []
    params.push(this._classJig)
    params.push(this._args)
    return params
  }
}

// ------------------------------------------------------------------------------------------------
// _PluckAction
// ------------------------------------------------------------------------------------------------

// PluckAction is a special action that is only used internally and never becomes an opcode
class _PluckAction extends _Action {
  constructor (berryClass, berry, args) {
    super(berry)
    this._berryClass = berryClass
    this._args = args
  }

  toString () {
    return `Pluck ${_text(this._creation)}`
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
    jigs.forEach(jig => authParents(jig, 'deploy'))

    // Create the deploy action
    const action = new _DeployAction()

    for (const C of jigs) {
      // Object.assign() will only copy owned class props, not parent props. This is good.
      const src = C.toString()
      const props = _sudo(() => _deepClone(Object.assign({}, C)))

      // Add all jig properties as reads
      addReadRefs(props)

      // Remove bindings from the props because they won't be deployed
      _BINDINGS.forEach(x => delete props[x])

      // Presets should also never be present on code jigs
      _assert(!props.presets)

      action._srcList.push(src)
      action._propsList.push(props)
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

  // If already destroyed, then we can't upgrade
  const destroyed = 'vdel' in _location(_sudo(() => jig.location))
  if (destroyed) throw new StateError('Cannot upgrade destroyed jig')

  CURRENT_RECORD._capture(() => {
    authParents(jig, 'upgrade')

    // Create the deploy action
    const src = jig.toString()
    const props = _sudo(() => _deepClone(Object.assign({}, jig)))

    // Add all jig properties as reads
    addReadRefs(props)

    // Remove bindings from the props because they won't be deployed
    _BINDINGS.forEach(x => delete props[x])

    // Presets should also never be present on code jigs
    _assert(!props.presets)

    const action = new _UpgradeAction(jig, src, props)

    // Spend the jig being updated
    CURRENT_RECORD._update(jig, snapshot)

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
  const destroyed = 'vdel' in _location(_sudo(() => jig.location))
  if (destroyed) throw new StateError('Cannot auth destroyed jigs')

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

    // Add jig args as references. If the jig has an init method, then this isn't necessary,
    // but because native code isn't recordable this is needed when there isn't an init method.
    addReadRefs(preparedArgs)

    // Create the action
    const action = new _NewAction(classJig, jig, preparedArgs)

    // Create the new jig
    CURRENT_RECORD._create(jig)

    // Sandwich the action in a push/pop stack update
    CURRENT_RECORD._push(action)
    const ret = jig.init(...preparedArgs)
    if (typeof ret !== 'undefined') throw new StateError('init must not return a value')
    CURRENT_RECORD._pop()

    // Disable this jig from calling ever init again
    Proxy2._getHandler(jig)._rules._disabledMethods.push('init')
  })
}

// ------------------------------------------------------------------------------------------------
// _pluck
// ------------------------------------------------------------------------------------------------

function _pluck (berryClass, berry, args) {
  const Berry = require('./berry')
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  if (Log._infoOn) Log._info(TAG, 'Pluck', _text(berryClass))

  CURRENT_RECORD._capture(() => {
    // Read all classes in the chain since they were part of the creation
    let T = berryClass
    while (T !== Berry) {
      CURRENT_RECORD._read(T)
      T = Object.getPrototypeOf(T)
    }

    // Prepare args, deploying code in the process
    const preparedArgs = _prepareArgs(berry, args)

    // Add args as references. If the berry has an init method, then this isn't necessary,
    // but because native code isn't recordable this is needed when there isn't an init method.
    addReadRefs(preparedArgs)

    // Create the action
    const action = new _PluckAction(berryClass, berry, preparedArgs)

    // Sandwich the action in a push/pop stack update
    CURRENT_RECORD._push(action)
    const ret = berry.init(...preparedArgs)
    if (typeof ret !== 'undefined') throw new StateError('init must not return a value')
    CURRENT_RECORD._pop()

    // Disable this berry from calling ever init again
    Proxy2._getHandler(berry)._rules._disabledMethods.push('init')
  })
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

function authParents (jig, method) {
  const Editor = require('./editor')
  const Record = require('./record')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  const Parent = _parent(jig)
  if (!Parent) return

  // Parents up the chain must all approve. This allows modding hierarchies where a company
  // allows other companies to extend their base class but still not create children that might
  // break instanceof checks.
  authParents(Parent, method)

  const parentEditor = Editor._get(Parent)
  if (parentEditor._native) return

  const parentSealed = _hasOwnProperty(Parent, 'sealed') ? Parent.sealed : 'owner'
  switch (parentSealed) {
    case 'owner':
      if (!_hasJig(CURRENT_RECORD._creates, Parent)) {
        CURRENT_RECORD._auth(Parent)
      }
      break
    case true:
      throw new StateError(`Cannot ${method}: ${_text(Parent)} is sealed`)
    case false:
      break
    default:
      throw new StateError(`Invalid sealed option: ${parentSealed}`)
  }
}

// ------------------------------------------------------------------------------------------------

function addReadRefs (obj) {
  const Creation = require('./creation')
  const Record = require('./record')
  const Unbound = require('../util/unbound')
  const CURRENT_RECORD = Record._CURRENT_RECORD

  _deepVisit(obj, x => {
    if (x === Unbound) return false

    if (x instanceof Creation) {
      CURRENT_RECORD._read(x)

      // Only add top-level refs. Do not traverse deeply because they
      // are not part of the recorded state in the args.
      return false
    }
  })
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
  _PluckAction,
  _deploy,
  _upgrade,
  _destroy,
  _auth,
  _call,
  _new,
  _pluck
}
