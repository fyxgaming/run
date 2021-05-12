/**
 * owner.js
 *
 * Tests for owner binding changes
 */

const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const Run = require('../env/run')
const { expectTx } = require('../env/misc')
const { Jig } = Run
const { LocalCache } = Run.plugins
const PrivateKey = require('bsv/lib/privatekey')

// ------------------------------------------------------------------------------------------------
// Owner
// ------------------------------------------------------------------------------------------------

describe('Owner', () => {
  it('assigned to creator owner', async () => {
    const run = new Run()
    class A extends Jig { init () { this.ownerAtInit = this.owner } }
    class B extends Jig { create () { return new A() } }
    B.deps = { A }
    function test (a, b) {
      expect(a.owner).to.equal(b.owner)
      expect(a.ownerAtInit).to.equal(b.owner)
    }
    const b = new B()
    await b.sync()
    const a = b.create()
    test(a, b)
    await a.sync()
    const a2 = await run.load(a.location)
    const b2 = await run.load(b.location)
    test(a2, b2)
    run.cache = new LocalCache()
    const a3 = await run.load(a.location)
    const b3 = await run.load(b.location)
    test(a3, b3)
  })

  // --------------------------------------------------------------------------

  it('set owner during init', async () => {
    const run = new Run()
    class A extends Jig { init (owner) { this.owner = owner } }
    const network = run.blockchain.network === 'main' ? 'mainnet' : 'testnet'
    const addr = new PrivateKey(network).toPublicKey().toAddress().toString()
    function test (a) { expect(a.owner).to.equal(addr) }
    const a = new A(addr)
    await a.sync()
    test(a)
    const a2 = await run.load(a.location)
    test(a2)
    run.cache = new LocalCache()
    const a3 = await run.load(a.location)
    test(a3)
  })

  // --------------------------------------------------------------------------

  it('may change assigned creator owner in transaction', async () => {
    const run = new Run()
    class A extends Jig { f (owner) { this.owner = owner } }
    class B extends Jig { static g () { return new A() } }
    B.deps = { A }
    const CB = run.deploy(B)
    const a = run.transaction(() => {
      const a = CB.g()
      a.f(run.purse.address)
      return a
    })
    await run.sync()
    function test (a) { expect(a.owner).to.equal(run.purse.address) }
    test(a)
    const a2 = await run.load(a.location)
    test(a2)
    run.cache = new LocalCache()
    const a3 = await run.load(a.location)
    test(a3)
  })

  // --------------------------------------------------------------------------

  it('throws if creator owner is undetermined', () => {
    new Run() // eslint-disable-line
    class A extends Jig { init () { this.ownerAtInit = this.owner } }
    class B extends Jig { create () { return new A() } }
    B.deps = { A }
    const b = new B()
    expect(() => b.create()).to.throw('Cannot read owner')
  })

  // --------------------------------------------------------------------------

  it('throws if read before assigned', () => {
    new Run() // eslint-disable-line
    class A extends Jig { init () { this.ownerAtInit = this.owner }}
    expect(() => new A()).to.throw('Cannot read owner')
  })

  // --------------------------------------------------------------------------

  it('throws if invalid', () => {
    new Run() // eslint-disable-line
    class A extends Jig { f (owner) { this.owner = owner } }
    const a = new A()
    expect(() => a.f(new PrivateKey().publicKey)).to.throw()
    expect(() => a.f('123')).to.throw()
    expect(() => a.f(null)).to.throw()
    expect(() => a.f(undefined)).to.throw()
  })

  // --------------------------------------------------------------------------

  it('throws if delete bound owner', () => {
    new Run() // eslint-disable-line
    class A extends Jig { f () { delete this.owner }}
    const a = new A()
    expect(() => { delete a.owner }).to.throw('Cannot delete owner')
    expect(() => a.f()).to.throw('Cannot delete owner')
  })

  // --------------------------------------------------------------------------

  it('delete in init', () => {
    new Run() // eslint-disable-line
    class A extends Jig {
      init () {
        this.destroy()
      }
    }
    expect(() => new A()).not.to.throw()
  })

  // --------------------------------------------------------------------------

  it('throws if delete unassigned owner in transaction', () => {
    const run = new Run()
    class A extends Jig { }
    const error = 'delete disabled: [jig A] has an unbound owner or satoshis value'
    expect(() => run.transaction(() => new A().destroy())).to.throw(error)
  })

  // --------------------------------------------------------------------------

  it('throws if delete unbound owner from another method', () => {
    const run = new Run()
    class A extends Jig { init (owner) { this.owner = owner } }
    class B extends Jig { f (owner) { new A(owner).destroy() } }
    B.deps = { A }
    const error = 'delete disabled: [jig A] has an unbound owner or satoshis value'
    const b = new B()
    expect(() => b.f(run.purse.address)).to.throw(error)
  })

  // --------------------------------------------------------------------------

  it('throws if set externally', () => {
    new Run () // eslint-disable-line
    class A extends Jig { }
    const a = new A()
    const error = 'Attempt to update [jig A] outside of a method'
    const addr = new PrivateKey().publicKey.toAddress().toString()
    expect(() => { a.owner = addr }).to.throw(error)
  })

  // --------------------------------------------------------------------------

  it('throws if set to address on another network', async () => {
    new Run() // eslint-disable-line
    class A extends Jig { send (addr) { this.owner = addr } }
    const a = new A()
    await a.sync()
    const addr = new PrivateKey('mainnet').toAddress().toString()
    a.send(addr)
    await expect(a.sync()).to.be.rejectedWith('Invalid owner')
  })

  // --------------------------------------------------------------------------

  it('may change until marked unbound', () => {
    new Run() // eslint-disable-line
    class A extends Jig { f (owner) { this.owner = owner; this.owner = owner } }
    const addr = new PrivateKey().toAddress().toString()
    const a = new A(addr)
    expect(() => a.f(addr)).not.to.throw()
  })

  // --------------------------------------------------------------------------

  it('bound if creator is fully bound', async () => {
    const run = new Run()
    class A extends Jig {
      f () { return new A().g() }
      g () { this.n = 1; return this }
    }
    const a = new A()
    await a.sync()
    const b = a.f()
    await b.sync()
    expect(b.n).to.equal(1)
    const b2 = await run.load(b.location)
    expect(b2.n).to.equal(1)
    run.cache = new LocalCache()
    const b3 = await run.load(b.location)
    expect(b3.n).to.equal(1)
  })

  // --------------------------------------------------------------------------

  it('throws if creator is pending unbind', async () => {
    const run = new Run()
    class A extends Jig {
      f (owner) { this.owner = owner; return new A().g() }
      g () { this.n = 1; return this }
    }
    const a = new A()
    await a.sync()
    const error = 'Cannot set n: unbound'
    expect(() => a.f(run.purse.address)).to.throw(error)
  })

  // --------------------------------------------------------------------------

  it('throws if creator is pending unbind in transaction', async () => {
    const run = new Run()
    class A extends Jig {
      f (owner) { this.owner = owner; return new A() }
      g () { this.n = 1; return this }
    }
    const a = new A()
    await a.sync()
    run.transaction(() => {
      const b = a.f(run.purse.address)
      // b.g()
      return b
    })
  })

  // --------------------------------------------------------------------------

  it('throws if update after inner method leaves', () => {
    const run = new Run()
    class A extends Jig {
      f (b, owner) {
        b.g(this, owner)
        this.i()
      }

      h (owner) {
        this.owner = owner
      }

      i () {
        this.n = 1
      }
    }
    class B extends Jig {
      g (a, owner) {
        a.h(owner)
      }
    }
    const a = new A()
    const b = new B()
    expect(() => a.f(b, run.purse.address)).to.throw('Cannot set n: unbound')
  })

  // --------------------------------------------------------------------------

  it('reads jig', async () => {
    const run = new Run()
    class A extends Jig { f (a) { this.x = a.owner }}
    const a = new A()
    const b = new A()
    await run.sync()

    function test (a, b) { expect(b.x).to.equal(a.owner) }

    expectTx({
      nin: 1,
      nref: 2,
      nout: 1,
      ndel: 0,
      ncre: 0,
      exec: [
        {
          op: 'CALL',
          data: [{ $jig: 0 }, 'f', [{ $jig: 1 }]]
        }
      ]
    })

    b.f(a)
    test(a, b)
    await b.sync()

    const a2 = await run.load(a.location)
    const b2 = await run.load(b.location)
    test(a2, b2)

    run.cache = new LocalCache()
    const a3 = await run.load(a.location)
    const b3 = await run.load(b.location)
    test(a3, b3)
  })

  // --------------------------------------------------------------------------

  it('only class can create instance', async () => {
    class A extends Jig {
      init () { if (this.owner !== A.owner) throw new Error() }
      static create () { return new A() }
    }
    const run = new Run()
    const A2 = run.deploy(A)
    await A2.sync()
    expect(() => new A()).to.throw()
    const a = A2.create()
    await a.sync()
    await run.load(a.location)
    run.cache = new LocalCache()
    await run.load(a.location)
  })

  // TODO
  /*
  describe('address', () => {
    it.skip('should get address for every new jig or code', async () => {
      // Create a jig and code, checking when next() is called
      class A extends Jig { }
      const run = new Run()
      spy(run.owner)
      expect(run.owner.address.called).to.equal(0)

      run.deploy(A)
      expect(run.owner.address.called).to.equal(1)

      // const a = new A()
      // expect(nextCount).to.equal(2)

      // await a.sync()
      // expect(nextCount).to.equal(2)
    })

    it.skip('should support creating new locks for every resource', async () => {
      class HDOwner {
        constructor () {
          this.master = new HDPrivateKey()
          this.n = 0
        }

        nextOwner () { return this.addr(this.n++) }

        async sign (rawtx, parents, locks) {
          const tx = new Transaction(rawtx)
          for (let i = 0; i < this.n; i++) {
            tx.sign(this.master.deriveChild(i).privateKey)
          }
          return tx.toString('hex')
        }

        addr (n) {
          const child = this.master.deriveChild(n)
          const address = child.publicKey.toAddress()
          return address.toString()
        }
      }

      const owner = new HDOwner()
      const run = new Run({ owner })

      class A extends Jig { }
      function f () { }

      const a = new A()
      run.deploy(f)
      await run.sync()

      expect(a.owner).not.to.equal(A.owner)
      expect(A.owner).to.equal(owner.addr(0))
      expect(a.owner).to.equal(owner.addr(1))
      expect(f.owner).to.equal(owner.addr(2))
    })

    it.skip('should fail to create resources if next() throws', () => {
      // Hook next() to throw
      const owner = new Run().owner
      owner.next = () => { throw new Error('failed to get next') }

      // Create a jig, and make sure it errored upon create
      new Run({ owner }) // eslint-disable-line
      class A extends Jig { }
      expect(() => new A()).to.throw('failed to get next')
    })
  })

  describe('sign', () => {
    it('should support signing with custom scripts', async () => {
      class OnePlusOneLock {
        script () { return asm('OP_1 OP_1 OP_ADD OP_EQUAL') }
        domain () { return 1 }
      }

      OnePlusOneLock.deps = { asm }

      class CustomOwner {
        nextOwner () { return new OnePlusOneLock() }

        async sign (rawtx, parents, locks) {
          const tx = new Transaction(rawtx)

          tx.inputs
            .filter((_, n) => locks[n] instanceof OnePlusOneLock)
            .forEach(input => input.setScript('OP_2'))

          return tx.toString('hex')
        }
      }

      const owner = new CustomOwner()
      new Run({ owner }) // eslint-disable-line

      // Create the jig, which will set the custom owner
      class A extends Jig { set () { this.n = 1 } }
      const a = new A()
      await a.sync()
      expect(a.owner.constructor.name).to.equal('OnePlusOneLock')

      // Call a method, which will call our custom sign
      a.set()
      await a.sync()
      expect(a.n).to.equal(1)
    })

    it('should throw if script does not evaluate to true', async () => {
      class OnePlusOneLock {
        script () { return asm('OP_1 OP_1 OP_ADD OP_EQUAL') }
        domain () { return 1 }
      }

      OnePlusOneLock.deps = { asm }

      class CustomOwner {
        nextOwner () { return new OnePlusOneLock() }

        async sign (rawtx, parents, locks) {
          const tx = new Transaction(rawtx)

          tx.inputs
            .filter((_, n) => locks[n] instanceof OnePlusOneLock)
            .forEach(input => input.setScript('OP_3'))

          return tx.toString('hex')
        }
      }

      const owner = new CustomOwner()
      new Run({ owner }) // eslint-disable-line

      // Create the jig, which will set the custom owner
      class A extends Jig { set () { this.n = 1 } }
      const a = new A()
      await a.sync()
      expect(a.owner.constructor.name).to.equal('OnePlusOneLock')

      // Call a method, which will call our custom sign, and fail
      a.set()
      await expect(a.sync()).to.be.rejectedWith('mandatory-script-verify-flag-failed')
    })

    it('should rethrow error during sign', async () => {
      // Hook sign() to throw an error
      const owner = new Run().owner
      owner.sign = () => { throw new Error('failed to sign') }

      // Create a jig and code, and check for our error on sync
      class A extends Jig { }
      new Run({ owner }) // eslint-disable-line
      const a = new A()
      await expect(a.sync()).to.be.rejectedWith('failed to sign')
    })

    it('should throw if partially signed', () => {
    })

    it('should pass CommonLock for address resource owner', () => {
      // Jig / Code
    })

    it('should pass CommonLock for pubkey resource owner', () => {
      // Jig / Code
    })

    it('should pass custom lock for custom resource owner', () => {
      // Jig / Code
    })

    it('should pass custom locks with host intrinsics', () => {
      // Jig / Code
    })

    it('should pass locks for resource inputs and undefined for payment inputs', () => {
      // Custom lock
      // Payment input
    })

    it('should pass all undefined for empty transaction', () => {
    })
  })

  describe('lock owners', () => {
    it('should throw if Run owner is a Lock', () => {
    })

    it('should sync resources using lock', () => {
    })

    it('should create new resources with owner as lock', () => {
      // export
    })
  })

  describe('changing owners', () => {
    it('should call next on the new owner for new resources', () => {
    })

    it('should use prior owner for resources enqueued', () => {
    })

    it('should call sign on owner that was assigned when resource was created', () => {
    })

    it('should create a new inventory when owner changes', () => {
    })

    it('should leave existing inventory to be saved and reassigned', () => {
    })

    it('should support changing owners within batch transaction', () => {
    })
  })
  */
})

// ------------------------------------------------------------------------------------------------
