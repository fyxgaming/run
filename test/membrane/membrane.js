/**
 * membrane.js
 */

const { describe, it } = require('mocha')
const Run = require('../env/run')
const unmangle = require('../env/unmangle')
const Membrane = unmangle(Run)._Membrane

describe('Membrane', () => {
  it('test', () => {
    const p = new Membrane({})
    p.n = 1
    console.log(p)

    // const p = new Membrane(new Set())
    // p.add(1)
    // p.forEach(x => console.log(x))
    // console.log(p)
  })
})
