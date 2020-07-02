/**
 * api.js
 *
 * Tests for lib/kernel/api.js
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const { NotImplementedError } = Run.errors
const { Blockchain, Purse, Logger, Cache, Lock, Owner } = Run.api

// ------------------------------------------------------------------------------------------------
// Blockchain API
// ------------------------------------------------------------------------------------------------

describe('Blockchain API', () => {
  describe('broadcast', () => {
    it('should throw NotImplementedError by default', async () => {
      await expect(new Blockchain().broadcast()).to.be.rejectedWith(NotImplementedError)
    })
  })

  describe('fetch', () => {
    it('should throw NotImplementedError by default', async () => {
      await expect(new Blockchain().fetch()).to.be.rejectedWith(NotImplementedError)
    })
  })

  describe('utxos', () => {
    it('should throw NotImplementedError by default', async () => {
      await expect(new Blockchain().utxos()).to.be.rejectedWith(NotImplementedError)
    })
  })

  describe('network', () => {
    it('should throw NotImplementedError by default', async () => {
      expect(() => new Blockchain().network).to.throw(NotImplementedError)
    })
  })

  describe('instanceof', () => {
    it('returns true if all required properties are present', () => {
      const blockchain = {
        broadcast: () => {},
        fetch: () => {},
        utxos: () => {},
        time: () => {},
        spends: () => {},
        network: 'test'
      }
      expect(blockchain instanceof Blockchain).to.equal(true)
      expect(Object.assign(() => {}, blockchain) instanceof Blockchain).to.equal(true)
    })

    it('returns false if required property is missing', () => {
      const blockchain = {
        broadcast: () => {},
        fetch: () => {},
        utxos: () => {},
        time: () => {},
        spends: () => {},
        network: 'test'
      }
      expect(Object.assign({}, blockchain, { broadcast: undefined }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { fetch: undefined }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { utxos: undefined }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { time: undefined }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { spends: undefined }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { network: undefined }) instanceof Blockchain).to.equal(false)
    })

    it('returns false if required properties have wrong types', () => {
      const blockchain = { broadcast: () => {}, fetch: () => {}, utxos: () => {}, network: 'test' }
      expect(Object.assign({}, blockchain, { broadcast: 'method' }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { fetch: 123 }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { utxos: null }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { time: {} }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { spends: 'abc' }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { network: () => {} }) instanceof Blockchain).to.equal(false)
    })

    it('returns false for non-objects', () => {
      expect(0 instanceof Blockchain).to.equal(false)
      expect(true instanceof Blockchain).to.equal(false)
      expect('blockchain' instanceof Blockchain).to.equal(false)
      expect(null instanceof Blockchain).to.equal(false)
      expect(undefined instanceof Blockchain).to.equal(false)
      expect(Symbol.hasInstance instanceof Blockchain).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// Purse API
// ------------------------------------------------------------------------------------------------

describe('Purse API ', () => {
  describe('pay', () => {
    it('should throw NotImplementedError by default', async () => {
      await expect(new Purse().pay()).to.be.rejectedWith(NotImplementedError)
    })
  })

  describe('broadcast', () => {
    it('should throw NotImplementedError by default', async () => {
      await expect(new Purse().broadcast()).to.be.rejectedWith(NotImplementedError)
    })
  })

  describe('instanceof', () => {
    it('returns true if pay method is present', () => {
      const purse = { pay: () => {} }
      expect(purse instanceof Purse).to.equal(true)
      expect(Object.assign(function () {}, purse) instanceof Purse).to.equal(true)
    })

    it('returns false if pay method is missing or invalid', () => {
      expect(({}) instanceof Purse).to.equal(false)
      expect((() => {}) instanceof Purse).to.equal(false)
      expect(({ pay: null }) instanceof Purse).to.equal(false)
      expect(({ pay: {} }) instanceof Purse).to.equal(false)
    })

    it('returns false for non-objects', () => {
      expect(0 instanceof Purse).to.equal(false)
      expect(true instanceof Purse).to.equal(false)
      expect('blockchain' instanceof Purse).to.equal(false)
      expect(null instanceof Purse).to.equal(false)
      expect(undefined instanceof Purse).to.equal(false)
      expect(Symbol.hasInstance instanceof Purse).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// Owner API
// ------------------------------------------------------------------------------------------------

describe('Owner API', () => {
  describe('sign', () => {
    it('should throw NotImplementedError by default', async () => {
      await expect(new Owner().sign()).to.be.rejectedWith(NotImplementedError)
    })
  })

  describe('owner', () => {
    it('should throw NotImplementedError by default', async () => {
      expect(() => new Owner().owner()).to.throw(NotImplementedError)
    })
  })

  describe('instanceof', () => {
    it('returns true if owner and sign are present', () => {
      expect(({ owner: () => '', sign: () => {} }) instanceof Owner).to.equal(true)
      expect(Object.assign(() => {}, { owner: () => [''], sign: () => {} }) instanceof Owner).to.equal(true)
    })

    it('returns false if sign is not a function', () => {
      expect(({ owner: () => '' }) instanceof Owner).to.equal(false)
      expect(({ owner: () => '', sign: 123 }) instanceof Owner).to.equal(false)
      expect(({ owner: () => '', get sign () { } }) instanceof Owner).to.equal(false)
    })

    it('returns false for non-objects', () => {
      expect(0 instanceof Owner).to.equal(false)
      expect(true instanceof Owner).to.equal(false)
      expect('blockchain' instanceof Owner).to.equal(false)
      expect(null instanceof Owner).to.equal(false)
      expect(undefined instanceof Owner).to.equal(false)
      expect(Symbol.hasInstance instanceof Owner).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// Logger API
// ------------------------------------------------------------------------------------------------

describe('Logger API', () => {
  describe('info', () => {
    it('should not throw NotImplementedError by default', () => {
      expect(() => new Logger().info()).not.to.throw()
    })
  })

  describe('warn', () => {
    it('should not throw NotImplementedError by default', () => {
      expect(() => new Logger().warn()).not.to.throw()
    })
  })

  describe('debug', () => {
    it('should not throw NotImplementedError by default', () => {
      expect(() => new Logger().debug()).not.to.throw()
    })
  })

  describe('error', () => {
    it('should not throw NotImplementedError by default', () => {
      expect(() => new Logger().error()).not.to.throw()
    })
  })

  describe('instanceof', () => {
    it('returns true for any object for function', () => {
      expect(({}) instanceof Logger).to.equal(true)
      expect((() => {}) instanceof Logger).to.equal(true)
      expect(({ info: () => {} }) instanceof Logger).to.equal(true)
      expect(({ warn: function () { } }) instanceof Logger).to.equal(true)
      expect(({ debug: false }) instanceof Logger).to.equal(true)
      expect(({ error: null }) instanceof Logger).to.equal(true)
      const f = () => {}
      expect(({ error: f, info: f, warn: f, debug: f }) instanceof Logger).to.equal(true)
    })

    it('returns false for non-objects', () => {
      expect(0 instanceof Logger).to.equal(false)
      expect(true instanceof Logger).to.equal(false)
      expect('blockchain' instanceof Logger).to.equal(false)
      expect(null instanceof Logger).to.equal(false)
      expect(undefined instanceof Logger).to.equal(false)
      expect(Symbol.hasInstance instanceof Logger).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// Cache API
// ------------------------------------------------------------------------------------------------

describe('Cache API', () => {
  describe('get', () => {
    it('should throw NotImplementedError by default', async () => {
      await expect(new Cache().get()).to.be.rejectedWith(NotImplementedError)
    })
  })

  describe('set', () => {
    it('should throw NotImplementedError by default', async () => {
      await expect(new Cache().set()).to.be.rejectedWith(NotImplementedError)
    })
  })

  describe('instanceof', () => {
    it('returns true if set and get functions are present', () => {
      expect(({ set: () => {}, get: () => {} }) instanceof Cache).to.equal(true)
      expect(Object.assign(() => {}, { set: () => {}, get: () => {} }) instanceof Cache).to.equal(true)
    })

    it('returns false if set and get are not functions', () => {
      expect(({ set: false, get: () => {} }) instanceof Cache).to.equal(false)
      expect(({ set: () => {}, get: null }) instanceof Cache).to.equal(false)
      expect(({ set: () => {} }) instanceof Cache).to.equal(false)
      expect(({ get: () => {} }) instanceof Cache).to.equal(false)
    })

    it('returns false for non-objects', () => {
      expect(0 instanceof Cache).to.equal(false)
      expect(true instanceof Cache).to.equal(false)
      expect('blockchain' instanceof Cache).to.equal(false)
      expect(null instanceof Cache).to.equal(false)
      expect(undefined instanceof Cache).to.equal(false)
      expect(Symbol.hasInstance instanceof Cache).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// Lock API
// ------------------------------------------------------------------------------------------------

describe('Lock API', () => {
  describe('script', () => {
    it('should throw NotImplementedError by default', () => {
      expect(() => new Lock().script()).to.throw(NotImplementedError)
    })
  })

  describe('instanceof', () => {
    it('returns true if script is a function on class', () => {
      class CustomLock {
        script () { return new Uint8Array() }
        domain () { return 1 }
      }
      expect(new CustomLock() instanceof Lock).to.equal(true)
    })

    it('returns true if script returns a sandbox Uint8Array', () => {
      const SandboxUint8Array = unmangle(Run.sandbox)._intrinsics.Uint8Array
      class CustomLock {
        script () { return new SandboxUint8Array() }
        domain () { return 1 }
      }
      expect(new CustomLock() instanceof Lock).to.equal(true)
    })

    it('returns false if script is a getter', () => {
      class CustomLock {
        get script () { return new Uint8Array() }
        domain () { return 1 }
      }
      expect(new CustomLock() instanceof Lock).to.equal(false)
    })

    it('returns false if script is a property', () => {
      class CustomLock {
        constructor () { this.script = new Uint8Array() }
        domain () { return 1 }
      }
      expect(new CustomLock() instanceof Lock).to.equal(false)
      expect(({ script: null, domain: 1 }) instanceof Lock).to.equal(false)
      expect(({ script: new Uint8Array(), domain: 1 }) instanceof Lock).to.equal(false)
    })

    it('returns false if script is a getter on object', () => {
      expect(({
        script () { return new Uint8Array() },
        domain () { return 1 }
      }) instanceof Lock).to.equal(false)
    })

    it('returns true if domain is a function on class', () => {
      class CustomLock {
        script () { return new Uint8Array() }
        domain () { return 1 }
      }
      expect(new CustomLock() instanceof Lock).to.equal(true)
    })

    it('returns false if domain is a getter', () => {
      class CustomLock {
        script () { return new Uint8Array() }
        get domain () { return 1 }
      }
      expect(new CustomLock() instanceof Lock).to.equal(false)
    })

    it('returns false if domain is a property', () => {
      class CustomLock { script () { return new Uint8Array() } }
      const lock = new CustomLock()
      lock.domain = 1
      expect(lock instanceof Lock).to.equal(false)
    })

    it('returns false if domain returns a non-number', () => {
      class CustomLock {
        script () { return new Uint8Array() }
        domain () { return null }
      }
      expect(new CustomLock() instanceof Lock).to.equal(false)
    })

    it('returns false if domain returns a non-integer', () => {
      class CustomLock {
        script () { return new Uint8Array() }
        domain () { return 1.5 }
      }
      expect(new CustomLock() instanceof Lock).to.equal(false)
    })

    it('returns false if domain returns negative', () => {
      class CustomLock {
        script () { return new Uint8Array() }
        domain () { return -1 }
      }
      expect(new CustomLock() instanceof Lock).to.equal(false)
    })

    it('returns false if object overrides script getter', () => {
      class CustomLock { script () { return new Uint8Array() } }
      const o = { script: new Uint8Array() }
      Object.setPrototypeOf(o, CustomLock.prototype)
      expect(o instanceof Lock).to.equal(false)
    })

    it('returns false if script is not a Uint8Array', () => {
      class CustomLock { script () { return [1, 2, 3] } }
      expect(new CustomLock() instanceof Lock).to.equal(false)
    })

    it('returns false for non-objects', () => {
      expect(0 instanceof Lock).to.equal(false)
      expect(true instanceof Lock).to.equal(false)
      expect('blockchain' instanceof Lock).to.equal(false)
      expect(null instanceof Lock).to.equal(false)
      expect(undefined instanceof Lock).to.equal(false)
      expect(Symbol.hasInstance instanceof Lock).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
