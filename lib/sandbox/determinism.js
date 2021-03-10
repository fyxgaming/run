/**
 * determinism.js
 *
 * Code to make the sandbox deterministic or detect non-determinism
 */

// ------------------------------------------------------------------------------------------------
// Make Deterministic
// ------------------------------------------------------------------------------------------------

/**
 * Stubs JavaScript implementations to make the current realm deterministic.
 *
 * This builds expects SES's lockdown() function to be called and does not duplicate that work.
 * For example, lockdown() already shuts down the Date object. We also expect that
 * the nonDeterministicIntrinsics below will be disabled by the realm.
 *
 * This all has to be in one function because its code will be executed in the realm.
 */
function makeDeterministic (createJSONStringify) {
  const defaultCompare = (x, y) => {
    if (x === y) return 0
    if (x === undefined) return 1
    if (y === undefined) return -1
    const xs = x === null ? 'null' : x.toString()
    const ys = y === null ? 'null' : y.toString()
    return xs < ys ? -1 : xs > ys ? 1 : 0
  }

  // Make Array.prototype.sort stable. The spec does not guarantee this.
  // All major browsers are now stable: https://github.com/tc39/ecma262/pull/1340
  // So is Node 11+: https://github.com/nodejs/node/issues/29446
  // However, Node 10, is not stable. We fix it everywhere just in case.
  const oldSort = Array.prototype.sort
  function sort (compareFunc = defaultCompare) {
    const indices = new Map()
    this.forEach((x, n) => indices.set(x, n))
    const newCompareFunc = (a, b) => {
      const result = compareFunc(a, b)
      if (result !== 0) return result
      return indices.get(a) - indices.get(b)
    }
    return oldSort.call(this, newCompareFunc)
  }
  Array.prototype.sort = sort // eslint-disable-line

  // Disallow localeCompare. We probably could allow it in some cases in the future, but it's safer
  // to just turn it off for now.
  delete String.prototype.localeCompare

  // Make Object.keys() and similar methods deterministic. To do this, we make them behave like
  // Object.getOwnPropertyNames except it won't include non-enumerable properties like that does.
  // This hopefully will not affect many VMs anymore. For more details, see [1] [2] [3]
  //
  // [1] https://github.com/tc39/proposal-for-in-order
  // [2] https://esdiscuss.org/topic/property-ordering-of-enumerate-getownpropertynames
  // [3] https://stackoverflow.com/questions/5525795/does-javascript-guarantee-object-property-order

  const oldObjectKeys = Object.keys
  Object.keys = function keys (target) {
    const keys = oldObjectKeys(target)
    const props = Object.getOwnPropertyNames(target)
    return keys.sort((a, b) => props.indexOf(a) - props.indexOf(b))
  }

  Object.values = function values (target) {
    return Object.keys(target).map(key => target[key])
  }

  Object.entries = function entries (target) {
    return Object.keys(target).map(key => [key, target[key]])
  }

  // Uint8array elements should all be configurable when returned.
  // See: 2020-10-17 https://webkit.googlesource.com/WebKit/+/master/Source/JavaScriptCore/ChangeLog
  // See: Description https://github.com/tc39/ecma262/pull/2164
  // Node.js and some browsers return non-configurable entries, even though they may be changed.
  const oldReflectGetOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor
  Reflect.getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor = function getOwnPropertyDescriptor (o, p) {
    const desc = oldReflectGetOwnPropertyDescriptor(o, p)
    if (desc && typeof p === 'string' && o instanceof Uint8Array) desc.configurable = true
    return desc
  }

  // When Uint8Array elements are set, define property may fail on older JS VMs. So we use direct sets.
  const oldReflectDefineProperty = Reflect.defineProperty
  Reflect.defineProperty = Object.defineProperty = function defineProperty (o, p, desc) {
    if (desc && typeof p === 'string' && o instanceof Uint8Array && desc.writable && desc.enumerable && desc.configurable) {
      Reflect.set(o, p, desc.value)
      return o
    }
    return oldReflectDefineProperty(o, p, desc)
  }

  JSON.stringify = createJSONStringify()

  // Function.prototype.toString() in general is not deterministic. Whitespace, line terminators,
  // and semicolons may be different, and in Safari, the browser also inserts "function" before
  // method.toString(), where as Node and other browsers do not. We cannot fix all aspects of
  // non-determinism, but we can fix the "function" issue. We will not change the whitespace,
  // because whitespace may be important to the execution of the code. Without an interpreter
  // we cannot know.
  const oldFunctionToString = Function.prototype.toString
  function toString () { // eslint-disable-line
    // Hide our custom implementations
    if (this === Array.prototype.sort) return 'function sort() { [native code ] }'
    if (this === Object.keys) return 'function keys() { [native code ] }'
    if (this === Object.values) return 'function values() { [native code ] }'
    if (this === Object.entries) return 'function entries() { [native code ] }'
    if (this === JSON.stringify) return 'function stringify() { [native code ] }'
    if (this === toString) return 'function toString() { [native code ] }'
    if (this === Object.getOwnPropertyDescriptor) return 'function getOwnPropertyDescriptor() { [native code ] }'
    if (this === Reflect.getOwnPropertyDescriptor) return 'function getOwnPropertyDescriptor() { [native code ] }'
    if (this === Object.defineProperty) return 'function defineProperty() { [native code ] }'
    if (this === Reflect.defineProperty) return 'function defineProperty() { [native code ] }'

    const s = oldFunctionToString.call(this)
    const match = s.match(/^([a-zA-Z0-9_$]+)\s*\(/)
    return (match && match[1] !== 'function') ? `function ${s}` : s
  }
  Function.prototype.toString = toString // eslint-disable-line
}

// ------------------------------------------------------------------------------------------------
// Non-deterministic Intrinsics
// ------------------------------------------------------------------------------------------------

// Will be disabled
const nonDeterministicIntrinsics = [
  'Date',
  'Math',
  'eval',
  'XMLHttpRequest',
  'FileReader',
  'WebSocket',
  'setTimeout',
  'setInterval'
]

// ------------------------------------------------------------------------------------------------

module.exports = { makeDeterministic, nonDeterministicIntrinsics }
