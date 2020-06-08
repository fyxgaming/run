/**
 * type.js
 *
 * Helpers functions for understanding Javascript types
 */

// ------------------------------------------------------------------------------------------------
// parent
// ------------------------------------------------------------------------------------------------

/**
 * Gets the parent class of T, or undefined if none exists
 */
function _parent (T) {
  if (typeof T !== 'function') return
  const Sandbox = require('./sandbox')
  const SO = Sandbox._intrinsics.Object
  const HO = Sandbox._hostIntrinsics.Object
  const P = Object.getPrototypeOf(T)
  const hasParent = P !== HO.getPrototypeOf(HO) && P !== SO.getPrototypeOf(SO)
  if (hasParent) return P
}

// ------------------------------------------------------------------------------------------------
// _text
// ------------------------------------------------------------------------------------------------

/*
 * Converts any value into a short string form usable in error messages and logs.
 * @param {*} x Value to stringify
 */
function _text (x) {
  const { JigControl } = require('../kernel/jig')
  return JigControl._disableSafeguards(() => {
    switch (typeof x) {
      case 'string': return `"${x.length > 20 ? x.slice(0, 20) + '…' : x}"`
      case 'object':
        if (!x) return 'null'
        if (!x.constructor.name) return '[anonymous object]'
        return `[object ${x.constructor.name}]`
      case 'function': {
        const s = x.toString()
        const isAnonymousFunction =
          /^\(/.test(s) || // () => {}
          /^function\s*\(/.test(s) || // function() {}
          /^[a-zA-Z0-9_$]+\s*=>/.test(s) // x => x
        if (isAnonymousFunction) return '[anonymous function]'
        const isAnonymousClass = /^class\s*{/.test(s)
        if (isAnonymousClass) return '[anonymous class]'
        return x.name
      }
      case 'undefined': return 'undefined'
      default: return x.toString()
    }
  })
}

// ------------------------------------------------------------------------------------------------
// sourceCode
// ------------------------------------------------------------------------------------------------

/**
 * Returns the "normalized" source code for a class or function.
 *
 * This is generally T.toString(), with some fixes.
 *
 * For classes, if T is a class that extends another class, we make sure the parent class name in
 * the extends expression is the actual name of the parent class, because man times the code will
 * be "class X extends SomeLibrary.Y" and what is deployed should be "class X extends Y", or an
 * obfuscator will change the variable name.
 *
 * For functions, Safari sometimes ignores the "function" keyword when printing method calls. We
 * add that back in so that we always can parse the code.
 *
 * Lastly, this may still return slightly different results in different environments, usually
 * related to line returns and whitespace. Functionally though, according to the spec, the code
 * should be the same.
 */
function _sourceCode (T) {
  const code = T.toString()
  const Parent = Object.getPrototypeOf(T)

  if (Parent.prototype) {
    const classDef = /^class \S+ extends \S+ {/
    return code.replace(classDef, `class ${T.name} extends ${Parent.name} {`)
  }

  const functionMatch = code.match(/^([a-zA-Z0-9_$]+)\S*\(/)
  if (functionMatch && functionMatch[1] !== 'function') return `function ${code}`

  return code
}

// ------------------------------------------------------------------------------------------------
// Type detection
// ------------------------------------------------------------------------------------------------

function _isBasicObject (x) {
  return x && _protoLen(x) === 2
}

// ------------------------------------------------------------------------------------------------

function _isBasicArray (x) {
  return Array.isArray(x) && _protoLen(x) === 3
}

// ------------------------------------------------------------------------------------------------

function _isUndefined (x) {
  return typeof x === 'undefined'
}

// ------------------------------------------------------------------------------------------------

/**
 * Gets the length of the prototype chain
 */
function _protoLen (x) {
  if (!x) return 0
  let n = 0
  do {
    n++
    x = Object.getPrototypeOf(x)
  } while (x)
  return n
}

// ------------------------------------------------------------------------------------------------

module.exports = {
  _parent,
  _text,
  _sourceCode,
  _isBasicObject,
  _isBasicArray,
  _isUndefined,
  _protoLen
}
