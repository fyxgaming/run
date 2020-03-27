/**
 * code.js
 *
 * Tests for code deployment, loading, and sandboxing.
 */

const { describe, it } = require('mocha')
const { Run } = require('../config')
const Sandbox = require('@runonbitcoin/sandbox')

describe('Code', () => {
  it.only('a', async () => {
    class A {
      constructor(n) {
        console.log(`A.constructor(${n})`)
        this.n
      }
    }

    function proxyClass(T) {
      const H = {}
      let P = new Proxy(T, H)
      H.construct = (target, args, newTarget) => {
        console.log('P.construct', args)
        const t = new target(...args)
        const h = {}
        const p = new Proxy(t, h)
        h.get = (target, prop) => {
          if (prop === 'constructor') return P
          return target[prop]
        }
        return p
      }
      return P
    }

    const AProxy = proxyClass(A)

    const a = new AProxy(1)

    console.log(a) // A {}
    console.log(a instanceof A) // true
    console.log(a instanceof AProxy) // true
    console.log(a.constructor === A) // false
    console.log(a.constructor === AProxy) // true
  })

  it('should deploy', async () => {
    
    class Jig { }

    class A extends Jig {
      constructor(n) {
        super()
        this.n = n
      }
    }

    const r = new Sandbox()

    function proxyClass(T) {
      const name = T.name
      let handler = {}
      let P = new Proxy(T, handler)

      handler.construct = (target, args, newTarget) => {
        console.log('CONSTRUCTING', name, 'WITH', args, target.name, newTarget.name)

        const t = new target(...args)

        // Object.setPrototypeOf(t, Object.getPrototypeOf(newTarget))

        /*
        return new Proxy(t, {
          get: (t, p) => {
            if (p === 'constructor') return P
            return t[p]
          },

          getPrototypeOf(target) {
            console.log('GET PROTOTYPE OF OBJECT', JSON.stringify(t))
            const result = Object.getPrototypeOf(target)
            console.log('RESULT', result)
            return result
          }
        })
        */
       return t
      }

      handler.getPrototypeOf = (target) => {
        console.log('GET PROTOTYPE OF CLASS', name)
        return Object.getPrototypeOf(T)
      }

      handler.get = (t, p) => {
        // console.log('GET', p, 'on', name)

        if (p === 'location') return 'LOCATION'

        if (p === Symbol.hasInstance) {
          return function (target) {
            console.log('hasInstance', JSON.stringify(target), this)
            let U = Object.getPrototypeOf(target)
            while (U) {
              console.log('PROTOTYPE', U)
              if (U === P.prototype) return true
              U = Object.getPrototypeOf(U)
            }
            return false
          }
        }

        return t[p]
      }

      return P
    }

    const cJig = r.makeCompartment()
    const JigS = cJig.evaluate(`var C=${Jig.toString()};C`)
    const JigP = proxyClass(JigS)
    // const JigP = JigS

    const cA = r.makeCompartment()
    cA.global.Jig = JigP
    const AS = cA.evaluate(`var C=${A.toString()};C`)
    const AP = proxyClass(AS)
    // const AP = AS

    console.log(AP.location)

    const a = new AP(1)
    console.log('---')
    console.log(a)
    console.log('---')
    console.log(a.constructor)
    console.log('---')

    console.log(a instanceof JigP) // true
    console.log(a instanceof AP) // true
    console.log(a instanceof A) // true
    console.log(a.constructor === AP) // true
    console.log(a.constructor === A) // false

    /*
    const run = new Run({ logger: console })
    // await run.deploy(function render () { return 1 })
    class Monster {}
    await run.deploy(class Dragon extends Monster {})
    */

    // await run.deploy(x => x)
    // await run.deploy(class {})

    // TODO: Detect undeployable
    // await run.deploy('class A { }')

    // class B { }
    // B.locationMocknet = '123'
    // await run.deploy(B)
  })
})
