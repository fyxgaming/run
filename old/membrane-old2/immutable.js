/**
 * immutable.js
 *
 * Tests for lib/membrane/immutable.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../../test/env/run')
const unmangle = require('../../test/env/unmangle')
const Immutable = unmangle(unmangle(Run)._membrane)._Immutable
const Intrinsics = unmangle(unmangle(Run)._membrane)._Intrinsics
const Proxy = unmangle(Run)._Proxy

// ------------------------------------------------------------------------------------------------
// Immutable
// ------------------------------------------------------------------------------------------------

describe('Immutable', () => {
  it.only('test', () => {
    expect(Immutable).not.to.equal(undefined)
    console.log(Immutable)

    const q = new Proxy({ a: [] }, new Immutable())
    // q.n = 1
    // console.log(q.n)
    // q.a.push(1)
    console.log(q)

    const p = new Proxy(new Set(), new Immutable(new Intrinsics()))
    // const p = new Proxy(new Set(), new Immutable())
    // console.log(p)
    p.add(1)
    console.log(p.has(1))

    // console.log(Intrinsics)
  })
})

// ------------------------------------------------------------------------------------------------
