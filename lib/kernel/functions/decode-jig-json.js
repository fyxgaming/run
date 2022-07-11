const JSON = require('../json')

function decodeJigJson (x, refToJig) {
  return JSON._decode(x, { _decodeJig: refToJig })
}

module.exports = decodeJigJson
