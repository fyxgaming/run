/**
 * jig.js
 *
 * Tests for lib/kernel/jig.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../env/config')
const { unmangle } = require('../env/unmangle')
const JigHandler = unmangle(Run)._JigHandler

// ------------------------------------------------------------------------------------------------
// JigHandler
// ------------------------------------------------------------------------------------------------

describe('JigHandler', () => {
  it('should test', () => {
    class A { }
    const A2 = unmangle(JigHandler)._createProxy(A)
    const a = new A2()
    expect(a instanceof A).to.equal(true)
    expect(a instanceof A2).to.equal(true)
    expect(a.constructor).not.to.equal(A)
    expect(a.constructor).to.equal(A2)

    Object.freeze(A2.prototype)
    A2.prototype.x = 1
    console.log(A2.prototype)
    console.log(a.x)

    // Check that sandbox is frozen too
    // Object.freeze(A2)
    // console.log(A2.prototype.constructor)
    A2.prototype.constructor.y = 5
    // Object.getPrototypeOf(A2.prototype).y = 4
    console.log(A2.y)

    // Change the A2 class
    class B { f () { } }
    console.log('s', A2.toString())
    A2.upgrade(B)
    console.log(B.prototype.f)
    console.log(A2.prototype.f)
    console.log(a.f)
    console.log('s', A2.toString())
  })

  it.only('test upgrade', () => {
    // For a refresher on prototypes
    // See section 2.2.1 in https://2ality.com/2015/02/es6-classes-final.html

    // Create two classes, A1 and A2. We will upgrade A1 into A2.

    const A1 = class A {
      f () { return 'f1' }
      g () { return 'g1' }
    }

    const A2 = class A {
      g () { return 'g2' }
      h () { return 'h2' }
    }

    // Completely hijack A's proxy. This should be done on a sandbox.
    // Although we should freeze originals too, to be safe.

    const methodTable = { }

    const methods = Object.getOwnPropertyNames(A1.prototype)

    // Static methods, checks. Not methods.
    // if (methods.includes('upgrade')) throw new Error('upgrade() must not be defined')
    // if (methods.includes('sync')) throw new Error('sync() must not be defined')
    // if (methods.includes('destroy')) throw new Error('destroy() must not be defined')

    methods.forEach(name => {
      const desc = Object.getOwnPropertyDescriptor(A1.prototype, name)
      Object.defineProperty(methodTable, name, desc)
      delete A1.prototype[name]
    })

    const methodAPI = new Proxy(methodTable, {
      set (target, prop, value) {
        return false
      }
    })

    const protoproto = Object.getPrototypeOf(A1.prototype)
    Object.setPrototypeOf(methodTable, protoproto)
    Object.setPrototypeOf(A1.prototype, methodAPI)

    // TODO: Deep freeze method table properties too
    Object.freeze(A1.prototype)

    // Proxy A, as if it were real
    const APROXY_HANDLER = { }
    const APROXY = new Proxy(A1, APROXY_HANDLER)
    methodTable.constructor = APROXY

    // freeze will make setPrototypeOf fail
    // Object.setPrototypeOf(A.prototype, {})

    // Good, we've hijacked A's prototype
    // We can use this to add methods
    // PROTOTYPE_HACK.f = () => { }

    // But now PROTOTYPE_HACK is changable. make that not?
    // Good. Now I have a proxy I control, to se theproxy for A.
    // I can remove all properties of A.prototype.
    // Set them on the parent.
    // Constructor can be the proxy

    const a = new APROXY()
    console.log(a.constructor === APROXY && a.constructor !== A1)
    console.log(Object.getPrototypeOf(a) === A1.prototype)

    // To-string

    APROXY_HANDLER.get = (target, prop) => {
      if (prop === 'upgrade') {
        return T => {
          // Clear the method table
          Object.getOwnPropertyNames(methodTable).forEach(name => { delete methodTable[name] })

          // Install T...

          Object.getOwnPropertyNames(T.prototype).forEach(name => {
            const desc = Object.getOwnPropertyDescriptor(T.prototype, name)
            Object.defineProperty(methodTable, name, desc)
          })

          methodTable.constructor = APROXY

        //   console.log(Object.getOwnPropertyNames(methodTable))
          //   const props = Object.getOwnPropertyDescriptors(T.prototype)
        //   Object.defineProperties(methodTable, T.prototype)
        }
      }
      return target[prop]
    }

    APROXY.upgrade(A2)

    // await APROXY.sync()
    // APROXY.x = 5

    // Can upgrade change the name? No

    // Destroy stops all further upgrades
    // What is its final location then? An input? A virtual output?
    // And is destroy the right name? Or unlink? seal?

    console.log(a.g())

    const AC = a.constructor
    const a2 = new AC()
    console.log(a2.g())
  })
})

// ------------------------------------------------------------------------------------------------
