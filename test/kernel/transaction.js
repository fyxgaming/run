/**
 * transaction.js
 *
 * Tests for lib/kernel/transaction.js
 */

const bsv = require('bsv')
const { PrivateKey } = bsv
const { describe, it, afterEach } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { stub, fake } = require('sinon')
const { expect } = require('chai')
const Run = require('../env/run')
const { Jig, Transaction, LocalCache } = Run
const { STRESS } = require('../env/config')

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

    it('throws if sync all', () => {
      const run = new Run()
      const tx = new Run.Transaction()
      expect(() => tx.update(() => { run.sync() })).to.throw('sync all disabled during atomic transaction')
    })

    // ------------------------------------------------------------------------

    it('throws if sync', () => {
      const run = new Run()
      const tx = new Run.Transaction()
      const A = run.deploy(class A extends Jig { })
      const a = new A()
      expect(() => tx.update(() => { A.sync() })).to.throw('sync disabled during atomic transaction')
      expect(() => tx.update(() => { a.sync() })).to.throw('sync disabled during atomic transaction')
    })

    // ------------------------------------------------------------------------

    it('throws if load', () => {
      const run = new Run()
      const tx = new Run.Transaction()
      expect(() => tx.update(() => { run.load('abc') })).to.throw('load disabled during atomic transaction')
    })

    // ------------------------------------------------------------------------

    it('throws if activate', () => {
      const run2 = new Run()
      new Run() // eslint-disable-line
      const tx = new Run.Transaction()
      expect(() => tx.update(() => { return new Run() })).to.throw('activate disabled during atomic transaction')
      expect(() => tx.update(() => { run2.activate() })).to.throw('activate disabled during atomic transaction')
    })

    // ------------------------------------------------------------------------

    it('throws if deactivate', () => {
      const run = new Run()
      const tx = new Run.Transaction()
      expect(() => tx.update(() => { run.deactivate() })).to.throw('deactivate disabled during atomic transaction')
    })

    // ------------------------------------------------------------------------

    it('throws if import', () => {
      const run = new Run()
      const tx = new Run.Transaction()
      expect(() => tx.update(() => { run.import() })).to.throw('import disabled during atomic transaction')
    })

    // ------------------------------------------------------------------------

    it('throws if update', () => {
      new Run() // eslint-disable-line
      const tx = new Run.Transaction()
      expect(() => tx.update(() => { tx.update(() => { }) })).to.throw('update disabled during atomic transaction')
    })

    // ------------------------------------------------------------------------

    it('throws if publish', () => {
      new Run() // eslint-disable-line
      const tx = new Run.Transaction()
      expect(() => tx.update(() => { tx.publish() })).to.throw('publish disabled during atomic transaction')
    })
    // ------------------------------------------------------------------------

    it('throws if export', () => {
      new Run() // eslint-disable-line
      const tx = new Run.Transaction()
      expect(() => tx.update(() => { tx.export() })).to.throw('export disabled during atomic transaction')
    })

    // ------------------------------------------------------------------------

    it('throws if rollback', () => {
      new Run() // eslint-disable-line
      const tx = new Run.Transaction()
      expect(() => tx.update(() => { tx.rollback() })).to.throw('rollback disabled during atomic transaction')
    })

    // ------------------------------------------------------------------------

    it('throws if invalid callback', () => {
      new Run() // eslint-disable-line
      const tx = new Run.Transaction()
      expect(() => tx.update()).to.throw('Invalid callback')
      expect(() => tx.update(null)).to.throw('Invalid callback')
      expect(() => tx.update({})).to.throw('Invalid callback')
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

    it('throws if update after publish', async () => {
      const run = new Run()
      const tx = new Transaction()
      tx.update(() => run.deploy(class A { }))
      await tx.publish()
      expect(() => tx.update(() => run.deploy(class B { }))).to.throw('update disabled once published')
    })

    // ------------------------------------------------------------------------

    it('throws if update during publish', () => {
      const run = new Run()
      const tx = new Transaction()
      tx.update(() => run.deploy(class A { }))
      tx.publish()
      expect(() => tx.update(() => run.deploy(class B { }))).to.throw('update disabled during publish')
    })

    // ------------------------------------------------------------------------

    it('throws if export during publish', () => {
      const run = new Run()
      const tx = new Transaction()
      tx.update(() => run.deploy(class A { }))
      tx.publish()
      expect(() => tx.export()).to.throw('export disabled during publish')
    })

    // ------------------------------------------------------------------------

    it('throws if rollback during publish', () => {
      const run = new Run()
      const tx = new Transaction()
      tx.update(() => run.deploy(class A { }))
      tx.publish()
      expect(() => tx.rollback()).to.throw('rollback disabled during publish')
    })

    // ------------------------------------------------------------------------

    it('re-publish after fail', async () => {
      const run = new Run()
      const tx = new Transaction()
      const A = tx.update(() => run.deploy(class A { }))
      stub(run.blockchain, 'broadcast').onFirstCall().throws()
      await expect(tx.publish()).to.be.rejected
      await tx.publish()
      expect(A.location.endsWith('_o1')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('throws if empty', async () => {
      new Run() // eslint-disable-line
      const tx = new Transaction()
      tx.update(() => {})
      expect(() => tx.publish()).to.throw('Nothing to publish')
    })

    // ------------------------------------------------------------------------

    it('throws if pay disabled on new transaction', async () => {
      const run = new Run()
      const tx = new Transaction()
      tx.update(() => run.deploy(class A { }))
      const error = 'tx has no inputs'
      await expect(tx.publish({ pay: false })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if sign disabled on new transaction', async () => {
      new Run() // eslint-disable-line
      const tx = new Transaction()
      class A extends Jig { }
      const a = new A()
      tx.update(() => a.auth())
      const error = 'Missing signature for [jig A]'
      await expect(tx.publish({ sign: false })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if invalid pay option', () => {
      const run = new Run()
      const tx = new Transaction()
      tx.update(() => run.deploy(class A { }))
      expect(() => tx.publish({ pay: null })).to.throw('Invalid pay')
      expect(() => tx.publish({ pay: 1 })).to.throw('Invalid pay')
      expect(() => tx.publish({ pay: '' })).to.throw('Invalid pay')
      expect(() => tx.publish({ pay: () => { } })).to.throw('Invalid pay')
    })

    // ------------------------------------------------------------------------

    it('throws if invalid sign option', () => {
      const run = new Run()
      const tx = new Transaction()
      tx.update(() => run.deploy(class A { }))
      expect(() => tx.publish({ sign: null })).to.throw('Invalid sign')
      expect(() => tx.publish({ sign: 1 })).to.throw('Invalid sign')
      expect(() => tx.publish({ sign: '' })).to.throw('Invalid sign')
      expect(() => tx.publish({ sign: () => { } })).to.throw('Invalid sign')
    })
  })

  // --------------------------------------------------------------------------
  // export
  // --------------------------------------------------------------------------

  describe('export', () => {
    it('exports hex transaction', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => run.deploy(A))
      const rawtx = await tx.export()
      expect(typeof rawtx).to.equal('string')
      expect(rawtx.length > 0).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('paid and signed', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => run.deploy(A))
      const rawtx = await tx.export()
      await run.blockchain.broadcast(rawtx)
    })

    // ------------------------------------------------------------------------

    it('unpaid', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => run.deploy(A))
      const rawtx = await tx.export({ pay: false })
      const error = 'tx has no inputs'
      await expect(run.blockchain.broadcast(rawtx)).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('unsigned', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      const tx = new Transaction()
      tx.update(() => a.destroy())
      const rawtx = await tx.export({ sign: false })
      const error = 'mandatory-script-verify-flag-failed'
      await expect(run.blockchain.broadcast(rawtx)).to.be.rejectedWith(error)
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

    it('dedups exports', () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => run.deploy(A))
      const promise1 = tx.export()
      const promise2 = tx.export()
      expect(promise1).to.equal(promise2)
    })

    // ------------------------------------------------------------------------

    it('update and re-export', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      const C = run.deploy(A)
      tx.update(() => C.auth())
      const rawtx1 = await tx.export()
      tx.update(() => C.destroy())
      const rawtx2 = await tx.export()
      tx.rollback()
      expect(rawtx1).not.to.equal(rawtx2)
      await run.blockchain.broadcast(rawtx2)
      await C.sync()
      expect(C.location.endsWith('_d0')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('publish after export', async () => {
      const run = new Run()
      const tx = new Transaction()
      const A = tx.update(() => run.deploy(class A { }))
      await tx.export()
      await tx.publish()
      await A.sync()
      expect(A.location.endsWith('_o1')).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('throws if publish during export', () => {
      const run = new Run()
      const tx = new Transaction()
      tx.update(() => run.deploy(class A { }))
      tx.export()
      expect(() => tx.publish()).to.throw('publish disabled during export')
    })

    // ------------------------------------------------------------------------

    it('throws if update during export', () => {
      const run = new Run()
      const tx = new Transaction()
      tx.update(() => run.deploy(class A { }))
      tx.export()
      expect(() => tx.update(() => run.deploy(class B { }))).to.throw('update disabled during export')
    })

    // ------------------------------------------------------------------------

    it('throws if rollback during export', () => {
      const run = new Run()
      const tx = new Transaction()
      tx.update(() => run.deploy(class A { }))
      tx.export()
      expect(() => tx.rollback()).to.throw('rollback disabled during export')
    })

    // ------------------------------------------------------------------------

    it('throws if invalid pay option', () => {
      const run = new Run()
      const tx = new Transaction()
      tx.update(() => run.deploy(class A { }))
      expect(() => tx.export({ pay: null })).to.throw('Invalid pay')
      expect(() => tx.export({ pay: 1 })).to.throw('Invalid pay')
      expect(() => tx.export({ pay: '' })).to.throw('Invalid pay')
      expect(() => tx.export({ pay: () => { } })).to.throw('Invalid pay')
    })

    // ------------------------------------------------------------------------

    it('throws if invalid sign option', () => {
      const run = new Run()
      const tx = new Transaction()
      tx.update(() => run.deploy(class A { }))
      expect(() => tx.export({ sign: null })).to.throw('Invalid sign')
      expect(() => tx.export({ sign: 1 })).to.throw('Invalid sign')
      expect(() => tx.export({ sign: '' })).to.throw('Invalid sign')
      expect(() => tx.export({ sign: () => { } })).to.throw('Invalid sign')
    })

    // ------------------------------------------------------------------------

    it('re-export after fail', async () => {
      const run = new Run()
      const tx = new Transaction()
      tx.update(() => run.deploy(class A { }))
      stub(run.purse, 'pay').onFirstCall().throws()
      await expect(tx.export()).to.be.rejected
      await tx.export()
    })

    // ------------------------------------------------------------------------

    it('sync during export ok', async () => {
      const run = new Run()
      const tx = new Transaction()
      tx.update(() => run.deploy(class A { }))
      tx.export()
      await run.sync()
    })

    // ------------------------------------------------------------------------

    it('throws if empty', () => {
      new Run() // eslint-disable-line
      const tx = new Transaction()
      expect(() => tx.export()).to.throw('Nothing to export')
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

    it('published', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await a.sync()
      const txid = a.location.slice(0, 64)
      const rawtx = await run.blockchain.fetch(txid)
      const tx = await run.import(rawtx)
      await tx.publish()
      const rawtx2 = await tx.export()
      expect(rawtx).to.equal(rawtx2)
    })

    // ------------------------------------------------------------------------

    it('import and publish emits jig events', async () => {
      const callback = fake()
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => run.deploy(A))
      const rawtx = await tx.export()
      const tx2 = await run.import(rawtx)
      run.on('publish', callback)
      await tx2.publish()
      expect(callback.called).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('import, update, and publish emits jig events', async () => {
      const callback = fake()
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => run.deploy(A))
      const rawtx = await tx.export()
      const tx2 = await run.import(rawtx)
      tx2.update(() => run.deploy(class B { }))
      run.on('publish', callback)
      await tx2.publish()
      expect(callback.called).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('import and publish adds to cache', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => new A())
      const rawtx = await tx.export()
      run.cache = new LocalCache()
      const tx2 = await run.import(rawtx)
      await tx2.publish()
      expect(!!(await run.cache.get('jig://' + tx2.outputs[0].location))).to.equal(true)
      expect(!!(await run.cache.get('jig://' + tx2.outputs[1].location))).to.equal(true)
    })
    // ------------------------------------------------------------------------

    it('import, update, and publish adds to cache', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => new A())
      const rawtx = await tx.export()
      run.cache = new LocalCache()
      const tx2 = await run.import(rawtx)
      tx2.update(() => run.deploy(class B { }))
      await tx2.publish()
      expect(!!(await run.cache.get('jig://' + tx2.outputs[0].location))).to.equal(true)
      expect(!!(await run.cache.get('jig://' + tx2.outputs[1].location))).to.equal(true)
      expect(!!(await run.cache.get('jig://' + tx2.outputs[2].location))).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('same transaction twice ok', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => run.deploy(A))
      const rawtx = await tx.export()
      const tx1 = await run.import(rawtx)
      const tx2 = await run.import(rawtx)
      expect(tx1).not.to.equal(tx2)
    })

    // ------------------------------------------------------------------------

    it('unsigned', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => run.deploy(A))
      const rawtx = await tx.export({ signed: false })
      const tx2 = await run.import(rawtx)
      await tx2.publish({ pay: false })
    })

    // ------------------------------------------------------------------------

    it('unpaid', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => run.deploy(A))
      const rawtx = await tx.export({ pay: false })
      const tx2 = await run.import(rawtx)
      await tx2.publish()
    })

    // ------------------------------------------------------------------------

    it('paid twice', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => run.deploy(A))
      const rawtx = await tx.export({ sign: false })
      const tx2 = await run.import(rawtx)
      await tx2.publish()
    })

    // ------------------------------------------------------------------------

    it('signed twice', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => run.deploy(A))
      const rawtx = await tx.export({ pay: false })
      const tx2 = await run.import(rawtx)
      await tx2.publish()
    })

    // ------------------------------------------------------------------------

    it('throws if publish unsigned', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await run.sync()
      const tx = new Transaction()
      tx.update(() => a.auth())
      const rawtx = await tx.export({ sign: false })
      const tx2 = await run.import(rawtx)
      const error = 'Missing signature for [jig A]'
      await expect(tx2.publish({ sign: false })).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if non-run transaction', async () => {
      const run = new Run()
      const Buffer = bsv.deps.Buffer
      const slp = Buffer.from('slp', 'utf8')
      const dat = Buffer.from('', 'utf8')
      const slpscript = bsv.Script.buildSafeDataOut([slp, dat, dat, dat, dat])
      const slpoutput = new bsv.Transaction.Output({ script: slpscript, satoshis: 0 })
      const tx = new bsv.Transaction().addOutput(slpoutput).to(run.purse.address, 1000)
      const rawtx = tx.toString('hex')
      const error = 'Not a run transaction: invalid op_return protocol'
      await expect(run.import(rawtx)).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if unsupported version payload', async () => {
      const run = new Run()
      const Buffer = bsv.deps.Buffer
      const slp = Buffer.from('run', 'utf8')
      const ver = Buffer.from([0x04])
      const app = Buffer.from('', 'utf8')
      const json = Buffer.from('{}', 'utf8')
      const runscript = bsv.Script.buildSafeDataOut([slp, ver, app, json])
      const runoutput = new bsv.Transaction.Output({ script: runscript, satoshis: 0 })
      const tx = new bsv.Transaction().addOutput(runoutput).to(run.purse.address, 1000)
      const rawtx = tx.toString('hex')
      const error = 'Not a run transaction: unsupported run version'
      await expect(run.import(rawtx)).to.be.rejectedWith(error)
    })

    // ------------------------------------------------------------------------

    it('throws if invalid payload', async () => {
      const run = new Run()
      const Buffer = bsv.deps.Buffer
      const slp = Buffer.from('run', 'utf8')
      const ver = Buffer.from([0x05])
      const app = Buffer.from('', 'utf8')
      const json = Buffer.from('{}', 'utf8')
      const runscript = bsv.Script.buildSafeDataOut([slp, ver, app, json])
      const runoutput = new bsv.Transaction.Output({ script: runscript, satoshis: 0 })
      const tx = new bsv.Transaction().addOutput(runoutput).to(run.purse.address, 1000)
      const rawtx = tx.toString('hex')
      const error = 'Not a run transaction: invalid run payload'
      await expect(run.import(rawtx)).to.be.rejectedWith(error)
    })
  })

  // --------------------------------------------------------------------------
  // rollback
  // --------------------------------------------------------------------------

  describe('rollback', () => {
    it('rolls back creates', async () => {
      const run = new Run()
      const tx = new Transaction()
      class A extends Jig { }
      const a = tx.update(() => new A())
      tx.rollback()
      await run.sync()
      expect(() => a.location).to.throw('Cannot read location')
      expect(() => a.origin).to.throw('Cannot read origin')
      expect(() => a.nonce).to.throw('Cannot read nonce')
    })

    // ------------------------------------------------------------------------

    it('rolls back deploys', async () => {
      const run = new Run()
      const tx = new Transaction()
      const A = tx.update(() => run.deploy(class A { }))
      tx.rollback()
      await run.sync()
      expect(() => A.location).to.throw('Cannot read location')
      expect(() => A.origin).to.throw('Cannot read origin')
      expect(() => A.nonce).to.throw('Cannot read nonce')
      await A.sync()
    })

    // ------------------------------------------------------------------------

    it('rolls back updates', async () => {
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

    it('rolls back destroys', async () => {
      const run = new Run()
      class A extends Jig { }
      const a = new A()
      await run.sync()
      const tx = new Transaction()
      tx.update(() => a.destroy())
      tx.rollback()
      expect(a.location).to.equal(a.origin)
    })

    // ------------------------------------------------------------------------

    it('rolls back auths', async () => {
      const run = new Run()
      const A = run.deploy(class A { })
      await run.sync()
      const tx = new Transaction()
      tx.update(() => A.auth())
      tx.rollback()
      expect(A.location).to.equal(A.origin)
    })

    // ------------------------------------------------------------------------

    it('rolls back upgrades', async () => {
      const run = new Run()
      const A = run.deploy(class A {
        f () { }
        static g () { }
      })
      class B {
        h () { }
        static i () { }
      }
      await run.sync()
      const tx = new Transaction()
      tx.update(() => A.upgrade(B))
      expect(A.name).to.equal('B')
      expect(typeof A.prototype.f).to.equal('undefined')
      expect(typeof A.prototype.h).to.equal('function')
      expect(typeof A.g).to.equal('undefined')
      expect(typeof A.i).to.equal('function')
      tx.rollback()
      expect(A.location).to.equal(A.origin)
      expect(A.name).to.equal('A')
      expect(typeof A.prototype.f).to.equal('function')
      expect(typeof A.prototype.h).to.equal('undefined')
      expect(typeof A.g).to.equal('function')
      expect(typeof A.i).to.equal('undefined')
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

    it('rollback then re-update', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { static f () { this.n = 1 } })
      const tx = new Transaction()
      tx.update(() => A.f())
      expect(A.n).to.equal(1)
      tx.rollback()
      expect(typeof A.n).to.equal('undefined')
      tx.update(() => A.f())
      await tx.publish()
      expect(A.n).to.equal(1)
      await run.load(A.location)
      expect(A.n).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('rollback then re-upgrade', async () => {
      const run = new Run()
      const A = run.deploy(class A extends Jig { })
      class B extends Jig { }
      const tx = new Transaction()
      tx.update(() => A.upgrade(B))
      tx.rollback()
      tx.update(() => A.upgrade(B))
      await tx.publish()
      expect(A.name).to.equal('B')
      run.cache = new LocalCache()
      await run.load(A.location)
      expect(A.name).to.equal('B')
    })

    // ------------------------------------------------------------------------

    it('rollback then re-destroy', async () => {
      const run = new Run()
      class A extends Jig { destroy () { super.destroy(); this.destroyed = true }}
      const a = new A()
      const tx = new Transaction()
      tx.update(() => a.destroy())
      expect(a.destroyed).to.equal(true)
      tx.rollback()
      expect(!!a.destroyed).to.equal(false)
      tx.update(() => a.destroy())
      await tx.publish()
      const a2 = await run.load(a.location)
      expect(a2.destroyed).to.equal(true)
    })

    // ------------------------------------------------------------------------

    it('rollback twice', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => run.deploy(A))
      tx.rollback()
      tx.rollback()
      await run.sync()
      expect(typeof Object.getOwnPropertyDescriptor(A, 'location')).to.equal('undefined')
      expect(typeof Object.getOwnPropertyDescriptor(A, 'presets')).to.equal('undefined')
    })

    // ------------------------------------------------------------------------

    it('rollback after export', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => new A())
      const rawtx = await tx.export()
      tx.rollback()
      const tx2 = await run.import(rawtx)
      await tx2.publish()
      expect(tx2.outputs.length).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('throws if rollback after publish', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const tx = new Transaction()
      tx.update(() => new A())
      await tx.publish()
      const error = 'rollback disabled once published'
      expect(() => tx.rollback()).to.throw(error)
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
    it('outputs', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      const tx = new Transaction()
      tx.update(() => a.auth())
      const b = tx.update(() => new A())
      expect(tx.outputs.length).to.equal(2)
      expect(tx.outputs[0]).to.equal(a)
      expect(tx.outputs[1]).to.equal(b)
      tx.update(() => b.destroy())
      expect(tx.outputs).to.deep.equal([a])
    })

    // ------------------------------------------------------------------------

    it('deletes', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      const tx = new Transaction()
      tx.update(() => a.destroy())
      expect(tx.deletes).to.deep.equal([a])
    })

    // ------------------------------------------------------------------------

    it('newly created deletes', () => {
      const run = new Run()
      const tx = new Transaction()
      class A { }
      tx.update(() => { run.deploy(A).destroy() })
      expect(tx.deletes.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('stores states after', () => {
      new Run() // eslint-disable-line
      class A extends Jig {
        destroy () { super.destroy(); this.n = 1 }
        static f () { this.m = 2 }
      }
      const tx = new Transaction()
      const a = new A()
      tx.update(() => a.destroy())
      tx.update(() => a.constructor.f())
      expect(tx.deletes[0].n).to.equal(1)
      expect(tx.outputs[0].m).to.equal(2)
    })

    // ------------------------------------------------------------------------

    it('correct after import', async () => {
      const run = new Run()
      class A extends Jig { }
      const tx = new Transaction()
      const a = tx.update(() => new A())
      tx.update(() => a.destroy())
      const rawtx = await tx.export()
      const tx2 = await run.import(rawtx)
      expect(tx2.outputs.length).to.equal(1)
      expect(tx2.deletes.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('cannot be modified', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      const tx = new Transaction()
      tx.update(() => a.destroy())
      tx.update(() => new A())
      tx.outputs.shift()
      expect(tx.outputs.length).to.equal(1)
      tx.deletes.push(1)
      expect(tx.deletes.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('empty after rollback', () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      const tx = new Transaction()
      tx.update(() => a.destroy())
      tx.update(() => new A())
      tx.rollback()
      expect(tx.outputs.length).to.equal(0)
      expect(tx.deletes.length).to.equal(0)
    })

    // ------------------------------------------------------------------------

    it('persists after publish', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      const tx = new Transaction()
      tx.update(() => a.destroy())
      tx.update(() => new A())
      await tx.publish()
      expect(tx.outputs.length).to.equal(1)
      expect(tx.deletes.length).to.equal(1)
    })

    // ------------------------------------------------------------------------

    it('persists after export', async () => {
      new Run() // eslint-disable-line
      class A extends Jig { }
      const a = new A()
      const tx = new Transaction()
      tx.update(() => a.destroy())
      tx.update(() => new A())
      await tx.export()
      expect(tx.outputs.length).to.equal(1)
      expect(tx.deletes.length).to.equal(1)
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

    if (STRESS) {
      it('many open transactions', async () => {
        const run = new Run()
        for (let i = 0; i < 1000; i++) {
          class A extends Jig { }
          const tx = new Transaction()
          tx.update(() => new A())
        }
        await run.sync()
      })
    }
  })
})

// ------------------------------------------------------------------------------------------------
