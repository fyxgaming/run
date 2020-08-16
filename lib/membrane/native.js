const AdminMembrane = require('./admin')

// Native code cannot be changed. The traps enforce this.
NATIVE_TRAPS.defineProperty = () => throwNativeError()
NATIVE_TRAPS.deleteProperty = () => throwNativeError()
NATIVE_TRAPS.preventExtensions = () => throwNativeError()
NATIVE_TRAPS.set = () => throwNativeError()
NATIVE_TRAPS.setPrototypeOf = () => throwNativeError()

function nativeToString () {
  const editor = Code._editor(this)
  if (!editor) throw new Error('Native toString() cannot run on non-native code')
  const D = editor._D
  const src = D.toString()
  if (src.startsWith('class')) {
    return `class ${D.name} { [native code] }`
  } else {
    return `function ${D.name}() { [native code] }`
  }
}

const sandboxedNativeToString = Sandbox._sandboxType(nativeToString, { Code }, true)[0]
const sandboxedNativeSync = Sandbox._evaluate('function sync() { } ')[0]

// The native code version of toString always returns a source with [native code] in it
// The native code version of sync() always returns immediately
NATIVE_TRAPS.get = function (target, prop, receiver) {
  if (receiver === this._proxy && prop === 'toString') return sandboxedNativeToString
  if (receiver === this._proxy && prop === 'sync') return sandboxedNativeSync
  return Reflect.get(target, prop, receiver)
}
