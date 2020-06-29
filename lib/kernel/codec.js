/**
 * codec.js
 *
 * Converts complex javascript objects with jigs into JSON
 *
 * This conversion is basically what determines what kinds of data may be stored in Jigs, stored
 * as class properties, or passed into functions. If we were to support a new kind of data type,
 * we would start by supporting it here.
 *
 * We use a custom JSON notation encoding because we haven't found any other suitable format
 * to-date. This encoding is JSON and may be used as such. However, it is also special JSON.
 * The JSON represents a complex JS object, and through decoding, we can convert it back into
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
 *    undefined                                 { $und: 1 }
 *
 *    new Set(['a'])                            { $set: ['a'] }
 *
 *    new Map([[1, 2]])                         { $map: [[1, 2]] }
 *
 *    { $set: 'a' }                             { $obj:  { $set: 'a' } }
 *
 *    new SomeJig()                             { $ref: <jig.location> }        (using replacer)
 *
 *    [someObject, someObject]                  { $top: [{ $dup: 0 }, ${dup: 0}], dups: [{<encoding of someObject>}] }
 *
 * Within this file, we often use 'x' to represent the original rich JavaScript object and 'y'
 * to represent the JSON encoded form of 'x'.
 */

const { _text, _protoLen, _isBasicObject, _isBasicArray, _isUndefined } = require('./type')
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

const _throwEnc = x => { throw new Error(`Cannot encode ${_text(x)}`) }
const _throwDec = x => { throw new Error(`Cannot decode ${_text(x)}`) }

// ------------------------------------------------------------------------------------------------
// Codec
// ------------------------------------------------------------------------------------------------

class Codec {
  constructor () {
    this._OI = HI
    this._cache = new Map() // X -> JSON
    this._dups = new Set() // [X]
    this._dedups = undefined
    this._topLevel = true
    this._onlyContainer = false
    this._preparedContainer = undefined
    this._jigSaver = undefined
    this._jigLoader = undefined
  }

  _encode (x) {
    // Clear the cache each time to eliminate dups
    if (this._topLevel) this._cache = new Map()
    // Inner calls to _encode will not dedup.
    const dedup = this._topLevel
    try {
      this._topLevel = false
      // Encode without de-duping anything. Dups are copies, using the cache.
      const y = this._encodeAny(x)
      // Dedup if necessary
      return (this._dups.size && dedup) ? this._dedup(y) : y
    } finally {
      this._topLevel = dedup
    }
  }

  _decode (y) {
    return this._decodeAny(y)
  }

  _toSandbox () { this._OI = SI; return this }
  _saveJigs (saver) { this._jigSaver = saver; return this }
  _loadJigs (loader) { this._jigLoader = loader; return this }

  // Set cache in encodeObject, before going deeper
  _encodeAny (x) {
    switch (typeof x) {
      case 'undefined': {
        const y = this._newObject()
        y.$und = 1
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
        return this._encodeObject(x)
      }
    }
    _throwEnc(x)
  }

  _encodeObject (x) {
    if (SIS.has(x) || HIS.has(x)) _throwEnc(x)

    // This check works on all intrinsics, host or sandbox
    if (_isBasicObject(x)) {
      const y = this._newObject()
      this._cache.set(x, y)
      let $ = false
      Object.keys(x).forEach(key => {
        $ = $ || key.startsWith('$')
        y[key] = this._encodeAny(x[key])
      })
      if ($) {
        const z = this._newObject()
        Object.assign(z, y)
        Object.keys(y).forEach(key => { delete y[key] })
        y.$obj = z
      }
      return y
    }

    // This check also works on all intrinsics, host or sandbox
    if (_isBasicArray(x)) {
      const keys = Object.keys(x)
      if (keys.length === x.length) {
        const y = this._newArray()
        this._cache.set(x, y)
        keys.forEach(key => y.push(this._encodeAny(x[key])))
        return y
      } else {
        const y = this._newObject()
        const arr = this._newObject()
        this._cache.set(x, y)
        keys.forEach(key => { arr[key] = this._encodeAny(x[key]) })
        y.$arr = arr
        return y
      }
    }

    const isSet = (x instanceof HI.Set || x instanceof SI.Set) && _protoLen(x) === 3
    if (isSet) {
      const y = this._newObject()
      this._cache.set(x, y)
      y.$set = this._newArray()
      // Encode every entry in the set
      for (const v of x) { y.$set.push(this._encodeAny(v)) }
      // Encode properties on the set, if they exist
      if (Object.keys(x).length) {
        y.props = this._newObject()
        Object.keys(x).forEach(key => { y.props[key] = this._encodeAny(x[key]) })
      }
      return y
    }

    const isMap = (x instanceof HI.Map || x instanceof SI.Map) && _protoLen(x) === 3
    if (isMap) {
      const y = this._newObject()
      this._cache.set(x, y)
      y.$map = this._newArray()
      // Encode every entry of the map
      for (const [k, v] of x) {
        const entry = this._newArray()
        entry.push(this._encodeAny(k))
        entry.push(this._encodeAny(v))
        y.$map.push(entry)
      }
      // Encode properties on the map, if they exist
      if (Object.keys(x).length) {
        y.props = this._newObject()
        Object.keys(x).forEach(key => { y.props[key] = this._encodeAny(x[key]) })
      }
      return y
    }

    const isUint8Array = (x instanceof HI.Uint8Array || x instanceof SI.Uint8Array) && _protoLen(x) === 4
    if (isUint8Array) {
      const keys = Object.keys(x)
      if (keys.length !== x.length) _throwEnc(x)
      const y = this._newObject()
      this._cache.set(x, y)
      // Convert to Uint8Array to fix a bug in browsers if x is a sandbox intrinsic
      const b = Buffer.from(new Uint8Array(x))
      y.$ui8a = b.toString('base64')
      return y
    }

    // Handle jigs and arbitrary objects
    if (this._jigSaver) {
      const Jig = require('./jig')
      const Code = require('./code')
      const Berry = require('./berry')

      if (x instanceof Jig || x instanceof Code || x instanceof Berry) {
        const y = this._newObject()
        y.$jig = this._jigSaver(x)
        this._cache.set(x, y)
        return y
      }

      const y = { }
      this._cache.set(x, y)
      const xprops = Object.assign({}, x)
      y.$arb = this._encode(xprops)
      y.T = this._encode(x.constructor)
      return y
    }

    _throwEnc(x)
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
    y.$top = {}
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
    y.$top = this._replaceDups(x, dedups)
    y.dups.forEach(dup => {
      Object.keys(dup).forEach(key => {
        dup[key] = this._replaceDups(dup[key], dedups)
      })
    })
    return y
  }

  _decodeAny (y) {
    switch (typeof y) {
      case 'string': return y
      case 'boolean': return y
      case 'number': if (isNaN(y) || !isFinite(y) || Object.is(y, -0)) break; return y
      case 'object':
      case 'function': {
        if (!y) return null
        return this._decodeObject(y)
      }
    }
    _throwDec(y)
  }

  _decodeObject (y) {
  // This check works on all intrinsics, host or sandbox
    if (_isBasicObject(y)) {
    // Check if there are any special props
      let $
      Object.keys(y).forEach(key => {
        if (key.startsWith('$')) {
          if ($) _throwDec(y)
          $ = key
        }
      })

      // Basic objects
      if (!$) {
        const x = this._preparedContainer || this._newObject()
        delete this._preparedContainer
        if (this._onlyContainer) return x

        Object.keys(y).forEach(key => {
          x[key] = this._decodeAny(y[key])
        })

        return x
      }

      // Primitives
      if ($ === '$und' && y.$und === 1) return undefined
      if ($ === '$n0' && y.$n0 === 1) return -0
      if ($ === '$nan' && y.$nan === 1) return NaN
      if ($ === '$inf' && y.$inf === 1) return Infinity
      if ($ === '$ninf' && y.$ninf === 1) return -Infinity

      // Arrays with special props
      if ($ === '$arr') {
        if (!(_isBasicObject(y.$arr) && y.$arr)) _throwDec(y)

        const x = this._preparedContainer || this._newArray()
        delete this._preparedContainer
        if (this._onlyContainer) return x

        const o = y.$arr
        Object.keys(o).forEach(key => {
          x[key] = this._decodeAny(o[key])
        })

        return x
      }

      // Objects that contain $ properties
      if ($ === '$obj') {
        if (!(_isBasicObject(y.$obj) && y.$obj)) _throwDec(y)

        const x = this._preparedContainer || this._newObject()
        delete this._preparedContainer
        if (this._onlyContainer) return x

        const o = y.$obj
        Object.keys(o).forEach(key => {
          x[key] = this._decodeAny(o[key])
        })

        return x
      }

      // Sets
      if ($ === '$set') {
        if (!_isBasicArray(y.$set)) _throwDec(y)
        if (!(_isUndefined(y.props) || _isBasicObject(y.props))) _throwDec(y)

        const x = this._preparedContainer || this._newSet()
        delete this._preparedContainer
        if (this._onlyContainer) return x

        for (const val of y.$set) {
          x.add(this._decodeAny(val))
        }

        const props = y.props
        if (props) {
          Object.keys(props).forEach(key => {
            x[key] = this._decodeAny(props[key])
          })
        }

        return x
      }

      // Maps
      if ($ === '$map') {
        if (!_isBasicArray(y.$map)) _throwDec(y)
        if (!(_isUndefined(y.props) || _isBasicObject(y.props))) _throwDec(y)

        const x = this._preparedContainer || this._newMap()
        delete this._preparedContainer
        if (this._onlyContainer) return x

        for (const val of y.$map) {
          if (!_isBasicArray(val) || val.length !== 2) _throwDec(y)
          x.set(this._decodeAny(val[0]), this._decodeAny(val[1]))
        }

        const props = y.props
        if (props) {
          Object.keys(props).forEach(key => {
            x[key] = this._decodeAny(props[key])
          })
        }

        return x
      }

      // Uint8Arrays
      if ($ === '$ui8a') {
        if (typeof y.$ui8a !== 'string') _throwDec(y)
        if (y.$ui8a.split('').some(c => !BASE64_CHARS.has(c))) _throwDec(y)

        const buf = Buffer.from(y.$ui8a, 'base64')
        return this._OI.Uint8Array.from(buf)
      }

      // Special dedup
      if ($ === '$top') {
        if (!(typeof y.$top === 'object' && y.$top)) _throwDec(y)
        if (!_isBasicArray(y.dups)) _throwDec(y)
        if (!_isUndefined(this._dedups)) _throwDec(y)

        // Create all the dup containers first
        this._onlyContainer = true
        this._dedups = y.dups.map(dup => this._decodeAny(dup))
        delete this._onlyContainer

        // Decode the dups
        y.dups.forEach((dup, n) => {
          this._preparedContainer = this._dedups[n]
          this._decodeAny(dup)
        })

        // Decode the main object
        const x = this._decodeAny(y.$top)

        delete this._dedups
        return x
      }

      // Special dup'd object
      if ($ === '$dup') {
        if (!_isBasicArray(this._dedups)) _throwDec(y)
        if (!(typeof y.$dup === 'number' && y.$dup >= 0 && y.$dup < this._dedups.length)) _throwDec(y)

        return this._dedups[y.$dup]
      }
    }

    // This check also works on all intrinsics, host or sandbox
    if (_isBasicArray(y)) {
      const x = this._preparedContainer || this._newArray()
      delete this._preparedContainer
      if (this._onlyContainer) return x

      for (const v of y) { x.push(this._decodeAny(v)) }
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

        Object.assign(x, this._decode(y.$arb))

        const T = this._decode(y.T)
        Object.setPrototypeOf(x, T.prototype)

        return x
      }
    }

    _throwDec(y)
  }

  _newObject() { return new this._OI.Object() } // eslint-disable-line
  _newArray() { return new this._OI.Array() } // eslint-disable-line
  _newSet() { return new this._OI.Set() } // eslint-disable-line
  _newMap() { return new this._OI.Map() } // eslint-disable-line
}

// ------------------------------------------------------------------------------------------------

module.exports = Codec
