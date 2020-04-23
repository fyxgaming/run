/**
 * owner.js
 *
 * Tests common for all owners
 */

const { HDPrivateKey } = require('bsv')
const { describe, it } = require('mocha')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const { Run } = require('../env/config')
const { Jig, asm } = Run

// ------------------------------------------------------------------------------------------------
// Owner
// ------------------------------------------------------------------------------------------------

describe('Owner', () => {
  new Run() // eslint-disable-line

  describe('next', () => {
    it('should call next() for every new jig or code', async () => {
      // Hook next() to count the number of times its called
      const owner = new Run().owner
      const oldNext = owner.next
      let nextCount = 0
      owner.next = () => { nextCount++; return oldNext.call(owner) }

      // Create a jig and code, checking when next() is called
      class A extends Jig { }
      const run = new Run({ owner })
      expect(nextCount).to.equal(0)

      run.deploy(A)
      expect(nextCount).to.equal(1)

      const a = new A()
      expect(nextCount).to.equal(2)

      await a.sync()
      expect(nextCount).to.equal(2)
    })

    it('should support creating new locks for every resource', async () => {
      class HDOwner {
        constructor () {
          this.master = new HDPrivateKey()
          this.n = 0
        }

        next () { return this.addr(this.n++) }

        async sign (tx, locks) {
          for (let i = 0; i < this.n; i++) {
            tx.sign(this.master.deriveChild(i).privateKey)
          }
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

    it('should fail to create resources if next() throws', () => {
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
        get script () { return asm('OP_1 OP_1 OP_ADD OP_EQUAL') }
      }

      OnePlusOneLock.deps = { asm }

      class CustomOwner {
        next () { return new OnePlusOneLock() }

        async sign (tx, locks) {
          tx.inputs
            .filter((_, n) => locks[n] instanceof OnePlusOneLock)
            .forEach(input => input.setScript('OP_2'))
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
        get script () { return asm('OP_1 OP_1 OP_ADD OP_EQUAL') }
      }

      OnePlusOneLock.deps = { asm }

      class CustomOwner {
        next () { return new OnePlusOneLock() }

        async sign (tx, locks) {
          tx.inputs
            .filter((_, n) => locks[n] instanceof OnePlusOneLock)
            .forEach(input => input.setScript('OP_3'))
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
      await expect(a.sync()).to.be.rejectedWith('tx signature not valid')
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

    it('should pass StandardLock for address resource owner', () => {
      // Jig / Code
    })

    it('should pass StandardLock for pubkey resource owner', () => {
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

  describe('ours', () => {
    it('should support owner without ours method', () => {
    })

    it('should add to inventory if returns true', () => {
    })

    it('should not add to inventory if returns false', () => {
    })

    it('should rethrow error in sync if ours throws', () => {
    })
  })

  describe('locations', () => {
    it('should support owner without ours method', () => {
    })

    it('should use locations for inventory sync', () => {
    })

    it('should throw if locations does not return valid array', () => {
    })

    it('should log errors if locations do not load', () => {
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
