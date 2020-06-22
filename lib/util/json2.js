/**
 * json.js
 *
 * Converts rich javascript objects and jigs into "Jig JSON", or JJSON
 *
 * This conversion is basically what determines what kinds of data may be stored in Jigs, stored
 * as class properties, or passed into functions. If we were to support a new kind of data type,
 * we would start by supporting it here.
 *
 * We use a custom JSON notation called JJSON because we haven't found any other suitable
 * format to-date. JJSON is JSON and may be used as such. However, it is also special JSON.
 * The JSON represents a rich JS object, and through deserialization, we can convert it back into
 * one.
 *
 * We often use what we call "$ objects" to do this. These are objects with a property (only
 * one is allowed) beginning with '$'. This means it contains something that JSON is unable to
 * represent. We also support circular references, duplicate objects, and more. The goal is to
 * fully recreate a JS object in all its structure. Here are a few examples:
 *
 *    Javascript Object                         JSON
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
 * to represent the JJSON serialized form of 'x'.
 */

const { Jig } = require('../kernel/jig')
const { Code } = require('../kernel/v2/code')
const { Berry } = require('../kernel/berry')
const { _text, _protoLen, _isBasicObject, _isBasicArray, _isUndefined } = require('./type')
const { SafeMap, SafeSet } = require('./safe')
const Sandbox = require('./sandbox')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const SI = Sandbox._intrinsics
const HI = Sandbox._hostIntrinsics
const SIS = Sandbox._intrinsicSet
const HIS = Sandbox._hostIntrinsicSet

const BASE64_CHARS = new Set()
'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  .split('').forEach(x => BASE64_CHARS.add(x))

const _throwSer = x => { throw new Error(`Cannot serialize ${_text(x)}`) }
const _throwDes = x => { throw new Error(`Cannot deserialize ${_text(x)}`) }

// ------------------------------------------------------------------------------------------------
// JJSON
// ------------------------------------------------------------------------------------------------

class JJSON {
  constructor () {
    this._OI = HI
    this._cache = new SafeMap() // X -> JSON
    this._dups = new SafeSet() // [X]
    this._dedup = true
    this._onlyContainer = false
    this._preparedContainer = null

    this._jigSaver = null
    this._jigLoader = null
  }

  _serialize (x) {
    // Inner calls to ResourceJSON._serialize will not dedup.
    const dedup = this._dedup
    try {
      this._dedup = false
      // Serialize without de-duping anything. Dups are copies, using the cache.
      const y = this._serializeAny(x)
      // Dedup if necessary
      return (this._dups.size && dedup) ? this._dedup(y) : y
    } finally {
      this._dedup = dedup
    }
  }

  _deserialize (y) {
    return this._deserializeAny(y)
  }

  _saveJigs (saver) { this._jigSaver = saver }
  _loadJigs (loader) { this._jigLoader = loader }

  // Set cache in serializeObject, before going deeper
  _serializeAny (x) {
    switch (typeof x) {
      case 'undefined': {
        const y = this._newObject()
        y.$undef = 1
        return y
      }
      case 'string': return x
      case 'boolean': return x
      case 'number':
        if (isNaN(x) || !isFinite(x) || Object.is(x, -0)) {
          const y = this._newObject()
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
        const cached = this._cache.get(x)
        if (cached) {
          this._dups.add(cached)
          return cached
        }
        return this._serializeObject(x)
      }
    }
    _throwSer(x)
  }

  _serializeObject (x) {
    if (SIS.has(x) || HIS.has(x)) _throwSer(x)

    // This check works on all intrinsics, host or sandbox
    if (_isBasicObject(x)) {
      const y = this._newObject()
      this._cache.set(x, y)
      let $ = false
      Object.keys(x).forEach(key => {
        $ = $ || key.startsWith('$')
        y[key] = this._serializeAny(x[key])
      })
      if (!$) return y
      const z = this._newObject()
      z.$obj = y
      return z
    }

    // This check also works on all intrinsics, host or sandbox
    if (_isBasicArray(x)) {
      const keys = Object.keys(x)
      if (keys.length === x.length) {
        const y = this._newArray()
        this._cache.set(x, y)
        keys.forEach(key => y.push(this._serializeAny(x[key])))
        return y
      } else {
        const y = this._newObject()
        const arr = this._newObject()
        this._cache.set(x, y)
        keys.forEach(key => { arr[key] = this._serializeAny(x[key]) })
        y.$arr = arr
        return y
      }
    }

    const isSet = (x instanceof HI.Set || x instanceof SI.Set) && _protoLen(x) === 3
    if (isSet) {
      const y = this._newObject()
      this._cache.set(x, y)
      y.$set = this._newArray()
      // Serialize every entry in the set
      for (const v of x) { y.$set.push(this._serializeAny(v)) }
      // Serialize properties on the set, if they exist
      if (Object.keys(x).length) {
        y.props = this._newObject()
        Object.keys(x).forEach(key => { y.props[key] = this._serializeAny(x[key]) })
      }
      return y
    }

    const isMap = (x instanceof HI.Map || x instanceof SI.Map) && _protoLen(x) === 3
    if (isMap) {
      const y = this._newObject()
      this._cache.set(x, y)
      y.$map = this._newArray()
      // Serialize every entry of the map
      for (const [k, v] of x) {
        const entry = this._newArray()
        entry.push(this._serializeAny(k))
        entry.push(this._serializeAny(v))
        y.$map.push(entry)
      }
      // Serialize properties on the map, if they exist
      if (Object.keys(x).length) {
        y.props = this._newObject()
        Object.keys(x).forEach(key => { y.props[key] = this._serializeAny(x[key]) })
      }
      return y
    }

    const isUint8Array = (x instanceof HI.Uint8Array || x instanceof SI.Uint8Array) && _protoLen(x) === 4
    if (isUint8Array) {
      const keys = Object.keys(x)
      if (keys.length !== x.length) _throwSer(x)
      const valid = n => Number.isInteger(n) && n <= 255 && n >= 0
      if (keys.some(key => !valid(x[key]))) _throwSer(x)

      const y = this._newObject()
      this._cache.set(x, y)
      // Convert to Uint8Array to fix a bug in browsers if x is a sandbox intrinsic
      const b = Buffer.from(new Uint8Array(x))
      y.$ui8a = b.toString('base64')
      return y
    }

    // Handle jigs and arbitrary objects
    if (this._jigSaver) {
      if (x instanceof Jig || x instanceof Code || x instanceof Berry) {
        const y = this._newObject()
        y.$jig = this._jigSaver(x)
        this._cache.set(x, y)
        return y
      }

      const y = { }
      this._cache.set(x, y)
      y.$arb = this._serialize(Object.assign({}, x))
      y.T = this._serialize(x.constructor)
      return y
    }

    _throwSer(x)
  }

  _replaceDups (x, dedups) {
    if ((typeof x !== 'object' && typeof x !== 'function') || !x) return x
    const y = dedups.get(x)
    if (y) return y
    Object.keys(x).forEach(key => { x[key] = this._replaceDups(x[key], dedups) })
    return x
  }

  _dedup (x) {
    const y = this._newObject()
    y.$dedup = {}
    // Create array of dup objects
    const dedups = new Map()
    y.dups = this._newArray()
    for (const dup of this._dups) {
      const dedup = this._newObject()
      dedup.$dup = y.dups.length
      dedups.set(dup, dedup)
      y.dups.push(dup)
    }
    // Dedup each entry in main object, as well each dup
    y.$dedup = this._replaceDups(x, dedups)
    y.dups.forEach(dup => {
      Object.keys(dup).forEach(key => {
        dup[key] = this._replaceDups(dup[key], dedups)
      })
    })
    return y
  }

  _deserializeAny (y) {
    switch (typeof y) {
      case 'string': return y
      case 'boolean': return y
      case 'number': if (isNaN(y) || !isFinite(y) || Object.is(y, -0)) break; return y
      case 'object':
      case 'function': {
        if (!y) return null
        return this._deserializeObject(y)
      }
    }
    _throwDes(y)
  }

  _deserializeObject (y) {
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
        const x = this._preparedContainer || this._newObject()
        delete this._preparedContainer
        if (this._onlyContainer) return x

        Object.keys(y).forEach(key => {
          x[key] = this._deserializeAny(y[key])
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

        const x = this._preparedContainer || this._newArray()
        delete this._preparedContainer
        if (this._onlyContainer) return x

        const o = y.$arr
        Object.keys(o).forEach(key => {
          x[key] = this._deserializeAny(o[key])
        })

        return x
      }

      // Objects that contain $ properties
      if ($ === '$obj') {
        if (!(_isBasicObject(y.$obj) && y.$obj)) _throwDes(y)

        const x = this._preparedContainer || this._newObject()
        delete this._preparedContainer
        if (this._onlyContainer) return x

        const o = y.$obj
        Object.keys(o).forEach(key => {
          x[key] = this._deserializeAny(o[key])
        })

        return x
      }

      // Sets
      if ($ === '$set') {
        if (!_isBasicArray(y.$set)) _throwDes(y)
        if (!(_isUndefined(y.props) || _isBasicObject(y.props))) _throwDes(y)

        const x = this._preparedContainer || this._newSet()
        delete this._preparedContainer
        if (this._onlyContainer) return x

        for (const val of y.$set) {
          x.add(this._deserializeAny(val))
        }

        const props = y.props
        if (props) {
          Object.keys(props).forEach(key => {
            x[key] = this._deserializeAny(props[key])
          })
        }

        return x
      }

      // Maps
      if ($ === '$map') {
        if (!_isBasicArray(y.$map)) _throwDes(y)
        if (!(_isUndefined(y.props) || _isBasicObject(y.props))) _throwDes(y)

        const x = this._preparedContainer || this._newMap()
        delete this._preparedContainer
        if (this._onlyContainer) return x

        for (const val of y.$map) {
          if (!_isBasicArray(val) || val.length !== 2) _throwDes(y)
          x.set(this._deserializeAny(val[0]), this._deserializeAny(val[1]))
        }

        const props = y.props
        if (props) {
          Object.keys(props).forEach(key => {
            x[key] = this._deserializeAny(props[key])
          })
        }

        return x
      }

      // Uint8Arrays
      if ($ === '$ui8a') {
        if (typeof y.$ui8a !== 'string') _throwDes(y)
        if (y.$ui8a.split('').some(c => !BASE64_CHARS.has(c))) _throwDes(y)

        const buf = Buffer.from(y.$ui8a, 'base64')
        return this._OI.Uint8Array.from(buf)
      }

      // Special dedup
      if ($ === '$dedup') {
        if (!(typeof y.$dedup === 'object' && y.$dedup)) _throwDes(y)
        if (!_isBasicArray(y.dups)) _throwDes(y)
        if (!_isUndefined(this._dups)) _throwDes(y)

        // Create all the dup containers first
        this._onlyContainer = true
        this._dups = y.dups.map(dup => this._deserializeAny(dup))
        delete this._onlyContainer

        // Deserialize the dups
        y.dups.forEach((dup, n) => {
          this._preparedContainer = this._dups[n]
          this._deserializeAny(dup)
        })

        // Deserialize the main object
        const x = this._deserializeAny(y.$dedup)

        delete this._dups
        return x
      }

      // Special dup'd object
      if ($ === '$dup') {
        if (!_isBasicArray(this._dups)) _throwDes(y)
        if (!(typeof y.$dup === 'number' && y.$dup >= 0 && y.$dup < this._dups.length)) _throwDes(y)

        return this._dups[y.$dup]
      }
    }

    // This check also works on all intrinsics, host or sandbox
    if (_isBasicArray(y)) {
      const x = this._preparedContainer || this._newArray()
      delete this._preparedContainer
      if (this._onlyContainer) return x

      for (const v of y) { x.push(this._deserializeAny(v)) }
      return x
    }

    // Revive jigs and arbitrary objects
    if (this._jigLoader) {
      if (_isBasicObject(y) && !_isUndefined(y.$jig)) {
        const x = this._jigLoader(y.$jig)
        if (x) {
          delete this._preparedContainer
          return x
        }
      }

      if (_isBasicObject(y) && !_isUndefined(y.$arb) && !_isUndefined(y.T)) {
        const x = this._preparedContainer || this._newObject()
        delete this._preparedContainer
        if (this._onlyContainer) return x

        Object.assign(x, this._deserialize(y.$arb))

        const T = this._deserialize(y.T)
        Object.setPrototypeOf(x, T.prototype)

        return x
      }
    }

    _throwDes(y)
  }

  _newObject() { return new this._OI.Object() } // eslint-disable-line
  _newArray() { return new this._OI.Array() } // eslint-disable-line
  _newSet() { return new this._OI.Set() } // eslint-disable-line
  _newMap() { return new this._OI.Map() } // eslint-disable-line
}

// ------------------------------------------------------------------------------------------------

module.exports = JJSON
