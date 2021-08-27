/**
 * stringify.js
 *
 * A JSON.stringify implementation that stably sorts keys
 *
 * Based on https://github.com/substack/json-stable-stringify
 */

// ------------------------------------------------------------------------------------------------
// stableJSONStringify
// ------------------------------------------------------------------------------------------------

function stableJSONStringify (value, replacer, space, cmp = null, nativeStringify = JSON.stringify) {
  if (typeof space === 'number') space = Array(space + 1).join(' ')
  if (typeof space !== 'string') space = ''

  const seen = new Set()

  function stringify (parent, key, node, level) {
    const indent = space ? ('\n' + new Array(level + 1).join(space)) : ''
    const colonSeparator = space ? ': ' : ':'

    if (node && typeof node.toJSON === 'function') node = node.toJSON()

    node = replacer ? replacer.call(parent, key, node) : node

    if (node === undefined) return undefined
    if (typeof node !== 'object' || node === null) return nativeStringify(node)

    if (seen.has(node)) throw new TypeError('Converting circular structure to JSON')
    seen.add(node)

    let result
    if (Array.isArray(node)) {
      const out = []
      for (let i = 0; i < node.length; i++) {
        const item = stringify(node, i, node[i], level + 1) || nativeStringify(null)
        out.push(indent + space + item)
      }
      result = '[' + out.join(',') + (out.length ? indent : '') + ']'
    } else {
      let keys = Object.keys(node)
      if (cmp) keys = keys.sort(cmp)
      const out = []
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const value = stringify(node, key, node[key], level + 1)
        if (!value) continue
        const keyValue = nativeStringify(key) + colonSeparator + value
        out.push(indent + space + keyValue)
      }
      result = '{' + out.join(',') + (out.length ? indent : '') + '}'
    }

    seen.delete(node)
    return result
  }

  // This matches the real JSON.stringify implementation
  return stringify({ '': value }, '', value, 0)
}

// ------------------------------------------------------------------------------------------------

module.exports = stableJSONStringify
