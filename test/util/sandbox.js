/**
 * sandbox.js
 *
 * Tests for the sandbox
 */

/* global VARIANT */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Sandbox = unmangle(unmangle(Run)._Sandbox)

// ------------------------------------------------------------------------------------------------
// Sandbox
// ------------------------------------------------------------------------------------------------

describe('Sandbox', () => {
  it('sandboxes code', () => {

  })

  if (typeof VARIANT === 'undefined' || VARIANT === 'node') {
    it('proxies console', () => {
      const writes = []
      const oldWrite = process.stdout.write
      try {
        process.stdout.write = (msg) => writes.push(msg)
        Sandbox._evaluate('console.log("hello")')
        const A = Sandbox._evaluate('class A { static f() { console.log("world") } }')[0]
        A.f()
      } finally {
        process.stdout.write = oldWrite
      }
      expect(writes).to.deep.equal(['hello\n', 'world\n'])
    })
  }

  it('can set globals', () => {

  })

  it('intrinsics frozen', () => {
    /*
    const run = new Run()
    function f () {
      Array.n = 1
      // Array.prototype.filter.n = 1
      return Array.prototype.filter.n
    }
    const cf = run.deploy(f)
    console.log(cf())
    */
  })

  it('intrinsic prototypes frozen', () => {
    /*
    const run = new Run()
    function f () {
      Array.n = 1
      // Array.prototype.filter.n = 1
      return Array.prototype.filter.n
    }
    const cf = run.deploy(f)
    console.log(cf())
    */
  })
})

// ------------------------------------------------------------------------------------------------
