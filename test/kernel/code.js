/**
 * code.js
 *
 * Tests for kernel code sandboxing, deploying, and loading
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('../config')
const code = Run._code

describe.only('Code', () => {
  describe('sourceCode', () => {
    it('test', () => {
      class A { }
      const A2 = A
      class B extends A2 {}
      expect(code.sourceCode(B)).to.equal('class B extends A {}')
    })
  })

  describe('makeFunctionProxy', () => {
    it('should handle basic instances', () => {
      class A { }
      const A2 = code.makeFunctionProxy(A)

      expect(A === A2)
      expect(new A() instanceof A).to.equal(true)
      expect(new A() instanceof A2).to.equal(true)
      expect(new A2() instanceof A).to.equal(true)
      expect(new A2() instanceof A2).to.equal(true)

      expect(new A().constructor).to.equal(A)
      expect(new A().constructor).not.to.equal(A2)
      expect(new A2().constructor).not.to.equal(A)
      expect(new A2().constructor).to.equal(A2)

      expect(Object.getPrototypeOf(new A())).to.equal(A.prototype)
      expect(Object.getPrototypeOf(new A())).to.equal(A2.prototype)
      expect(Object.getPrototypeOf(new A2())).to.equal(A.prototype)
      expect(Object.getPrototypeOf(new A2())).to.equal(A2.prototype)
    })

    it('should handle child class instances', () => {

    })
  })
})
