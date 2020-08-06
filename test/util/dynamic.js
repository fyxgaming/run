/**
 * dynamic.js
 *
 * Tests for lib/util/dynamic.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Dynamic = unmangle(Run)._Dynamic

// ------------------------------------------------------------------------------------------------
// Dynamic
// ------------------------------------------------------------------------------------------------

describe('Dynamic', () => {
  describe('constructor', () => {
    it('creates base type', () => {
      const D = new Dynamic()
      expect(typeof D === 'function').to.equal(true)
      expect(D.toString()).to.equal('function dynamic() {}')
    })

    // Create with custom base type
  })

  describe('_setInnerType', () => {
    // Only allow functions
    // Is a file a util?

    it('should change source code', () => {
      const D = new Dynamic()
      class A { f () { } }
      D.__type__ = A

      D.prototype = 123
      console.log('===', A.prototype)

      // Can't name using __type__
      // Jigs aren't allowed to have the dynamic type returned. Only they can do it, through upgrade.

      console.log(D.toString())
      console.log(D.prototype)
      console.log('1', Object.getOwnPropertyNames(D.prototype))
      console.log('2', Object.getOwnPropertyNames(Object.getPrototypeOf(D.prototype)))
      console.log(D.prototype.f)

      console.log('---')
      console.log(Object.getOwnPropertyNames(A.prototype))
      console.log('---')

    //   function f () { }
    //   file._set(f)
    //   console.log(file._type.toString())
    })

    // Old functions are removed
    // Prototype can't be changed
    // Create instances, upgrades as we go
  })

  describe.only('new', () => {
    it('is instanceof dynamic type', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      const d = new D()
      expect(d instanceof D).to.equal(true)
    })

    it('is not instance of inner type', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      const d = new D()
      expect(d instanceof D.__type__).to.equal(false)
    })

    it('has same prototype of as dynamic', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      const d = new D()
      expect(Object.getPrototypeOf(d)).to.equal(D.prototype)
    })

    it('can change methods on instance', () => {
      const D = new Dynamic()
      D.__type__ = class A { f () { } }
      const d = new D()
      D.__type__ = class B { g () { } }
      expect(typeof d.f).to.equal('undefined')
      expect(typeof d.g).to.equal('function')
    })

    it('has same constructor as dynamic', () => {
      const D = new Dynamic()
      D.__type__ = class A { f () { } }
      const d = new D()
      expect(d.constructor).to.equal(D)
    })
  })

  it('__type__', () => {
    // TODO: Check constructor
  })

  it('proxy2', () => {
    const D = new Dynamic()

    D.__type__ = class A { }

    const E = new Proxy(D, {
      set (target, prop, value, receiver) {
        console.log(prop)
        target[prop] = value

        if (prop === '__type__') {
          // throw new Error('NOT ALLOWED')
        }
      }
    })

    E.__type__ = class B { }

    console.log(E.toString())
  })

  it('inside another proxy', () => {
    const D = new Dynamic()

    class A { static f () { console.log('f()'); this.n = 1 } }

    // 1. Sandbox class
    // 2. Make class a jig with a membrane
    // 3. Set the class on the dynamic
    // But then the dynamic is the jig. That's backwards.
    // Because __type__ can be set then.

    // Type is not on the prototype. It's on the class.
    // Meaning the dynamic can be wrapped too.

    // When getting an instance method, it should be applied to the object

    /*
    const A2 = new Proxy(A, {
      get (target, prop, receiver) {
        console.log('get', prop)
        return target[prop]
      },

      set (target, prop, value, receiver) {
        console.log('set', prop, value)
        target[prop] = value
        return true
      }
    })
    */

    D.__type__ = A

    console.log('f')
    D.f()

    console.log(D.n)

    const G = class { }
    console.log(G.name)
    console.log(G.toString())

    D.__type__ = G// class G { }

    console.log(D.n)
  })
})

// ------------------------------------------------------------------------------------------------
