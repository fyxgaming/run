/**
 * code.js
 *
 * Tests for code deployment, loading, and sandboxing.
 */

const { describe, it } = require('mocha')
// const { Run } = require('../config')
const Sandbox = require('@runonbitcoin/sandbox')
const { expect } = require('chai')

describe('Code', () => {
  it.only('c', async () => {
    class B {
      constructor () {
        console.log('B.constructor()')
      }

      checkInstanceOf (X) {
        return this instanceof X
      }

      checkConstructor (X) {
        return this.constructor === X
      }
    }

    const r = new Sandbox()
    const BC = r.makeCompartment()
    const BS = BC.evaluate(`var X=${B.toString()};X`)

    // const BProxy = B
    // const BProxy = proxyClass(B)
    const BProxy = proxyClass(BS)
    // const BProxy = BS

    class A extends BProxy {
      constructor (n) {
        super()
        this.n = n
        this.n = 2
      }
    }

    /**
 * Returns the source code for a class or function. This is generally type.toString(), however if
 * the type is a class and it extends another class, we make sure the parent class name in the
 * extends expression is the actual name of the parent class name because a lot of times the code
 * will be "class X extends SomeLibrary.Y" and what is deployed should be "class X extends Y"
 *
 * This may still return slightly different results. For example, node 8 and node 12 sometimes
 * have slightly different spacing. Howeve, functionally the code should be the same.
 */
    function getNormalizedSourceCode (type) {
      const code = type.toString()
      const parent = Object.getPrototypeOf(type)

      if (parent.prototype) {
        const classDef = /^class \S+ extends \S+ {/
        return code.replace(classDef, `class ${type.name} extends ${parent.name} {`)
      }

      return code
    }
    console.log('...')
    console.log(getNormalizedSourceCode(A))

    function proxyClass (T) {
      const H = {}
      const P = new Proxy(T, H)
      H.construct = (target, args, newTarget) => {
        console.log('P.construct', target.name, args)
        const t = Reflect.construct(target, args, newTarget)
        // const t = new target(...args)
        const h = {}
        const p = new Proxy(t, h)
        h.get = (target, prop) => {
          // console.log('GET', target, prop)
          if (prop === 'constructor') return P
          return target[prop]
        }
        h.setPrototypeOf = (target, prototype) => {
          // console.log('SET_PROTOTYPE_OF', target, prototype)
          Object.setPrototypeOf(target, prototype)
        }
        return p
      }
      return P
    }

    console.log('---')
    const AC = r.makeCompartment()
    console.log(BProxy.name)
    AC.global.B = BProxy
    console.log('---')
    const AS = AC.evaluate(`var X=${getNormalizedSourceCode(A)};X`)

    console.log('---')
    const AProxy = proxyClass(AS)
    console.log('---')

    const a = new AProxy(1)

    console.log(a) // A {}
    expect(a instanceof A).to.equal(false) // handled in Jig
    expect(a instanceof AProxy).to.equal(true)
    expect(a.constructor === A).to.equal(false)
    expect(a.constructor === AProxy).to.equal(true)
    expect(a instanceof B).to.equal(false) // handled in Jig
    expect(a instanceof BProxy).to.equal(true)
    expect(a.constructor === B).to.equal(false)
    expect(a.constructor === BProxy).to.equal(false)
    expect(a.checkInstanceOf(B)).to.equal(false) // handled in Jig
    expect(a.checkInstanceOf(BProxy)).to.equal(true)
    expect(a.checkConstructor(B)).to.equal(false)
    expect(a.checkConstructor(BProxy)).to.equal(false)
  })
})
