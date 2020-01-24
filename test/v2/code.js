const { describe, it } = require('mocha')
const Package = require('../../lib/v2/code')

describe('Code', () => {
  it('test', () => {
    class A {}
    /*
    A.x = 1
    A.z = { m: { n: 'o' } }
    A.y = new Set()
    A.y.add('234')
    A.m = new Map()
    A.m.set('abc', 123)
    A.m.set({ n: 1 }, { n: 2 })
    A.u = Uint8Array.from([0x88])
    A.a = [1, 2, []]
    */

    // A.$m = 1
    // A.o = { $class: 'ref' }
    // A.err = [new WeakSet()]

    // A.func = () => {}

    // A.f = {}
    // A.g = { f2: A.f }
    // A.f.g2 = A.g

    class B { constructor () { this.n = 1 }}
    A.b = new B()

    // A.a = [1, 2, 3]
    // A.a2 = A.a
    // A.a3 = A.a

    const start = new Date()
    for (let i = 0; i < 10000; i++) {
      new Package(A) // eslint-disable-line
    }
    console.log((new Date() - start) / 10000)

    const p = new Package(A)
    console.log(p)
    console.log(p.deployables)
    // console.log(JSON.stringify(p, null, 2))
    // console.log(JSON.stringify(p))
  })
})
