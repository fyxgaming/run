/**
 * xray.js
 *
 * Powerful object scanner to deeply inspect, serialize, deserialize, and clone objects.
 */

const Protocol = require('./protocol')
const TokenSet = require('./datatypes')

// ------------------------------------------------------------------------------------------------
// Xray
// -----------------------------------------------------------------------------------------------

// Doc:
// Caching means values are not expected to change

class Xray {
  constructor (options = {}) {
    // Scanners
    this.checkSerializable = !!options.checkSerializable
    this.checkDeserializable = !!options.checkDeserializable
    this.allowDeployables = !!options.allowDeployables
    this.allowTokens = !!options.allowTokens
    this.allowedIntrinsics = options.allowedIntrinsics || []
    this.preferredIntrinsics = options.preferredIntrinsics || {}
    this.shouldClone = !!options.shouldClone
    this.shouldSerialize = !!options.shouldSerialize
    this.shouldDeserialize = !!options.shouldDeserialize
    // Caches for duplicates
    this.caches = {
      cloneable: new Map(),
      serializable: new Map(),
      deserializable: new Map(),
      clone: new Map(),
      serialize: new Map(),
      deserialize: new Map()
    }
    // Scanners
    this.basicObjectScanner = new BasicObjectScanner(this.preferredIntrinsics.Object)
    this.scanners = [
      new UndefinedScanner(),
      new PrimitiveScanner(),
      this.basicObjectScanner,
      new BasicArrayScanner(this.getAllowedIntrinsics('Array'), this.preferredIntrinsics.Array),
      new Uint8ArrayScanner(this.getAllowedIntrinsics('Uint8Array'), this.preferredIntrinsics.Uint8Array),
      new SetScanner(this.getAllowedIntrinsics('Set'), this.preferredIntrinsics.Set),
      new MapScanner(this.getAllowedIntrinsics('Map'), this.preferredIntrinsics.Map)
    ]
    if (this.allowDeployables) this.scanners.unshift(new CodeScanner())
    if (this.allowTokens) this.scanners.unshift(new TokenScanner())
    if (this.allowDeployables) this.scanners.push(new ArbitraryObjectScanner(this.basicObjectScanner))
  }

  scan (x, result = new Result(this)) {
    this.deployables = new Set()
    this.tokens = new TokenSet()

    if (this.checkSerializable && !this.serializable(x)) {
      throw new Error(`${x} is not serializable`)
    }

    if (this.checkDeserializable && !this.deserializable(x)) {
      throw new Error(`${x} is not deserializable`)
    }

    if (this.shouldClone) {
      result.clone = this.clone(x)
    }

    if (this.shouldSerialize) {
      result.serialized = serializeDedup(this.serialize(x))
    }

    if (this.shouldDeserialize) {
      result.deserialized = this.deserialize(deserializeRedup(x))
    }

    result.deployables = this.deployables
    result.tokens = this.tokens

    return result
  }

  cloneable (x) {
    if (this.caches.cloneable.has(x)) return this.caches.cloneable.get(x)
    const y = this.scanners.some(scanner => scanner.cloneable(x, this))
    this.caches.cloneable.set(x, y)
    return y
  }

  serializable (x) {
    if (this.caches.serializable.has(x)) return this.caches.serializable.get(x)
    const y = this.scanners.some(scanner => scanner.serializable(x, this))
    this.caches.serializable.set(x, y)
    return y
  }

  deserializable (x) {
    if (this.caches.deserializable.has(x)) return this.caches.deserializable.get(x)
    const y = this.scanners.some(scanner => scanner.deserializable(x, this))
    this.caches.deserializable.set(x, y)
    return y
  }

  clone (x) {
    if (this.caches.clone.has(x)) return this.caches.clone.get(x)
    const scanner = this.scanners.find(scanner => scanner.cloneable(x, this))
    if (scanner) {
      const y = scanner.clone(x, this)
      this.caches.clone.set(x, y)
      return y
    }
    throw new Error(`${x} cannot be cloned`)
  }

  serialize (x) {
    if (this.caches.serialize.has(x)) return this.caches.serialize.get(x)
    const scanner = this.scanners.find(scanner => scanner.serializable(x, this))
    if (scanner) {
      const y = scanner.serialize(x, this)
      this.caches.serialize.set(x, y)
      return y
    }
    throw new Error(`${x} cannot be serialized`)
  }

  deserialize (x) {
    if (this.caches.deserialize.has(x)) return this.caches.deserialize.get(x)
    const scanner = this.scanners.find(scanner => scanner.deserializable(x, this))
    if (scanner) {
      const y = scanner.deserialize(x, this)
      this.caches.deserialize.set(x, y)
      return y
    }
    throw new Error(`${x} cannot be deserialized`)
  }

  getAllowedIntrinsics (name) {
    const allowed = []
    this.allowedIntrinsics.forEach(intrinsics => {
      if (name in intrinsics) allowed.push(intrinsics[name])
    })
    return allowed
  }
}

// ------------------------------------------------------------------------------------------------
// Xray.Builder
// -----------------------------------------------------------------------------------------------

class Builder {
  constructor () { this.options = { allowedIntrinsics: [global] } }
  checkSerializable () { this.options.checkSerializable = true; return this }
  checkDeserializable () { this.options.checkDeserializable = true; return this }
  allowDeployables () { this.options.allowDeployables = true; return this }
  allowTokens () { this.options.allowTokens = true; return this }
  clone () { this.options.shouldClone = true; return this }
  serialize () { this.options.shouldSerialize = true; return this }
  deserialize () { this.options.shouldDeserialize = true; return this }
  allowIntrinsics (intrinsics) {
    this.options.allowedIntrinsics = this.options.allowedIntrinsics.concat(intrinsics)
    return this
  }

  preferIntrinsics (intrinsics) { this.options.preferredIntrinsics = intrinsics; return this }
  build () { return new Xray(this.options) }
}

Xray.Builder = Builder

// ------------------------------------------------------------------------------------------------
// Xray.Result
// -----------------------------------------------------------------------------------------------

class Result {
  constructor (options) {
    if (options.allowDeployables) this.deployables = new Set()
    if (options.allowTokens) this.tokens = new TokenSet()
  }
}

Xray.Result = Result

// ------------------------------------------------------------------------------------------------
// Scanner API
// -----------------------------------------------------------------------------------------------

class Scanner {
  cloneable (x, xray) { throw new Error('Not implemented') }
  serializable (x, xray) { throw new Error('Not implemented') }
  deserializable (x, xray) { throw new Error('Not implemented') }
  clone (x, xray) { throw new Error('Not implemented') }
  serialize (x, xray) { throw new Error('Not implemented') }
  deserialize (x, xray) { throw new Error('Not implemented') }
}

// ------------------------------------------------------------------------------------------------
// Undefined value scanner
// -----------------------------------------------------------------------------------------------

class UndefinedScanner {
  cloneable (x, xray) { return typeof x === 'undefined' }
  serializable (x, xray) { return typeof x === 'undefined' }
  deserializable (x, xray) { return typeof x === 'object' && x && x.$class === 'undefined' }
  clone (x, xray) { return x }
  serialize (x, xray) { return { $class: undefined } }
  deserialize (x, xray) { return undefined }
}

// ------------------------------------------------------------------------------------------------
// Code detector
// -----------------------------------------------------------------------------------------------

class CodeScanner {
  cloneable (x, xray) { this.detect(x, xray) }
  serializable (x, xray) { this.detect(x, xray) }
  deserializable (x, xray) { this.detect(x, xray) }
  clone (x, xray) { this.detect(x, xray) }
  serialize (x, xray) { this.detect(x, xray) }
  deserialize (x, xray) { this.detect(x, xray) }
  detect (x, xray) { if (deployable(x)) xray.deployables.add(x) }
}

// ------------------------------------------------------------------------------------------------
// Token detector
// -----------------------------------------------------------------------------------------------

class TokenScanner {
  cloneable (x, xray) { this.detect(x, xray) }
  serializable (x, xray) { this.detect(x, xray) }
  deserializable (x, xray) { this.detect(x, xray) }
  clone (x, xray) { this.detect(x, xray) }
  serialize (x, xray) { this.detect(x, xray) }
  deserialize (x, xray) { this.detect(x, xray) }
  detect (x, xray) { if (Protocol.isToken(x)) xray.tokens.add(x) }
}

// ------------------------------------------------------------------------------------------------
// Primitive value scanner
// -----------------------------------------------------------------------------------------------

class PrimitiveScanner {
  cloneable (x, xray) {
    switch (typeof x) {
      case 'undefined': return false
      case 'boolean': return true
      case 'number': return true
      case 'string': return true
      case 'object': return x === null
      case 'function': return false
      case 'symbol': return false
    }
  }

  serializable (x, xray) {
    switch (typeof x) {
      case 'undefined': return false
      case 'boolean': return true
      case 'number': return !isNaN(x) && isFinite(x)
      case 'string': return true
      case 'object': return x === null
      case 'function': return false
      case 'symbol': return false
    }
  }

  deserializable (x, xray) {
    switch (typeof x) {
      case 'undefined': return false
      case 'boolean': return true
      case 'number': return !isNaN(x) && isFinite(x)
      case 'string': return true
      case 'object': return x === null || x.$class === 'undefined'
      case 'function': return false
      case 'symbol': return false
    }
  }

  clone (x, xray) { return x }
  serialize (x, xray) { return x }
  deserialize (x, xray) { return x }
}

// ------------------------------------------------------------------------------------------------
// Normal object scanner
// -----------------------------------------------------------------------------------------------

class BasicObjectScanner {
  constructor (preferredObject = Object) { this.Object = preferredObject }

  cloneable (x, xray) {
    if (!this.isBasicObject(x, xray)) return false
    xray.caches.cloneable.set(x, true)
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isBasicObject(x)) return false
    const badKey = Object.keys(x).find(key => key.startsWith('$'))
    if (badKey) throw new Error(`Dollar signs are not allowed on keys: ${badKey}`)
    xray.caches.serializable.set(x, true)
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (!this.isBasicObject(x)) return false
    xray.caches.deserializable.set(x, true)
    return !Object.keys(x).some(key => !xray.deserializable(key) || !xray.deserializable(x[key]))
  }

  clone (x, xray) {
    const y = this.Object.create(Object.prototype)
    xray.caches.clone.set(x, y)
    Object.keys(x).forEach(key => { y[xray.clone(key)] = xray.clone(x[key]) })
    return y
  }

  serialize (x, xray) {
    const y = this.Object.create(Object.prototype)
    xray.caches.serialize.set(x, y)
    Object.keys(x).forEach(key => { y[xray.serialize(key)] = xray.serialize(x[key]) })
    return y
  }

  deserialize (x, xray) {
    const y = this.Object.create(Object.prototype)
    xray.caches.deserialize.set(x, y)
    Object.keys(x).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x[key]) })
    return y
  }

  isBasicObject (x) {
    if (typeof x !== 'object' || !x) return false
    return getPrototypeCount(x) === 1 // Object
  }
}

// ------------------------------------------------------------------------------------------------
// Normal array scanner
// -----------------------------------------------------------------------------------------------

class BasicArrayScanner {
  constructor (allowedArrays = [Array], preferredArray = Array) {
    this.allowedArrays = allowedArrays
    this.preferredArray = preferredArray
  }

  cloneable (x, xray) {
    if (!this.isBasicArray(x)) return false
    xray.caches.cloneable.set(x, true)
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isBasicArray(x)) return false
    xray.caches.serializable.set(x, true)
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (!this.isBasicArray(x)) return false
    xray.caches.deserializable.set(x, true)
    return !Object.keys(x).some(key => !xray.deserializable(key) || !xray.deserializable(x[key]))
  }

  clone (x, xray) {
    const y = this.preferredArray.from([])
    xray.caches.clone.set(x, y)
    Object.keys(x).forEach(key => { y[xray.clone(key)] = xray.clone(x[key]) })
    return y
  }

  serialize (x, xray) {
    const y = this.preferredArray.from([])
    xray.caches.serialize.set(x, y)
    Object.keys(x).forEach(key => { y[xray.serialize(key)] = xray.serialize(x[key]) })
    return y
  }

  deserialize (x, xray) {
    const y = this.preferredArray.from([])
    xray.caches.deserialize.set(x, y)
    Object.keys(x).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x[key]) })
    return y
  }

  isBasicArray (x) {
    if (typeof x !== 'object' || !x) return false
    if (getPrototypeCount(x) !== 2) return false // Array, Object
    return this.allowedArrays.some(Array => Array.isArray(x))
  }
}

// ------------------------------------------------------------------------------------------------
// Uint8Array scanner
// -----------------------------------------------------------------------------------------------

class Uint8ArrayScanner {
  constructor (allowedUint8Arrays = [Uint8Array], preferredUint8Array = Uint8Array) {
    this.allowedUint8Arrays = allowedUint8Arrays
    this.preferredUint8Array = preferredUint8Array
  }

  cloneable (x, xray) { return this.isUint8Array(x) }
  serializable (x, xray) { return this.isUint8Array(x) }
  deserializable (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (x.$class !== 'Uint8Array') return false
    return typeof x.base64Data === 'string'
  }

  clone (x, xray) { return this.preferredUint8Array.from(x) }
  serialize (x, xray) { return { $class: 'Uint8Array', base64Data: Buffer.from(x).toString('base64') } }
  deserialize (x, xray) { return this.preferredUint8Array.from(Buffer.from(x.base64Data, 'base64')) }

  isUint8Array (x) {
    if (typeof x !== 'object' || !x) return false
    if (getPrototypeCount(x) !== 3) return false // Uint8Array, TypedArray, Object
    if (Object.keys(x).some(key => x[key] > 255 || x[key] < 0)) return false
    return this.allowedUint8Arrays.some(Uint8Array => x instanceof Uint8Array)
  }
}

// ------------------------------------------------------------------------------------------------
// Set scanner
// -----------------------------------------------------------------------------------------------

class SetScanner {
  constructor (allowedSets = [Set], preferredSet = Set) {
    this.allowedSets = allowedSets
    this.preferredSet = preferredSet
  }

  cloneable (x, xray) {
    if (!this.isSet(x)) return false
    xray.caches.cloneable.set(x, true)
    for (const y of x) { if (!xray.cloneable(y)) return false }
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isSet(x)) return false
    xray.caches.serializable.set(x, true)
    for (const y of x) { if (!xray.serializable(y)) return false }
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (x.$class !== 'Set') return false
    if (!Array.isArray(x.entries)) return false
    if (typeof x.props !== 'object') return false
    xray.caches.deserializable.set(x, true)
    if (x.entries.some(y => !xray.deserializable(y))) return false
    return !Object.keys(x.props).some(key => !xray.deserializable(key) || !xray.deserializable(x.props[key]))
  }

  clone (x, xray) {
    const y = new this.preferredSet() // eslint-disable-line
    xray.caches.clone.set(x, y)
    for (const entry of x) { y.add(xray.clone(entry)) }
    Object.keys(x).forEach(key => { y[xray.clone(key)] = xray.clone(x[key]) })
    return y
  }

  serialize (x, xray) {
    const y = { $class: 'Set', entries: [], props: {} }
    xray.caches.serialize.set(x, y)
    for (const entry of x) { y.entries.push(xray.serialize(entry)) }
    Object.keys(x).forEach(key => { y.props[xray.serialize(key)] = xray.serialize(x[key]) })
    return y
  }

  deserialize (x, xray) {
    const y = new this.preferredSet() // eslint-disable-line
    xray.caches.deserialize.set(x, y)
    for (const entry of x.entries) { y.add(xray.deserialize(entry)) }
    Object.keys(y.props).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x[key]) })
  }

  isSet (x) {
    if (typeof x !== 'object' || !x) return false
    if (getPrototypeCount(x) !== 2) return false // Set, Object
    return this.allowedSets.some(Set => x instanceof Set)
  }
}

// ------------------------------------------------------------------------------------------------
// Map scanner
// -----------------------------------------------------------------------------------------------

class MapScanner {
  constructor (allowedMaps = [Map], preferredMap = Map) {
    this.allowedMaps = allowedMaps
    this.preferredMap = preferredMap
  }

  cloneable (x, xray) {
    if (!this.isMap(x)) return false
    xray.caches.cloneable.set(x, true)
    for (const [key, val] of x) {
      if (!xray.cloneable(key)) return false
      if (!xray.cloneable(val)) return false
    }
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isMap(x)) return false
    xray.caches.serializable.set(x, true)
    for (const [key, val] of x) {
      if (!xray.serializable(key)) return false
      if (!xray.serializable(val)) return false
    }
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (x.$class !== 'Map') return false
    if (!Array.isArray(x.entries)) return false
    if (typeof x.props !== 'object') return false
    xray.caches.deserializable.set(x, true)
    for (const entry of x.entries) {
      if (!Array.isArray(entry) || entry.length !== 2) return false
      if (!xray.deserializable(entry[0])) return false
      if (!xray.deserializable(entry[1])) return false
    }
    return !Object.keys(x.props).some(key => !xray.deserializable(key) || !xray.deserializable(x.props[key]))
  }

  clone (x, xray) {
    const y = new this.preferredMap() // eslint-disable-line
    xray.caches.clone.set(x, y)
    for (const [key, val] of x) { y.set(xray.clone(key), xray.clone(val)) }
    Object.keys(x).forEach(key => { y[xray.clone(key)] = xray.clone(x[key]) })
    return y
  }

  serialize (x, xray) {
    const y = { $class: 'Map', entries: [], props: {} }
    xray.caches.serialize.set(x, y)
    for (const [key, val] of x) { y.entries.push([xray.serialize(key), xray.serialize(val)]) }
    Object.keys(x).forEach(key => { y.props[xray.serialize(key)] = xray.serialize(x[key]) })
    return y
  }

  deserialize (x, xray) {
    const y = new this.preferredMap() // eslint-disable-line
    xray.caches.deserialize.set(x, y)
    for (const [key, val] of x.entries) { y.set(xray.deserialize(key), xray.deserialize(val)) }
    Object.keys(y.props).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x[key]) })
  }

  isMap (x) {
    if (typeof x !== 'object' || !x) return false
    if (getPrototypeCount(x) !== 2) return false // Map, Object
    return this.allowedMaps.some(Map => x instanceof Map)
  }
}

// ------------------------------------------------------------------------------------------------
// Arbitrary classes
// ------------------------------------------------------------------------------------------------

class ArbitraryObjectScanner {
  constructor (basicObjectScanner) {
    this.basicObjectScanner = basicObjectScanner
  }

  cloneable (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (!deployable(x.constructor)) return false
    xray.deployables.add(x.constructor)
    return this.basicObjectScanner.cloneable(Object.assign({}, x), xray)
  }

  serializable (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (!deployable(x.constructor)) return false
    xray.deployables.add(x.constructor)
    return this.basicObjectScanner.serializable(Object.assign({}, x), xray)
  }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (x.class !== 'arbitraryObject') return false
    if (typeof value !== 'object') return false
    // TODO: Check type
    // return true
  }

  clone (x, xray) {
    const clone = this.basicObjectScanner.clone(Object.assign({}, x), xray)
    // TODO: Safe convert x's prototype into sandbox, and object.assign too
    Object.setPrototypeOf(clone, x.constructor.prototype)
    return clone
  }

  serialize (x, xray) {
    const type = '!!!'
    const value = this.basicObjectScanner.serialize(Object.assign({}, x), xray)
    return { $class: 'arbitraryObject', type, value }
  }

  deserialize (x, xray) {
    // TODO
  }
}

// ------------------------------------------------------------------------------------------------
// Duplicate serialization/deserialization
// ------------------------------------------------------------------------------------------------

function serializeDedup (x) {
  const seen = new Set()
  const indexes = new Map()

  function detectDups (x) {
    if (typeof x !== 'object') return x
    if (seen.has(x) && !indexes.has(x)) {
      indexes.set(x, indexes.size)
    } else {
      seen.add(x)
      Object.keys(x).forEach(key => detectDups(x[key]))
    }
  }

  detectDups(x)

  if (!indexes.size) return x

  function replaceDups (x) {
    if (typeof x !== 'object') return x
    if (indexes.has(x)) {
      return { $class: 'dup', n: indexes.get(x) }
    } else {
      const y = {}
      Object.keys(x).forEach(key => { y[key] = replaceDups(x[key]) })
      return y
    }
  }

  const val = replaceDups(x)
  const dups = Array.from(indexes.keys())

  dups.forEach(dup => {
    Object.keys(dup).forEach(key => { dup[key] = replaceDups(dup[key]) })
  })

  return { $class: 'dupObject', val, dups }
}

function deserializeRedup (x) {
  if (typeof x !== 'object' || !x) return x
  if (x.$class !== 'object') return x

  function replaceDups (y) {
    if (typeof y !== 'object') return y
    if (y.$class === 'dup') return x.dups[y.n]
    Object.keys(y).forEach(key => { y[key] = replaceDups(y[key]) })
    return y
  }

  replaceDups(x.dups)

  return replaceDups(x.val)
}

// ------------------------------------------------------------------------------------------------
// Helper functions
// ------------------------------------------------------------------------------------------------

function getPrototypeCount (x) {
  let count = 0
  x = Object.getPrototypeOf(x)
  while (x) { x = Object.getPrototypeOf(x); count++ }
  return count
}

function deployable (x) {
  return typeof x === 'function' && x.toString().indexOf('[native code]') === -1
}

// ------------------------------------------------------------------------------------------------

// TODO
// Safe versions ... arbitrary code, elsewhere
// Token replacer ... deployable replacer

Xray.Scanner = Scanner
Xray.UndefinedScanner = UndefinedScanner
Xray.PrimitiveScanner = PrimitiveScanner
Xray.BasicObjectScanner = BasicObjectScanner
Xray.BasicArrayScanner = BasicArrayScanner
Xray.Uint8ArrayScanner = Uint8ArrayScanner
Xray.SetScanner = SetScanner
Xray.MapScanner = MapScanner

module.exports = Xray
