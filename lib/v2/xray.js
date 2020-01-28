/**
 * xray.js
 *
 * Powerful object scanner to deeply inspect, serialize, deserialize, and clone objects.
 */

// TODO
//  -Tests
//  -Safe deduper
//  -Tokens and deployables don't need sets. Need loaders.
//  -Documentation (remove Builder references)
//  -Does RunSet need special handling for Set?
//  -Hook up to existing code
//  -How to load other protocols?

const Protocol = require('./protocol')
const { RunSet } = require('./datatypes')
const Evaluator = require('../evaluator')
const { display } = require('../util')

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
    this.caches = {
      scanned: new Set(),
      cloneable: new Map(),
      serializable: new Map(),
      deserializable: new Map(),
      clone: new Map(),
      serialize: new Map(),
      deserialize: new Map()
    }
    this.scanners = [
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
      this.tokens = new RunSet()
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

  useTokenizer (tokenizer) {
    this.tokenizer = tokenizer
    return this
  }

  useIntrinsics (intrinsics) {
    this.intrinsics = intrinsics
    return this
  }

  scan (x) {
    if (this.caches.scanned.has(x)) return this
    const value = this.scanners.some(scanner => scanner.scan(x, this))
    this.caches.scanned.add(x)
    if (!value) throw new Error(`${display(x)} cannot be scanned`)
    return this
  }

  /**
   * Returns whether an object can be cloned by this Xray
   */
  cloneable (x) {
    if (this.caches.cloneable.has(x)) return this.caches.cloneable.get(x)
    const value = this.scanners.some(scanner => scanner.cloneable(x, this))
    this.caches.cloneable.set(x, value)
    return value
  }

  /**
   * Returns whether an object can be serialized by this Xray
   */
  serializable (x) {
    if (this.caches.serializable.has(x)) return this.caches.serializable.get(x)
    const value = this.scanners.some(scanner => scanner.serializable(x, this))
    this.caches.serializable.set(x, value)
    return value
  }

  /**
   * Returns whether an object can be deserialized by this Xray
   */
  deserializable (x) {
    if (this.caches.deserializable.has(x)) return this.caches.deserializable.get(x)
    const value = this.scanners.some(scanner => scanner.deserializable(x, this))
    this.caches.deserializable.set(x, value)
    return value
  }

  clone (x) {
    if (this.caches.clone.has(x)) return this.caches.clone.get(x)
    const scanner = this.scanners.find(scanner => scanner.cloneable(x, this))
    if (scanner) {
      const y = scanner.clone(x, this)
      this.caches.clone.set(x, y)
      return y
    }
    throw new Error(`${display(x)} cannot be cloned`)
  }

  serialize (x) {
    if (this.caches.serialize.has(x)) return this.caches.serialize.get(x)
    const scanner = this.scanners.find(scanner => scanner.serializable(x, this))
    if (scanner) {
      const y = scanner.serialize(x, this)
      this.caches.serialize.set(x, y)
      return y
    }
    throw new Error(`${display(x)} cannot be serialized`)
  }

  deserialize (x) {
    if (this.caches.deserialize.has(x)) return this.caches.deserialize.get(x)
    const scanner = this.scanners.find(scanner => scanner.deserializable(x, this))
    if (scanner) {
      const y = scanner.deserialize(x, this)
      this.caches.deserialize.set(x, y)
      return y
    }
    throw new Error(`${display(x)} cannot be deserialized`)
  }
}

// ------------------------------------------------------------------------------------------------
// Scanner API
// -----------------------------------------------------------------------------------------------

class Scanner {
  // Return true to skip
  scan (x, xray) { throw new Error('Not implemented') }
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

/**
 * Scanner to handle undefined, which cannot be passed through during serializion
 */
class UndefinedScanner {
  scan (x, xray) { return typeof x === 'undefined' }
  cloneable (x, xray) { return typeof x === 'undefined' }
  serializable (x, xray) { return typeof x === 'undefined' }
  deserializable (x, xray) { return typeof x === 'object' && x && x.$class === 'undefined' }
  clone (x, xray) { return x }
  serialize (x, xray) {
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    y.$class = 'undefined'
    return y
  }

  deserialize (x, xray) { return undefined }
}

// ------------------------------------------------------------------------------------------------
// Code detector
// -----------------------------------------------------------------------------------------------

class DeployableScanner {
  scan (x, xray) {
    if (deployable(x, xray)) {
      xray.deployables.add(x)
      return true
    }
  }

  cloneable (x, xray) {
    if (deployable(x, xray)) {
      xray.deployables.add(x)
      return true
    }
  }

  serializable (x, xray) { }

  deserializable (x, xray) { }

  clone (x, xray) {
    return xray.tokenizer.load(xray.tokenizer.deploy(x))
  }

  serialize (x, xray) { }

  deserialize (x, xray) { }
}

// ------------------------------------------------------------------------------------------------
// Token detector
// -----------------------------------------------------------------------------------------------

class TokenScanner {
  scan (x, xray) { this.detect(x, xray) }
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

/**
 * Scanner to handle booleans, numbers, strings, and null
 */
class PrimitiveScanner {
  scan (x, xray) {
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
      case 'object': return x === null
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
  scan (x, xray) {
    if (this.isBasicObject(x, xray)) {
      xray.caches.scanned.add(x)
      Object.keys(x).forEach(key => { xray.scan(key); xray.scan(x[key]) })
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isBasicObject(x, xray)) return false
    xray.caches.cloneable.set(x, true) // Preassume cloneable for circular refs
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isBasicObject(x, xray)) return false
    if (Object.keys(x).find(key => key.startsWith('$'))) return false
    xray.caches.serializable.set(x, true) // Preassume serializable for circular refs
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (!this.isBasicObject(x, xray)) return false
    if (Object.keys(x).find(key => key.startsWith('$'))) return false
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
    const y = Object.create(Object.prototype)
    xray.caches.deserialize.set(x, y)
    Object.keys(x).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x[key]) })
    return y
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
      xray.caches.scanned.add(x)
      Object.keys(x).forEach(key => { xray.scan(key); xray.scan(x[key]) })
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isBasicArray(x, xray)) return false
    xray.caches.cloneable.set(x, true) // Preassume cloneable for circular refs
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isBasicArray(x, xray)) return false
    xray.caches.serializable.set(x, true) // Preassume serializable for circular refs
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (!this.isBasicArray(x, xray)) return false
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
    const y = Array.from([])
    xray.caches.deserialize.set(x, y)
    Object.keys(x).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x[key]) })
    return y
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

class Uint8ArrayScanner {
  scan (x, xray) { return this.isUint8Array(x, xray) }
  cloneable (x, xray) { return this.isUint8Array(x, xray) }
  serializable (x, xray) { return this.isUint8Array(x, xray) }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (x.$class !== 'Uint8Array') return false
    return typeof x.base64Data === 'string'
  }

  clone (x, xray) {
    const { Uint8Array } = xray.intrinsics.default
    return Uint8Array.from(x)
  }

  serialize (x, xray) {
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    y.$class = 'Uint8Array'
    y.base64Data = Buffer.from(x).toString('base64')
    return y
  }

  deserialize (x, xray) {
    const { Uint8Array } = xray.intrinsics.default
    return Uint8Array.from(Buffer.from(x.base64Data, 'base64'))
  }

  isUint8Array (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (getPrototypeCount(x) !== 3) return false // Uint8Array, TypedArray, Object
    if (Object.keys(x).some(key => x[key] > 255 || x[key] < 0)) return false
    return xray.intrinsics.allowed.some(intrinsics => x instanceof intrinsics.Uint8Array)
  }
}

// ------------------------------------------------------------------------------------------------
// Set scanner
// -----------------------------------------------------------------------------------------------

class SetScanner {
  scan (x, xray) {
    if (this.isSet(x, xray)) {
      xray.caches.scanned.add(x)
      for (const y of x) { xray.scan(y) }
      Object.keys(x).forEach(key => { xray.scan(key); xray.scan(x[key]) })
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isSet(x, xray)) return false
    xray.caches.cloneable.set(x, true) // Preassume cloneable for circular refs
    for (const y of x) { if (!xray.cloneable(y)) return false }
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isSet(x, xray)) return false
    xray.caches.serializable.set(x, true) // Preassume serializable for circular refs
    for (const y of x) { if (!xray.serializable(y)) return false }
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x || x.$class !== 'Set') return false
    if (typeof x.entries !== 'undefined' && !Array.isArray(x.entries)) return false
    if (typeof x.props !== 'undefined' && typeof x.props !== 'object') return false
    xray.caches.deserializable.set(x, true) // Preassume deserializable for circular refs
    if (x.entries && x.entries.some(y => !xray.deserializable(y))) return false
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
    y.$class = 'Set'
    xray.caches.serialize.set(x, y)
    if (x.size) {
      y.entries = Array.from([])
      for (const entry of x) { y.entries.push(xray.serialize(entry)) }
    }
    if (Object.keys(x).length) {
      y.props = Object.create(Object.prototype)
      Object.keys(x).forEach(key => { y.props[xray.serialize(key)] = xray.serialize(x[key]) })
    }
    return y
  }

  deserialize (x, xray) {
    const { Set } = xray.intrinsics.default
    const y = new Set()
    xray.caches.deserialize.set(x, y)
    if (x.entries) { for (const entry of x.entries) { y.add(xray.deserialize(entry)) } }
    if (x.props) Object.keys(x.props).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x.props[key]) })
    return y
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
      xray.caches.scanned.add(x)
      for (const [key, val] of x) { xray.scan(key); xray.scan(value) }
      Object.keys(x).forEach(key => { xray.scan(key); xray.scan(x[key]) })
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isMap(x, xray)) return false
    xray.caches.cloneable.set(x, true) // Preassume cloneable for circular refs
    for (const [key, val] of x) {
      if (!xray.cloneable(key)) return false
      if (!xray.cloneable(val)) return false
    }
    return !Object.keys(x).some(key => !xray.cloneable(key) || !xray.cloneable(x[key]))
  }

  serializable (x, xray) {
    if (!this.isMap(x, xray)) return false
    xray.caches.serializable.set(x, true) // Preassume serializable for circular refs
    for (const [key, val] of x) {
      if (!xray.serializable(key)) return false
      if (!xray.serializable(val)) return false
    }
    return !Object.keys(x).some(key => !xray.serializable(key) || !xray.serializable(x[key]))
  }

  deserializable (x, xray) {
    if (typeof x !== 'object' || !x || x.$class !== 'Map') return false
    if (!Array.isArray(x.entries)) return false
    if (typeof x.props !== 'object') return false
    xray.caches.deserializable.set(x, true) // Preassume deserializable for circular refs
    for (const entry of x.entries) {
      if (!Array.isArray(entry) || entry.length !== 2) return false
      if (!xray.deserializable(entry[0])) return false
      if (!xray.deserializable(entry[1])) return false
    }
    return !Object.keys(x.props).some(key => !xray.deserializable(key) || !xray.deserializable(x.props[key]))
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
    y.$class = 'Map'
    y.entries = Array.from([])
    y.props = Object.create(Object.prototype)
    xray.caches.serialize.set(x, y)
    for (const [key, val] of x) { y.entries.push([xray.serialize(key), xray.serialize(val)]) }
    Object.keys(x).forEach(key => { y.props[xray.serialize(key)] = xray.serialize(x[key]) })
    return y
  }

  deserialize (x, xray) {
    const { Map } = xray.intrinsics.default
    const y = new Map()
    xray.caches.deserialize.set(x, y)
    for (const [key, val] of x.entries) { y.set(xray.deserialize(key), xray.deserialize(val)) }
    Object.keys(y.props).forEach(key => { y[xray.deserialize(key)] = xray.deserialize(x[key]) })
  }

  isMap (x, xray) {
    if (typeof x !== 'object' || !x) return false
    if (getPrototypeCount(x) !== 2) return false // Map, Object
    return xray.intrinsics.allowed.some(intrinsics => x instanceof intrinsics.Map)
  }
}

// ------------------------------------------------------------------------------------------------
// Tokenizer API
// ------------------------------------------------------------------------------------------------

/**
 * API to load tokens and deploy code within the xray. The API communicates with some real
 * system that is able perform these actions on tokens.
 */
class Tokenizer {
  // Returns sandboxed token
  load (location) { throw new Error('Not implemented') }
  // Returns location after deploying
  deploy (deployable) { throw new Error('Not implemented') }
}

// ------------------------------------------------------------------------------------------------
// Arbitrary classes
// ------------------------------------------------------------------------------------------------

class ArbitraryObjectScanner {
  constructor () {
    this.basicObjectScanner = new BasicObjectScanner()
  }

  scan (x, xray) {
    if (this.isArbitraryObject(x)) {
      xray.caches.scanned.add(x)
      xray.deployables.add(x.constructor)
      Object.keys(x).forEach(key => { xray.scan(key); xray.scan(x[key]) })
      return true
    }
  }

  cloneable (x, xray) {
    if (!this.isArbitraryObject(x, xray)) return false
    xray.deployables.add(x.constructor)
    return this.basicObjectScanner.cloneable(Object.assign({}, x), xray)
  }

  serializable (x, xray) {
    if (!this.isArbitraryObject(x, xray)) return false
    xray.deployables.add(x.constructor)
    return this.basicObjectScanner.serializable(Object.assign({}, x), xray)
  }

  deserializable (x, xray) {
    if (!xray.tokenizer) throw new Error(`No tokenizer provided to deserialize ${display(x)}`)
    if (typeof x !== 'object' || !x) return false
    if (x.$class !== 'arbitraryObject') return false
    if (!xray.tokenizer.load(x.type)) return false
    if (typeof x.value !== 'object') return false
    return true
  }

  clone (x, xray) {
    if (!xray.tokenizer) throw new Error(`No tokenizer provided to clone ${display(x)}`)
    const clone = this.basicObjectScanner.clone(Object.assign({}, x), xray)
    const sandbox = xray.tokenizer.load(xray.tokenizer.deploy(x.constructor))
    Object.setPrototypeOf(clone, sandbox.prototype)
    return clone
  }

  serialize (x, xray) {
    if (!xray.tokenizer) throw new Error(`No tokenizer provided to serialize ${display(x)}`)
    const { Object } = xray.intrinsics.default
    const y = Object.create(Object.prototype)
    y.$class = 'arbitraryObject'
    y.type = xray.tokenizer.deploy(x.constructor)
    y.value = this.basicObjectScanner.serialize(Object.assign({}, x), xray)
    return y
  }

  deserialize (x, xray) {
    if (!xray.tokenizer) throw new Error(`No tokenizer provided to deserialize ${display(x)}`)
    const type = xray.tokenizer.load(x.type)
    const { Object } = xray.intrinsics.default
    const obj = Object.assign(Object.create(Object.prototype), x.value)
    Object.setPrototypeOf(obj, type.prototype)
    return obj
  }

  isArbitraryObject (x, xray) {
    if (typeof x !== 'object' || !x) return false
    return deployable(x.constructor, xray)
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

      // TODO
      const { Object, Array } = xray.intrinsics.default
      const y = Object.create(Object.prototype)
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

  // TODO
  const { Object, Array } = xray.intrinsics.default
  const y = Object.create(Object.prototype)
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
// Intrinsics
// ------------------------------------------------------------------------------------------------

/**
 * Manages known intrinsics
 */
class Intrinsics {
  constructor () {
    this.default = null
    this.allowed = []
    this.types = new Set()
    this.use(Evaluator.getIntrinsics())
  }

  allow (intrinsics) {
    this.allowed.push(intrinsics)
    Object.keys(intrinsics).forEach(name => this.types.add(intrinsics[name]))
    return this
  }

  use (intrinsics) {
    this.allow(intrinsics)
    this.default = intrinsics
    return this
  }
}

Intrinsics.defaultIntrinsics = new Intrinsics()

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
  if (Protocol.isToken(x)) return false
  return true
}

// ------------------------------------------------------------------------------------------------

module.exports = Xray
