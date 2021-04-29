/**
 * source.js
 *
 * Functionality related to processing raw source code
 */

// ------------------------------------------------------------------------------------------------
// Globals
// ------------------------------------------------------------------------------------------------

const FUNCTION_REGEX = /^\s*function\s+[a-zA-Z0-9$_]+\s*\(.*?{(.*)}\s*$/s
const CLASS_REGEX = /^\s*class\s+[a-zA-Z0-9$_]+\s*{(.*)}\s*$/s
const CHILD_REGEX = /^\s*class\s+[a-zA-Z0-9$_]+\s+extends\s+[a-zA-Z0-9$_]+\s*{(.*)}\s*$/s

// ------------------------------------------------------------------------------------------------
// _anonymize
// ------------------------------------------------------------------------------------------------

/**
 * Strip out the class or function name from source code
 */
function _anonymize (src) {
  const functionMatches = src.match(/^(function\s+)([a-zA-Z0-9$_]+)(\s*)\((.*)/s)
  if (functionMatches) return `${functionMatches[1]}${functionMatches[3]}(${functionMatches[4]}`

  const classMatches = src.match(/^(class\s+)([a-zA-Z0-9$_]+)(\s*){(.*)/s)
  if (classMatches) return `${classMatches[1]}${classMatches[3]}{${classMatches[4]}`

  const childMatches = src.match(/^(class\s+)([a-zA-Z0-9$_]+)(\s*)extends(.*)/s)
  if (childMatches) return `${childMatches[1]}${childMatches[3]}extends${childMatches[4]}`

  throw new Error(`Bad source code: ${src}`)
}

// ------------------------------------------------------------------------------------------------
// _deanonymize
// ------------------------------------------------------------------------------------------------

/**
 * Adds back in the class or function name to anonymized source code
 */
function _deanonymize (src, name) {
  // Code that is excluded for code coverage should not be anonymized. Breaks.
  if (require('../sandbox/sandbox')._cover.includes(name)) return src

  const functionMatches = src.match(/^(function\s)(.*)/s)
  if (functionMatches) return `${functionMatches[1]}${name}${functionMatches[2]}`

  const classMatches = src.match(/^(class\s)(.*)/s)
  if (classMatches) return `${classMatches[1]}${name}${classMatches[2]}`

  throw new Error(`Bad source code: ${src}`)
}

// ------------------------------------------------------------------------------------------------
// _check
// ------------------------------------------------------------------------------------------------

/**
 * Checks that some source code can be executed by RUN
 */
function _check (src) {
  // TODO: Strip comments out of the source code

  const match = src.match(FUNCTION_REGEX) || src.match(CLASS_REGEX) || src.match(CHILD_REGEX)
  if (!match) throw new Error(`Bad source code: ${src}`)

  // Check that there are not multiple classes or functions like "class A{};class B{}"
  // We can do this by getting the inside of the brackets "};classB{" and then check that
  // there are always matching brackets, ignoring all comments and strings.
  const inner = match[1]
  let brackets = 0
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '{') brackets++
    if (inner[i] === '}') brackets--
    if (brackets < 0) throw new Error(`Multiple definitions not permitted: ${src}`)
  }
}

// ------------------------------------------------------------------------------------------------

module.exports = { _anonymize, _deanonymize, _check }
