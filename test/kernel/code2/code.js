const { describe, it } = require('mocha')
const Run = require('../../env/run')
const { Code2: Code } = Run

describe('Code', () => {
  it('should create', () => {
    const code = new Code()
    console.log(code._jig.toString())
    code._setType(class A {})
    console.log(code._jig.toString())
  })

  // Test method table, changeability, etc.
})
