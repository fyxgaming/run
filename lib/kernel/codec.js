/**
 * codec.js
 *
 * Converts complex javascript objects with jigs into JSON
 *
 * This conversion is basically what determines what kinds of data may be stored in jigs, stored
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
 *      Uint8Array instance     $ui8a           { $ui8a: '<base64data>' }
 *      Jig/Code/Berry          $jig            { $jig: 1 }
 *      Arbitrary object        $arb            { $arb: { n: 1 }, T: { $jig: 1 } }
 *      Object                  $obj            { $obj: { $n: 1 } }
 *      Sparse array            $arr            { $arr: { 0: 'a', 100: 'c' } }
 *      Duplicate object        $dup            { $dup: ['n', 'm', '0'] }
 *
 * Order of properties is important and must be preserved during encode and decode. Duplicate paths
 * are arrays into the encoded object, not the original object.
 */

const {
  _text, _basicObject, _basicArray, _basicSet, _basicMap, _basicUint8Array,
  _defined, _negativeZero
} = require('./misc')
const { _deterministicObjectKeys } = require('./determinism')
const Sandbox = require('./sandbox')

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const SIS = Sandbox._intrinsicSet
const HIS = Sandbox._hostIntrinsicSet

const BASE64_CHARS = new Set()
'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  .split('').forEach(x => BASE64_CHARS.add(x))

const _throwEnc = x => { throw new Error(`Cannot encode ${_text(x)}`) }
const _throwDec = x => { throw new Error(`Cannot decode ${_text(JSON.stringify(x))}`) }

// ------------------------------------------------------------------------------------------------
// encode
// ------------------------------------------------------------------------------------------------

/**
 * Encodes x into $json
 * @param {object} x Object to encode
 * @param {?function} options._encodeJig Gets an encoded id for a jig
 * @param {?object} options._intrinsics Intrinsics to use for the encoded json
 * @returns Encoded json
 */
function encode (x, options = {}) {
  const paths = new Map()
  const intrinsics = options._intrinsics || Sandbox._hostIntrinsics
  return encodeAny(x, [], paths, intrinsics, options._encodeJig)
}

// ------------------------------------------------------------------------------------------------
// encodeAny
// ------------------------------------------------------------------------------------------------

function encodeAny (x, path, paths, intrinsics, encodeJig) {
  switch (typeof x) {
    case 'undefined': return encodeUndefined(intrinsics)
    case 'string': return x
    case 'boolean': return x
    case 'number': return encodeNumber(x, intrinsics)
    case 'symbol': break
    case 'object': return encodeObject(x, path, paths, intrinsics, encodeJig)
    case 'function': return encodeObject(x, path, paths, intrinsics, encodeJig)
  }
  _throwEnc(x)
}

// ------------------------------------------------------------------------------------------------
// encodeUndefined
// ------------------------------------------------------------------------------------------------

function encodeUndefined (intrinsics) {
  const y = new intrinsics.Object()
  y.$und = 1
  return y
}

// ------------------------------------------------------------------------------------------------
// encodeNumber
// ------------------------------------------------------------------------------------------------

function encodeNumber (x, intrinsics) {
  if (isNaN(x) || !isFinite(x) || _negativeZero(x)) {
    const y = new intrinsics.Object()
    if (isNaN(x)) y.$nan = 1
    if (x === Infinity) y.$inf = 1
    if (x === -Infinity) y.$ninf = 1
    if (_negativeZero(x)) y.$n0 = 1
    return y
  }
  return x
}

// ------------------------------------------------------------------------------------------------
// encodeObject
// ------------------------------------------------------------------------------------------------

function encodeObject (x, path, paths, intrinsics, encodeJig) {
  if (!x) return null

  if (paths.has(x)) {
    const y = new intrinsics.Object()
    y.$dup = intrinsics.Array.from(paths.get(x))
    return y
  }

  paths.set(x, path)

  if (SIS.has(x) || HIS.has(x)) _throwEnc(x)

  if (_basicObject(x)) return encodeBasicObject(x, path, paths, intrinsics, encodeJig)
  if (_basicArray(x)) return encodeBasicArray(x, path, paths, intrinsics, encodeJig)
  if (_basicSet(x)) return encodeBasicSet(x, path, paths, intrinsics, encodeJig)
  if (_basicMap(x)) return encodeBasicMap(x, path, paths, intrinsics, encodeJig)
  if (_basicUint8Array(x)) return encodeBasicUint8Array(x, path, paths, intrinsics, encodeJig)

  // Handle jigs and arbitrary objects
  if (encodeJig) {
    const Creation = require('./creation')

    if (x instanceof Creation) {
      const y = new intrinsics.Object()
      y.$jig = encodeJig(x)
      return y
    }

    if (x.constructor instanceof Creation) {
      const y = new intrinsics.Object()
      const xprops = Object.assign({}, x)
      const yarbpath = path.concat(['$arb'])
      const yTpath = path.concat(['T'])
      y.$arb = encodeAny(xprops, yarbpath, paths, intrinsics, encodeJig)
      y.T = encodeAny(x.constructor, yTpath, paths, intrinsics, encodeJig)
      return y
    }
  }

  _throwEnc(x)
}

// ------------------------------------------------------------------------------------------------
// encodeBasicObject
// ------------------------------------------------------------------------------------------------

function encodeBasicObject (x, path, paths, intrinsics, encodeJig) {
  const $ = _deterministicObjectKeys(x).some(key => key.startsWith('$'))
  const y = new intrinsics.Object()
  let yobj = y
  let ypath = path
  if ($) {
    y.$obj = new intrinsics.Object()
    yobj = y.$obj
    ypath = path.concat(['$obj'])
  }
  _deterministicObjectKeys(x).forEach(key => {
    const subpath = ypath.concat([key.toString()])
    yobj[key] = encodeAny(x[key], subpath, paths, intrinsics, encodeJig)
  })
  return y
}

// ------------------------------------------------------------------------------------------------
// encodeBasicArray
// ------------------------------------------------------------------------------------------------

function encodeBasicArray (x, path, paths, intrinsics, encodeJig) {
  const keys = _deterministicObjectKeys(x)
  if (keys.length === x.length) {
    const y = new intrinsics.Array()
    keys.forEach(key => {
      const subpath = path.concat([key.toString()])
      const subvalue = encodeAny(x[key], subpath, paths, intrinsics, encodeJig)
      y.push(subvalue)
    })
    return y
  } else {
    const y = new intrinsics.Object()
    const yarr = new intrinsics.Object()
    const ypath = path.concat(['$arr'])
    keys.forEach(key => {
      const subpath = ypath.concat([key.toString()])
      yarr[key] = encodeAny(x[key], subpath, paths, intrinsics, encodeJig)
    })
    y.$arr = yarr
    return y
  }
}

// ------------------------------------------------------------------------------------------------
// encodeBasicSet
// ------------------------------------------------------------------------------------------------

function encodeBasicSet (x, path, paths, intrinsics, encodeJig) {
  const y = new intrinsics.Object()
  y.$set = new intrinsics.Array()
  let i = 0
  const ypath = path.concat(['$set'])
  for (const v of x) {
    const subpath = ypath.concat([i.toString()])
    const subvalue = encodeAny(v, subpath, paths, intrinsics, encodeJig)
    y.$set.push(subvalue)
    i++
  }
  if (_deterministicObjectKeys(x).length) {
    y.props = new intrinsics.Object()
    const ypropspath = path.concat(['props'])
    _deterministicObjectKeys(x).forEach(key => {
      const subpath = ypropspath.concat([key.toString()])
      y.props[key] = encodeAny(x[key], subpath, paths, intrinsics, encodeJig)
    })
  }
  return y
}

// ------------------------------------------------------------------------------------------------
// encodeBasicMap
// ------------------------------------------------------------------------------------------------

function encodeBasicMap (x, path, paths, intrinsics, encodeJig) {
  const y = new intrinsics.Object()
  y.$map = new intrinsics.Array()
  let i = 0
  const ypath = path.concat(['$map'])
  for (const [k, v] of x) {
    const entry = new intrinsics.Array()
    entry.push(encodeAny(k, ypath.concat([i.toString(), '0']), paths, intrinsics, encodeJig))
    entry.push(encodeAny(v, ypath.concat([i.toString(), '1']), paths, intrinsics, encodeJig))
    y.$map.push(entry)
    i++
  }
  if (_deterministicObjectKeys(x).length) {
    y.props = new intrinsics.Object()
    const ypropspath = path.concat(['props'])
    _deterministicObjectKeys(x).forEach(key => {
      const subpath = ypropspath.concat([key.toString()])
      y.props[key] = encodeAny(x[key], subpath, paths, intrinsics, encodeJig)
    })
  }
  return y
}

// ------------------------------------------------------------------------------------------------
// encodeBasicUint8Array
// ------------------------------------------------------------------------------------------------

function encodeBasicUint8Array (x, path, paths, intrinsics, encodeJig) {
  const keys = _deterministicObjectKeys(x)
  if (keys.length !== x.length) _throwEnc(x)
  const y = new intrinsics.Object()
  // Convert to Uint8Array to fix a bug in browsers if x is a sandbox intrinsic
  const b = Buffer.from(new Uint8Array(x))
  y.$ui8a = b.toString('base64')
  return y
}

// ------------------------------------------------------------------------------------------------
// decode
// ------------------------------------------------------------------------------------------------

/**
 * Decodes from JSON to a rich object
 * @param {object} y JSON to decode
 * @param {object} options._intrinsics The set of intrinsics to use when decoding
 * @param {function} options._decodeJig Gets a jig from its encoded id
 */
function decode (y, options = {}) {
  const root = y
  const decs = new Map() // enc -> dec
  const intrinsics = options._intrinsics || Sandbox._hostIntrinsics
  return decodeAny(y, root, decs, intrinsics, options._decodeJig)
}

// ------------------------------------------------------------------------------------------------
// decodeAny
// ------------------------------------------------------------------------------------------------

function decodeAny (y, root, decs, intrinsics, decodeJig) {
  switch (typeof y) {
    case 'string': return y
    case 'boolean': return y
    case 'number':return decodeNumber(y)
    case 'object': return decodeObject(y, root, decs, intrinsics, decodeJig)
    case 'function': return decodeObject(y, root, decs, intrinsics, decodeJig)
  }
  _throwDec(y)
}

// ------------------------------------------------------------------------------------------------
// decodeNumber
// ------------------------------------------------------------------------------------------------

function decodeNumber (y) {
  if (isNaN(y) || !isFinite(y)) _throwDec()
  // Firefox special case. Decodeing -0 to 0 should be safe because -0 should not be encoded.
  if (_negativeZero(y)) return 0
  return y
}

// ------------------------------------------------------------------------------------------------
// decodeObject
// ------------------------------------------------------------------------------------------------

function decodeObject (y, root, decs, intrinsics, decodeJig) {
  if (!y) return null

  if (_basicObject(y)) {
    // Check if there are any special props
    let $
    _deterministicObjectKeys(y).forEach(key => {
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

    // Objects
    if (!$) return decodeBasicObject(y, root, decs, intrinsics, decodeJig)
    if ($ === '$obj') return decodeNonstandardObject(y, root, decs, intrinsics, decodeJig)
    if ($ === '$arr') return decodeSparseArray(y, root, decs, intrinsics, decodeJig)
    if ($ === '$dup') return decodeDuplicate(y, root, decs, intrinsics, decodeJig)
    if ($ === '$set') return decodeBasicSet(y, root, decs, intrinsics, decodeJig)
    if ($ === '$map') return decodeBasicMap(y, root, decs, intrinsics, decodeJig)
    if ($ === '$ui8a') return decodeBasicUint8Array(y, root, decs, intrinsics, decodeJig)
  }

  if (_basicArray(y)) return decodeBasicArray(y, root, decs, intrinsics, decodeJig)

  // Revive jigs and arbitrary objects
  if (decodeJig) {
    if (_basicObject(y) && _defined(y.$jig)) {
      const x = decodeJig(y.$jig)
      if (x) {
        decs.set(y, x)
        return x
      }
    }
    if (_basicObject(y) && _defined(y.$arb) && _defined(y.T)) {
      const x = new intrinsics.Object()
      decs.set(y, x)
      Object.assign(x, decodeAny(y.$arb, root, decs, intrinsics, decodeJig))
      const T = decodeAny(y.T, root, decs, intrinsics, decodeJig)
      Object.setPrototypeOf(x, T.prototype)
      return x
    }
  }

  _throwDec(y)
}

// ------------------------------------------------------------------------------------------------
// decodeBasicObject
// ------------------------------------------------------------------------------------------------

function decodeBasicObject (y, root, decs, intrinsics, decodeJig) {
  const x = new intrinsics.Object()
  decs.set(y, x)
  _deterministicObjectKeys(y).forEach(key => {
    x[key] = decodeAny(y[key], root, decs, intrinsics, decodeJig)
  })
  return x
}

// ------------------------------------------------------------------------------------------------
// decodeNonstandardObject
// ------------------------------------------------------------------------------------------------

function decodeNonstandardObject (y, root, decs, intrinsics, decodeJig) {
  const yobj = y.$obj
  if (!(_basicObject(yobj) && yobj)) _throwDec(y)
  const x = new intrinsics.Object()
  decs.set(y, x)
  _deterministicObjectKeys(yobj).forEach(key => {
    x[key] = decodeAny(yobj[key], root, decs, intrinsics, decodeJig)
  })
  return x
}

// ------------------------------------------------------------------------------------------------
// decodeSparseArray
// ------------------------------------------------------------------------------------------------

function decodeSparseArray (y, root, decs, intrinsics, decodeJig) {
  if (!(_basicObject(y.$arr) && y.$arr)) _throwDec(y)
  const x = new intrinsics.Array()
  decs.set(y, x)
  const yarr = y.$arr
  _deterministicObjectKeys(yarr).forEach(key => {
    x[key] = decodeAny(yarr[key], root, decs, intrinsics, decodeJig)
  })
  return x
}

// ------------------------------------------------------------------------------------------------
// decodeDuplicate
// ------------------------------------------------------------------------------------------------

function decodeDuplicate (y, root, decs, intrinsics, decodeJig) {
  const ydup = y.$dup
  if (!(_basicArray(ydup))) _throwDec(y)
  let enc = root
  for (let i = 0; i < ydup.length; i++) {
    const key = ydup[i]
    if (!(key in enc)) _throwDec(y)
    enc = enc[key]
  }
  if (!decs.has(enc)) _throwDec(y)
  const x = decs.get(enc)
  decs.set(y, x)
  return x
}

// ------------------------------------------------------------------------------------------------
// decodeBasicSet
// ------------------------------------------------------------------------------------------------

function decodeBasicSet (y, root, decs, intrinsics, decodeJig) {
  if (!_basicArray(y.$set)) _throwDec(y)
  if (!(!_defined(y.props) || _basicObject(y.props))) _throwDec(y)
  const x = new intrinsics.Set()
  decs.set(y, x)
  for (const val of y.$set) {
    x.add(decodeAny(val, root, decs, intrinsics, decodeJig))
  }
  const props = y.props
  if (props) {
    _deterministicObjectKeys(props).forEach(key => {
      x[key] = decodeAny(props[key], root, decs, intrinsics, decodeJig)
    })
  }
  return x
}

// ------------------------------------------------------------------------------------------------
// decodeBasicMap
// ------------------------------------------------------------------------------------------------

function decodeBasicMap (y, root, decs, intrinsics, decodeJig) {
  if (!_basicArray(y.$map)) _throwDec(y)
  if (!(!_defined(y.props) || _basicObject(y.props))) _throwDec(y)
  const x = new intrinsics.Map()
  decs.set(y, x)
  for (const val of y.$map) {
    if (!_basicArray(val) || val.length !== 2) _throwDec(y)
    const subkey = decodeAny(val[0], root, decs, intrinsics, decodeJig)
    const subval = decodeAny(val[1], root, decs, intrinsics, decodeJig)
    x.set(subkey, subval)
  }
  const props = y.props
  if (props) {
    _deterministicObjectKeys(props).forEach(key => {
      x[key] = decodeAny(props[key], root, decs, intrinsics, decodeJig)
    })
  }
  return x
}

// ------------------------------------------------------------------------------------------------
// decodeBasicUint8Array
// ------------------------------------------------------------------------------------------------

function decodeBasicUint8Array (y, root, decs, intrinsics, decodeJig) {
  if (typeof y.$ui8a !== 'string') _throwDec(y)
  if (y.$ui8a.split('').some(c => !BASE64_CHARS.has(c))) _throwDec(y)
  const buf = Buffer.from(y.$ui8a, 'base64')
  // Safari/WebKit throws if we use TypedArray.from(). So we use new Uint8Array instead.
  const x = new intrinsics.Uint8Array(buf)
  decs.set(x, x)
  return x
}

// ------------------------------------------------------------------------------------------------
// decodeBasicArray
// ------------------------------------------------------------------------------------------------

function decodeBasicArray (y, root, decs, intrinsics, decodeJig) {
  const x = new intrinsics.Array()
  decs.set(y, x)
  for (const v of y) {
    x.push(decodeAny(v, root, decs, intrinsics, decodeJig))
  }
  return x
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _encode: encode,
  _decode: decode
}
