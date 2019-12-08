const { createRun, hookPay, Jig, Run, getObfuscatedKey } = require('./test-util')

const installsKey = getObfuscatedKey('installs')

const run = createRun()

beforeEach(() => { run.activate(); Run.code.flush() })
beforeEach(() => run.blockchain.block())

describe('Code', () => {
  describe('deploy', () => {
    test('basic class', async () => {
      class A { }
      await run.deploy(A)
      expect(A.location).not.toBeUndefined()
      expect(A.location).toBe(A.origin)
      expect(A.originMocknet).toBe(A.origin)
      expect(A.locationMocknet).toBe(A.origin)
      expect(A.owner).toBe(run.owner.pubkey)
      expect(A.ownerMocknet).toBe(run.owner.pubkey)
    })

    test('detects previous installs', async () => {
      class A { }
      const loc = await run.deploy(A)
      expect(loc).toBe(await run.deploy(A))
    })

    test('functions', async () => {
      function f (a, b) { return a + b }
      const loc = await run.deploy(f)
      expect(f.origin).toBe(loc)
      expect(f.location).toBe(loc)
    })

    test('throws for non-deployables', async () => {
      await expect(run.deploy(2)).rejects.toThrow()
      await expect(run.deploy('abc')).rejects.toThrow()
      await expect(run.deploy({ n: 1 })).rejects.toThrow()
      await expect(run.deploy(Math.random)).rejects.toThrow()
    })

    test('throws if parent dep is different', async () => {
      class C { }
      class B { }
      class A extends B { }
      A.deps = { B: C }
      await expect(run.deploy(A)).rejects.toThrow('unexpected parent dependency B')
    })

    test('does not throw if parent dep is its sandbox', async () => {
      class B { }
      const B2 = await run.load(await run.deploy(B))
      class A extends B { }
      A.deps = { B: B2 }
      await run.deploy(A)
    })

    test('deploys parents', async () => {
      class Grandparent { }
      class Parent extends Grandparent { f () { this.n = 1 } }
      class Child extends Parent { f () { super.f(); this.n += 1 } }
      const Child2 = await run.load(await run.deploy(Child))
      const child = new Child2()
      child.f()
      expect(child.n).toBe(2)
      expect(run.constructor.code[installsKey].has(Parent)).toBe(true)
      expect(run.constructor.code[installsKey].has(Grandparent)).toBe(true)
      expect(Child2.deps).toEqual({ Parent: await run.load(Parent.origin) })
    })

    test('deploys dependencies', async () => {
      class A { createB () { return new B() } }
      class B { constructor () { this.n = 1 } }
      A.deps = { B }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().createB().n).toBe(1)
    })

    test('does not have parent deps as deps', async () => {
      function f () { }
      class A { callF () { f() } }
      A.deps = { f }
      class B extends A { callF2 () { f() } }
      const B2 = await run.load(await run.deploy(B))
      const b = new B2()
      expect(() => b.callF()).not.toThrow()
      expect(() => b.callF2()).toThrow()
    })

    test('dependency instances are expected', async () => {
      class B { }
      class A {
        bInstanceofB () { return new B() instanceof B }

        bPrototype () { return Object.getPrototypeOf(new B()) }

        nameOfB () { return B.name }
      }
      A.deps = { B }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().nameOfB()).toBe('B')
      const B2 = await run.load(await run.deploy(B))
      expect(new A2().bPrototype()).toBe(B2.prototype)
    })

    test('rename dependencies', async () => {
      class A { createB() { return new B() } } // eslint-disable-line
      class C { constructor () { this.n = 1 } }
      A.deps = { B: C }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().createB().n).toBe(1)
    })

    test('throw for undefined dependencies', async () => {
      class B { }
      class A { createB () { return new B() } }
      const A2 = await run.load(await run.deploy(A))
      expect(() => new A2().createB()).toThrow('B is not defined')
    })

    test('circular dependencies', async () => {
      class A { createB () { return new B() } }
      class B { createA () { return new A() } }
      A.deps = { B }
      B.deps = { A }
      const A2 = await run.load(await run.deploy(A))
      const B2 = await run.load(await run.deploy(B))
      expect(new A2().createB()).toBeInstanceOf(B2)
      expect(new B2().createA()).toBeInstanceOf(A2)
    })

    test('temporary origins and locations before sync', async () => {
      class B { }
      class A { }
      A.deps = { B }
      const locationPromise = run.deploy(A)
      expect(B.origin).toBeUndefined()
      expect(A.origin).toBeUndefined()
      expect(B.location).toBeUndefined()
      expect(A.location).toBeUndefined()
      expect(B.originMocknet).toBe('_d1')
      expect(A.originMocknet).toBe('_d0')
      expect(B.locationMocknet).toBe('_d1')
      expect(A.locationMocknet).toBe('_d0')
      const location = await locationPromise
      expect(location.startsWith('_')).toBe(false)
      expect(B.origin.startsWith('_')).toBe(false)
      expect(A.origin.startsWith('_')).toBe(false)
      expect(B.location.startsWith('_')).toBe(false)
      expect(A.location.startsWith('_')).toBe(false)
      expect(B.originMocknet.startsWith('_')).toBe(false)
      expect(A.originMocknet.startsWith('_')).toBe(false)
      expect(B.locationMocknet.startsWith('_')).toBe(false)
      expect(A.locationMocknet.startsWith('_')).toBe(false)
    })

    test('batch', async () => {
      class A { }
      class B { }
      class C { }
      run.transaction.begin()
      run.deploy(A)
      run.deploy(B)
      run.deploy(C)
      run.transaction.end()
      expect(A.origin).toBeUndefined()
      expect(B.origin).toBeUndefined()
      expect(C.origin).toBeUndefined()
      expect(A.location).toBeUndefined()
      expect(B.location).toBeUndefined()
      expect(C.location).toBeUndefined()
      expect(A.originMocknet).toBe('_d0')
      expect(B.originMocknet).toBe('_d1')
      expect(C.originMocknet).toBe('_d2')
      expect(A.locationMocknet).toBe('_d0')
      expect(B.locationMocknet).toBe('_d1')
      expect(C.locationMocknet).toBe('_d2')
      await run.sync()
      const txid = A.origin.split('_')[0]
      expect(A.origin.startsWith(txid)).toBe(true)
      expect(B.origin.startsWith(txid)).toBe(true)
      expect(C.origin.startsWith(txid)).toBe(true)
      expect(A.location.startsWith(txid)).toBe(true)
      expect(B.location.startsWith(txid)).toBe(true)
      expect(C.location.startsWith(txid)).toBe(true)
      expect(A.originMocknet.startsWith(txid)).toBe(true)
      expect(B.originMocknet.startsWith(txid)).toBe(true)
      expect(C.originMocknet.startsWith(txid)).toBe(true)
      expect(A.locationMocknet.startsWith(txid)).toBe(true)
      expect(B.locationMocknet.startsWith(txid)).toBe(true)
      expect(C.locationMocknet.startsWith(txid)).toBe(true)
    })

    test('queued', async () => {
      class A { }
      class B { }
      run.deploy(A)
      run.deploy(B)
      await run.sync()
      expect(A.origin.split('_')[0]).not.toBe(B.origin.split('_')[0])
      expect(A.location.split('_')[0]).not.toBe(B.location.split('_')[0])
    })

    test('fail ', async () => {
      hookPay(run, false)
      class A { }
      await expect(run.deploy(A)).rejects.toThrow()
      expect(A.origin).toBeUndefined()
      expect(A.location).toBeUndefined()
      expect(A.originMocknet).toBeUndefined()
      expect(A.locationMocknet).toBeUndefined()
    })

    test('queued fail', async () => {
      hookPay(run, true, false)
      class A { }
      class B { }
      run.deploy(A).catch(e => {})
      run.deploy(B).catch(e => {})
      expect(A.origin).toBeUndefined()
      expect(B.origin).toBeUndefined()
      expect(A.location).toBeUndefined()
      expect(B.location).toBeUndefined()
      expect(A.originMocknet.startsWith('_')).toBe(true)
      expect(B.originMocknet.startsWith('_')).toBe(true)
      expect(A.locationMocknet.startsWith('_')).toBe(true)
      expect(B.locationMocknet.startsWith('_')).toBe(true)
      await expect(run.sync()).rejects.toThrow('tx has no inputs')
      expect(A.origin.endsWith('_o1')).toBe(true)
      expect(A.originMocknet.endsWith('_o1')).toBe(true)
      expect(B.origin).toBeUndefined()
      expect(B.originMocknet).toBeUndefined()
      expect(A.location.endsWith('_o1')).toBe(true)
      expect(A.locationMocknet.endsWith('_o1')).toBe(true)
      expect(B.location).toBeUndefined()
      expect(B.locationMocknet).toBeUndefined()
    })

    test('to testnet', async () => {
      const run = createRun({ network: 'test' })
      class C { g () { return 1 } }
      class B { }
      class A extends B {
        f () { return 1 }

        createC () { return new C() }
      }
      A.deps = { B, C }
      await run.deploy(A)
      expect(A.origin.split('_')[0].length).toBe(64)
      expect(B.origin.split('_')[0].length).toBe(64)
      expect(C.origin.split('_')[0].length).toBe(64)
      expect(A.originTestnet.split('_')[0].length).toBe(64)
      expect(B.originTestnet.split('_')[0].length).toBe(64)
      expect(C.originTestnet.split('_')[0].length).toBe(64)
      expect(A.origin.endsWith('_o2')).toBe(true)
      expect(B.origin.endsWith('_o1')).toBe(true)
      expect(C.origin.endsWith('_o3')).toBe(true)
      expect(A.originTestnet.endsWith('_o2')).toBe(true)
      expect(B.originTestnet.endsWith('_o1')).toBe(true)
      expect(C.originTestnet.endsWith('_o3')).toBe(true)
      expect(A.location.split('_')[0].length).toBe(64)
      expect(B.location.split('_')[0].length).toBe(64)
      expect(C.location.split('_')[0].length).toBe(64)
      expect(A.locationTestnet.split('_')[0].length).toBe(64)
      expect(B.locationTestnet.split('_')[0].length).toBe(64)
      expect(C.locationTestnet.split('_')[0].length).toBe(64)
      expect(A.location.endsWith('_o2')).toBe(true)
      expect(B.location.endsWith('_o1')).toBe(true)
      expect(C.location.endsWith('_o3')).toBe(true)
      expect(A.locationTestnet.endsWith('_o2')).toBe(true)
      expect(B.locationTestnet.endsWith('_o1')).toBe(true)
      expect(C.locationTestnet.endsWith('_o3')).toBe(true)
      // console.log('origin', A.originTestnet)
      // console.log('owner', A.ownerTestnet)
    })

    test('standard library', async () => {
      const run = createRun({ network: 'test' })
      class A { }
      await run.deploy(A)
      delete A.location
      delete A.origin
      const run2 = createRun({ network: 'test' })
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      const location = await run2.deploy(A)
      expect(A.origin).toBe(A.originTestnet)
      expect(A.location).toBe(A.locationTestnet)
      expect(location).toBe(A.locationTestnet)
    })

    test('standard library origin only', async () => {
      const run = createRun({ network: 'main' })
      class A { }
      await run.deploy(A)
      delete A.location
      delete A.origin
      const run2 = createRun({ network: 'main' })
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      const location = await run2.deploy(A)
      expect(A.origin).toBe(A.originMainnet)
      expect(A.location).toBe(A.originMainnet)
      expect(location).toBe(A.locationMainnet)
    })

    test('standard library location only', async () => {
      const run = createRun({ network: 'test' })
      class A { }
      await run.deploy(A)
      delete A.location
      delete A.origin
      delete A.originTestnet
      const run2 = createRun({ network: 'test' })
      run2.blockchain.broadcast = () => { throw new Error('unexpected broadcast') }
      const location = await run2.deploy(A)
      expect(A.origin).toBeUndefined()
      expect(A.location).toBe(A.locationTestnet)
      expect(location).toBe(A.locationTestnet)
    })
  })

  describe('load', () => {
    test('from cached', async () => {
      class A { f () { return 1 } }
      const A2 = await run.load(await run.deploy(A))
      expect(await run.load(A.origin)).toBe(A2)
    })

    test('from mockchain cached', async () => {
      class A { f () { return 1 } }
      const A2 = await run.load(await run.deploy(A))
      const run2 = createRun({ blockchain: run.blockchain })
      const A3 = await run2.load(A.origin)
      expect(A2).toBe(A3)
    })

    test('from mockchain uncached', async () => {
      class A { f () { return 1 } }
      const A2 = await run.load(await run.deploy(A))
      Run.code.flush()
      const run2 = createRun({ blockchain: run.blockchain })
      const A3 = await run2.load(A.origin)
      expect(A2.owner).toBe(run.owner.pubkey)
      expect(A2.owner).toBe(A2.ownerMocknet)
      expect(A3.owner).toBe(A2.owner)
    })

    test('from testnet', async () => {
      const run = createRun({ network: 'test' })
      // TODO: do automatically
      // generate this from the 'to testnet' test above
      const loc = '04b294f5d30daf37f075869c864a40a03946fc2b764d75c47f276908445b3bf4_o2'
      const A = await run.load(loc)
      expect(A.origin).toBe(loc)
      expect(A.location).toBe(loc)
      expect(A.originTestnet).toBe(loc)
      expect(A.locationTestnet).toBe(loc)
      expect(A.owner).toBe('0302c77434fa976a6d3932c2a337ebd825fe9152df2d34d08af13bf7c35189a527')
      expect(A.ownerTestnet).toBe('0302c77434fa976a6d3932c2a337ebd825fe9152df2d34d08af13bf7c35189a527')
      expect(new A().f()).toBe(1)
      expect(new A().createC().g()).toBe(1)
    })

    test('temporary location throws', async () => {
      class A { f () { return 1 } }
      run.deploy(A).catch(e => {})
      await expect(run.load(A.locationMocknet)).rejects.toThrow()
    })

    test('functions', async () => {
      function f (a, b) { return a + b }
      const f2 = await run.load(await run.deploy(f))
      expect(f(1, 2)).toBe(f2(1, 2))
    })

    test('load after deploy with preset', async () => {
      // get a location
      class A { }
      await run.deploy(A)
      // clear the code, but A.location will be set
      Run.code.flush()
      // deploy the same code again
      const run2 = createRun({ blockchain: run.blockchain })
      await run2.deploy(A)
      // find the sandbox directly, without using load, because we want to make sure deploy works correctly.
      // and using load, make sure the sandboxes are the same
      expect(Run.code[installsKey].get(A)).toBe(await run2.load(A.location))
    })

    test('dependencies in different transactions', async () => {
      class A {}
      class B extends A {}
      class C {}
      C.B1 = B
      C.B2 = B
      run.deploy(A)
      run.deploy(B)
      run.deploy(C)
      await run.sync()
      Run.code.flush()
      await run.load(C.location)
    })
  })

  describe('static props', () => {
    test('circular props', async () => {
      class A extends Jig { }
      class B extends Jig { }
      A.B = B
      B.A = A
      await run.deploy(A)
      Run.code.flush()
      const A2 = await run.load(A.location)
      const B2 = await run.load(B.location)
      expect(A2.B).toBe(B2)
      expect(B2.A).toBe(A2)
    })

    test('deploy then load', async () => {
      class J extends Jig {}
      class K extends Jig {}
      class C { }
      class B { }
      class A extends B { }
      A.deps = { C }
      A.n = 1
      A.s = 'a'
      A.a = [1, 2, 3]
      A.b = true
      A.x = null
      A.o = { m: 1, n: '2' }
      A.j = new J()
      A.k = [new K()]
      class D { }
      A.D = D
      A.E = class E { }
      A.F = { R: class R { } }
      A.Self = A
      A.G = function g () { return 1 }
      await run.deploy(A)
      expect(D.origin.length > 66 && D.location.length > 66).toBe(true)
      expect(A.E.origin.length > 66 && A.E.location.length > 66).toBe(true)
      expect(A.F.R.origin.length > 66 && A.F.R.location.length > 66).toBe(true)
      const run2 = createRun({ blockchain: run.blockchain })
      const checkAllProperties = async T => {
        expect(T.n).toEqual(A.n)
        expect(T.s).toEqual(A.s)
        expect(T.a).toEqual(A.a)
        expect(T.b).toEqual(A.b)
        expect(T.x).toEqual(A.x)
        expect(T.o).toEqual(A.o)
        expect(T.j.origin).toBe(A.j.origin)
        expect(T.j.location).toBe(A.j.location)
        expect(T.k[0].origin).toBe(A.k[0].origin)
        expect(T.k[0].location).toBe(A.k[0].location)
        const D2 = await run2.load(A.D.origin)
        expect(T.D).toBe(D2)
        const E2 = await run2.load(A.E.origin)
        expect(T.E).toBe(E2)
        const R2 = await run2.load(A.F.R.origin)
        expect(T.F.R).toBe(R2)
        const B2 = await run2.load(B.origin)
        const C2 = await run2.load(C.origin)
        expect(T.deps).toEqual({ B: B2, C: C2 })
        expect(T.Self).toBe(T)
        const G2 = await run2.load(A.G.origin)
        expect(T.G).toBe(G2)
      }
      await checkAllProperties(await run2.load(A.origin))
      Run.code.flush()
      await checkAllProperties(await run2.load(A.origin))
    })

    test('bad deps', async () => {
      class B { }
      class A extends Jig { }
      A.deps = [B]
      await expect(run.deploy(A)).rejects.toThrow('deps must be an object')
      A.deps = B
      await expect(run.deploy(A)).rejects.toThrow('deps must be an object')
    })

    test('bad strings', async () => {
      class A extends Jig { }
      const stringProps = ['origin', 'location', 'originMainnet', 'locationMainnet', 'originTestnet',
        'locationTestnet', 'originStn', 'locationStn', 'originMocknet', 'locationMocknet']
      for (const s of stringProps) {
        A[s] = {}
        await expect(run.deploy(A)).rejects.toThrow(`${s} must be a string`)
        A[s] = 123
        await expect(run.deploy(A)).rejects.toThrow(`${s} must be a string`)
        delete A[s]
      }
    })

    test('unpackable', async () => {
      class A { }
      A.set = new Set()
      await expect(run.deploy(A)).rejects.toThrow('Set cannot be serialized to json')
      class B { }
      B.map = new Map()
      await expect(run.deploy(B)).rejects.toThrow('Map cannot be serialized to json')
      class C { }
      C.b = new B()
      await expect(run.deploy(C)).rejects.toThrow('B cannot be serialized to json')
      class D { }
      D.A = class { }
      await expect(run.deploy(D)).rejects.toThrow('class {} cannot be serialized to json')
      class E { }
      E.f = function () { }
      await expect(run.deploy(E)).rejects.toThrow('function () {} cannot be serialized to json')
    })
  })

  describe('sandbox', () => {
    test('sandbox', async () => {
      const s = 'abc'
      class A {
        add (n) { return n + 1 }

        break () { return s }
      }
      const A2 = await run.load(await run.deploy(A))
      expect(new A2().add(1)).toBe(2)
      expect(new A().break()).toBe('abc')
      expect(() => new A2().break()).toThrow()
    })

    test('inaccessible globals', async () => {
      class A {
        isUndefined (x) {
          return typeof (typeof window !== 'undefined' ? window : global)[x] === 'undefined'
        }
      }
      const A1 = await run.load(await run.deploy(A))
      const a1 = new A1()
      const bad = ['Date', 'Math', 'eval', 'XMLHttpRequest', 'FileReader', 'WebSocket', 'setTimeout', 'setInterval']
      bad.forEach(x => expect(a1.isUndefined(x)).toBe(true))
      await run.sync()
      const run2 = createRun({ blockchain: run.blockchain })
      const A2 = await run2.load(A.origin)
      const a2 = new A2()
      bad.forEach(x => expect(a2.isUndefined(x)).toBe(true))
    })
  })

  describe('misc', () => {
    test('instanceof', async () => {
      class A { }
      const A2 = await run.load(await run.deploy(A))
      expect(new A()).toBeInstanceOf(A)
      expect(new A()).not.toBeInstanceOf(A2)
      expect(new A2()).not.toBeInstanceOf(A)
      expect(new A2()).toBeInstanceOf(A2)
    })

    test('deploy without run', async () => {
      Run.instance = null
      expect(() => Run.code.deploy(class A { })).toThrow('Run not instantiated')
    })
  })

  describe('activate', () => {
    test('activate different network', async () => {
      class A { }
      await run.deploy(A)
      expect(A.location.length).toBe(67)
      expect(A.location).toBe(A.locationMocknet)
      expect(A.owner).toBe(run.owner.pubkey)
      expect(A.ownerMocknet).toBe(run.owner.pubkey)
      const run2 = createRun({ network: 'test' })
      expect(A.location).toBeUndefined()
      expect(A.locationMocknet.length).toBe(67)
      expect(A.owner).toBeUndefined()
      expect(A.ownerMocknet).toBe(run.owner.pubkey)
      await run2.deploy(A)
      expect(A.location.length).toBe(67)
      expect(A.location).toBe(A.locationTestnet)
      expect(A.owner).toBe(A.ownerTestnet)
      run.activate()
      expect(A.location.length).toBe(67)
      expect(A.location).toBe(A.locationMocknet)
      expect(A.owner).toBe(A.ownerMocknet)
      expect(Run.code[installsKey].size).toBe(6)
    })

    test('check owner on different networks', async () => {
      class A { }
      class B extends Jig { init () { if (this.owner !== A.owner) throw new Error() } }
      B.deps = { A }
      for (const network of ['test', 'mock']) {
        const run = createRun({ network })
        run.transaction.begin()
        run.deploy(A)
        run.deploy(B)
        run.transaction.end()
        await run.sync()
        const b = new B()
        await b.sync()
        Run.code.flush()
        await run.sync()
      }
    })
  })
})
