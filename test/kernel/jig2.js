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
    class A { }

    const PROTOTYPE_HACK = {
        x: 1
    }

    const PROTOTYPE_HACK_PROXY = new Proxy(PROTOTYPE_HACK, {
        set(target, prop, value) {
            return false
        }
    })

    Object.setPrototypeOf(A.prototype, PROTOTYPE_HACK_PROXY)

    // Proxy A, as if it were real
    const APROXY_HANDLER = { }
    const APROXY = new Proxy(A, APROXY_HANDLER)
    A.prototype.constructor = APROXY

    // freeze will make setPrototypeOf fail
    Object.freeze(A.prototype)
    // Object.setPrototypeOf(A.prototype, {})

    // Good, we've hijacked A's prototype
    // We can use this to add methods
    PROTOTYPE_HACK.f = () => { }

    // But now PROTOTYPE_HACK is changable. make that not?
    // Good. Now I have a proxy I control, to se the proxy for A.
    // I can remove all properties of A.prototype.
    // Set them on the parent.
    // Constructor can be the proxy

    console.log(A.prototype.x)

    const a = new APROXY()
    console.log(a.f)
    console.log(a.constructor === APROXY && a.constructor !== A)
    console.log(Object.getPrototypeOf(a) === A.prototype)


    // So to upgrade a class, I get its prototype
    // Apply the prototype to our hack'ed prototype in full
    // This gives you every function
    
    class B { g() { return 33 } }

    // Upgrade
    // Object.assign(PROTOTYPE_HACK, B.prototype)
    // Object.getOwnPropertyNames(B.prototype).forEach(method => {
        // PROTOTYPE_HACK[method] = B.prototype[method]
    // })

    // What about parents?

    // To-string

    APROXY_HANDLER.get = (target, prop) => {
        if (prop === 'upgrade') {
            return T => {

    Object.assign(PROTOTYPE_HACK, T.prototype)
    Object.getOwnPropertyNames(T.prototype).forEach(method => {
        PROTOTYPE_HACK[method] = T.prototype[method]
    })

            }
        }
        return target[prop]
    }

    APROXY.upgrade(B)

    console.log(a.g())


    const A2 = a.constructor
    const a2 = new A2()
    console.log(a2.g())
  })
})

// ------------------------------------------------------------------------------------------------
