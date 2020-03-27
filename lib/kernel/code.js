/**
 * code.js
 *
 * Functionality related to loading, deploying, and running arbitrary code.
 */

// ------------------------------------------------------------------------------------------------
// Source code
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
function sourceCode (T) {
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
// Function proxy
// ------------------------------------------------------------------------------------------------

function makeFunctionProxy (T, handler = { }) {
  const TProxy = new Proxy(T, handler)

  handler.construct = (target, args, newTarget) => {
    const t = Reflect.construct(target, args, newTarget)

    const objectHandler = {}
    const objectProxy = new Proxy(t, objectHandler)

    objectHandler.get = (target, prop) => {
      if (prop === 'constructor') return TProxy
      return target[prop]
    }

    return objectProxy
  }

  return TProxy
}

// ------------------------------------------------------------------------------------------------

module.exports = { sourceCode, makeFunctionProxy }
