const JSON = require('../json')

function encodeJigJson (x, jigToRef) {
  return JSON._encode(x, { _encodeJig: jigToRef })
}

module.exports = encodeJigJson
