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
  })

  describe('__type__', () => {
    it('initially gets base type', () => {
      const D = new Dynamic()
      expect(typeof D.__type__).to.equal('function')
    })

    it('returns changed type', () => {
      const D = new Dynamic()
      class A { }
      D.__type__ = A
      expect(D.__type__).to.equal(A)
    })

    it('can change functions', () => {
      const D = new Dynamic()
      D.__type__ = function f () { }
      D.__type__ = function g () { }
      D.__type__ = function h () { }
      expect(D.name).to.equal('h')
    })

    it('can change classes', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      D.__type__ = class B { }
      D.__type__ = class C { }
      expect(D.name).to.equal('C')
    })

    it('can set class with extension', () => {
      const D = new Dynamic()
      class A { f () { } }
      class B extends A { }
      D.__type__ = B
      expect(D.name).to.equal('B')
      expect(typeof new D().f).to.equal('function')
    })

    it('cannot set to non-function', () => {
      const D = new Dynamic()
      const error = 'Inner type must be a function type'
      expect(() => { D.__type__ = 1 }).to.throw(error)
      expect(() => { D.__type__ = null }).to.throw(error)
      expect(() => { D.__type__ = undefined }).to.throw(error)
      expect(() => { D.__type__ = 'function' }).to.throw(error)
      expect(() => { D.__type__ = true }).to.throw(error)
    })

    it('cannot change classes to functions', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      expect(() => { D.__type__ = function f () { } }).to.throw()
    })

    it('cannot change functions to classes', () => {
      const D = new Dynamic()
      D.__type__ = function f () { }
      expect(() => { D.__type__ = class A { } }).to.throw()
    })

    it('cannot have __type__ property', () => {
      const D = new Dynamic()
      const error = '__type__ is a reserved property'
      class A { }
      A.__type__ = function f () { }
      expect(() => { D.__type__ = A }).to.throw(error)
      class B { static get __type__ () { } }
      expect(() => { D.__type__ = B }).to.throw(error)
      function f () { }
      f.__type__ = undefined
      expect(() => { D.__type__ = f }).to.throw(error)
      class C extends B { }
      expect(() => { D.__type__ = C }).to.throw(error)
    })

    it('cannot set anonymous types', () => {
      const D = new Dynamic()
      const error = 'Types must not be anonymous'
      const A = class { }
      expect(() => { D.__type__ = A }).to.throw(error)
      class B2 { }
      const B = class extends B2 { }
      expect(() => { D.__type__ = B }).to.throw(error)
      const f = function () { }
      expect(() => { D.__type__ = f }).to.throw(error)
      const g = () => { }
      expect(() => { D.__type__ = g }).to.throw(error)
    })

    it('cannot have toString static function', () => {
      const D = new Dynamic()
      const error = 'toString is a reserved property'
      class A { static toString () { } }
      expect(() => { D.__type__ = A }).to.throw(error)
      class B extends A { }
      expect(() => { D.__type__ = B }).to.throw(error)
    })

    it('cannot be non-extensible', () => {
      const D = new Dynamic()
      const error = 'Types must be extensible'
      class A { }
      Object.preventExtensions(A)
      expect(() => { D.__type__ = A }).to.throw(error)
      class B extends A {}
      expect(() => { D.__type__ = B }).to.throw(error)
    })
  })

  describe('apply', () => {
    it('can call changed functions', () => {
      const D = new Dynamic()
      function f () { return 1 }
      function g () { return 2 }
      D.__type__ = f
      expect(D()).to.equal(1)
      D.__type__ = g
      expect(D()).to.equal(2)
    })

    it('can call functions with custom thisArg', () => {
      const D = new Dynamic()
      function f () { return this.n }
      D.__type__ = f
      expect(Reflect.apply(D, { n: 1 }, [])).to.equal(1)
    })

    it('cannot call classes', () => {
      const D = new Dynamic()
      class A { }
      D.__type__ = A
      expect(() => D()).to.throw()
    })
  })

  describe('defineProperty', () => {
    it('defines on inner type', () => {
      const D = new Dynamic()
      class A { }
      D.__type__ = A
      Object.defineProperty(D, 'x', { value: 1 })
      expect(D.x).to.equal(1)
      expect(A.x).to.equal(1)
    })

    it('cannot define prototype', () => {
      const D = new Dynamic()
      class A { }
      D.__type__ = A
      expect(() => Object.defineProperty(D, 'prototype', { value: 123 })).to.throw()
      expect(D.prototype).not.to.equal(123)
    })

    it('cannot define __type__', () => {
      const D = new Dynamic()
      class A { }
      D.__type__ = A
      expect(() => Object.defineProperty(D, '__type__', { value: 123 })).to.throw()
      expect(D.__type__).to.equal(A)
    })

    it('cannot define toString', () => {
      const D = new Dynamic()
      class A { }
      D.__type__ = A
      expect(() => Object.defineProperty(D, 'toString', { value: 123 })).to.throw()
    })
  })

  describe('delete', () => {
    it('deletes on inner type', () => {
      const D = new Dynamic()
      class A { }
      A.n = 1
      D.__type__ = A
      delete D.n
      expect(A.n).to.equal(undefined)
    })

    it('cannot delete prototype', () => {
      const D = new Dynamic()
      class A { }
      D.__type__ = A
      delete D.prototype
      expect(D.prototype).not.to.equal(undefined)
    })

    it('cannot delete toString', () => {
      const D = new Dynamic()
      class A { }
      D.__type__ = A
      delete D.toString
      expect(D.toString).not.to.equal(undefined)
    })

    it('cannot delete __type__', () => {
      const D = new Dynamic()
      class A { }
      D.__type__ = A
      delete D.__type__
      expect(D.__type__).not.to.equal(undefined)
    })
  })

  describe('get', () => {
    it('should get basic property', () => {
      const D = new Dynamic()
      class A { }
      A.x = 1
      D.__type__ = A
      expect(A.x).to.equal(1)
    })

    it('should bind functions to dynamic', () => {
      const D = new Dynamic()
      class A { static f () { this.thisInF = this } }
      D.__type__ = A
      D.f()
      expect(D.thisInF).to.equal(D)
    })

    it('toString should be bound to inner type', () => {
      const D = new Dynamic()
      class A { }
      D.__type__ = A
      expect(D.toString()).to.equal(A.toString())
    })

    it('should get on child class', () => {
      class A { }
      class B extends A { }
      B.n = 2
      A.n = 1
      const DA = new Dynamic()
      DA.__type__ = A
      const DB = new Dynamic()
      DB.__type__ = B
      expect(DA.n).to.equal(1)
      expect(DB.n).to.equal(2)
    })
  })

  describe('getOwnPropertyDescriptor', () => {
    it('should get property descriptor of inner type', () => {
      const D = new Dynamic()
      class A { static f () { } }
      D.__type__ = A
      const descA = Object.getOwnPropertyDescriptor(A, 'f')
      const descD = Object.getOwnPropertyDescriptor(D, 'f')
      expect(descA.value).to.equal(A.f)
      expect(descA).to.deep.equal(descD)
    })

    it('should get property descriptor of child class', () => {
      class A { static f () { }}
      class B extends A { static f () { } }
      const DA = new Dynamic()
      DA.__type__ = A
      const DB = new Dynamic()
      DB.__type__ = B
      const descA = Object.getOwnPropertyDescriptor(A, 'f')
      const descB = Object.getOwnPropertyDescriptor(B, 'f')
      const descDA = Object.getOwnPropertyDescriptor(DA, 'f')
      const descDB = Object.getOwnPropertyDescriptor(DB, 'f')
      expect(descA.value).to.equal(A.f)
      expect(descB.value).to.equal(B.f)
      expect(descA).to.deep.equal(descDA)
      expect(descB).to.deep.equal(descDB)
      expect(descA).not.to.deep.equal(descB)
      expect(descDA).not.to.deep.equal(descDB)
    })
  })

  describe('getPrototypeOf', () => {
    it('should return inner type parent', () => {
      class A { }
      class B extends A { }
      const D = new Dynamic()
      D.__type__ = B
      expect(Object.getPrototypeOf(D)).to.equal(A)
    })

    it('should return Function.prototype for base functions', () => {
      const D = new Dynamic()
      D.__type__ = function f () { }
      expect(Object.getPrototypeOf(D)).to.equal(Function.prototype)
    })
  })

  describe('has', () => {
    it('returns has on the inner type', () => {
      const D = new Dynamic()
      D.n = 1
      expect('n' in D).to.equal(true)
      D.__type__ = class A { }
      expect('n' in D).to.equal(false)
    })
  })

  describe('ownKeys', () => {
    it('returns own keys on the inner type', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      D.n = 1
      expect(Object.getOwnPropertyNames(D).includes('n')).to.equal(true)
    })
  })

  describe('preventExtensions', () => {
    it('cannot prevent extensions', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      expect(() => Object.preventExtensions(D)).to.throw()
      expect(Object.isExtensible(D)).to.equal(true)
    })
  })

  describe('prototype', () => {
    it('should always return base prototype', () => {
      const D = new Dynamic()
      const basePrototype = D.prototype
      D.__type__ = class A {}
      expect(D.prototype).to.equal(basePrototype)
    })

    it('should have prototypes of parents', () => {
      const D = new Dynamic()
      class A {}
      class B extends A {}
      class C extends B { }
      D.__type__ = C
      expect(D.prototype instanceof A).to.equal(true)
      expect(D.prototype instanceof B).to.equal(true)
    })

    it('prototype properties cannot be set', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      D.prototype.x = 1
      expect(D.prototype.x).to.equal(undefined)
    })

    it('prototype properties cannot be defined', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      expect(() => Object.defineProperty(D.prototype, 'x', { value: 1 })).to.throw()
      expect(D.prototype.x).to.equal(undefined)
    })

    it('prototype prototype cannot be changed', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      const protoproto = Object.getPrototypeOf(D.prototype)
      expect(() => Object.setPrototypeOf(D.prototype, {})).to.throw()
      expect(Object.getPrototypeOf(D.prototype)).to.equal(protoproto)
    })
  })

  describe('method table', () => {
    it('method table properties cannot be set', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      const protoproto = Object.getPrototypeOf(D.prototype)
      protoproto.x = 1
      expect(protoproto.x).to.equal(undefined)
    })

    it('method table properties cannot be defined', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      const protoproto = Object.getPrototypeOf(D.prototype)
      expect(() => Object.defineProperty(protoproto, 'x', { value: 1 })).to.throw()
      expect(protoproto.x).to.equal(undefined)
    })

    it('method table properties cannot be deleted', () => {
      const D = new Dynamic()
      D.__type__ = class A { f () { } }
      const protoproto = Object.getPrototypeOf(D.prototype)
      delete protoproto.f
      expect(typeof protoproto.f).to.equal('function')
    })

    it('method table prototype cannot be changed', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      const protoproto = Object.getPrototypeOf(D.prototype)
      const protoprotoproto = Object.getPrototypeOf(protoproto)
      expect(() => Object.setPrototypeOf(protoproto, {})).to.throw()
      expect(Object.getPrototypeOf(protoproto)).to.equal(protoprotoproto)
    })

    it('method table prototype cannot be made unextensible', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      const protoproto = Object.getPrototypeOf(D.prototype)
      expect(() => Object.preventExtensions(protoproto)).to.throw()
      expect(Object.isExtensible(protoproto)).to.equal(true)
    })
  })

  describe('set', () => {
    it('sets on inner type', () => {
      const D = new Dynamic()
      class A { }
      D.__type__ = A
      D.n = 1
      expect(A.n).to.equal(1)
    })

    it('old properties are not on new type', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      D.n = 1
      D.__type__ = class B { }
      expect(D.n).to.equal(undefined)
    })

    it('cannot set prototype', () => {
      const D = new Dynamic()
      class A { }
      D.__type__ = A
      D.prototype = 123
      expect(D.prototype).not.to.equal(123)
      expect(A.prototype).not.to.equal(123)
    })

    it('cannot set toString', () => {
      const D = new Dynamic()
      class A { }
      D.__type__ = A
      D.toString = 123
      expect(D.toString).not.to.equal(123)
    })
  })

  describe('setPrototypeOf', () => {
    it('cannot change prototype', () => {
      const D = new Dynamic()
      class A { }
      D.__type__ = A
      const proto = Object.getPrototypeOf(A)
      expect(() => Object.setPrototypeOf(D, class B { })).to.throw()
      expect(Object.getPrototypeOf(D)).to.equal(proto)
    })
  })

  describe('instance', () => {
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
      D.__type__ = class A { }
      const d = new D()
      expect(d.constructor).to.equal(D)
    })

    it('has same constructor as dynamic after type change', () => {
      const D = new Dynamic()
      D.__type__ = class A { }
      const d = new D()
      D.__type__ = class B {}
      expect(d.constructor).to.equal(D)
    })

    it('can set dynamic class properties', () => {
      const D = new Dynamic()
      D.__type__ = class A { f () { this.constructor.n = 1 } }
      const d = new D()
      d.f()
      expect(D.n).to.equal(1)
    })

    it('can call methods that set on instance', () => {
      const D = new Dynamic()
      D.__type__ = class A { f () { this.n = 1 } }
      const d = new D()
      d.f()
      expect(d.n).to.equal(1)
    })

    it('can call methods that define properties on instance', () => {
      const D = new Dynamic()
      D.__type__ = class A { f () { Object.defineProperty(this, 'n', { value: 1 }) } }
      const d = new D()
      d.f()
      expect(d.n).to.equal(1)
    })

    it('can call methods that delete on instance', () => {
      const D = new Dynamic()
      D.__type__ = class A { f () { delete this.n } }
      const d = new D()
      d.n = 1
      expect(d.n).to.equal(1)
      d.f()
      expect(d.n).to.equal(undefined)
    })
  })

  describe('extends', () => {
    it('can call instance methods that set', () => {
      const DA = new Dynamic()
      DA.__type__ = class A { f () { this.n = 1 } }
      const DB = new Dynamic()
      DB.__type__ = class B extends DA { g () { this.m = 2 }}
      const b = new DB()
      b.f()
      b.g()
      expect(b.n).to.equal(1)
      expect(b.m).to.equal(2)
    })

    it('cannot change prototypes', () => {
      const DA = new Dynamic()
      DA.__type__ = class A { }
      const DB = new Dynamic()
      DB.__type__ = class B extends DA { }
      Object.getPrototypeOf(DA.prototype).x = 1
      expect(Object.getPrototypeOf(DA.prototype).x).to.equal(undefined)
      Object.getPrototypeOf(DB.prototype).y = 2
      expect(Object.getPrototypeOf(DB.prototype).y).to.equal(undefined)
    })

    it('instances are from both child and parent class', () => {
      const DA = new Dynamic()
      DA.__type__ = class A { f () { this.n = 1 } }
      const DB = new Dynamic()
      DB.__type__ = class B extends DA { g () { this.m = 2 }}
      const b = new DB()
      expect(b instanceof DB).to.equal(true)
      expect(b instanceof DA).to.equal(true)
    })

    it('toString is correct for child class', () => {
      const DA = new Dynamic()
      DA.__type__ = class A { }
      const DB = new Dynamic()
      DB.__type__ = class B extends DA { }
      const DC = new Dynamic()
      DC.__type__ = class C extends DA { }
      expect(DA.toString().startsWith('class A')).to.equal(true)
      expect(DB.toString().startsWith('class B')).to.equal(true)
      expect(DC.toString().startsWith('class C')).to.equal(true)
    })
  })

  it.skip('proxy2', () => {
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

  it.skip('inside another proxy', () => {
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

  describe.skip('_setInnerType', () => {
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
})

// ------------------------------------------------------------------------------------------------
