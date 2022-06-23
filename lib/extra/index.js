const recreateJigsFromStates = require('../kernel/functions/recreate-jigs-from-states')

const mainnetJigs = recreateJigsFromStates(require('./states-mainnet.json'))
const testnetJigs = recreateJigsFromStates(require('./states-testnet.json'))

Object.assign(module.exports, mainnetJigs)

module.exports.main = mainnetJigs
module.exports.test = testnetJigs
