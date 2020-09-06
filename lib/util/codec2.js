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
 * a rich object.
 *
 * We use what we call "$ objects" to do this. $ objects are JSON objects with a single property
 * that begins with '$'. This means it contains a special value that JSON is unable to
 * represent. Through this approach, in addition to standard JSON, we support the following:
 *
 *      Type                    $ Prefix        Example
 *      ---------               --------        -----------
 *      Undefined               $und            { $und: 1 }
 *      NaN                     $nan            { $nan: 1 }
 *      Infinity                $inf            { $inf: 1 }
 *      Negative infinity       $ninf           { $ninf: 1 }
 *      Negative zero           $n0             { $n0: 1 }
 *      Set instance            $set            { $set: [1], props: { n: 1 } }
 *      Map instance            $map            { $map: [[1, 2]], props: { n: 1 } }
 *      Uint8Array instance     $ui8a           { $ui8a: '<base64data' }
 *      Jig/Code/Berry          $jig            { $jig: 1 }
 *      Arbitrary object        $arb            { $arb: { n: 1 }, T: { $jig: 1 } }
 *      Object                  $obj            { $obj: { $n: 1 } }
 *      Sparse array            $arr            { $arr: { 0: 'a', 100: 'c' } }
 *      Duplicate object        $dup            { $dup: ['n', 'm'] }
 *
 * Order of properties is important and must be preserved during encode and decode. Duplicate paths
 * are arrays into the encoded object, not the original object.
 */

const { _text, _isBasicObject } = require('./misc')
const Sandbox = require('./sandbox')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const SI = Sandbox._intrinsics
const HI = Sandbox._hostIntrinsics
const SIS = Sandbox._intrinsicSet
const HIS = Sandbox._hostIntrinsicSet

// const BASE64_CHARS = new Set()
// 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
//   .split('').forEach(x => BASE64_CHARS.add(x))

const _throwEnc = x => { throw new Error(`Cannot encode ${_text(x)}`) }
const _throwDec = x => { throw new Error(`Cannot decode ${_text(x)}`) }

// ------------------------------------------------------------------------------------------------
// Codec
// ------------------------------------------------------------------------------------------------

class Codec {
  constructor () {
    this._OI = HI
    this._jigSaver = undefined
    this._jigLoader = undefined
    this._paths = new Map() // obj -> [..path..]
    this._decs = new Map() // enc -> dec
    this._root = null
  }

  _encode (x) {
    this._paths = new Map()
    return this._encodeAny(x, [])
  }

  _decode (y) {
    this._root = y
    this._decs = new Map()
    return this._decodeAny(y)
  }

  _toSandbox () { this._OI = SI; return this }
  _saveJigs (saver) { this._jigSaver = saver; return this }
  _loadJigs (loader) { this._jigLoader = loader; return this }

  _encodeAny (x, path) {
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
        if (this._paths.has(x)) return { $dup: this._paths.get(x) }
        this._paths.set(x, path)
        return this._encodeObject(x, path)
      }
    }
    _throwEnc(x)
  }

  _encodeObject (x, path) {
    if (SIS.has(x) || HIS.has(x)) _throwEnc(x)

    if (_isBasicObject(x)) {
      const $ = Object.keys(x).some(key => key.startsWith('$'))
      const y = this._newObject()
      let yobj = y
      let ypath = path
      if ($) {
        y.$obj = this._newObject()
        yobj = y.$obj
        ypath = path.concat(['$obj'])
      }
      Object.keys(x).forEach(key => {
        yobj[key] = this._encodeAny(x[key], ypath.concat([key]))
      })
      return y
    }
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
    if (_isBasicObject(y)) {
      // Check if there are any special props
      let $
      Object.keys(y).forEach(key => {
        if (key.startsWith('$')) {
          if ($) _throwDec(y)
          $ = key
        }
      })

      // Primitives
      if ($ === '$und' && y.$und === 1) return undefined
      if ($ === '$n0' && y.$n0 === 1) return -0
      if ($ === '$nan' && y.$nan === 1) return NaN
      if ($ === '$inf' && y.$inf === 1) return Infinity
      if ($ === '$ninf' && y.$ninf === 1) return -Infinity

      // Basic objects
      if (!$) {
        const x = this._newObject()
        this._decs.set(y, x)
        Object.keys(y).forEach(key => {
          x[key] = this._decodeAny(y[key])
        })
        return x
      }

      // Objects that contain $ properties
      if ($ === '$obj') {
        const yobj = y.$obj
        if (!(_isBasicObject(yobj) && yobj)) _throwDec(y)
        const x = this._newObject()
        this._decs.set(y, x)
        Object.keys(yobj).forEach(key => {
          x[key] = this._decodeAny(yobj[key])
        })
        return x
      }
    }
  }

  _newObject() { return new this._OI.Object() } // eslint-disable-line
  _newArray() { return new this._OI.Array() } // eslint-disable-line
  _newSet() { return new this._OI.Set() } // eslint-disable-line
  _newMap() { return new this._OI.Map() } // eslint-disable-line
}

// ------------------------------------------------------------------------------------------------

module.exports = Codec
