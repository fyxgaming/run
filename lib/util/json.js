/**
 * json.js
 *
 * Converts rich javascript objects and resources into "Resource JSON"
 *
 * This conversion is basically what determines what kinds of data may be stored in Jigs, stored
 * as class properties, or passed into functions. If we were to support a new kind of data type,
 * we would start by supporting it here.
 *
 * We use a custom JSON notation called "Resource JSON" because we haven't found any other suitable
 * format to-date. Resource JSON is JSON and may be used as such. However, it is also special JSON.
 * The JSON represents a rich JS object, and through deserialization, we can convert it back into
 * one.
 *
 * We often use what we call "$ objects" to do this. These are objects with a property (only
 * one is allowed) beginning with '$'. This means it contains something that JSON is unable to
 * represent. We also support circular references, duplicate objects, and more. The goal is to
 * fully recreate a JS object in all its structure. Here are a few examples:
 *
 *    Javascript Object                         Resource JSON
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
 * to represent the Resource JSON serialized form of 'x'.
 */

const { _resourceType } = require('./misc')
const { _text, _protoLen, _isBasicObject, _isBasicArray, _isUndefined } = require('./type')
const { SafeMap, SafeSet } = require('./safe')
const Sandbox = require('./sandbox')

// ------------------------------------------------------------------------------------------------
// ResourceJSON
// ------------------------------------------------------------------------------------------------

/**
 * External API to serialize and deserialize
 *
 * Replacer and reviver functions are used when there is any customization. This file provides
 * several. If a replacer or reviver function returns a truthy value, then it is used.
 */
class ResourceJSON {
  /**
   * Serializes a rich javascript object into Resource JSON.
   * @param {*} x Value to serialize
   * @param {?object} opts Optional configuration
   * @param {?object} _hostIntrinsics Object containing host intrinsics. Defaults to host intrinsics.
   * @param {?object} _sandboxIntrinsics Object containing sandbox intrinsics. Defaults to sandbox intrinsics.
   * @param {?object} _outputIntrinsics Object containing intrinsics for the return. Defaults to host intrinsics.
   * @param {?Set} _knownIntrinsics Set containing both host and sandbox intrinsics. Calculated is unspecified.
   * @param {?function} _replacer Replacer function that converts a non-null object to its serialization
   * @returns {*} Resource JSON of x
   */
  static _serialize (x, opts = {}) {
    opts = Object.assign({}, opts)

    opts._hostIntrinsics = opts._hostIntrinsics || Sandbox._hostIntrinsics
    opts._sandboxIntrinsics = opts._sandboxIntrinsics || Sandbox._intrinsics
    opts._outputIntrinsics = opts._outputIntrinsics || opts._hostIntrinsics
    opts._replacer = opts._replacer || null

    if (!opts._knownIntrinsics) {
      opts._knownIntrinsics = new Set()
      Object.keys(opts._hostIntrinsics).forEach(key => opts._knownIntrinsics.add(opts._hostIntrinsics[key]))
      if (opts._hostIntrinsics !== opts._sandboxIntrinsics) {
        Object.keys(opts._sandboxIntrinsics).forEach(key => opts._knownIntrinsics.add(opts._sandboxIntrinsics[key]))
      }
    }

    opts._cache = opts._cache || new SafeMap() // X -> JSON
    opts._dups = opts._dups || new SafeSet() // [X]

    // Inner calls to ResourceJSON._serialize will not dedup.
    const dedup = typeof opts._dedup === 'boolean' ? opts._dedup : true
    opts._dedup = false

    // Serialize without de-duping anything. Dups are copies, using the cache.
    const y = _serializeAny(x, opts)

    // Dedup if necessary
    return (opts._dups.size && dedup) ? _dedup(y, opts) : y
  }

  /**
   * Deserializes Resource JSON back to a rich object
   * @param {*} y Resource JSON to deserialize
   * @param {?object} opts Optional configuration
   * @param {?object} _hostIntrinsics Object containing host intrinsics. Defaults to host intrinsics.
   * @param {?object} _sandboxIntrinsics Object containing sandbox intrinsics. Defaults to sandbox intrinsics.
   * @param {?object} _outputIntrinsics Object containing intrinsics for the return. Defaults to sandbox intrinsics.
   * @param {?function} _reviver Reviver function that converts a serialization into a non-null object
   * @returns {*} Rich object of y
   */
  static _deserialize (y, opts = {}) {
    // console.log('d', y)
    opts = Object.assign({}, opts)

    opts._hostIntrinsics = opts._hostIntrinsics || Sandbox._hostIntrinsics
    opts._sandboxIntrinsics = opts._sandboxIntrinsics || Sandbox._intrinsics
    opts._outputIntrinsics = opts._outputIntrinsics || opts._sandboxIntrinsics
    opts._reviver = opts._reviver || null

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
  if (opts._knownIntrinsics.has(x)) _throwSer(x)

  // This check works on all intrinsics, host or sandbox
  if (_isBasicObject(x)) {
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
  if (_isBasicArray(x)) {
    const keys = Object.keys(x)
    if (keys.length === x.length) {
      const y = _newArray(opts)
      opts._cache.set(x, y)
      keys.forEach(key => y.push(_serializeAny(x[key], opts)))
      return y
    } else {
      const y = _newObject(opts)
      const arr = _newObject(opts)
      opts._cache.set(x, y)
      keys.forEach(key => { arr[key] = _serializeAny(x[key], opts) })
      y.$arr = arr
      return y
    }
  }

  const isSet = (x instanceof opts._hostIntrinsics.Set ||
    x instanceof opts._sandboxIntrinsics.Set) && _protoLen(x) === 3
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
    x instanceof opts._sandboxIntrinsics.Map) && _protoLen(x) === 3
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

  const isUint8Array = (x instanceof opts._hostIntrinsics.Uint8Array ||
    x instanceof opts._sandboxIntrinsics.Uint8Array) && _protoLen(x) === 4
  if (isUint8Array) {
    const keys = Object.keys(x)
    if (keys.length !== x.length) _throwSer(x)
    const valid = n => Number.isInteger(n) && n <= 255 && n >= 0
    if (keys.some(key => !valid(x[key]))) _throwSer(x)

    const y = _newObject(opts)
    opts._cache.set(x, y)
    // Convert to Uint8Array to fix a bug in browsers if x is a sandbox intrinsic
    const b = Buffer.from(new Uint8Array(x))
    y.$ui8a = b.toString('base64')
    return y
  }

  if (opts._replacer) {
    const y = opts._replacer(x, opts)
    if (y) return y
  }

  _throwSer(x)
}

function _replaceDups (x, dedups) {
  if ((typeof x !== 'object' && typeof x !== 'function') || !x) return x
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
    case 'number': if (isNaN(y) || !isFinite(y) || Object.is(y, -0)) break; return y
    case 'object':
    case 'function': {
      if (!y) return null
      return _deserializeObject(y, opts)
    }
  }
  _throwDes(y)
}

function _deserializeObject (y, opts) {
  // This check works on all intrinsics, host or sandbox
  if (_isBasicObject(y)) {
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
      const x = opts._preparedContainer || _newObject(opts)
      delete opts._preparedContainer
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

    // Arrays with special props
    if ($ === '$arr') {
      if (!(_isBasicObject(y.$arr) && y.$arr)) _throwDes(y)

      const x = opts._preparedContainer || _newArray(opts)
      delete opts._preparedContainer
      if (opts._onlyContainer) return x

      const o = y.$arr
      Object.keys(o).forEach(key => {
        x[key] = _deserializeAny(o[key], opts)
      })

      return x
    }

    // Objects that contain $ properties
    if ($ === '$obj') {
      if (!(_isBasicObject(y.$obj) && y.$obj)) _throwDes(y)

      const x = opts._preparedContainer || _newObject(opts)
      delete opts._preparedContainer
      if (opts._onlyContainer) return x

      const o = y.$obj
      Object.keys(o).forEach(key => {
        x[key] = _deserializeAny(o[key], opts)
      })

      return x
    }

    // Sets
    if ($ === '$set') {
      if (!_isBasicArray(y.$set)) _throwDes(y)
      if (!(_isUndefined(y.props) || _isBasicObject(y.props))) _throwDes(y)

      const x = opts._preparedContainer || _newSet(opts)
      delete opts._preparedContainer
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
      if (!_isBasicArray(y.$map)) _throwDes(y)
      if (!(_isUndefined(y.props) || _isBasicObject(y.props))) _throwDes(y)

      const x = opts._preparedContainer || _newMap(opts)
      delete opts._preparedContainer
      if (opts._onlyContainer) return x

      for (const val of y.$map) {
        if (!_isBasicArray(val) || val.length !== 2) _throwDes(y)
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

    // Uint8Arrays
    if ($ === '$ui8a') {
      if (typeof y.$ui8a !== 'string') _throwDes(y)
      if (y.$ui8a.split('').some(c => !base64Chars.has(c))) _throwDes(y)

      const buf = Buffer.from(y.$ui8a, 'base64')
      return opts._outputIntrinsics.Uint8Array.from(buf)
    }

    // Special dedup
    if ($ === '$dedup') {
      if (!(typeof y.$dedup === 'object' && y.$dedup)) _throwDes(y)
      if (!_isBasicArray(y.dups)) _throwDes(y)
      if (!_isUndefined(opts._dups)) _throwDes(y)

      // Create all the dup containers first
      opts._onlyContainer = true
      opts._dups = y.dups.map(dup => _deserializeAny(dup, opts))
      delete opts._onlyContainer

      // Deserialize the dups
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
      if (!_isBasicArray(opts._dups)) _throwDes(y)
      if (!(typeof y.$dup === 'number' && y.$dup >= 0 && y.$dup < opts._dups.length)) _throwDes(y)

      return opts._dups[y.$dup]
    }
  }

  // This check also works on all intrinsics, host or sandbox
  if (_isBasicArray(y)) {
    const x = opts._preparedContainer || _newArray(opts)
    delete opts._preparedContainer
    if (opts._onlyContainer) return x

    for (const v of y) { x.push(_deserializeAny(v, opts)) }
    return x
  }

  if (opts._reviver) {
    const x = opts._reviver(y, opts)
    delete opts._preparedContainer
    if (x) return x
  }

  _throwDes(y)
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

const _newObject = opts => new opts._outputIntrinsics.Object() // eslint-disable-line
const _newArray = opts => new opts._outputIntrinsics.Array() // eslint-disable-line
const _newSet = opts => new opts._outputIntrinsics.Set() // eslint-disable-line
const _newMap = opts => new opts._outputIntrinsics.Map() // eslint-disable-line

const _throwSer = x => { throw new Error(`Cannot serialize ${_text(x)}`) }
const _throwDes = x => { throw new Error(`Cannot deserialize ${_text(x)}`) }

const base64Chars = new Set()
'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  .split('').forEach(x => base64Chars.add(x))

// ------------------------------------------------------------------------------------------------
// Resources
// ------------------------------------------------------------------------------------------------

function _replaceResources (getLocation) {
  return (x, opts) => {
    if (_resourceType(x)) {
      const y = _newObject(opts)
      y.$ref = getLocation(x)
      return y
    }
  }
}

function _reviveResources (getResource) {
  return y => {
    if (_isBasicObject(y) && !_isUndefined(y.$ref)) {
      return getResource(y.$ref)
    }
  }
}

// ------------------------------------------------------------------------------------------------
// Arbitrary objects
// ------------------------------------------------------------------------------------------------

const _replaceArbitraryObjects = () => {
  return (x, opts) => {
    if (typeof x === 'object') {
      const y = { }
      opts._cache.set(x, y)
      y.$arb = ResourceJSON._serialize(Object.assign({}, x), opts)
      y.T = ResourceJSON._serialize(x.constructor, opts)
      return y
    }
  }
}

const _reviveArbitraryObjects = () => {
  return (y, opts) => {
    if (_isBasicObject(y) && !_isUndefined(y.$arb) && !_isUndefined(y.T)) {
      const x = opts._preparedContainer || _newObject(opts)
      delete opts._preparedContainer
      if (opts._onlyContainer) return x

      Object.assign(x, ResourceJSON._deserialize(y.$arb, opts))

      const T = ResourceJSON._deserialize(y.T, opts)
      Object.setPrototypeOf(x, T.prototype)

      return x
    }
  }
}

// ------------------------------------------------------------------------------------------------
// Combine replacers and revivers
// ------------------------------------------------------------------------------------------------

const _combine = (...callbacks) => {
  return (...args) => {
    for (const c of callbacks) {
      const y = c(...args)
      if (y) return y
    }
  }
}

// ------------------------------------------------------------------------------------------------
// Cache replacers and revivers
// ------------------------------------------------------------------------------------------------

const _cache = c => {
  return (x, opts) => {
    const cached = opts._cache.get(x)
    if (cached) return cached
    const y = c(x, opts)
    if (y) {
      opts._cache.set(x, y)
      return y
    }
  }
}

// ------------------------------------------------------------------------------------------------
// JSON scanning
// ------------------------------------------------------------------------------------------------

function _findAllResourceRefsInResourceJSON (json) {
  const refs = []
  _scanJsonForObjects(json, y => {
    if (y.$ref) refs.push(y.$ref)
  })
  return refs
}

function _scanJsonForObjects (y, scanner) {
  if ((typeof y === 'object' || typeof y === 'function') && y) {
    scanner(y)
    Object.keys(y).forEach(key => _scanJsonForObjects(y[key], scanner))
  }
}

// ------------------------------------------------------------------------------------------------

ResourceJSON._replace = {
  _resources: _replaceResources,
  _arbitraryObjects: _replaceArbitraryObjects,
  _multiple: _combine,
  _cache
}

ResourceJSON._revive = {
  _resources: _reviveResources,
  _arbitraryObjects: _reviveArbitraryObjects,
  _multiple: _combine
}

ResourceJSON._findAllResourceRefsInResourceJSON = _findAllResourceRefsInResourceJSON

module.exports = ResourceJSON
