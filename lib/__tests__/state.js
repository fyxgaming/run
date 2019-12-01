const { createRun, Run, Jig } = require('./test-util')
const bsv = require('bsv')
const { StateCache } = Run

const stateGets = []
const stateSets = []
const stateGetOverrides = new Map()

class WrappedState extends StateCache {
  async get (location) {
    stateGets.push(location)
    if (stateGetOverrides.has(location)) return stateGetOverrides.get(location)
    return super.get(location)
  }

  async set (location, state) {
    stateSets.push({ location, state })
    super.set(location, state)
  }
}

function expectStateGet (location) {
  expect(stateGets.shift()).toBe(location)
}

function expectStateSet (location, state) {
  expect(stateSets.shift()).toEqual({ location, state })
}

const run = createRun({ state: new WrappedState() })

afterEach(() => {
  expect(stateGets.length).toBe(0)
  expect(stateSets.length).toBe(0)
})

describe('StateCache', () => {
  describe('set', () => {
    test('called for each update after sync', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      await a.sync()
      expectStateSet(a.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      a.set(3)
      await a.sync()
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 3 } })
    })

    test('satoshis', async () => {
      class A extends Jig { init () { this.satoshis = 3000 } }
      const a = new A()
      await a.sync()
      expectStateSet(a.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 3000 } })
    })

    test('owner', async () => {
      const owner = new bsv.PrivateKey().publicKey.toString()
      class A extends Jig { init (owner) { this.owner = owner } }
      const a = new A(owner)
      await a.sync()
      expectStateSet(a.location, { type: '_o1', state: { owner, satoshis: 0 } })
    })

    test('new jig ref', async () => {
      class B extends Jig { }
      class A extends Jig { init () { this.b = new B() } }
      A.deps = { B }
      const a = new A()
      await run.sync()
      expectStateSet(a.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0, b: { $ref: '_o4' } } })
      expectStateSet(a.b.location, { type: '_o2', state: { owner: run.owner.pubkey, satoshis: 0 } })
    })

    test('prior jig ref', async () => {
      class B extends Jig { }
      class A extends Jig { set (b) { this.b = b } }
      const b = new B()
      const a = new A()
      a.set(b)
      await run.sync()
      expectStateSet(b.location, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, b: { $ref: b.location } } })
    })

    test('code ref', async () => {
      class B extends Jig { }
      run.deploy(B)
      class A extends Jig { init () { this.A = A; this.B = B } }
      A.deps = { B }
      const a = new A()
      await run.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0, A: { $ref: '_o1' }, B: { $ref: B.location } } })
    })

    test('respects max size', async () => {
      const state = new Run.StateCache({ maxSizeMB: 400 / 1000 / 1000 })
      for (let i = 0; i < 100; i++) {
        state.set('x' + i, i)
      }
      expect(state.cache.size < 100).toBe(true)
      expect(state.cache.has('x99')).toBe(true)
      expect(state.cache.has('x0')).toBe(false)
    })

    test('existing value gets moved to the top', async () => {
      const state = new Run.StateCache({ maxSizeMB: 30 })
      state.set('a', 1)
      state.set('b', 2)
      state.set('c', 3)
      expect(state.cache.keys().next().value).toBe('a')
      const sizeMBBefore = state.sizeMB
      state.set('a', 1)
      expect(state.sizeMB).toBe(sizeMBBefore)
      expect(state.cache.keys().next().value).toBe('b')
    })

    // Re-enable in next release
    test.skip('different values is error', () => {
      const state = new Run.StateCache({ maxSizeMB: 30 })
      state.set('a', 1)
      expect(() => state.set('a', 2)).toThrow('different values')
    })
  })

  describe('get', () => {
    test('load latest state', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
      const a2 = await run.load(a.location)
      expectStateGet(a2.location)
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
    })

    test('load original state', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
      stateGetOverrides.set(a.location, undefined)
      const a2 = await run.load(a.location)
      expectStateGet(a2.location)
      expectStateGet(a2.origin)
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
    })

    test('load middle state', async () => {
      class A extends Jig { set (n) { this.n = n } }
      const a = new A()
      a.set(1)
      await a.sync()
      const middleLocation = a.location
      a.set(a)
      await a.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      expectStateSet(middleLocation, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: { $ref: '_o1' } } })
      stateGetOverrides.set(a.location, undefined)
      const a2 = await run.load(a.location)
      expectStateGet(a2.location)
      expectStateGet(middleLocation)
      expectStateSet(middleLocation, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: 1 } })
      expectStateSet(a.location, { type: A.location, state: { origin: a.origin, owner: run.owner.pubkey, satoshis: 0, n: { $ref: '_o1' } } })
    })

    test.skip('hashed state does not match', async () => {
      class A extends Jig { }
      const a = new A()
      await a.sync()
      expectStateSet(a.origin, { type: '_o1', state: { owner: run.owner.pubkey, satoshis: 0 } })
      stateGetOverrides.set(a.location, { n: 1 })
      await expect(run.load(a.location)).rejects.toThrow('hello')
      expectStateGet(a.location)
    })

    // TODO: pending state of jigs changed, make sure does not interfere in publishNext
  })
})
