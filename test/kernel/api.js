/**
 * api.js
 *
 * Tests for lib/kernel/api.js
 */

const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run } = require('../env/config')
const { NotImplementedError } = Run.errors
const { Blockchain, Purse, Logger, State, Lock, Owner } = Run.api

// ------------------------------------------------------------------------------------------------
// Blockchain API
// ------------------------------------------------------------------------------------------------

describe('Blockchain API', () => {
  describe('instanceof', () => {
    it('returns true if all required properties are present', () => {
      const blockchain = { broadcast: () => {}, fetch: () => {}, utxos: () => {}, network: 'test' }
      expect(blockchain instanceof Blockchain).to.equal(true)
      expect(Object.assign(() => {}, blockchain) instanceof Blockchain).to.equal(true)
    })

    it('returns false if required property is missing', () => {
      const blockchain = { broadcast: () => {}, fetch: () => {}, utxos: () => {}, network: 'test' }
      expect(Object.assign({}, blockchain, { broadcast: undefined }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { fetch: undefined }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { utxos: undefined }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { network: undefined }) instanceof Blockchain).to.equal(false)
    })

    it('returns false if required properties have wrong types', () => {
      const blockchain = { broadcast: () => {}, fetch: () => {}, utxos: () => {}, network: 'test' }
      expect(Object.assign({}, blockchain, { broadcast: 'method' }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { fetch: 123 }) instanceof Blockchain).to.equal(false)
      expect(Object.assign({}, blockchain, { utxos: null }) instanceof Blockchain).to.equal(false)
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
// Logger API
// ------------------------------------------------------------------------------------------------

describe('Logger API', () => {
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
// State API
// ------------------------------------------------------------------------------------------------

describe('State API', () => {
  describe('instanceof', () => {
    it('returns true if set and get functions are present', () => {
      expect(({ set: () => {}, get: () => {} }) instanceof State).to.equal(true)
      expect(Object.assign(() => {}, { set: () => {}, get: () => {} }) instanceof State).to.equal(true)
    })

    it('returns false if set and get are not functions', () => {
      expect(({ set: false, get: () => {} }) instanceof State).to.equal(false)
      expect(({ set: () => {}, get: null }) instanceof State).to.equal(false)
      expect(({ set: () => {} }) instanceof State).to.equal(false)
      expect(({ get: () => {} }) instanceof State).to.equal(false)
    })

    it('returns false for non-objects', () => {
      expect(0 instanceof State).to.equal(false)
      expect(true instanceof State).to.equal(false)
      expect('blockchain' instanceof State).to.equal(false)
      expect(null instanceof State).to.equal(false)
      expect(undefined instanceof State).to.equal(false)
      expect(Symbol.hasInstance instanceof State).to.equal(false)
    })
  })
})

// ------------------------------------------------------------------------------------------------
// Lock API
// ------------------------------------------------------------------------------------------------

describe('Lock API', () => {
  describe('instanceof', () => {
    it('returns true if script is a getter on class', () => {
      class CustomLock { get script () { return new Uint8Array() } }
      expect(new CustomLock() instanceof Lock).to.equal(true)
    })

    it('returns false if script is a function', () => {
      class CustomLock { script () { return new Uint8Array() } }
      expect(new CustomLock() instanceof Lock).to.equal(false)
    })

    it('returns false if script is a property', () => {
      class CustomLock { constructor () { this.script = new Uint8Array() } }
      expect(new CustomLock() instanceof Lock).to.equal(false)
      expect(({ script: null }) instanceof Lock).to.equal(false)
      expect(({ script: new Uint8Array() }) instanceof Lock).to.equal(false)
    })

    it('returns false if script is a getter on object', () => {
      expect(({ get script () { return new Uint8Array() } }) instanceof Lock).to.equal(false)
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
// Owner API
// ------------------------------------------------------------------------------------------------

describe('Owner API', () => {
  describe('methods', () => {
    it('should throw NotImplementedError by default', async () => {
      expect(() => new Owner().next()).to.throw(NotImplementedError)
      await expect(new Owner().sign()).to.be.rejectedWith(NotImplementedError)
      expect(() => new Owner().ours()).to.throw(NotImplementedError)
      await expect(new Owner().locations()).to.be.rejectedWith(NotImplementedError)
    })
  })

  describe('instanceof', () => {
    it('returns true if next and sign are present', () => {
      expect(({ next: () => {}, sign: () => {} }) instanceof Owner).to.equal(true)
      expect(Object.assign(() => {}, { next: () => {}, sign: () => {} }) instanceof Owner).to.equal(true)
    })

    it('returns false if next or sign are not functions', () => {
      expect(({ next: () => {} }) instanceof Owner).to.equal(false)
      expect(({ sign: () => {} }) instanceof Owner).to.equal(false)
      expect(({ next: false, sign: () => {} }) instanceof Owner).to.equal(false)
      expect(({ next: () => {}, sign: 123 }) instanceof Owner).to.equal(false)
      expect(({ next: () => {}, get sign () { } }) instanceof Owner).to.equal(false)
      expect(({ get next () {}, sign: () => { } }) instanceof Owner).to.equal(false)
    })

    it('returns true if ours or locations are functions', () => {
      function f () { }
      expect(({ next: f, sign: f, ours: f, locations: f }) instanceof Owner).to.equal(true)
      expect(({ next: f, sign: f, locations: f }) instanceof Owner).to.equal(true)
      expect(({ next: f, sign: f, ours: f }) instanceof Owner).to.equal(true)
    })

    it('returns false if ours or locations are not functions', () => {
      function f () { }
      expect(({ next: f, sign: f, locations: [] }) instanceof Owner).to.equal(false)
      expect(({ next: f, sign: f, ours: true }) instanceof Owner).to.equal(false)
      expect(({ next: f, sign: f, get ours () { return true } }) instanceof Owner).to.equal(false)
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
