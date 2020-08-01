
class Action {
  constructor (name, jig, data) {
    this._name = name
    this._jig = jig
    this._data = data
  }

  toString () {
    return `[Action ${this._name} ${this._data}]`
  }
}

/*
    const { _COMMANDS } = require('./command')
    _assert(_COMMANDS.includes(name))
    _assert(Array.isArray(data))
  */

module.exports = Action
