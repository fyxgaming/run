/**
 * transaction.js
 *
 * Tests for lib/kernel/transaction.js
 */

const { PrivateKey } = require('bsv')
const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, Transaction, LocalCache } = Run

// ------------------------------------------------------------------------------------------------
// Transaction
// ------------------------------------------------------------------------------------------------

describe('Transaction', () => {
  // Wait for every test to finish. This makes debugging easier.
  afterEach(() => Run.instance && Run.instance.sync())
  // Deactivate the current run instance. This stops leaks across tests.
  afterEach(() => Run.instance && Run.instance.deactivate())

  // --------------------------------------------------------------------------
  // transaction
  // --------------------------------------------------------------------------

  describe('transaction', () => {
    it('deploy and create', async () => {
      const run = new Run()
      class A extends Jig { }
      const [a, b] = run.transaction(() => [new A(), new A()])
      await run.sync()
      function test (a, b) { expect(a.location.slice(0, 64)).to.equal(b.location.slice(0, 64)) }
      test(a, b)
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      const b2 = await run.load(b.location)
      test(a2, b2)
    })

    // ------------------------------------------------------------------------

    it('deploy and deploy child', async () => {
      const run = new Run()
      class A { }
      class B extends A { }
      const C = run.transaction(() => { run.deploy(A); return run.deploy(B) })
      await run.sync()
      run.cache = new LocalCache()
      await run.load(C.location)
    })

    // ------------------------------------------------------------------------

    it('deploy and send', async () => {
      const run = new Run()
      class A extends Jig { static send (to) { this.owner = to } }
      const to = new PrivateKey().publicKey.toString()
      const C = run.transaction(() => { const C = run.deploy(A); C.send(to); return C })
      function test (C) { expect(C.owner).to.equal(to) }
      await run.sync()
      test(C)
      run.cache = new LocalCache()
      const C2 = await run.load(C.location)
      test(C2)
    })

    // ------------------------------------------------------------------------

    it('deploy and destroy', async () => {
      const run = new Run()
      class A { }
      const C = run.transaction(() => { const C = run.deploy(A); C.destroy(); return C })
      await run.sync()
      function test (C) { expect(C.location.endsWith('_d0')).to.equal(true) }
      test(C)
      run.cache = new LocalCache()
      const C2 = await run.load(C.location)
      test(C2)
    })

    // ------------------------------------------------------------------------

    it('create and call', async () => {
      const run = new Run()
      class A extends Jig { f () { this.n = 1 } }
      const a = run.transaction(() => { const a = new A(); a.f(); return a })
      await run.sync()
      function test (a) { expect(a.n).to.equal(1) }
      test(a)
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      test(a2)
    })

    // ------------------------------------------------------------------------

    it('create and destroy', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = run.transaction(() => { const a = new A(); a.destroy(); return a })
      await run.sync()
      function test (a) { expect(a.location.endsWith('_d0')).to.equal(true) }
      test(a)
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      test(a2)
    })

    // ------------------------------------------------------------------------

    it('create and send', async () => {
      const run = new Run()
      class A extends Jig { send (to) { this.owner = to } }
      const to = new PrivateKey().publicKey.toString()
      const a = run.transaction(() => { const a = new A(); a.send(to); return a })
      function test (a) { expect(a.owner).to.equal(to) }
      await run.sync()
      test(a)
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      test(a2)
    })

    // ------------------------------------------------------------------------

    it('create and upgrade', async () => {
      const run = new Run()
      class A extends Jig { }
      class B extends Jig { }
      const a = run.transaction(() => { const a = new A(); a.constructor.upgrade(B); return a })
      function test (a) { expect(a.constructor.name).to.equal('B') }
      test(a)
      await run.sync()
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      test(a2)
    })

    // ------------------------------------------------------------------------

    it('call and call', async () => {
      const run = new Run()
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      const b = new A()
      run.transaction(() => { a.f(); b.f() })
      function test (a, b) { expect(a.n).to.equal(1); expect(b.n).to.equal(1) }
      test(a, b)
      await run.sync()
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      const b2 = await run.load(b.location)
      test(a2, b2)
    })

    // ------------------------------------------------------------------------

    it('call and auth', async () => {
      const run = new Run()
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      run.transaction(() => { a.f(); a.auth() })
      function test (a) { expect(a.nonce).to.equal(2) }
      await run.sync()
      test(a)
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      test(a2)
    })

    // ------------------------------------------------------------------------

    it('call and destroy', async () => {
      const run = new Run()
      class A extends Jig { static f () { this.n = 1 } }
      const C = run.deploy(A)
      run.transaction(() => { C.f(); C.destroy() })
      function test (C) { expect(C.location.endsWith('_d0')).to.equal(true) }
      await run.sync()
      test(C)
      run.cache = new LocalCache()
      const C2 = await run.load(C.location)
      test(C2)
    })

    // ------------------------------------------------------------------------

    it('upgrade and call', async () => {
      const run = new Run()
      class A extends Jig { static f () { return 1 }}
      class B extends Jig { static f () { return 2 }}
      const C = run.deploy(A)
      expect(run.transaction(() => { C.upgrade(B); return C.f() })).to.equal(2)
      function test (C) { expect(C.name).to.equal('B') }
      test(C)
      await run.sync()
      run.cache = new LocalCache()
      const C2 = await run.load(C.location)
      test(C2)
    })

    // ------------------------------------------------------------------------

    it('deploy and call', async () => {
      const run = new Run()
      class A extends Jig { static f () { this.n = 1 } }
      const C = run.transaction(() => { const C = run.deploy(A); C.f(); return C })
      await run.sync()
      run.cache = new LocalCache()
      await run.load(C.location)
    })

    // ------------------------------------------------------------------------

    it('destroy and destroy', async () => {
      const run = new Run()
      class A extends Jig { }
      const C = run.deploy(A)
      run.transaction(() => { C.destroy(); C.destroy() })
      await run.sync()
      run.cache = new LocalCache()
      await run.load(C.location)
    })

    // ------------------------------------------------------------------------

    it('throws if deploy and auth', async () => {
      const run = new Run()
      class A { }
      const error = 'auth unavailable on new jigs'
      expect(() => run.transaction(() => { const C = run.deploy(A); C.auth() })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if create and auth', async () => {
      const run = new Run()
      class A extends Jig { }
      const error = 'auth unavailable on new jigs'
      expect(() => run.transaction(() => { const a = new A(); a.auth() })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if destroy and auth jig', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      const error = 'Cannot auth destroyed jigs'
      expect(() => run.transaction(() => { a.destroy(); a.auth() })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if destroy and auth code', async () => {
      const run = new Run()
      class A extends Jig { }
      const C = run.deploy(A)
      const error = 'Cannot auth destroyed jigs'
      expect(() => run.transaction(() => { C.destroy(); C.auth() })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if destroy and upgrade', () => {
      const run = new Run()
      const A = run.deploy(class A { })
      const error = 'Cannot upgrade destroyed jig'
      expect(() => run.transaction(() => { A.destroy(); A.upgrade(class B { }) })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if upgrade and create unupgraded', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      await A.sync()
      const A2 = await run.load(A.location)
      const error = 'Inconsistent worldview'
      class B extends Jig { }
      expect(() => run.transaction(() => { A.upgrade(B); return new A2() })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if send and call', async () => {
      const run = new Run()
      class A extends Jig { static send (to) { this.owner = to }; static f () { this.n = 1 } }
      const to = new PrivateKey().toAddress().toString()
      const C = run.deploy(A)
      const error = 'update disabled: A has new owner'
      expect(() => run.transaction(() => { C.send(to); C.f() })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if send and destroy', async () => {
      const run = new Run()
      class A extends Jig { static send (to) { this.owner = to } }
      const to = new PrivateKey().toAddress().toString()
      const C = run.deploy(A)
      const error = 'delete disabled: A has new owner'
      expect(() => run.transaction(() => { C.send(to); C.destroy() })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if send and auth', async () => {
      const run = new Run()
      class A extends Jig { static send (to) { this.owner = to } }
      const to = new PrivateKey().toAddress().toString()
      const C = run.deploy(A)
      const error = 'auth disabled: A has new owner'
      expect(() => run.transaction(() => { C.send(to); C.auth() })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if update different instances of same jig', async () => {
      const run = new Run()
      class A extends Jig { f () { this.n = 1 } }
      const a1 = new A()
      await a1.sync()
      const a2 = await run.load(a1.location)
      const error = 'Inconsistent worldview'
      expect(() => run.transaction(() => { a1.f(); a2.f() })).to.throw(error)
      expect(() => run.transaction(() => { a1.auth(); a2.auth() })).to.throw(error)
      expect(() => run.transaction(() => { a1.destroy(); a2.destroy() })).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if conflicting updates', async () => {
      const run = new Run()
      class A extends Jig { }
      const a1 = new A()
      await a1.sync()
      const a2 = await run.load(a1.location)
      run.transaction(() => a1.auth())
      run.transaction(() => a2.auth())
      const error = '[jig A] was spent in another transaction'
      await expect(run.sync()).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if async', () => {
      const run = new Run()
      expect(() => run.transaction(async () => {})).to.throw('async transactions not supported')
      expect(() => run.transaction(() => Promise.resolve())).to.throw('async transactions not supported')
    })

    // ------------------------------------------------------------------------

    it('throws if invalid callback', () => {
      const run = new Run()
      expect(() => run.transaction()).to.throw('Invalid callback')
      expect(() => run.transaction(null)).to.throw('Invalid callback')
      expect(() => run.transaction({})).to.throw('Invalid callback')
    })
  })

  // --------------------------------------------------------------------------
  // update
  // --------------------------------------------------------------------------

  describe('update', () => {
    it('multiple updates', async () => {
      const run = new Run()
      class A extends Jig { static f () { this.n = 1 } }
      const tx = new Transaction()
      const C = tx.update(() => run.deploy(A))
      tx.update(() => C.f())
      tx.update(() => C.destroy())
      await tx.publish()
      run.cache = new LocalCache()
      await run.load(C.location)
    })

    // ------------------------------------------------------------------------

    it('multiple upgrades', async () => {
      const run = new Run()
      const A = run.deploy(class A { })
      const tx = new Transaction()
      tx.update(() => A.upgrade(class B { }))
      tx.update(() => A.upgrade(class C { }))
      tx.update(() => A.upgrade(class D { }))
      await tx.publish()
      expect(A.name).to.equal('D')
      run.cache = new LocalCache()
      const A2 = await run.load(A.location)
      expect(A2.name).to.equal('D')
    })

    // ------------------------------------------------------------------------

    it('create and upgrade', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      const a = tx.update(() => new A())
      class B extends Jig { }
      tx.update(() => a.constructor.upgrade(B))
      expect(a.constructor.name).to.equal('B')
      await tx.publish()
      await run.sync()
      run.cache = new LocalCache()
      const a2 = await run.load(a.location)
      expect(a2.constructor.name).to.equal('B')
    })

    // ------------------------------------------------------------------------

    it('throws if update outside before publish', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { this.n = 1 } }
      const tx = new Transaction()
      const a = tx.update(() => new A())
      expect(() => a.f()).to.throw('Cannot update [jig A]: open transaction')
      tx.publish()
      a.f()
      await a.sync()
    })

    // ------------------------------------------------------------------------

    it('throws if auth outside before publish', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const tx = new Transaction()
      const a = tx.update(() => new A())
      expect(() => a.auth()).to.throw('Cannot auth [jig A]: open transaction')
      await tx.export()
      expect(() => a.auth()).to.throw('Cannot auth [jig A]: open transaction')
      await tx.publish()
      a.auth()
      await a.sync()
    })

    // ------------------------------------------------------------------------

    it('throws if destroy jig open in another transaction', async () => {
      const run = new Run()
      const tx1 = new Transaction()
      const A = tx1.update(() => run.deploy(class A { }))
      const tx2 = new Transaction()
      const error = 'Cannot delete A: open transaction'
      expect(() => tx2.update(() => A.destroy())).to.throw(error)
    })

    // ------------------------------------------------------------------------

    it('throws if async', () => {
      new Run() // eslint-disable-line
      const tx = new Run.Transaction()
      expect(() => tx.update(async () => {})).to.throw('async transactions not supported')
      expect(() => tx.update(() => Promise.resolve())).to.throw('async transactions not supported')
    })

    // ------------------------------------------------------------------------

    it.skip('throws if sync', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if load', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if activate', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if deactivate', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if import', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if invalid callback', () => {
      new Run() // eslint-disable-line
      const tx = new Run.Transaction()
      expect(() => tx.update()).to.throw('Invalid callback')
      expect(() => tx.update(null)).to.throw('Invalid callback')
      expect(() => tx.update({})).to.throw('Invalid callback')
    })

    // ------------------------------------------------------------------------

    it.skip('throws if no active run instance', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // publish
  // --------------------------------------------------------------------------

  describe('publish', () => {
    it('manual publish', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const tx = new Transaction()
      const a = tx.update(() => new A())
      const b = tx.update(() => new A())
      await tx.publish()
      expect(a.location.slice(0, 64)).to.equal(b.location.slice(0, 64))
    })

    // ------------------------------------------------------------------------

    it('dedups publish', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => new A())
      const promise1 = tx.publish()
      const promise2 = tx.publish()
      expect(promise1).to.equal(promise2)
    })

    // ------------------------------------------------------------------------

    it('only publishes once', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const tx = new Transaction()
      const a = tx.update(() => new A())
      await tx.publish()
      const alocation = a.location
      await tx.publish()
      expect(a.location).to.equal(alocation)
    })

    // ------------------------------------------------------------------------

    it('parallel transactions', async () => {
      const run = new Run()
      const tx1 = new Transaction()
      const A = tx1.update(() => run.deploy(class A { }))
      const tx2 = new Transaction()
      const B = tx2.update(() => run.deploy(class B { }))
      tx1.publish()
      tx2.publish()
      await run.sync()
      run.cache = new LocalCache()
      await run.load(A.location)
      await run.load(B.location)
    })

    // ------------------------------------------------------------------------

    it('waits for upstream commits', async () => {
      const run = new Run()
      class A { }
      run.deploy(A)
      const B = run.transaction(() => run.deploy(class B extends A {}))
      await B.sync()
      run.cache = new LocalCache()
      await run.load(B.location)
    })

    // ------------------------------------------------------------------------

    it.skip('throws if update after publish', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if update during publish', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if export during publish', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if rollback during publish', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('re-publish after fail', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if empty', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('uses active run instance', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if no active run instance', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // export
  // --------------------------------------------------------------------------

  describe('export', () => {
    it('export', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => run.deploy(A))
      const rawtx = await tx.export()
      expect(typeof rawtx).to.equal('string')
      expect(rawtx.length > 0).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it.skip('paid and signed', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('unpaid', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('unsigned', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('waits for upstream commits', async () => {
      new Run() // eslint-disable-line
      class B extends Jig { }
      class A extends Jig {
        init (b) {
          this.b = b
        }
      }
      const transaction = new Run.Transaction()
      const b = new B()
      transaction.update(() => new A(b))
      await transaction.export()
    })

    // ------------------------------------------------------------------------

    it.skip('dedups exports', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('update and re-export', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('publish after export', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if update during export', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if publish during export', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if rollback during export', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if invalid options', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('re-export after fail', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('sync during export ok', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if empty', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('uses active run instance', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if no active run instance', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // import
  // --------------------------------------------------------------------------

  describe('import', () => {
    it('unpublished', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => run.deploy(A))
      const rawtx = await tx.export()
      const tx2 = await run.import(rawtx)
      tx2.update(() => run.deploy(class B { }))
      await tx2.publish()
    })

    // ------------------------------------------------------------------------

    it.skip('published ', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('same transaction twice ok', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('partially signed', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('unpaid', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('publish after import', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('update after import', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if publish update of partially signed', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if invalid transaction', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if invalid payload', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if no active run instance', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // rollback
  // --------------------------------------------------------------------------

  describe('rollback', () => {
    it('rolls back jigs', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { f () { this.n = 1 } }
      const a = new A()
      await a.sync()
      const tx = new Transaction()
      tx.update(() => a.f())
      expect(a.n).to.equal(1)
      tx.rollback()
      expect(typeof a.n).to.equal('undefined')
      expect(a.location).to.equal(a.origin)
    })

    // ------------------------------------------------------------------------

    it.skip('rolls back deploys', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('rolls back updates', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('rolls back destroys', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('rolls back auths', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('rolls back upgrades', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it('throws if use undeployed jig after rollback', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const tx = new Transaction()
      const a = tx.update(() => new A())
      tx.rollback()
      await expect(a.sync()).to.be.rejectedWith('Cannot sync')
      expect(() => a.location).to.throw('Cannot read location')
    })

    // ------------------------------------------------------------------------

    it.skip('rollback then re-update', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('rollback then re-upgrade', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('rollback then re-destroy', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('rollback twice ok', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('rollback after export ok', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('rollback after publish ok', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('throws if no active run instance', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // sync
  // --------------------------------------------------------------------------

  describe('sync', () => {
    it('sync unpublished ok', async () => {
      const run = new Run()
      const tx = new Transaction()
      class A extends Jig { }
      const a = tx.update(() => new A())
      await run.sync()
      expect(() => a.location).to.throw('Cannot read location')
      await tx.publish()
      expect(() => a.location).not.to.throw()
    })

    // ------------------------------------------------------------------------

    it('throws if sync transaction jig', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const tx = new Transaction()
      const a = tx.update(() => new A())
      const error = 'Cannot sync [jig A]: transaction in progress'
      await expect(a.sync()).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if sync transaction code', async () => {
      const run = new Run()
      class A { }
      const tx = new Transaction()
      const C = tx.update(() => run.deploy(A))
      const error = 'Cannot sync A: transaction in progress'
      await expect(C.sync()).to.be.rejectedWith(error)
    })
  })

  // --------------------------------------------------------------------------
  // Getters
  // --------------------------------------------------------------------------

  describe('Getters', () => {
    it.skip('outputs', () => {
      // TODO
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      const transaction = new Transaction()
      transaction.update(() => a.auth())
      const b = transaction.update(() => new A())
      transaction.update(() => b.destroy())
    })

    // ------------------------------------------------------------------------

    it.skip('deletes', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('stores after states', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('correct after import', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('changes with updates', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('cannot be modified', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('clears after rollback', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('persists after publish', () => {
      // TODO
    })

    // ------------------------------------------------------------------------

    it.skip('persists after export', () => {
      // TODO
    })
  })

  // --------------------------------------------------------------------------
  // Misc
  // --------------------------------------------------------------------------

  describe('Misc', () => {
    it('allowed to read outside before publish', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { g () { return this.n } }
      const tx = new Transaction()
      const a = tx.update(() => new A())
      a.g()
      tx.publish()
      a.g()
      await a.sync()
    })

    // ------------------------------------------------------------------------

    it('allowed to read after export', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { g () { return this.n } }
      const tx = new Transaction()
      const a = tx.update(() => new A())
      a.g()
      const promise = tx.export()
      a.g()
      await promise
      a.g()
      tx.publish()
      await a.sync()
    })

    // ------------------------------------------------------------------------

    it.skip('many open transactions ok', () => {
      // TODO
    })
  })
})

// ------------------------------------------------------------------------------------------------
