/**
 * membrane.js
 */

const { describe, it } = require('mocha')
const { expect } = require('chai')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Proxy2 = unmangle(Run)._Proxy2

describe('Membrane', () => {
  it('test', () => {
    const h = {}
    h._nativeGetMethod = () => { console.log('  native get method') }
    h._nativeIn = x => { console.log('  native in', x); return x }
    h._nativeOut = x => { console.log('  native out', x); return x }
    h._nativeRead = () => { console.log('  native read') }
    h._nativeUpdate = () => { console.log('  native update') }

    const p = new Proxy2(new Set(), h)

    console.log('add 1')
    expect(p.add(1)).to.equal(p)

    console.log('for each')
    p.forEach(x => console.log(' ', x))

    console.log('print set')
    console.log(' ', p)

    console.log('checking same method')
    expect(p.set).to.equal(p.set)

    console.log('another object')
    const addMethod = p.add
    addMethod.call(new Set(), 1)

    // const p = new Membrane(new Set())
    // p.add(1)
    // p.forEach(x => console.log(x))
    // console.log(p)
  })
})
