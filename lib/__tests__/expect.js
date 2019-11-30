const { createRun, Run, deploy } = require('./test-util')

const run = createRun()
beforeEach(() => run.blockchain.block())

describe('expect', () => {
  test('toBe', () => {
    expect(() => Run.expect(1).toBe(1)).not.toThrow()
    expect(() => Run.expect('hello').toBe('hello')).not.toThrow()
    expect(() => Run.expect(null).toBe(null)).not.toThrow()
    expect(() => Run.expect({}).toBe({})).toThrow('expected value to be {} but was {}')
    expect(() => Run.expect(1).not.toBe(2)).not.toThrow()
    expect(() => Run.expect({}).not.toBe({})).not.toThrow()
    expect(() => Run.expect(null).not.toBe(null)).toThrow('expected value not to be null but was null')
  })

  test('toEqual', () => {
    expect(() => Run.expect(1).toEqual(1)).not.toThrow()
    expect(() => Run.expect(true).toEqual(true)).not.toThrow()
    expect(() => Run.expect({}).toEqual({})).not.toThrow()
    expect(() => Run.expect({ a: [1] }).toEqual({ a: [1] })).not.toThrow()
    expect(() => Run.expect([1, '2', { n: 3 }]).toEqual([1, '2', { n: 3 }])).not.toThrow()
    expect(() => Run.expect([1]).toEqual([2])).toThrow('expected value to be equal to [2] but was [1]')
    expect(() => Run.expect(new class A {}()).toEqual(new class B {}())).not.toThrow()
    expect(() => Run.expect({ a: 1 }).not.toEqual({ a: 2 })).not.toThrow()
    expect(() => Run.expect(new class A {}()).not.toEqual({ })).toThrow('expected value not to be equal to {} but was {}')
  })

  test('toBeInstanceOf', () => {
    class A {}
    class B extends A {}
    expect(() => Run.expect(new A()).toBeInstanceOf(A)).not.toThrow()
    expect(() => Run.expect(new B()).toBeInstanceOf(B)).not.toThrow()
    expect(() => Run.expect(new B()).toBeInstanceOf(A)).not.toThrow()
    expect(() => Run.expect([]).toBeInstanceOf(Array)).not.toThrow()
    expect(() => Run.expect(1).toBeInstanceOf(A)).toThrow('expected value to be an instance of A but was 1')
    expect(() => Run.expect(new A()).not.toBeInstanceOf(B)).not.toThrow()
    expect(() => Run.expect(new A()).not.toBeInstanceOf(A)).toThrow('expected value not to be an instance of A but was {}')
  })

  test('toBeDefined', () => {
    expect(() => Run.expect(1).toBeDefined()).not.toThrow()
    expect(() => Run.expect(undefined).toBeDefined()).toThrow('expected value to be defined but was undefined')
    expect(() => Run.expect().not.toBeDefined()).not.toThrow()
    expect(() => Run.expect(undefined).not.toBeDefined()).not.toThrow()
    expect(() => Run.expect(0).not.toBeDefined()).toThrow('expected value not to be defined but was 0')
  })

  test('toBeNull', () => {
    expect(() => Run.expect(null).toBeNull()).not.toThrow()
    expect(() => Run.expect(0).toBeNull()).toThrow('expected value to be null but was 0')
    expect(() => Run.expect(false).not.toBeNull()).not.toThrow()
    expect(() => Run.expect(null).not.toBeNull()).toThrow('expected value not to be null but was null')
  })

  test('toBeNumber', () => {
    expect(() => Run.expect(0).toBeNumber()).not.toThrow()
    expect(() => Run.expect(5).toBeNumber()).not.toThrow()
    expect(() => Run.expect(1.1).toBeNumber()).not.toThrow()
    expect(() => Run.expect(NaN).toBeNumber()).not.toThrow()
    expect(() => Run.expect(Infinity).toBeNumber()).not.toThrow()
    expect(() => Run.expect(false).toBeNumber()).toThrow('expected value to be a number but was false')
    expect(() => Run.expect('0').toBeNumber('bad argument')).toThrow('bad argument')
    expect(() => Run.expect('hello').not.toBeNumber()).not.toThrow()
    expect(() => Run.expect(5).not.toBeNumber()).toThrow('expected value not to be a number but was 5')
  })

  test('toBeInteger', () => {
    expect(() => Run.expect(0).toBeInteger()).not.toThrow()
    expect(() => Run.expect(1).toBeInteger()).not.toThrow()
    expect(() => Run.expect(1.1).toBeInteger()).toThrow('expected value to be an integer but was 1.1')
    expect(() => Run.expect(NaN).toBeInteger()).toThrow('expected value to be an integer but was NaN')
    expect(() => Run.expect(false).toBeInteger()).toThrow('expected value to be an integer but was false')
    expect(() => Run.expect('hello').not.toBeInteger()).not.toThrow()
    expect(() => Run.expect(5).not.toBeInteger()).toThrow('expected value not to be an integer but was 5')
  })

  test('toBeLessThan', () => {
    expect(() => Run.expect(0).toBeLessThan(1)).not.toThrow()
    expect(() => Run.expect(-1.2).toBeLessThan(-1.1)).not.toThrow()
    expect(() => Run.expect(false).toBeLessThan(0)).toThrow('expected value to be less than 0 but was false')
    expect(() => Run.expect(0).not.toBeLessThan(0)).not.toThrow()
    expect(() => Run.expect(-1).not.toBeLessThan(0)).toThrow('expected value not to be less than 0 but was -1')
  })

  test('toBeLessThanOrEqualTo', () => {
    expect(() => Run.expect(1).toBeLessThanOrEqualTo(1)).not.toThrow()
    expect(() => Run.expect(-1.2).toBeLessThanOrEqualTo(-1.1)).not.toThrow()
    expect(() => Run.expect(false).toBeLessThanOrEqualTo(0)).toThrow('expected value to be less than or equal to 0 but was false')
    expect(() => Run.expect(1).not.toBeLessThanOrEqualTo(0)).not.toThrow()
    expect(() => Run.expect(0).not.toBeLessThanOrEqualTo(0)).toThrow('expected value not to be less than or equal to 0 but was 0')
  })

  test('toBeGreaterThan', () => {
    expect(() => Run.expect(1).toBeGreaterThan(0)).not.toThrow()
    expect(() => Run.expect(-1.1).toBeGreaterThan(-1.2)).not.toThrow()
    expect(() => Run.expect(false).toBeGreaterThan(0)).toThrow('expected value to be greater than 0 but was false')
    expect(() => Run.expect(0).not.toBeGreaterThan(0)).not.toThrow()
    expect(() => Run.expect(0).not.toBeGreaterThan(-1)).toThrow('expected value not to be greater than -1 but was 0')
  })

  test('toBeGreaterThanOrEqualTo', () => {
    expect(() => Run.expect(1).toBeGreaterThanOrEqualTo(1)).not.toThrow()
    expect(() => Run.expect(-1.1).toBeGreaterThanOrEqualTo(-1.2)).not.toThrow()
    expect(() => Run.expect(false).toBeGreaterThanOrEqualTo(0)).toThrow('expected value to be greater than or equal to 0 but was false')
    expect(() => Run.expect(0).not.toBeGreaterThanOrEqualTo(1)).not.toThrow()
    expect(() => Run.expect(0).not.toBeGreaterThanOrEqualTo(0)).toThrow('expected value not to be greater than or equal to 0 but was 0')
  })

  test('toBeBoolean', () => {
    expect(() => Run.expect(true).toBeBoolean()).not.toThrow()
    expect(() => Run.expect(1).toBeBoolean()).toThrow('expected value to be a boolean but was 1')
    expect(() => Run.expect('true').not.toBeBoolean()).not.toThrow()
    expect(() => Run.expect(false).not.toBeBoolean()).toThrow('expected value not to be a boolean but was false')
  })

  test('toBeString', () => {
    expect(() => Run.expect('hello').toBeString()).not.toThrow()
    expect(() => Run.expect(true).toBeString()).toThrow('expected value to be a string but was true')
    expect(() => Run.expect(1).not.toBeString()).not.toThrow()
    expect(() => Run.expect('hello').not.toBeString()).toThrow('expected value not to be a string but was hello')
  })

  test('toBeObject', () => {
    expect(() => Run.expect({}).toBeObject()).not.toThrow()
    expect(() => Run.expect([1, 2, 3]).toBeObject()).not.toThrow()
    expect(() => Run.expect(null).toBeObject()).toThrow('expected value to be an object but was null')
    expect(() => Run.expect(true).toBeObject()).toThrow('expected value to be an object but was true')
    expect(() => Run.expect(1).not.toBeObject()).not.toThrow()
    expect(() => Run.expect(null).not.toBeObject()).not.toThrow()
    expect(() => Run.expect({}).not.toBeObject()).toThrow('expected value not to be an object but was {}')
  })

  test('toBeArray', () => {
    expect(() => Run.expect([]).toBeArray()).not.toThrow()
    expect(() => Run.expect(new Array(1)).toBeArray()).not.toThrow()
    expect(() => Run.expect({}).toBeArray()).toThrow('expected value to be an array but was {}')
    expect(() => Run.expect(1).not.toBeArray()).not.toThrow()
    expect(() => Run.expect(null).not.toBeArray()).not.toThrow()
    expect(() => Run.expect([1, 2]).not.toBeArray()).toThrow('expected value not to be an array but was [1,2]')
  })

  test('toBeClass', () => {
    expect(() => Run.expect(class A {}).toBeClass()).not.toThrow()
    expect(() => Run.expect(class {}).toBeClass()).not.toThrow()
    expect(() => Run.expect(function f () {}).toBeClass()).toThrow('expected value to be a class but was function f() {}')
    expect(() => Run.expect(() => {}).toBeClass()).toThrow('expected value to be a class but was () => {}')
    expect(() => Run.expect({}).not.toBeClass()).not.toThrow()
    expect(() => Run.expect(class A {}).not.toBeClass()).toThrow('expected value not to be a class but was class A {}')
  })

  test('toBeFunction', () => {
    expect(() => Run.expect(function f () {}).toBeFunction()).not.toThrow()
    expect(() => Run.expect(() => {}).toBeFunction()).not.toThrow()
    expect(() => Run.expect(class A {}).toBeFunction()).toThrow('expected value to be a function but was class A {}')
    expect(() => Run.expect(class {}).toBeFunction()).toThrow('expected value to be a function but was class {}')
    expect(() => Run.expect([]).not.toBeFunction()).not.toThrow()
    expect(() => Run.expect(() => {}).not.toBeFunction()).toThrow('expected value not to be a function but was () => {}')
  })

  test.skip('deploy', async () => {
    await deploy(Run.expect)
  })
})
