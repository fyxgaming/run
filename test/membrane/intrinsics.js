/**
 * intrinsics.js
 *
 * Tests for lib/membrane/intrinsics.js
 */

const { describe, it } = require('mocha')
// const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Intrinsics = unmangle(unmangle(Run)._membrane)._Intrinsics
const Proxy = unmangle(Run)._Proxy

describe('Intrinsics', () => {
  describe('Set', () => {
    it('hello', () => {
      const p = new Proxy(new Set(), new Intrinsics())
      console.log(p, p.has(1), p.size)
      p.add(1)
      console.log(p, p.has(1), p.size)
    })
  })

  describe('Map', () => {

  })

  describe('Uint8Array', () => {

  })

  describe('misc', () => {
    // TODO: Other intrinsics, unsupported
    // Normal functions, etc.
    // Intrinsics in another proxy
  })
})
