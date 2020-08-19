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

describe('Intrinsics', () => {
  describe('Set', () => {
    it('hello', () => {
      console.log(Intrinsics)
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
