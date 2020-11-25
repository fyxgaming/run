/**
 * owner.js
 *
 * Owner API tests that should work across all owner implementations.
 */

const { spy } = require('sinon')
const { HDPrivateKey, Transaction } = require('bsv')
const { describe, it } = require('mocha')
require('chai').use(require('chai-as-promised'))
const { expect } = require('chai')
const { Run } = require('../env/config')
const { Jig } = Run
const { asm } = Run.extra

// ------------------------------------------------------------------------------------------------
// Owner tests
// ------------------------------------------------------------------------------------------------

describe('Owner', () => {
  new Run() // eslint-disable-line

  // Calls owner for every new jig created

  describe('address', () => {
    it.skip('should get address for every new jig or code', async () => {
      // Create a jig and code, checking when next() is called
      class A extends Jig { }
      const run = new Run()
      spy(run.owner)
      expect(run.owner.address.called).to.equal(0)

      run.deploy(A)
      expect(run.owner.address.called).to.equal(1)

      /*
      const a = new A()
      expect(nextCount).to.equal(2)

      await a.sync()
      expect(nextCount).to.equal(2)
      */
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
})

// ------------------------------------------------------------------------------------------------
