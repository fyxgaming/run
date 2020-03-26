/**
 * index.js
 *
 * Tests for lib/util/index.js
 */

const { describe, it } = require('mocha')
const { Run } = require('../config')
const { _name } = Run._util

describe('util', () => {
  it.only('_name', () => {
    console.log(_name('Hello, world!'))
    console.log(_name(123))
    console.log(_name(false))
    console.log(_name(undefined))
    console.log(_name(null))
    console.log(_name([1, 2, 3]))
    console.log(_name({ a: 1 }))
    console.log(_name(class A {}))
    console.log(_name(function f () {}))
    console.log(_name(() => {}))
    console.log(_name(Symbol.unscopables))
  })
})
