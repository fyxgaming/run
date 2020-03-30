/**
 * serialize.js
 *
 * Converts rich javascript objects and tokens into JSON
 */

const { _display } = require('./misc')
const { _hostIntrinsics } = require('../kernel/intrinsics')

// ------------------------------------------------------------------------------------------------
// Serialize
// ------------------------------------------------------------------------------------------------

function _toTokenJson (x, options = {}) {
  options._cache = options._cache || new Map()
  options._dups = options._dups || new Set()
  options._hostIntrinsics = options._hostIntrinsics || _hostIntrinsics
  options._sandboxIntrinsics = options._sandboxIntrinsics || _hostIntrinsics
  options._outputIntrinsics = options._outputIntrinsics || _hostIntrinsics
  const y = _serialize(x, options)
  return options._dups.size ? _dedup(y, options) : y
}

// Set cache in serializeObject, before going deeper
function _serialize (x, options) {
  switch (typeof x) {
    case 'undefined': return { $undef: 1 }
    case 'string': return x
    case 'boolean': return x
    case 'number': if (isNaN(x) || !isFinite(x)) break; return x
    case 'symbol': break
    case 'object':
    case 'function': {
      if (!x) return null
      const cached = options._cache.get(x)
      if (cached) {
        options._dups.add(cached)
        return cached
      }
      return _serializeObject(x, options)
    }
  }
  throw new Error(`Cannot serialize ${_display(x)}`)
}

const _newObject = options => Object.create(options._outputIntrinsics.Object)
const _newArray = options => options._outputIntrinsics.Array.from([])

function _serializeObject (x, options) {
  const proto2 = Object.getPrototypeOf(Object.getPrototypeOf(x))

  // This check works on all intrinsics, host or sandbox
  const isBasicObject = !proto2
  if (isBasicObject) {
    const y = _newObject(options)
    options._cache.set(x, y)
    let $ = false
    Object.keys(x).forEach(key => {
      $ = $ || key.startsWith('$')
      y[key] = _serialize(x[key], options)
    })
    if (!$) return y
    const z = _newObject(options)
    z.$obj = y
    return z
  }

  // This check also works on all intrinsics, host or sandbox
  const proto3 = proto2 && Object.getPrototypeOf(proto2)
  const isBasicArray = Array.isArray(x) && !proto3
  if (isBasicArray) {
    const y = _newArray(options)
    options._cache.set(x, y)
    Object.keys(x).forEach(key => { y[key] = _serialize(x[key], options) })
    return y
  }

  const isSet = (x instanceof options._hostIntrinsics.Set ||
    x instanceof options._sandboxIntrinsics.Set) && !proto3
  if (isSet) {
    const y = _newObject(options)
    options._cache.set(x, y)
    y.$set = _newArray(options)
    // Serialize every entry in the set
    for (const v of x) { y.$set.push(_serialize(v, options)) }
    // Serialize properties on the set, if they exist
    if (Object.keys(x).length) {
      y.props = _newObject(options)
      Object.keys(x).forEach(key => { y.props[key] = _serialize(x[key], options) })
    }
    return y
  }

  const isMap = (x instanceof options._hostIntrinsics.Map ||
    x instanceof options._sandboxIntrinsics.Map) && !proto3
  if (isMap) {
    const y = _newObject(options)
    options._cache.set(x, y)
    y.$map = _newArray(options)
    // Serialize every entry of the map
    for (const [k, v] of x) {
      const entry = _newArray(options)
      entry.push(_serialize(k, options))
      entry.push(_serialize(v, options))
      y.$map.push(entry)
    }
    // Serialize properties on the map, if they exist
    if (Object.keys(x).length) {
      y.props = _newObject(options)
      Object.keys(x).forEach(key => { y.props[key] = _serialize(x[key], options) })
    }
    return y
  }

  throw new Error(`Cannot serialize ${_display(x)}`)
}

function _replaceDups (x, dedups) {
  if (typeof x !== 'object' && typeof x !== 'function') return x
  const y = dedups.get(x)
  if (y) return y
  Object.keys(x).forEach(key => { x[key] = _replaceDups(x[key], dedups) })
  return x
}

function _dedup (x, options) {
  const y = _newObject(options)
  y.$dedup = {}
  // Create array of dup objects
  const dedups = new Map()
  y.dups = _newArray(options)
  for (const dup of options._dups) {
    const dedup = _newObject(options)
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

function _fromTokenJson (x) {
  return x
}

// ------------------------------------------------------------------------------------------------

module.exports = { _toTokenJson, _fromTokenJson }
