/**
 * xray.js
 *
 * Powerful object scanner to deeply inspect, serialize, deserialize, and clone objects.
 */

// TODO
// Document serialization protocol
//  -Tests
//  -Tokens and deployables don't need sets. Need loaders.
//  -Documentation (remove Builder references)
//  -Does UniqueSet need special handling for Set?
//  -Hook up to existing code (And UniqueSet as default)
//  -How to load other protocols?
// - intrinsics are designed to be as flexible as safe.
// So Objects and arrays are acceptible from without.
// Document scanner API

const Protocol = require('./protocol')
const { display } = require('../util')
const { Jig, JigControl } = require('../jig')
const { Intrinsics } = require('../intrinsics')

// ------------------------------------------------------------------------------------------------
// Xray
// -----------------------------------------------------------------------------------------------

/**
 * The Xray is a scanner that an clone, serialize, and deserialize complex JavaScript objects with
 * tokens into formats that be stored on a blockchain and cached. To use the Xray, create one using
 * the Builder below, specifying and properties needed. Then, you may begin scanning objects. The
 * Xray has internal caches and assumes that while using the scanner objects will not change. The
 * Xray uses Scanners to process objects. Scanners have a consistent API documented below.
 *
 * Format:
 *  $class
 *
 * Caches, intrinsics - membrane, not passing objects or arrays, primitives OK.
 *
 * Serialization is JSON
 */
class Xray {
  /**
   * Creates an Xray that uses the default intrinsics and a set of basic scanners. Tokens and
   * deployables are not supported by default in scanned objects and must be enabled.
   */
  constructor () {
    this.intrinsics = Intrinsics.defaultIntrinsics
    this.tokenizer = null
    this.deployables = null
    this.tokens = null
    this.refs = null
    this.caches = {
      scanned: new Set(),
      cloneable: new Map(),
      serializable: new Map(),
      deserializable: new Map(),
      clone: new Map(),
      serialize: new Map(),
      deserialize: new Map(),
      predeserialize: new Map()
    }
    this.scanners = [
      new DedupScanner(),
      new UndefinedScanner(),
      new PrimitiveScanner(),
      new BasicObjectScanner(),
      new BasicArrayScanner(),
      new Uint8ArrayScanner(),
      new SetScanner(),
      new MapScanner()
    ]
  }

  allowTokens () {
    if (!this.tokens) {
      this.tokens = new Set()
      this.refs = new Set()
      this.scanners.unshift(new TokenScanner())
    }
    return this
  }

  allowDeployables () {
    if (!this.deployables) {
      this.deployables = new Set()
      this.scanners.unshift(new DeployableScanner())
      this.scanners.push(new ArbitraryObjectScanner())
    }
    return this
  }

  useTokenSaver (saveToken) { this.saveToken = saveToken; return this }
  useTokenLoader (loadToken) { this.loadToken = loadToken; return this }
  useCodeCloner (cloneCode) { this.cloneCode = cloneCode; return this }
  useIntrinsics (intrinsics) { this.intrinsics = intrinsics; return this }
  restrictOwner (owner) { this.restrictedOwner = owner; return this }
  deeplyScanTokens () { this.deeplyScanTokens = true; return this }
  useTokenReplacer (replaceToken) { this.replaceToken = replaceToken; return this }

  scan (x) {
    if (this.caches.scanned.has(x)) return this
    for (const scanner of this.scanners) {
      const value = scanner.scan(x, this)
      if (typeof value === 'undefined') continue
      this.caches.scanned.add(x)
      if (value === false) break
      return true
    }
    throw new Error(`${display(x)} cannot be scanned`)
  }

  /**
   * Returns whether an object can be cloned by this Xray
   */
  cloneable (x) {
    if (this.caches.cloneable.has(x)) return this.caches.cloneable.get(x)
    for (const scanner of this.scanners) {
      const value = scanner.cloneable(x, this)
      if (typeof value === 'undefined') continue
      this.caches.cloneable.set(x, value)
      if (!value && typeof this.errorObject === 'undefined') this.errorObject = x
      return value
    }
    this.caches.cloneable.set(x, false)
    if (typeof this.errorObject === 'undefined') this.errorObject = x
    return false
  }

  /**
   * Returns whether an object can be serialized by this Xray
   */
  serializable (x) {
    if (this.caches.serializable.has(x)) return this.caches.serializable.get(x)
    for (const scanner of this.scanners) {
      const value = scanner.serializable(x, this)
      if (typeof value === 'undefined') continue
      this.caches.serializable.set(x, value)
      if (!value && typeof this.errorObject === 'undefined') this.errorObject = x
      return value
    }
    this.caches.serializable.set(x, false)
    if (typeof this.errorObject === 'undefined') this.errorObject = x
    return false
  }

  /**
   * Returns whether an object can be deserialized by this Xray
   */
  deserializable (x) {
    if (this.caches.deserializable.has(x)) return this.caches.deserializable.get(x)
    for (const scanner of this.scanners) {
      const value = scanner.deserializable(x, this)
      if (typeof value === 'undefined') continue
      this.caches.deserializable.set(x, value)
      if (!value && typeof this.errorObject === 'undefined') this.errorObject = x
      return value
    }
    this.caches.deserializable.set(x, false)
    if (typeof this.errorObject === 'undefined') this.errorObject = x
    return false
  }

  clone (x) {
    this.errorObject = undefined
    if (this.caches.clone.has(x)) return this.caches.clone.get(x)
    for (const scanner of this.scanners) {
      const cloneable = scanner.cloneable(x, this)
      if (typeof cloneable === 'undefined') continue
      if (cloneable === false) break
      const y = scanner.clone(x, this)
      this.caches.clone.set(x, y)
      return y
    }
    const errorObject = typeof this.errorObject !== 'undefined' ? this.errorObject : x
    throw new Error(`${display(errorObject)} cannot be cloned`)
  }

  serialize (x) {
    this.errorObject = undefined
    if (this.caches.serialize.has(x)) return this.caches.serialize.get(x)
    for (const scanner of this.scanners) {
      const serializable = scanner.serializable(x, this)
      if (typeof serializable === 'undefined') continue
      if (serializable === false) break
      const y = scanner.serialize(x, this)
      this.caches.serialize.set(x, y)
      return y
    }
    const errorObject = typeof this.errorObject !== 'undefined' ? this.errorObject : x
    throw new Error(`${display(errorObject)} cannot be serialized`)
  }

  deserialize (x) {
    this.errorObject = undefined
    if (this.caches.deserialize.has(x)) return this.caches.deserialize.get(x)
    for (const scanner of this.scanners) {
      const deserializable = scanner.deserializable(x, this)
      if (typeof deserializable === 'undefined') continue
      if (deserializable === false) break
      const y = scanner.deserialize(x, this)
      this.caches.deserialize.set(x, y)
      return y
    }
    const errorObject = typeof this.errorObject !== 'undefined' ? this.errorObject : x
    throw new Error(`${display(errorObject)} cannot be deserialized`)
  }

  predeserialize (x) {
    if (this.caches.predeserialize.has(x)) return
    for (const scanner of this.scanners) {
      const deserializable = scanner.deserializable(x, this)
      if (typeof deserializable === 'undefined') continue
      if (deserializable === false) break
      const y = scanner.predeserialize(x, this)
      this.caches.predeserialize.set(x, y)
      return y
    }
    throw new Error(`${display(x)} cannot be predeserialized`)
  }

  scanAndReplace (x) {
    this.scan(x)
    if (this.replaceToken && Protocol.isToken(x)) {
      const replacement = this.replaceToken(x)
      if (replacement) return replacement
    }
    return x
  }

  checkOwner (x) {
    if (typeof x.$owner !== 'undefined' && x.$owner !== this.restrictedOwner) {
      const suggestion = `Hint: Consider saving a clone of ${x} value instead.`
      throw new Error(`Property ${display(x)} is owned by a different token\n\n${suggestion}`)
    }
  }
}

// ------------------------------------------------------------------------------------------------
// Scanner API
// -----------------------------------------------------------------------------------------------

class Scanner {
  // Return true to skip, false to stop, undefined to continue
  scan (x, xray) { throw new Error('Not implemented') }
  cloneable (x, xray) { throw new Error('Not implemented') }
  serializable (x, xray) { throw new Error('Not implemented') }
  deserializable (x, xray) { throw new Error('Not implemented') }
  clone (x, xray) { throw new Error('Not implemented') }
  serialize (x, xray) { throw new Error('Not implemented') }
  deserialize (x, xray) { throw new Error('Not implemented') }
  predeserialize (x, xray) { throw new Error('Not implemented') }
}

// ------------------------------------------------------------------------------------------------
// Undefined value scanner
// -----------------------------------------------------------------------------------------------

/**
 * Scanner to handle undefined, which cannot be passed through during serializion
 */
class UndefinedScanner {
  scan (x, xray) { if (typeof x === 'undefined') return true }
  cloneable (x, xray) { if (typeof x === 'undefined') return true }
  serializable (x, xray) { if (typeof x === 'undefined') return true }
  deserializable (x, xray) {
    if (typeof x !== 'object' || !x || typeof x.$undef === 'undefined') return
    return x.$undef === 1
  }

  clone (x, xray) { return x }
  serialize (x, xray) {
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    y.$undef = 1
    return y
  }

  deserialize (x, xray) { return undefined }
  predeserialize (x, xray) { }
}

// ------------------------------------------------------------------------------------------------
// Primitive value scanner
// -----------------------------------------------------------------------------------------------

/**
 * Scanner to handle booleans, numbers, strings, and null
 */
class PrimitiveScanner {
  scan (x, xray) {
    switch (typeof x) {
      case 'boolean': return true
      case 'number': return true
      case 'string': return true
      case 'object': return x === null ? true : undefined
      case 'symbol': return true
    }
  }

  cloneable (x, xray) {
    switch (typeof x) {
      case 'boolean': return true
      case 'number': return true
      case 'string': return true
      case 'object': return x === null ? true : undefined
    }
  }

  serializable (x, xray) {
    switch (typeof x) {
      case 'boolean': return true
      case 'number': return !isNaN(x) && isFinite(x)
      case 'string': return true
      case 'object': return x === null ? true : undefined
    }
  }

  deserializable (x, xray) {
    switch (typeof x) {
      case 'boolean': return true
      case 'number': return !isNaN(x) && isFinite(x)
      case 'string': return true
      case 'object': return x === null ? true : undefined
    }
  }

  clone (x, xray) { return x }
  serialize (x, xray) { return x }
  deserialize (x, xray) { return x }
  predeserialize (x, xray) { }
}

// ------------------------------------------------------------------------------------------------
// Normal object scanner
// -----------------------------------------------------------------------------------------------

class BasicObjectScanner {
  scan (x, xray) {
    if (this.isBasicObject(x, xray)) {
      xray.checkOwner(x)
      xray.caches.scanned.add(x)
      Object.keys(x).forEach(key => {
        xray.scan(key)
        if (xray.replaceToken) {
          x[key] = xray.scanAndReplace(x[key])
        } else xray.scan(x[key])
      })
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isBasicObject(x, xray)) return
    xray.caches.cloneable.set(x, true) // Preassume cloneable for circular refs
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isBasicObject(x, xray)) return
    if (Object.keys(x).find(key => key.startsWith('$'))) return false
    xray.caches.serializable.set(x, true) // Preassume serializable for circular refs
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (!this.isBasicObject(x, xray)) return
    if (Object.keys(x).find(key => key.startsWith('$'))) return
    xray.caches.deserializable.set(x, true) // Preassume deserializable for circular refs
    return !Object.keys(x).some(key => !xray.deserializable(key) || !xray.deserializable(x[key]))
  }

  clone (x, xray) {
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    xray.caches.clone.set(x, y)
    Object.keys(x).forEach(key => { y[xray.clone(key)] = xray.clone(x[key]) })
    return y
  }

  serialize (x, xray) {
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    xray.caches.serialize.set(x, y)
    Object.keys(x).forEach(key => { y[xray.serialize(key)] = xray.serialize(x[key]) })
    return y
  }

  deserialize (x, xray) {
    const { Object } = xray.intrinsics.default
    const y = xray.caches.predeserialize.get(x) || Object.create(Object.prototype)
    xray.caches.deserialize.set(x, y)
    Object.keys(x).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x[key]) })
    return y
  }

  predeserialize (x, xray) {
    const { Object } = xray.intrinsics.default
    return Object.create(Object.prototype)
  }

  isBasicObject (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (xray.intrinsics.types.has(x)) return false
    return getPrototypeCount(x) === 1 // Object
  }
}

// ------------------------------------------------------------------------------------------------
// Normal array scanner
// -----------------------------------------------------------------------------------------------

class BasicArrayScanner {
  scan (x, xray) {
    if (this.isBasicArray(x, xray)) {
      xray.checkOwner(x)
      xray.caches.scanned.add(x)
      Object.keys(x).forEach(key => {
        xray.scan(key)
        if (xray.replaceToken) {
          x[key] = xray.scanAndReplace(x[key])
        } else xray.scan(x[key])
      })
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isBasicArray(x, xray)) return
    xray.caches.cloneable.set(x, true) // Preassume cloneable for circular refs
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isBasicArray(x, xray)) return
    xray.caches.serializable.set(x, true) // Preassume serializable for circular refs
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (!this.isBasicArray(x, xray)) return
    xray.caches.deserializable.set(x, true) // Preassume deserializable for circular refs
    return !Object.keys(x).some(key => !xray.deserializable(key) || !xray.deserializable(x[key]))
  }

  clone (x, xray) {
    const { Array } = xray.intrinsics.default
    const y = Array.from([])
    xray.caches.clone.set(x, y)
    Object.keys(x).forEach(key => { y[xray.clone(key)] = xray.clone(x[key]) })
    return y
  }

  serialize (x, xray) {
    const { Array } = xray.intrinsics.default
    const y = Array.from([])
    xray.caches.serialize.set(x, y)
    Object.keys(x).forEach(key => { y[xray.serialize(key)] = xray.serialize(x[key]) })
    return y
  }

  deserialize (x, xray) {
    const { Array } = xray.intrinsics.default
    const y = xray.caches.predeserialize.get(x) || Array.from([])
    xray.caches.deserialize.set(x, y)
    Object.keys(x).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x[key]) })
    return y
  }

  predeserialize (x, xray) {
    const { Array } = xray.intrinsics.default
    return Array.from([])
  }

  isBasicArray (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (getPrototypeCount(x) !== 2) return false // Array, Object
    return xray.intrinsics.allowed.some(intrinsics => intrinsics.Array.isArray(x))
  }
}

// ------------------------------------------------------------------------------------------------
// Uint8Array scanner
// -----------------------------------------------------------------------------------------------

const base64Chars = new Set()
'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  .split('').forEach(x => base64Chars.add(x))

class Uint8ArrayScanner {
  scan (x, xray) {
    if (this.isUint8Array(x, xray)) {
      xray.checkOwner(x)
      return true
    }
  }

  cloneable (x, xray) { if (this.isUint8Array(x, xray)) return true }
  serializable (x, xray) { if (this.isUint8Array(x, xray)) return true }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x || typeof x.$ui8a === 'undefined') return
    if (typeof x.$ui8a !== 'string') return false
    return !x.$ui8a.split('').some(x => !base64Chars.has(x))
  }

  clone (x, xray) {
    const { Uint8Array } = xray.intrinsics.default
    return Uint8Array.from(x)
  }

  serialize (x, xray) {
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    y.$ui8a = Buffer.from(x).toString('base64')
    return y
  }

  deserialize (x, xray) {
    const { Uint8Array } = xray.intrinsics.default
    return xray.caches.predeserialize.get(x) ||
      Uint8Array.from(Buffer.from(x.$ui8a, 'base64'))
  }

  predeserialize (x, xray) {
    const { Uint8Array } = xray.intrinsics.default
    return Uint8Array.from(Buffer.from(x.$ui8a, 'base64'))
  }

  isUint8Array (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (getPrototypeCount(x) !== 3) return false // Uint8Array, TypedArray, Object
    if (Object.keys(x).some(key => isNaN(key) || x[key] > 255 || x[key] < 0)) return false
    return xray.intrinsics.allowed.some(intrinsics => x instanceof intrinsics.Uint8Array)
  }
}

// ------------------------------------------------------------------------------------------------
// Set scanner
// -----------------------------------------------------------------------------------------------

class SetScanner {
  scan (x, xray) {
    if (this.isSet(x, xray)) {
      xray.checkOwner(x)
      xray.caches.scanned.add(x)
      if (xray.replaceToken) {
        const newSet = new Set()
        for (const y of x) { newSet.add(xray.scanAndReplace(y)) }
        x.clear()
        newSet.forEach(y => x.add(y))
      } else for (const y of x) { xray.scan(y) }
      Object.keys(x).forEach(key => {
        xray.scan(key)
        if (xray.replaceToken) {
          x[key] = xray.scanAndReplace(x[key])
        } else xray.scan(x[key])
      })
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isSet(x, xray)) return
    xray.caches.cloneable.set(x, true) // Preassume cloneable for circular refs
    for (const y of x) { if (!xray.cloneable(y)) return false }
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isSet(x, xray)) return
    xray.caches.serializable.set(x, true) // Preassume serializable for circular refs
    for (const y of x) { if (!xray.serializable(y)) return false }
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x || typeof x.$set === 'undefined') return
    if (!Array.isArray(x.$set)) return false
    if (typeof x.props !== 'undefined' && (typeof x.props !== 'object' || !x.props)) return false
    xray.caches.deserializable.set(x, true) // Preassume deserializable for circular refs
    if (x.$set && x.$set.some(y => !xray.deserializable(y))) return false
    if (x.props) return !Object.keys(x.props).some(key => !xray.deserializable(key) || !xray.deserializable(x.props[key]))
    return true
  }

  clone (x, xray) {
    const { Set } = xray.intrinsics.default
    const y = new Set()
    xray.caches.clone.set(x, y)
    for (const entry of x) { y.add(xray.clone(entry)) }
    Object.keys(x).forEach(key => { y[xray.clone(key)] = xray.clone(x[key]) })
    return y
  }

  serialize (x, xray) {
    const { Object, Array } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    xray.caches.serialize.set(x, y)
    y.$set = Array.from([])
    for (const entry of x) { y.$set.push(xray.serialize(entry)) }
    if (Object.keys(x).length) {
      y.props = Object.create(Object.prototype)
      Object.keys(x).forEach(key => { y.props[xray.serialize(key)] = xray.serialize(x[key]) })
    }
    return y
  }

  deserialize (x, xray) {
    const { Set } = xray.intrinsics.default
    const y = xray.caches.predeserialize.get(x) || new Set()
    xray.caches.deserialize.set(x, y)
    for (const entry of x.$set) { y.add(xray.deserialize(entry)) }
    if (x.props) Object.keys(x.props).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x.props[key]) })
    return y
  }

  predeserialize (x, xray) {
    const { Set } = xray.intrinsics.default
    return new Set()
  }

  isSet (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (getPrototypeCount(x) !== 2) return false // Set, Object
    return xray.intrinsics.allowed.some(intrinsics => x instanceof intrinsics.Set)
  }
}

// ------------------------------------------------------------------------------------------------
// Map scanner
// -----------------------------------------------------------------------------------------------

class MapScanner {
  scan (x, xray) {
    if (this.isMap(x, xray)) {
      xray.checkOwner(x)
      xray.caches.scanned.add(x)
      for (const entry of x) xray.scan(entry)
      if (xray.replaceToken) {
        const newMap = new Map()
        for (const [key, val] of x) newMap.set(xray.scanAndReplace(key), xray.scanAndReplace(val))
        x.clear()
        newMap.forEach(([key, val]) => x.set(key, val))
      } else for (const entry of x) { xray.scan(entry) }
      Object.keys(x).forEach(key => {
        xray.scan(key)
        if (xray.replaceToken) {
          x[key] = xray.scanAndReplace(x[key])
        } else xray.scan(x[key])
      })
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isMap(x, xray)) return
    xray.caches.cloneable.set(x, true) // Preassume cloneable for circular refs
    for (const [key, val] of x) {
      if (!xray.cloneable(key)) return false
      if (!xray.cloneable(val)) return false
    }
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isMap(x, xray)) return
    xray.caches.serializable.set(x, true) // Preassume serializable for circular refs
    for (const [key, val] of x) {
      if (!xray.serializable(key)) return false
      if (!xray.serializable(val)) return false
    }
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x || typeof x.$map === 'undefined') return
    if (!Array.isArray(x.$map)) return false
    if (typeof x.props !== 'undefined' && (typeof x.props !== 'object' || !x.props)) return false
    xray.caches.deserializable.set(x, true) // Preassume deserializable for circular refs
    for (const entry of x.$map) {
      if (!Array.isArray(entry) || entry.length !== 2) return false
      if (!xray.deserializable(entry[0])) return false
      if (!xray.deserializable(entry[1])) return false
    }
    if (x.props) {
      return !Object.keys(x.props).some(key =>
        !xray.deserializable(key) || !xray.deserializable(x.props[key]))
    }
    return true
  }

  clone (x, xray) {
    const { Map } = xray.intrinsics.default
    const y = new Map()
    xray.caches.clone.set(x, y)
    for (const [key, val] of x) { y.set(xray.clone(key), xray.clone(val)) }
    Object.keys(x).forEach(key => { y[xray.clone(key)] = xray.clone(x[key]) })
    return y
  }

  serialize (x, xray) {
    const { Object, Array } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    y.$map = Array.from([])
    xray.caches.serialize.set(x, y)
    for (const entry of x) y.$map.push(xray.serialize(entry))
    if (Object.keys(x).length) {
      y.props = Object.create(Object.prototype)
      Object.keys(x).forEach(key => { y.props[xray.serialize(key)] = xray.serialize(x[key]) })
    }
    return y
  }

  deserialize (x, xray) {
    const { Map } = xray.intrinsics.default
    const y = xray.caches.predeserialize.get(x) || new Map()
    xray.caches.deserialize.set(x, y)
    for (const [key, val] of x.$map) { y.set(xray.deserialize(key), xray.deserialize(val)) }
    if (x.props) Object.keys(x.props).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x.props[key]) })
    return y
  }

  predeserialize (x, xray) {
    const { Map } = xray.intrinsics.default
    return new Map()
  }

  isMap (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (getPrototypeCount(x) !== 2) return false // Map, Object
    return xray.intrinsics.allowed.some(intrinsics => x instanceof intrinsics.Map)
  }
}

// ------------------------------------------------------------------------------------------------
// Arbitrary classes
// ------------------------------------------------------------------------------------------------

class ArbitraryObjectScanner {
  constructor () {
    this.basicObjectScanner = new BasicObjectScanner()
  }

  scan (x, xray) {
    if (this.isArbitraryObject(x, xray)) {
      xray.checkOwner(x)
      xray.caches.scanned.add(x)
      Object.keys(x).forEach(key => {
        xray.scan(key)
        if (xray.replaceToken) {
          x[key] = xray.scanAndReplace(x[key])
        } else xray.scan(x[key])
      })
      const newConstructor = xray.scanAndReplace(x.constructor)
      if (newConstructor !== x.constructor) Object.setPrototypeOf(x, newConstructor)
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isArbitraryObject(x, xray)) return
    return this.basicObjectScanner.cloneable(Object.assign({}, x), xray)
  }

  serializable (x, xray) {
    if (!this.isArbitraryObject(x, xray)) return
    return this.basicObjectScanner.serializable(Object.assign({}, x), xray)
  }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x || typeof x.$arbob === 'undefined') return
    if (typeof x.$arbob !== 'object' || !x.$arbob) return false
    if (typeof x.type !== 'string') return false
    return true
  }

  clone (x, xray) {
    if (!xray.cloneCode) throw new Error(`No code cloner available to clone ${display(x)}`)
    const clone = this.basicObjectScanner.clone(Object.assign({}, x), xray)
    const sandbox = xray.cloneCode(x.constructor)
    Object.setPrototypeOf(clone, sandbox.prototype)
    return clone
  }

  serialize (x, xray) {
    if (!xray.saveToken) throw new Error(`No token saver available to serialize ${display(x)}`)
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    y.$arbob = this.basicObjectScanner.serialize(Object.assign({}, x), xray)
    y.type = xray.saveToken(x.constructor)
    if (typeof y.type !== 'string') throw new Error(`Saved type location must be a string: ${y.type}`)
    return y
  }

  deserialize (x, xray) {
    if (!xray.loadToken) throw new Error(`No token restorer available to deserialize ${display(x)}`)
    const { Object } = xray.intrinsics.default
    const obj = xray.caches.predeserialize.get(x) || Object.create(Object.prototype)
    Object.assign(obj, this.basicObjectScanner.deserialize(x.$arbob, xray))
    const type = xray.loadToken(x.type)
    Object.setPrototypeOf(obj, type.prototype)
    return obj
  }

  predeserialize (x, xray) {
    const { Object } = xray.intrinsics.default
    return Object.create(Object.prototype)
  }

  isArbitraryObject (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (!deployable(x.constructor, xray)) return false
    if (Protocol.isToken(x.constructor)) xray.tokens.add(x.constructor)
    xray.deployables.add(x.constructor)
    return true
  }
}

// ------------------------------------------------------------------------------------------------
// Duplicate object scanner
// ------------------------------------------------------------------------------------------------

class DedupScanner {
  constructor () {
    this.topLevel = true
    this.dups = null
    this.checkingDeserializability = false
    this.deserializingDups = false
    this.deserializingMaster = false
  }

  scan (x, xray) { }
  cloneable (x, xray) { }

  serializable (x, xray) {
    const topLevel = this.topLevel
    this.topLevel = false
    try {
      if (topLevel) return xray.serializable(x, xray)
    } finally {
      this.topLevel = topLevel
    }
  }

  deserializable (x, xray) {
    const topLevel = this.topLevel
    this.topLevel = false
    try {
      if (topLevel) {
        if (typeof x !== 'object' || !x || typeof x.$dedup === 'undefined') return
        if (!Array.isArray(x.dups)) return false
        this.dups = x.dups
        try {
          this.checkingDeserializability = true
          return xray.deserializable(x.$dedup) && xray.deserializable(x.dups)
        } finally {
          this.checkingDeserializability = false
          this.dups = null
        }
      } else {
        if (this.checkingDeserializability || this.deserializingDups || this.deserializingMaster) {
          if (typeof x !== 'object' || !x || typeof x.$dup === 'undefined') return
          if (typeof x.$dup !== 'number') return false
          if (!Number.isInteger(x.$dup) || x.$dup < 0 || x.$dup >= this.dups.length) return false
          return true
        }
      }
    } finally {
      this.topLevel = topLevel
    }
  }

  clone (x, xray) { }

  serialize (x, xray) {
    const topLevel = this.topLevel
    this.topLevel = false
    try {
      if (topLevel) return this.dedup(x, xray)
    } finally {
      this.topLevel = topLevel
    }
  }

  deserialize (x, xray) {
    const topLevel = this.topLevel
    this.topLevel = false
    try {
      if (topLevel) {
        if (typeof x !== 'object' || !x || typeof x.$dedup === 'undefined') return

        this.dups = x.dups

        // Predeserialize each dup to put objects in the cache
        this.dups = this.dups.map(dup => xray.predeserialize(dup))

        // Deserialize each dup
        try {
          this.deserializingDups = true
          this.dups = x.dups.map(dup => xray.deserialize(dup))
        } finally {
          this.deserializingDups = false
        }

        // Deserialize the master object
        try {
          this.deserializingMaster = true
          return xray.deserialize(x.$dedup)
        } finally {
          this.deserializingMaster = false
        }
      } else {
        // If we are deserializing any dups, replace them with our known set
        if (this.deserializingDups || this.deserializingMaster) {
          return this.dups[x.$dup]
        }
      }
    } finally {
      this.topLevel = topLevel
    }
  }

  predeserialize (x, xray) { }

  dedup (x, xray) {
    const serialized = xray.serialize(x)

    const { Object, Array } = xray.intrinsics.default

    const seen = new Set()
    const indexes = new Map()
    function detectDups (x) {
      if (typeof x !== 'object' || !x) return
      if (seen.has(x)) {
        if (!indexes.has(x)) indexes.set(x, indexes.size)
      } else {
        seen.add(x)
        Object.keys(x).forEach(key => detectDups(x[key]))
      }
    }

    detectDups(serialized)

    if (!indexes.size) return serialized

    function replaceDups (x) {
      if (typeof x !== 'object' || !x) return x
      if (indexes.has(x)) {
        const y = Object.create(Object.prototype)
        y.$dup = indexes.get(x)
        return y
      } else {
        Object.keys(x).forEach(key => { x[key] = replaceDups(x[key]) })
        return x
      }
    }

    const value = replaceDups(serialized)
    const dups = Array.from(indexes.keys())

    dups.forEach(dup => {
      Object.keys(dup).forEach(key => { dup[key] = replaceDups(dup[key]) })
    })

    const y = Object.create(Object.prototype)
    y.$dedup = value
    y.dups = dups
    return y
  }
}

// ------------------------------------------------------------------------------------------------
// Code detector
// -----------------------------------------------------------------------------------------------

class DeployableScanner {
  scan (x, xray) {
    if (deployable(x, xray)) {
      xray.checkOwner(x)
      xray.deployables.add(x)
      if (xray.deeplyScanTokens) {
        xray.caches.scanned.add(x)
        Object.keys(x).forEach(key => {
          xray.scan(key)
          if (xray.replaceToken) {
            x[key] = xray.scanAndReplace(x[key])
          } else xray.scan(x[key])
        })
      }
      return true
    }
  }

  cloneable (x, xray) {
    if (deployable(x, xray)) {
      xray.deployables.add(x)
      return true
    }
  }

  serializable (x, xray) {
    // We never serialize deployables. They must be tokens when serialized.
  }

  deserializable (x, xray) {
    // We never deserialize deployables. They become tokens when serialized.
  }

  clone (x, xray) {
    if (!xray.cloneCode) throw new Error(`No code cloner available to clone ${display(x)}`)
    return xray.cloneCode(x)
  }

  serialize (x, xray) {
    // We never serialize deployables. They become tokens when serialized.
  }

  deserialize (x, xray) {
    // We never deserialize deployables. They become tokens when serialized.
  }

  predeserialize (x, xray) {
    // We never deserialize deployables. They become tokens when serialized.
  }
}

// ------------------------------------------------------------------------------------------------
// Token detector
// -----------------------------------------------------------------------------------------------

class TokenScanner {
  scan (x, xray) {
    if (Protocol.isToken(x)) {
      xray.tokens.add(x)
      if (xray.deeplyScanTokens) {
        xray.caches.scanned.add(x)
        JigControl.disableProxy(() => {
          Object.keys(x).forEach(key => {
            xray.scan(key)
            if (xray.replaceToken) {
              x[key] = xray.scanAndReplace(x[key])
            } else xray.scan(x[key])
          })
        })
      }
      return true
    }

    if (typeof x === 'object' && x && typeof x.$ref !== 'undefined') {
      if (typeof x.$ref !== 'string') return false
      xray.refs.add(x.$ref)
      return true
    }
  }

  cloneable (x, xray) {
    if (Protocol.isToken(x)) {
      xray.tokens.add(x)
      return true
    }

    if (typeof x === 'object' && x && typeof x.$ref !== 'undefined') {
      if (typeof x.$ref !== 'string') return false
      xray.refs.add(x.$ref)
      return true
    }
  }

  serializable (x, xray) {
    if (Protocol.isToken(x)) {
      xray.tokens.add(x)
      return true
    }
  }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x || typeof x.$ref === 'undefined') return
    if (typeof x.$ref !== 'string') return false
    xray.refs.add(x.$ref)
    return true
  }

  clone (x, xray) {
    // Clone is often used to provide safe sandboxing, but all tokens are safely sandboxed
    return x
  }

  serialize (x, xray) {
    if (!xray.saveToken) throw new Error(`No token saver available to serialize ${display(x)}`)
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    y.$ref = xray.saveToken(x)
    if (typeof y.$ref !== 'string') throw new Error(`Saved token location must be a string: ${y.$ref}`)
    return y
  }

  deserialize (x, xray) {
    if (!xray.loadToken) throw new Error(`No token restorer available to deserialize ${display(x)}`)
    return xray.loadToken(x.$ref)
  }

  predeserialize (x, xray) { }
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

function deployable (x, xray) {
  if (typeof x !== 'function') return false
  if (display(x).indexOf('[native code]') !== -1) return false
  if (xray.intrinsics.types.has(x)) return false
  return true
}

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
    this.state = this.xray.serialize(obj)
  }

  restore () {
    return this.xray.deserialize(this.state)
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

    if (!deepEqual(this.state, other.state)) return false
    if (JSON.stringify(this.state) !== JSON.stringify(other.state)) return false
    if (this.refs.length !== other.refs.length) return false
    return this.refs.every((ref, n) => this.refs[n] === other.refs[n])
  }
}

// ------------------------------------------------------------------------------------------------

Xray.Scanner = Scanner
Xray.Checkpoint = Checkpoint

module.exports = Xray
