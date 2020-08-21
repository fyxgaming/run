/**
 * membrane.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Proxy2 = unmangle(Run)._Proxy2

describe('Proxy2', () => {
  it('test', () => {
    const h = {}
    h._intrinsicGetMethod = () => { console.log('  intrinsic get method') }
    h._intrinsicIn = x => { console.log('  intrinsic in', x); return x }
    h._intrinsicOut = x => { console.log('  intrinsic out', x); return x }
    h._intrinsicRead = () => { console.log('  intrinsic read') }
    h._intrinsicUpdate = () => { console.log('  intrinsic update') }

    const p = new Proxy2(new Set(), h)

    console.log('add 1, 2')
    expect(p.add(1)).to.equal(p)
    expect(p.add(2)).to.equal(p)

    console.log('for each')
    p.forEach(x => console.log(' ', x))

    console.log('iterator')
    for (const x of p) { console.log(' ', x) }

    console.log('entries')
    for (const x of p.entries()) { console.log(' ', x) }

    console.log('print set')
    console.log(' ', p)

    console.log('checking same method')
    expect(p.set).to.equal(p.set)

    console.log('another object')
    const addMethod = p.add
    expect(addMethod).not.to.equal(Set.prototype.add)
    addMethod.call(new Set(), 1)

    console.log('clear')
    p.clear()

    console.log('size getter')
    console.log(' ', p.size)
  })
})
