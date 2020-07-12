const bsv = require('bsv')
// ------------------------------------------------------------------------------------------------
// _txToTxo
// ------------------------------------------------------------------------------------------------

// A modified version of the txo format form unwriter
// Source: https://github.com/interplanaria/txo/blob/master/index.js
var _txToTxo = function (tx, options) {
  const gene = new bsv.Transaction(tx)
  const t = gene.toObject()
  const inputs = []
  const outputs = []
  if (gene.inputs) {
    gene.inputs.forEach(function (input, inputIndex) {
      if (input.script) {
        const xput = { i: inputIndex, seq: input.sequenceNumber }
        input.script.chunks.forEach(function (c, chunkIndex) {
          if (c.buf) {
            if (c.buf.byteLength >= 1000000) {
              xput['xlb' + chunkIndex] = c.buf.toString('base64')
            } else if (c.buf.byteLength >= 512 && c.buf.byteLength < 1000000) {
              xput['lb' + chunkIndex] = c.buf.toString('base64')
            } else {
              xput['b' + chunkIndex] = c.buf.toString('base64')
            }
            if (options && options.h && options.h > 0) {
              xput['h' + chunkIndex] = c.buf.toString('hex')
            }
          } else {
            if (typeof c.opcodenum !== 'undefined') {
              xput['b' + chunkIndex] = {
                op: c.opcodenum
              }
            } else {
              xput['b' + chunkIndex] = c
            }
          }
        })
        const sender = {
          h: input.prevTxId.toString('hex'),
          i: input.outputIndex
        }
        const address = input.script.toAddress(bsv.Networks.livenet).toString()
        if (address && address.length > 0) {
          sender.a = address
        }
        xput.e = sender
        inputs.push(xput)
      }
    })
  }
  if (gene.outputs) {
    gene.outputs.forEach(function (output, outputIndex) {
      if (output.script) {
        const xput = { i: outputIndex }
        output.script.chunks.forEach(function (c, chunkIndex) {
          if (c.buf) {
            if (c.buf.byteLength >= 1000000) {
              xput['xlb' + chunkIndex] = c.buf.toString('base64')
              xput['xls' + chunkIndex] = c.buf.toString('utf8')
            } else if (c.buf.byteLength >= 512 && c.buf.byteLength < 1000000) {
              xput['lb' + chunkIndex] = c.buf.toString('base64')
              xput['ls' + chunkIndex] = c.buf.toString('utf8')
            } else {
              xput['b' + chunkIndex] = c.buf.toString('base64')
              xput['s' + chunkIndex] = c.buf.toString('utf8')
            }
            if (options && options.h && options.h > 0) {
              xput['h' + chunkIndex] = c.buf.toString('hex')
            }
          } else {
            if (typeof c.opcodenum !== 'undefined') {
              xput['b' + chunkIndex] = {
                op: c.opcodenum
              }
            } else {
              xput['b' + chunkIndex] = c
            }
          }
        })
        const receiver = {
          v: output.satoshis,
          i: outputIndex
        }
        const address = output.script.toAddress(bsv.Networks.livenet).toString()
        if (address && address.length > 0) {
          receiver.a = address
        }
        xput.e = receiver
        outputs.push(xput)
      }
    })
  }
  const r = {
    tx: { h: t.hash },
    in: inputs,
    out: outputs,
    lock: t.nLockTime
  }
  // confirmations
  if (options && options.confirmations) {
    r.confirmations = options.confirmations
  }
  return r
}

module.exports = _txToTxo
