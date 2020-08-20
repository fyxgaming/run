/**
 * immutable.js
 *
 * Tests for lib/membrane/immutable.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Immutable = unmangle(unmangle(Run)._membrane)._Immutable

function _ownGetters (x) {
  return Object.getOwnPropertyNames(x)
    .concat(Object.getOwnPropertySymbols(x))
    .filter(prop => Object.getOwnPropertyDescriptor(x, prop).get)
}

function _ownMethods (x) {
  return Object.getOwnPropertyNames(x)
    .concat(Object.getOwnPropertySymbols(x))
    .filter(prop => typeof Object.getOwnPropertyDescriptor(x, prop).value === 'function')
}

// ------------------------------------------------------------------------------------------------
// Immutable
// ------------------------------------------------------------------------------------------------

describe('Immutable', () => {
  it('test', () => {
    expect(Immutable).not.to.equal(undefined)

    console.log('Set getters:', _ownGetters(Set.prototype))
    console.log('Set methods:', _ownMethods(Set.prototype))
    console.log('---')
    console.log('Map getters:', _ownGetters(Map.prototype))
    console.log('Map methods:', _ownMethods(Map.prototype))
    console.log('---')
    console.log('Uint8Array getters:', _ownGetters(Uint8Array.prototype)
      .concat(_ownGetters(Object.getPrototypeOf(Uint8Array.prototype))))
    console.log('Uint8Array getters:', _ownMethods(Uint8Array.prototype)
      .concat(_ownMethods(Object.getPrototypeOf(Uint8Array.prototype))))

    /*
    console.log(Immutable)

    console.log(Object.getOwnPropertyNames(Set.prototype))
    console.log(Object.getOwnPropertyNames(Map.prototype))
    console.log(Object.getOwnPropertyNames(Uint8Array.prototype))
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(Uint8Array.prototype)))
    console.log('---')
    console.log(Object.getOwnPropertySymbols(Set.prototype))
    console.log(Object.getOwnPropertySymbols(Map.prototype))
    console.log(Object.getOwnPropertySymbols(Uint8Array.prototype))
    console.log(Object.getOwnPropertySymbols(Object.getPrototypeOf(Uint8Array.prototype)))

    console.log(Object.getOwnPropertyDescriptor(Set.prototype, Symbol.iterator))
    console.log(Object.getOwnPropertyDescriptor(Set.prototype, 'size'))
    */
  })
})

// ------------------------------------------------------------------------------------------------
