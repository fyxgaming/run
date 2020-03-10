/**
 * evaluator.js
 *
 * Tests for ../lib/evaluator.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { Run } = require('./helpers')
const { intrinsicNames } = require('../lib/intrinsics')

// ------------------------------------------------------------------------------------------------
// Evaluator test suite
// ------------------------------------------------------------------------------------------------

function runEvaluatorTestSuite (createEvaluator, destroyEvaluator) {
  describe('evaluate parameters', () => {
    it('should evaluate named function', () => {
      const evaluator = createEvaluator()
      const f = evaluator.evaluate('function f() { return 1 }').result
      expect(typeof f).to.equal('function')
      expect(f.name).to.equal('f')
      expect(f()).to.equal(1)
      destroyEvaluator(evaluator)
    })

    it('should evaluate anonymous function', () => {
      const evaluator = createEvaluator()

      const f = evaluator.evaluate('function () { return "123" }').result
      expect(typeof f).to.equal('function')
      expect(f.name).to.equal('anonymousFunction')
      expect(f()).to.equal('123')

      const g = evaluator.evaluate('() => { return [] }').result
      expect(typeof g).to.equal('function')
      expect(g.name).to.equal('anonymousFunction')
      expect(g()).to.deep.equal([])

      destroyEvaluator(evaluator)
    })

    it('should evaluate named class', () => {
      const evaluator = createEvaluator()
      const T = evaluator.evaluate('class A { }').result
      expect(typeof T).to.equal('function')
      expect(T.name).to.equal('A')
      destroyEvaluator(evaluator)
    })

    it('should evaluate anonymous class', () => {
      const evaluator = createEvaluator()
      const T = evaluator.evaluate('class { }').result
      expect(typeof T).to.equal('function')
      expect(T.name).to.equal('AnonymousClass')
      destroyEvaluator(evaluator)
    })

    it('should throw if code is not a string', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate()).to.throw('Code must be a string. Received: undefined')
      expect(() => evaluator.evaluate(123)).to.throw('Code must be a string. Received: 123')
      expect(() => evaluator.evaluate(function f () {})).to.throw('Code must be a string. Received: ')
      destroyEvaluator(evaluator)
    })

    it('should throw if env is not an object', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate('()=>{}', false)).to.throw('Environment must be an object. Received: false')
      expect(() => evaluator.evaluate('()=>{}', 123)).to.throw('Environment must be an object. Received: 123')
      expect(() => evaluator.evaluate('()=>{}', class A {})).to.throw('Environment must be an object. Received: ')
      destroyEvaluator(evaluator)
    })

    it('should throw if env contains $globals', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate('()=>{}', { $globals: {} })).to.throw('Environment must not contain $globals')
      destroyEvaluator(evaluator)
    })

    it('should throw if evaluated code throws', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate('throw new Error()')).to.throw()
      expect(() => evaluator.evaluate('x.y = z')).to.throw()
      destroyEvaluator(evaluator)
    })
  })

  describe('environment', () => {
    it('should place environment parent class in scope', () => {
      const evaluator = createEvaluator()
      const A = evaluator.evaluate('class A {}').result
      evaluator.evaluate('class B extends A {}', { A })
      destroyEvaluator(evaluator)
    })

    it('should place environment constant in scope', () => {
      const evaluator = createEvaluator()
      const f = evaluator.evaluate('function f() { return CONSTANT }', { CONSTANT: 5 }).result
      expect(f()).to.equal(5)
      destroyEvaluator(evaluator)
    })

    it('should place environment function in scope', () => {
      const evaluator = createEvaluator()
      const f = evaluator.evaluate('function f() { return 1 }').result
      const g = evaluator.evaluate('function g() { return f() + 1 }', { f }).result
      expect(g()).to.equal(2)
      destroyEvaluator(evaluator)
    })

    it('should place environment related class in scope', () => {
      const evaluator = createEvaluator()
      const Z = evaluator.evaluate('class Z {}').result
      evaluator.evaluate('class Y { constructor() { this.a = new Z() } }', { Z })
      destroyEvaluator(evaluator)
    })

    it('should throw if parent class is not in environment', () => {
      const evaluator = createEvaluator()
      expect(() => evaluator.evaluate('class B extends MissingClass {}')).to.throw('MissingClass is not defined')
      destroyEvaluator(evaluator)
    })

    it('should throw if called function is not in environment', () => {
      const evaluator = createEvaluator()
      const f = evaluator.evaluate('function f() { return missingFunction() }').result
      expect(() => f()).to.throw('missingFunction is not defined')
      destroyEvaluator(evaluator)
    })

    it('should share intrinsics between evaluations', () => {
      const evaluator = createEvaluator()
      intrinsicNames.forEach(name => {
        if (typeof global[name] === 'undefined') return
        const intrinsic1 = evaluator.evaluate(`function f() { return ${name} }`).result()
        const intrinsic2 = evaluator.evaluate(`function f() { return ${name} }`).result()
        expect(intrinsic1).to.equal(intrinsic2)
      })
      destroyEvaluator(evaluator)
    })
  })

  describe('globals', () => {
    it('should support setting related classes', () => {
      const evaluator = createEvaluator()
      const { result: A, globals } = evaluator.evaluate('class A { createB() { return new B() } }')
      globals.B = class B { }
      expect(() => new A().createB()).not.to.throw()
      destroyEvaluator(evaluator)
    })

    it('should support setting related functions', () => {
      const evaluator = createEvaluator()
      const { result: f, globals } = evaluator.evaluate('function f () { return g() }')
      globals.g = function g () { return 3 }
      expect(f()).to.equal(3)
      destroyEvaluator(evaluator)
    })

    it('should support setting related constants', () => {
      const evaluator = createEvaluator()
      const { result: f, globals } = evaluator.evaluate('function f () { return NUM }')
      globals.NUM = 42
      expect(f()).to.equal(42)
      destroyEvaluator(evaluator)
    })

    it('should support setting getters ', () => {
      const evaluator = createEvaluator()
      const { result: f, globals } = evaluator.evaluate('function f () { return someValue }')
      Object.defineProperty(globals, 'someValue', { configurable: true, get: () => 4 })
      expect(f()).to.equal(4)
      destroyEvaluator(evaluator)
    })
  })
}

// ------------------------------------------------------------------------------------------------
// Evaluator tests
// ------------------------------------------------------------------------------------------------

describe('Evaluator', () => {
  const createEvaluator = () => new Run.Evaluator()
  const destroyEvaluator = evaluator => evaluator.deactivate()
  runEvaluatorTestSuite(createEvaluator, destroyEvaluator)

  describe('willSandbox', () => {
    it('should return whether name matches when regex', () => {
      const fCode = function f () { }.toString()
      const ACode = (class A {}).toString()
      const BCode = (class B {}).toString()
      const AnonClassCode = (class {}).toString()
      const AnonFunctionCode = (() => {}).toString()
      const evaluator = new Run.Evaluator({ sandbox: /(f|B)/ })
      expect(evaluator.willSandbox(fCode)).to.equal(true)
      expect(evaluator.willSandbox(ACode)).to.equal(false)
      expect(evaluator.willSandbox(BCode)).to.equal(true)
      expect(evaluator.willSandbox(AnonClassCode)).to.equal(false)
      expect(evaluator.willSandbox(AnonFunctionCode)).to.equal(false)
    })

    it('should return sandbox option when boolean', () => {
      const code = function f () { }.toString()
      expect(new Run.Evaluator({ sandbox: true }).willSandbox(code)).to.equal(true)
      expect(new Run.Evaluator({ sandbox: false }).willSandbox(code)).to.equal(false)
    })
  })

  it('should support deactivate and activate', () => {
    function f () { return g } // eslint-disable-line
    const evaluator = new Run.Evaluator({ sandbox: false })
    const f2 = evaluator.evaluate(f.toString(), { g: 2 }).result
    expect(f2()).to.equal(2)
    evaluator.deactivate()
    expect(() => f2()).to.throw()
    evaluator.activate()
    expect(f2()).to.equal(2)
  })
})

describe('SESEvaluator', () => {
  const createEvaluator = () => new Run.Evaluator.SESEvaluator()
  const destroyEvaluator = () => {}
  runEvaluatorTestSuite(createEvaluator, destroyEvaluator)

  it('should ban non-deterministic globals', () => {
    const evaluator = createEvaluator()
    Run.Evaluator.nonDeterministicGlobals.forEach(key => {
      expect(!!evaluator.evaluate(key).result).to.equal(false)
    })
  })

  it('should prevent access to the global scope', () => {
    const evaluator = createEvaluator()
    const { result } = evaluator.evaluate('typeof window === "undefined" && typeof global === "undefined"')
    expect(result).to.equal(true)
  })
})

describe('GlobalEvaluator', () => {
  const createEvaluator = options => new Run.Evaluator.GlobalEvaluator(options)
  const destroyEvaluator = evaluator => evaluator.deactivate()
  runEvaluatorTestSuite(createEvaluator, destroyEvaluator)

  it('should detect setting the same global twice in environment', () => {
    let warned = false
    const logger = { warn: () => { warned = true } }
    const evaluator = createEvaluator({ logger })
    evaluator.evaluate('globalToSetTwice', { globalToSetTwice: 1 })
    evaluator.evaluate('globalToSetTwice', { globalToSetTwice: 2 })
    expect(warned).to.equal(true)
    destroyEvaluator(evaluator)
  })

  it('should detect setting the same global twice in globals', () => {
    let warned = false
    const logger = { warn: () => { warned = true } }
    const evaluator = createEvaluator({ logger })
    const globals1 = evaluator.evaluate('function f() { }').globals
    const globals2 = evaluator.evaluate('function f() { }').globals
    Object.defineProperty(globals1, 'globalToSetTwice', { configurable: true, value: 1 })
    Object.defineProperty(globals2, 'globalToSetTwice', { configurable: true, value: 2 })
    expect(warned).to.equal(true)
    destroyEvaluator(evaluator)
  })

  it('should correctly deactivate globals', () => {
    const evaluator = createEvaluator()
    const { globals } = evaluator.evaluate('1', { x: 1 })
    globals.y = 2
    expect(x).to.equal(1) // eslint-disable-line
    expect(y).to.equal(2) // eslint-disable-line
    destroyEvaluator(evaluator)
    expect(typeof x).to.equal('undefined')
    expect(typeof y).to.equal('undefined')
  })

  it('should correctly reactivate globals', () => {
    const evaluator = createEvaluator()
    evaluator.evaluate('1', { x: 1 })
    expect(x).to.equal(1) // eslint-disable-line
    evaluator.deactivate()
    expect(typeof x).to.equal('undefined')
    evaluator.activate()
    expect(x).to.equal(1) // eslint-disable-line
    destroyEvaluator(evaluator)
  })
})

// ------------------------------------------------------------------------------------------------
