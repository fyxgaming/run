const { describe, it, beforeEach } = require('mocha')
const { expect } = require('chai')
const { Run, createRun, deploy } = require('./helpers')

describe('expect', () => {
  const run = createRun()
  beforeEach(() => run.activate())
  beforeEach(() => run.blockchain.block())

  it('toBe', () => {
    expect(() => Run.expect(1).toBe(1)).not.to.throw()
    expect(() => Run.expect('hello').toBe('hello')).not.to.throw()
    expect(() => Run.expect(null).toBe(null)).not.to.throw()
    expect(() => Run.expect({}).toBe({})).to.throw('expected value to be {} but was {}')
    expect(() => Run.expect(1).not.toBe(2)).not.to.throw()
    expect(() => Run.expect({}).not.toBe({})).not.to.throw()
    expect(() => Run.expect(null).not.toBe(null)).to.throw('expected value not to be null but was null')
  })

  it('toEqual', () => {
    expect(() => Run.expect(1).toEqual(1)).not.to.throw()
    expect(() => Run.expect(true).toEqual(true)).not.to.throw()
    expect(() => Run.expect({}).toEqual({})).not.to.throw()
    expect(() => Run.expect({ a: [1] }).toEqual({ a: [1] })).not.to.throw()
    expect(() => Run.expect([1, '2', { n: 3 }]).toEqual([1, '2', { n: 3 }])).not.to.throw()
    expect(() => Run.expect([1]).toEqual([2])).to.throw('expected value to be equal to [2] but was [1]')
    expect(() => Run.expect(new class A {}()).toEqual(new class B {}())).not.to.throw()
    expect(() => Run.expect({ a: 1 }).not.toEqual({ a: 2 })).not.to.throw()
    expect(() => Run.expect(new class A {}()).not.toEqual({ })).to.throw('expected value not to be equal to {} but was {}')
  })

  it('toBeInstanceOf', () => {
    class A {}
    class B extends A {}
    expect(() => Run.expect(new A()).toBeInstanceOf(A)).not.to.throw()
    expect(() => Run.expect(new B()).toBeInstanceOf(B)).not.to.throw()
    expect(() => Run.expect(new B()).toBeInstanceOf(A)).not.to.throw()
    expect(() => Run.expect([]).toBeInstanceOf(Array)).not.to.throw()
    expect(() => Run.expect(1).toBeInstanceOf(A)).to.throw('expected value to be an instance of A but was 1')
    expect(() => Run.expect(new A()).not.toBeInstanceOf(B)).not.to.throw()
    expect(() => Run.expect(new A()).not.toBeInstanceOf(A)).to.throw('expected value not to be an instance of A but was {}')
  })

  it('toBeDefined', () => {
    expect(() => Run.expect(1).toBeDefined()).not.to.throw()
    expect(() => Run.expect(undefined).toBeDefined()).to.throw('expected value to be defined but was undefined')
    expect(() => Run.expect().not.toBeDefined()).not.to.throw()
    expect(() => Run.expect(undefined).not.toBeDefined()).not.to.throw()
    expect(() => Run.expect(0).not.toBeDefined()).to.throw('expected value not to be defined but was 0')
  })

  it('toBeNull', () => {
    expect(() => Run.expect(null).toBeNull()).not.to.throw()
    expect(() => Run.expect(0).toBeNull()).to.throw('expected value to be null but was 0')
    expect(() => Run.expect(false).not.toBeNull()).not.to.throw()
    expect(() => Run.expect(null).not.toBeNull()).to.throw('expected value not to be null but was null')
  })

  it('toBeNumber', () => {
    expect(() => Run.expect(0).toBeNumber()).not.to.throw()
    expect(() => Run.expect(5).toBeNumber()).not.to.throw()
    expect(() => Run.expect(1.1).toBeNumber()).not.to.throw()
    expect(() => Run.expect(NaN).toBeNumber()).not.to.throw()
    expect(() => Run.expect(Infinity).toBeNumber()).not.to.throw()
    expect(() => Run.expect(false).toBeNumber()).to.throw('expected value to be a number but was false')
    expect(() => Run.expect('0').toBeNumber('bad argument')).to.throw('bad argument')
    expect(() => Run.expect('hello').not.toBeNumber()).not.to.throw()
    expect(() => Run.expect(5).not.toBeNumber()).to.throw('expected value not to be a number but was 5')
  })

  it('toBeInteger', () => {
    expect(() => Run.expect(0).toBeInteger()).not.to.throw()
    expect(() => Run.expect(1).toBeInteger()).not.to.throw()
    expect(() => Run.expect(1.1).toBeInteger()).to.throw('expected value to be an integer but was 1.1')
    expect(() => Run.expect(NaN).toBeInteger()).to.throw('expected value to be an integer but was NaN')
    expect(() => Run.expect(false).toBeInteger()).to.throw('expected value to be an integer but was false')
    expect(() => Run.expect('hello').not.toBeInteger()).not.to.throw()
    expect(() => Run.expect(5).not.toBeInteger()).to.throw('expected value not to be an integer but was 5')
  })

  it('toBeLessThan', () => {
    expect(() => Run.expect(0).toBeLessThan(1)).not.to.throw()
    expect(() => Run.expect(-1.2).toBeLessThan(-1.1)).not.to.throw()
    expect(() => Run.expect(false).toBeLessThan(0)).to.throw('expected value to be less than 0 but was false')
    expect(() => Run.expect(0).not.toBeLessThan(0)).not.to.throw()
    expect(() => Run.expect(-1).not.toBeLessThan(0)).to.throw('expected value not to be less than 0 but was -1')
  })

  it('toBeLessThanOrEqualTo', () => {
    expect(() => Run.expect(1).toBeLessThanOrEqualTo(1)).not.to.throw()
    expect(() => Run.expect(-1.2).toBeLessThanOrEqualTo(-1.1)).not.to.throw()
    expect(() => Run.expect(false).toBeLessThanOrEqualTo(0)).to.throw('expected value to be less than or equal to 0 but was false')
    expect(() => Run.expect(1).not.toBeLessThanOrEqualTo(0)).not.to.throw()
    expect(() => Run.expect(0).not.toBeLessThanOrEqualTo(0)).to.throw('expected value not to be less than or equal to 0 but was 0')
  })

  it('toBeGreaterThan', () => {
    expect(() => Run.expect(1).toBeGreaterThan(0)).not.to.throw()
    expect(() => Run.expect(-1.1).toBeGreaterThan(-1.2)).not.to.throw()
    expect(() => Run.expect(false).toBeGreaterThan(0)).to.throw('expected value to be greater than 0 but was false')
    expect(() => Run.expect(0).not.toBeGreaterThan(0)).not.to.throw()
    expect(() => Run.expect(0).not.toBeGreaterThan(-1)).to.throw('expected value not to be greater than -1 but was 0')
  })

  it('toBeGreaterThanOrEqualTo', () => {
    expect(() => Run.expect(1).toBeGreaterThanOrEqualTo(1)).not.to.throw()
    expect(() => Run.expect(-1.1).toBeGreaterThanOrEqualTo(-1.2)).not.to.throw()
    expect(() => Run.expect(false).toBeGreaterThanOrEqualTo(0)).to.throw('expected value to be greater than or equal to 0 but was false')
    expect(() => Run.expect(0).not.toBeGreaterThanOrEqualTo(1)).not.to.throw()
    expect(() => Run.expect(0).not.toBeGreaterThanOrEqualTo(0)).to.throw('expected value not to be greater than or equal to 0 but was 0')
  })

  it('toBeBoolean', () => {
    expect(() => Run.expect(true).toBeBoolean()).not.to.throw()
    expect(() => Run.expect(1).toBeBoolean()).to.throw('expected value to be a boolean but was 1')
    expect(() => Run.expect('true').not.toBeBoolean()).not.to.throw()
    expect(() => Run.expect(false).not.toBeBoolean()).to.throw('expected value not to be a boolean but was false')
  })

  it('toBeString', () => {
    expect(() => Run.expect('hello').toBeString()).not.to.throw()
    expect(() => Run.expect(true).toBeString()).to.throw('expected value to be a string but was true')
    expect(() => Run.expect(1).not.toBeString()).not.to.throw()
    expect(() => Run.expect('hello').not.toBeString()).to.throw('expected value not to be a string but was hello')
  })

  it('toBeObject', () => {
    expect(() => Run.expect({}).toBeObject()).not.to.throw()
    expect(() => Run.expect([1, 2, 3]).toBeObject()).not.to.throw()
    expect(() => Run.expect(null).toBeObject()).to.throw('expected value to be an object but was null')
    expect(() => Run.expect(true).toBeObject()).to.throw('expected value to be an object but was true')
    expect(() => Run.expect(1).not.toBeObject()).not.to.throw()
    expect(() => Run.expect(null).not.toBeObject()).not.to.throw()
    expect(() => Run.expect({}).not.toBeObject()).to.throw('expected value not to be an object but was {}')
  })

  it('toBeArray', () => {
    expect(() => Run.expect([]).toBeArray()).not.to.throw()
    expect(() => Run.expect(new Array(1)).toBeArray()).not.to.throw()
    expect(() => Run.expect({}).toBeArray()).to.throw('expected value to be an array but was {}')
    expect(() => Run.expect(1).not.toBeArray()).not.to.throw()
    expect(() => Run.expect(null).not.toBeArray()).not.to.throw()
    expect(() => Run.expect([1, 2]).not.toBeArray()).to.throw('expected value not to be an array but was [1,2]')
  })

  it('toBeClass', () => {
    expect(() => Run.expect(class A {}).toBeClass()).not.to.throw()
    expect(() => Run.expect(class {}).toBeClass()).not.to.throw()
    expect(() => Run.expect(function f () {}).toBeClass()).to.throw('expected value to be a class but was')
    expect(() => Run.expect(() => {}).toBeClass()).to.throw('expected value to be a class but was')
    expect(() => Run.expect({}).not.toBeClass()).not.to.throw()
    expect(() => Run.expect(class A {}).not.toBeClass()).to.throw('expected value not to be a class but was')
  })

  it('toBeFunction', () => {
    expect(() => Run.expect(function f () {}).toBeFunction()).not.to.throw()
    expect(() => Run.expect(() => {}).toBeFunction()).not.to.throw()
    expect(() => Run.expect(class A {}).toBeFunction()).to.throw('expected value to be a function but was class A {}')
    expect(() => Run.expect(class {}).toBeFunction()).to.throw('expected value to be a function but was class {}')
    expect(() => Run.expect([]).not.toBeFunction()).not.to.throw()
    expect(() => Run.expect(() => {}).not.toBeFunction()).to.throw('expected value not to be a function but was () => {}')
  })

  it.skip('deploy', async () => {
    await deploy(Run.expect)
  })
})
