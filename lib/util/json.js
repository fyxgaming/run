/**
 * json.js
 *
 * Converts rich javascript objects and tokens into "Token JSON"
 *
 * This conversion is basically what determines what kinds of data may be stored in Jigs, stored
 * as class properties, or passed into functions. If we were to support a new kind of data type,
 * we would start by supporting it here.
 *
 * We use a custom JSON notation called "Token JSON" because we haven't found any other suitable
 * format to-date. Token JSON is JSON and may be used as such. However, it is also special JSON.
 * The JSON represents a rich JS object, and through deserialization, we can convert it back into
 * one.
 *
 * We often use what we call "$ objects" to do this. These are objects with a property (only
 * one is allowed) beginning with '$'. This means it contains something that JSON is unable to
 * represent. We also support circular references, duplicate objects, and more. The goal is to
 * fully recreate a JS object in all its structure. Here are a few examples:
 *
 *    Javascript Object                         Token JSON
 *    --------                                  ----------
 *    { n: 1 }                                  { n: 1 }
 *
 *    [true, false]                             [true, false]
 *
 *    "hello"                                   "hello"
 *
 *    undefined                                 { $undef: 1 }
 *
 *    new Set(['a'])                            { $set: ['a'] }
 *
 *    new Map([[1, 2]])                         { $map: [[1, 2]] }
 *
 *    { $set: 'a' }                             { $obj:  { $set: 'a' } }
 *
 *    new SomeJig()                             { $ref: <jig.location> }        (using replacer)
 *
 *    [someObject, someObject]                  { $dedup: [{ $dup: 0 }, ${dup: 0}], dups: [{<serialization of someObject>}] }
 *
 * Within this file, we often use 'x' to represent the original rich JavaScript object and 'y'
 * to represent the Token JSON serialized form of 'x'.
 */

const { _tokenType, _display } = require('./misc')
const { _hostIntrinsics } = require('../kernel/intrinsics')

// ------------------------------------------------------------------------------------------------
// TokenJSON
// ------------------------------------------------------------------------------------------------

/**
 * External API to serialize and deserialize
 *
 * Replacer and reviver functions are used when there is any customization. This file provides
 * several. If a replacer or reviver function returns a truthy value, then it is used.
 */
class TokenJSON {
  /**
   * Serializes a rich javascript object into Token JSON.
   * @param {*} x Value to serialize
   * @param {?object} opts Optional configuration
   * @param {?object} _hostIntrinsics Object containing host intrinsics. Defaults to host intrinsics.
   * @param {?object} _sandboxIntrinsics Object containing sandbox intrinsics. Defaults to host intrinsics.
   * @param {?object} _outputIntrinsics Object containing intrinsics for the return. Defaults to host intrinsics.
   * @param {?function} _replacer Replacer function that converts a non-null object to its serialization
   * @returns {*} Token JSON of x
   */
  static _serialize (x, opts = {}) {
    opts._hostIntrinsics = opts._hostIntrinsics || _hostIntrinsics
    opts._sandboxIntrinsics = opts._sandboxIntrinsics || _hostIntrinsics
    opts._outputIntrinsics = opts._outputIntrinsics || _hostIntrinsics
    opts._replacer = opts._replacer || (() => {})

    opts._cache = opts._cache || new Map() // X -> JSON
    opts._dups = opts._dups || new Set() // [X]

    // Inner calls to TokenJSON._serialize will not dedup.
    const dedup = typeof opts._dedup === 'boolean' ? opts._dedup : true
    opts._dedup = false

    // Serialize without de-duping anything. Dups are copies, using the cache.
    const y = _serializeAny(x, opts)

    // Dedup if necessary
    return (opts._dups.size && dedup) ? _dedup(y, opts) : y
  }

  /**
   * Deserializes Token JSON back to a rich object
   * @param {*} y Token JSON to deserialize
   * @param {?object} opts Optional configuration
   * @param {?object} _hostIntrinsics Object containing host intrinsics. Defaults to host intrinsics.
   * @param {?object} _sandboxIntrinsics Object containing sandbox intrinsics. Defaults to host intrinsics.
   * @param {?object} _outputIntrinsics Object containing intrinsics for the return. Defaults to sandbox intrinsics.
   * @param {?function} _reviver Reviver function that converts a serialization into a non-null object
   * @returns {*} Rich object of y
   */
  static _deserialize (y, opts = {}) {
    opts._hostIntrinsics = opts._hostIntrinsics || _hostIntrinsics
    opts._sandboxIntrinsics = opts._sandboxIntrinsics || _hostIntrinsics
    opts._outputIntrinsics = opts._outputIntrinsics || opts._sandboxIntrinsics
    opts._reviver = opts._reviver || (() => {})

    return _deserializeAny(y, opts)
  }
}

// ------------------------------------------------------------------------------------------------
// Serialize
// ------------------------------------------------------------------------------------------------

// Set cache in serializeObject, before going deeper
function _serializeAny (x, opts) {
  switch (typeof x) {
    case 'undefined': {
      const y = _newObject(opts)
      y.$undef = 1
      return y
    }
    case 'string': return x
    case 'boolean': return x
    case 'number':
      if (isNaN(x) || !isFinite(x) || Object.is(x, -0)) {
        const y = _newObject(opts)
        if (isNaN(x)) y.$nan = 1
        if (x === Infinity) y.$inf = 1
        if (x === -Infinity) y.$ninf = 1
        if (Object.is(x, -0)) y.$n0 = 1
        return y
      }
      return x
    case 'symbol': break
    case 'object':
    case 'function': {
      if (!x) return null
      const cached = opts._cache.get(x)
      if (cached) {
        opts._dups.add(cached)
        return cached
      }
      return _serializeObject(x, opts)
    }
  }
  _throwSer(x)
}

function _serializeObject (x, opts) {
  const proto2 = Object.getPrototypeOf(Object.getPrototypeOf(x))

  // This check works on all intrinsics, host or sandbox
  const isBasicObject = !proto2
  if (isBasicObject) {
    const y = _newObject(opts)
    opts._cache.set(x, y)
    let $ = false
    Object.keys(x).forEach(key => {
      $ = $ || key.startsWith('$')
      y[key] = _serializeAny(x[key], opts)
    })
    if (!$) return y
    const z = _newObject(opts)
    z.$obj = y
    return z
  }

  // This check also works on all intrinsics, host or sandbox
  const proto3 = proto2 && Object.getPrototypeOf(proto2)
  const isBasicArray = Array.isArray(x) && !proto3
  if (isBasicArray) {
    const y = _newArray(opts)
    opts._cache.set(x, y)
    Object.keys(x).forEach(key => { y[key] = _serializeAny(x[key], opts) })
    return y
  }

  const isSet = (x instanceof opts._hostIntrinsics.Set ||
    x instanceof opts._sandboxIntrinsics.Set) && !proto3
  if (isSet) {
    const y = _newObject(opts)
    opts._cache.set(x, y)
    y.$set = _newArray(opts)
    // Serialize every entry in the set
    for (const v of x) { y.$set.push(_serializeAny(v, opts)) }
    // Serialize properties on the set, if they exist
    if (Object.keys(x).length) {
      y.props = _newObject(opts)
      Object.keys(x).forEach(key => { y.props[key] = _serializeAny(x[key], opts) })
    }
    return y
  }

  const isMap = (x instanceof opts._hostIntrinsics.Map ||
    x instanceof opts._sandboxIntrinsics.Map) && !proto3
  if (isMap) {
    const y = _newObject(opts)
    opts._cache.set(x, y)
    y.$map = _newArray(opts)
    // Serialize every entry of the map
    for (const [k, v] of x) {
      const entry = _newArray(opts)
      entry.push(_serializeAny(k, opts))
      entry.push(_serializeAny(v, opts))
      y.$map.push(entry)
    }
    // Serialize properties on the map, if they exist
    if (Object.keys(x).length) {
      y.props = _newObject(opts)
      Object.keys(x).forEach(key => { y.props[key] = _serializeAny(x[key], opts) })
    }
    return y
  }

  const y = opts._replacer(x, opts)
  if (y) return y

  _throwSer(x)
}

function _replaceDups (x, dedups) {
  if (typeof x !== 'object' && typeof x !== 'function') return x
  const y = dedups.get(x)
  if (y) return y
  Object.keys(x).forEach(key => { x[key] = _replaceDups(x[key], dedups) })
  return x
}

function _dedup (x, opts) {
  const y = _newObject(opts)
  y.$dedup = {}
  // Create array of dup objects
  const dedups = new Map()
  y.dups = _newArray(opts)
  for (const dup of opts._dups) {
    const dedup = _newObject(opts)
    dedup.$dup = y.dups.length
    dedups.set(dup, dedup)
    y.dups.push(dup)
  }
  // Dedup each entry in main object, as well each dup
  y.$dedup = _replaceDups(x, dedups)
  y.dups.forEach(dup => {
    Object.keys(dup).forEach(key => {
      dup[key] = _replaceDups(dup[key], dedups)
    })
  })
  return y
}

// ------------------------------------------------------------------------------------------------
// Deserialize
// ------------------------------------------------------------------------------------------------

function _deserializeAny (y, opts) {
  switch (typeof y) {
    case 'string': return y
    case 'boolean': return y
    case 'number': if (isNaN(y) || !isFinite(y)) break; return y
    case 'object':
    case 'function': {
      if (!y) return null
      return _deserializeObject(y, opts)
    }
  }
  _throwDes(y)
}

function _deserializeObject (y, opts) {
  const proto2 = Object.getPrototypeOf(Object.getPrototypeOf(y))

  const preparedContainer = opts._preparedContainer
  delete opts._preparedContainer

  // This check works on all intrinsics, host or sandbox
  const isBasicObject = !proto2
  if (isBasicObject) {
    // Check if there are any special props
    let $
    Object.keys(y).forEach(key => {
      if (key.startsWith('$')) {
        if ($) _throwDes(y)
        $ = key
      }
    })

    // Basic objects
    if (!$) {
      const x = preparedContainer || _newObject(opts)
      if (opts._onlyContainer) return x

      Object.keys(y).forEach(key => {
        x[key] = _deserializeAny(y[key], opts)
      })

      return x
    }

    // Primitives
    if ($ === '$undef' && y.$undef === 1) return undefined
    if ($ === '$n0' && y.$n0 === 1) return -0
    if ($ === '$nan' && y.$nan === 1) return NaN
    if ($ === '$inf' && y.$inf === 1) return Infinity
    if ($ === '$ninf' && y.$ninf === 1) return -Infinity

    // Objects that contain $ properties
    if ($ === '$obj') {
      if (!(typeof y.$obj === 'object' && y.$obj)) _throwDes(y)

      const x = preparedContainer || _newObject(opts)
      if (opts._onlyContainer) return x

      const o = y.$obj
      Object.keys(o).forEach(key => {
        x[key] = _deserializeAny(o[key], opts)
      })

      return x
    }

    // Sets
    if ($ === '$set') {
      if (!Array.isArray(y.$set)) _throwDes(y)
      if (!(typeof y.props === 'undefined' || typeof y.props === 'object')) _throwDes(y)

      const x = preparedContainer || _newSet(opts)
      if (opts._onlyContainer) return x

      for (const val of y.$set) {
        x.add(_deserializeAny(val, opts))
      }

      const props = y.props
      if (props) {
        Object.keys(props).forEach(key => {
          x[key] = _deserializeAny(props[key], opts)
        })
      }

      return x
    }

    // Maps
    if ($ === '$map') {
      if (!Array.isArray(y.$map)) _throwDes(y)
      if (!(typeof y.props === 'undefined' || typeof y.props === 'object')) _throwDes(y)

      const x = preparedContainer || _newMap(opts)
      if (opts._onlyContainer) return x

      for (const val of y.$map) {
        if (!Array.isArray(val) || val.length !== 2) _throwDes(y)
        x.set(_deserializeAny(val[0], opts), _deserializeAny(val[1], opts))
      }

      const props = y.props
      if (props) {
        Object.keys(props).forEach(key => {
          x[key] = _deserializeAny(props[key], opts)
        })
      }

      return x
    }

    // Special dedup
    if ($ === '$dedup') {
      if (!(typeof y.$dedup === 'object' && y.$dedup)) _throwDes(y)
      if (!Array.isArray(y.dups)) _throwDes(y)
      if (!(typeof opts._dups === 'undefined')) _throwDes(y)

      // Create all the dup containers first
      opts._onlyContainer = true
      opts._dups = y.dups.map(dup => _deserializeAny(dup, opts))

      // Deserialize the dups
      delete opts._onlyContainer
      y.dups.forEach((dup, n) => {
        opts._preparedContainer = opts._dups[n]
        _deserializeAny(dup, opts)
      })

      // Deserialize the main object
      const x = _deserializeAny(y.$dedup, opts)

      delete opts._dups
      return x
    }

    // Special dup'd object
    if ($ === '$dup') {
      if (!Array.isArray(opts._dups)) _throwDes(y)
      if (!(typeof y.$dup === 'number' && y.$dup >= 0 && y.$dup < opts._dups.length)) _throwDes(y)

      return opts._dups[y.$dup]
    }
  }

  // This check also works on all intrinsics, host or sandbox
  const proto3 = proto2 && Object.getPrototypeOf(proto2)
  const isBasicArray = Array.isArray(y) && !proto3
  if (isBasicArray) {
    const x = preparedContainer || _newArray(opts)
    if (opts._onlyContainer) return x
    for (const v of y) { x.push(_deserializeAny(v, opts)) }
    return x
  }

  const x = opts._reviver(y, opts)
  if (x) return x

  _throwDes(y)
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

const _newObject = opts => new opts._outputIntrinsics.Object() // eslint-disable-line
const _newArray = opts => new opts._outputIntrinsics.Array() // eslint-disable-line
const _newSet = opts => new opts._outputIntrinsics.Set() // eslint-disable-line
const _newMap = opts => new opts._outputIntrinsics.Map() // eslint-disable-line

const _throwSer = x => { throw new Error(`Cannot serialize ${_display(x)}`) }
const _throwDes = x => { throw new Error(`Cannot deserialize ${_display(x)}`) }

// ------------------------------------------------------------------------------------------------
// Replacers and Revivers
// ------------------------------------------------------------------------------------------------

function _serializeTokensToRefs (getLocation) {
  return (x, opts) => {
    if (_tokenType(x)) {
      const y = _newObject(opts)
      y.$ref = getLocation(x)
      return y
    }
  }
}

function _deserializeRefsToTokens (getToken) {
  return x => x.$ref && getToken(x.$ref)
}

function _findAllTokenRefsInTokenJson (json) {
  const refs = new Set()
  _scanJsonForObjects(json, y => {
    if (y.$ref) refs.add(y.$ref)
  })
  return refs
}

function _scanJsonForObjects (y, scanner) {
  if (typeof y === 'object' || typeof y === 'function') {
    scanner(y)
    Object.keys(y).forEach(key => _scanJsonForObjects(y[key], scanner))
  }
}

const _serializeArbitraryObjects = deployables => {
  return (x, opts) => {
    console.log(x)
    if (typeof x === 'object') {
      // if (Run._util.deployable(x.constructor)) {
      // add to deployable list
      deployables.push(x.constructor)
      // }
      // TODO: use _newObject
      const y = { }
      opts._cache.set(x, y)
      y.$arb = TokenJSON._serialize(Object.assign({}, x), opts)
      y.T = '123'
      return y
    }
  }
}

/*
const _firstResult = (...callbacks) => {
  return (...args) => {
    for (const c of callbacks) {
      const y = c(...args)
      if (y) return y
    }
  }
}
*/

/*
// ------------------------------------------------------------------------------------------------
// Jig Checkpoint
// ------------------------------------------------------------------------------------------------

class Checkpoint {
  constructor (x, code, owner) {
    this.x = x
    this.refs = []

    this.xray = new Xray()
      .allowDeployables()
      .allowTokens()
      .restrictOwner(owner)
      .useIntrinsics(code.intrinsics)
      .useTokenSaver(token => { this.refs.push(token); return (this.refs.length - 1).toString() })
      .useTokenLoader(ref => this.refs[parseInt(ref, 10)])

    // Note: We should scan and deploy in one pass
    const obj = x instanceof Jig ? Object.assign({}, x) : x
    this.xray.scan(obj)
    this.xray.deployables.forEach(deployable => code.deploy(deployable))

    const obj = x instanceof Jig ? Object.assign({}, x) : x

    const refify = token => {
      this.refs.push(token);
      return this.refs.length - 1
    })

    this.serialized = TokenJSON._serialize(obj, {
      _sandboxIntrinsics: code._sandboxIntrinsics,
      _replacer: _refifyTokens(refify)
    })
  }

  restore () {
    if (!('restored' in this)) {
      this.restored = this.xray.deserialize(this.serialized)
    }
    return this.restored
  }

  restoreInPlace () {
    JigControl.disableProxy(() => {
      Object.keys(this.x).forEach(key => delete this.x[key])
      Object.assign(this.x, this.restore())
    })
  }

  equals (other) {
    const deepEqual = (a, b) => {
      if (typeof a !== typeof b) return false
      if (typeof a === 'object' && typeof b === 'object') {
        if (Object.keys(a).length !== Object.keys(b).length) return false
        return Object.keys(a).every(key => deepEqual(a[key], b[key]))
      }
      return a === b
    }

    if (!deepEqual(this.serialized, other.serialized)) return false
    if (this.refs.length !== other.refs.length) return false
    return this.refs.every((ref, n) => this.refs[n] === other.refs[n])
  }
}
*/

// ------------------------------------------------------------------------------------------------

TokenJSON._replace = {
  _tokens: _serializeTokensToRefs,
  _arbitraryObjects: _serializeArbitraryObjects
}

TokenJSON._revive = {
  _tokens: _deserializeRefsToTokens
}

TokenJSON._findAllTokenRefsInTokenJson = _findAllTokenRefsInTokenJson

module.exports = TokenJSON
