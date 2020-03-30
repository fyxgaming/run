/**
 * json.js
 *
 * Converts rich javascript objects and tokens into JSON
 */

const { _display } = require('./misc')
const { _hostIntrinsics } = require('../kernel/intrinsics')

// ------------------------------------------------------------------------------------------------
// Serialize
// ------------------------------------------------------------------------------------------------

function _toTokenJson (x, opts = {}) {
  opts._cache = opts._cache || new Map()
  opts._dups = opts._dups || new Set()
  opts._hostIntrinsics = opts._hostIntrinsics || _hostIntrinsics
  opts._sandboxIntrinsics = opts._sandboxIntrinsics || _hostIntrinsics
  opts._outputIntrinsics = opts._outputIntrinsics || _hostIntrinsics
  const y = _serialize(x, opts)
  return opts._dups.size ? _dedup(y, opts) : y
}

// Set cache in serializeObject, before going deeper
function _serialize (x, opts) {
  switch (typeof x) {
    case 'undefined': return { $undef: 1 }
    case 'string': return x
    case 'boolean': return x
    case 'number': if (isNaN(x) || !isFinite(x)) break; return x
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
      y[key] = _serialize(x[key], opts)
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
    Object.keys(x).forEach(key => { y[key] = _serialize(x[key], opts) })
    return y
  }

  const isSet = (x instanceof opts._hostIntrinsics.Set ||
    x instanceof opts._sandboxIntrinsics.Set) && !proto3
  if (isSet) {
    const y = _newObject(opts)
    opts._cache.set(x, y)
    y.$set = _newArray(opts)
    // Serialize every entry in the set
    for (const v of x) { y.$set.push(_serialize(v, opts)) }
    // Serialize properties on the set, if they exist
    if (Object.keys(x).length) {
      y.props = _newObject(opts)
      Object.keys(x).forEach(key => { y.props[key] = _serialize(x[key], opts) })
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
      entry.push(_serialize(k, opts))
      entry.push(_serialize(v, opts))
      y.$map.push(entry)
    }
    // Serialize properties on the map, if they exist
    if (Object.keys(x).length) {
      y.props = _newObject(opts)
      Object.keys(x).forEach(key => { y.props[key] = _serialize(x[key], opts) })
    }
    return y
  }

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

function _fromTokenJson (x, opts = {}) {
  opts._hostIntrinsics = opts._hostIntrinsics || _hostIntrinsics
  opts._sandboxIntrinsics = opts._sandboxIntrinsics || _hostIntrinsics
  opts._outputIntrinsics = opts._sandboxIntrinsics || _hostIntrinsics
  return _deserialize(x, opts)
}

function _deserialize (x, opts) {
  switch (typeof x) {
    case 'string': return x
    case 'boolean': return x
    case 'number': if (isNaN(x) || !isFinite(x)) break; return x
    case 'object':
    case 'function': {
      if (!x) return null
      return _deserializeObject(x, opts)
    }
  }
  _throwDes(x)
}

function _deserializeObject (x, opts) {
  const proto2 = Object.getPrototypeOf(Object.getPrototypeOf(x))

  const preparedContainer = opts._preparedContainer
  delete opts._preparedContainer

  // This check works on all intrinsics, host or sandbox
  const isBasicObject = !proto2
  if (isBasicObject) {
    // Check if there are any special props
    let $
    Object.keys(x).forEach(key => {
      if (key.startsWith('$')) {
        if ($) _throwDes(x)
        $ = key
      }
    })

    if (!$) {
      const y = preparedContainer || _newObject(opts)
      if (opts._onlyContainer) return y

      Object.keys(x).forEach(key => {
        y[key] = _deserialize(x[key], opts)
      })

      return y
    }

    if ($ === '$obj') {
      if (!(typeof x.$obj === 'object' && x.$obj)) _throwDes(x)

      const y = preparedContainer || _newObject(opts)
      if (opts._onlyContainer) return y

      const o = x.$obj
      Object.keys(o).forEach(key => {
        y[key] = _deserialize(o[key], opts)
      })

      return y
    }

    if ($ === '$set') {
      if (!Array.isArray(x.$set)) _throwDes(x)
      if (!(typeof x.props === 'undefined' || typeof x.props === 'object')) _throwDes(x)

      const y = preparedContainer || _newSet(opts)
      if (opts._onlyContainer) return y

      for (const val of x.$set) {
        y.add(_deserialize(val, opts))
      }

      const props = x.props
      if (props) {
        Object.keys(props).forEach(key => {
          y[key] = _deserialize(props[key], opts)
        })
      }

      return y
    }

    if ($ === '$map') {
      if (!Array.isArray(x.$map)) _throwDes(x)
      if (!(typeof x.props === 'undefined' || typeof x.props === 'object')) _throwDes(x)

      const y = preparedContainer || _newMap(opts)
      if (opts._onlyContainer) return y

      for (const val of x.$map) {
        if (!Array.isArray(val) || val.length !== 2) _throwDes(x)
        y.set(_deserialize(val[0], opts), _deserialize(val[1], opts))
      }

      const props = x.props
      if (props) {
        Object.keys(props).forEach(key => {
          y[key] = _deserialize(props[key], opts)
        })
      }

      return y
    }

    if ($ === '$dedup') {
      if (!(typeof x.$dedup === 'object' && x.$dedup)) _throwDes(x)
      if (!Array.isArray(x.dups)) _throwDes(x)
      if (!(typeof opts._dups === 'undefined')) _throwDes(x)

      // Create all the dup containers first
      opts._onlyContainer = true
      opts._dups = x.dups.map(dup => _deserialize(dup, opts))

      // Deserialize the dups
      delete opts._onlyContainer
      x.dups.forEach((dup, n) => {
        opts._preparedContainer = opts._dups[n]
        _deserialize(dup, opts)
      })

      // Deserialize the main object
      const y = _deserialize(x.$dedup, opts)

      delete opts._dups
      return y
    }

    if ($ === '$dup') {
      if (!Array.isArray(opts._dups)) _throwDes(x)
      if (!(typeof x.$dup === 'number' && x.$dup >= 0 && x.$dup < opts._dups.length)) _throwDes(x)

      return opts._dups[x.$dup]
    }
  }

  // This check also works on all intrinsics, host or sandbox
  const proto3 = proto2 && Object.getPrototypeOf(proto2)
  const isBasicArray = Array.isArray(x) && !proto3
  if (isBasicArray) {
    const y = preparedContainer || _newArray(opts)
    if (opts._onlyContainer) return y
    for (const v of x) { y.push(_deserialize(v, opts)) }
    return y
  }

  _throwDes(x)
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

const _newObject = opts => new opts._outputIntrinsics.Object() // eslint-disable-line
const _newArray = opts => new opts._outputIntrinsics.Array() // eslint-disable-line
const _newSet = opts => new opts._outputIntrinsics.Set() // eslint-disable-line
const _newMap = opts => new opts._outputIntrinsics.Map() // eslint-disable-line

const _throwSer = x => { throw new Error(`Cannot deserialize ${_display(x)}`) }
const _throwDes = x => { throw new Error(`Cannot deserialize ${_display(x)}`) }

// ------------------------------------------------------------------------------------------------

module.exports = { _toTokenJson, _fromTokenJson }
