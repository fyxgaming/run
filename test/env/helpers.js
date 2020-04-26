/**
 * helpers.js
 *
 * Various helpers methods used in tests
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { Run } = require('./config')
const { unmangle } = require('./unmangle')

// ------------------------------------------------------------------------------------------------
// hookPay
// ------------------------------------------------------------------------------------------------

async function hookPay (run, ...enables) {
  const publisher = unmangle(unmangle(run)._kernel)._publisher
  enables = new Array(unmangle(publisher)._queued.length).fill(true).concat(enables)
  const orig = run.purse.pay.bind(run.purse)
  run.purse.pay = async (tx) => {
    if (!enables.length) { return orig(tx) }
    if (enables.shift()) { return orig(tx) } else { return tx }
  }
}

// ------------------------------------------------------------------------------------------------
// deploy
// ------------------------------------------------------------------------------------------------

async function deploy (Class) {
  const keysPath = path.join(os.homedir(), '.keys.json')
  const deployKeys = JSON.parse(fs.readFileSync(keysPath)).deploy

  const app = 'Run ▸ Extra'
  const networks = [['test', 'Testnet'], ['main', 'Mainnet'], ['stn', 'Stn']]

  let properties = ''

  for (const [network, suffix] of networks) {
    const purse = deployKeys[network]
    const run = new Run({ network, purse, app })
    const origin = `origin${suffix}`
    const location = `location${suffix}`
    const owner = `owner${suffix}`

    delete Class[origin]
    delete Class[location]
    delete Class[owner]

    run.deploy(Class)

    await run.sync()

    properties += `${Class.name}.${origin} = '${Class[origin]}'\n`
    properties += `${Class.name}.${location} = '${Class[location]}'\n`
    properties += `${Class.name}.${owner} = '${Class[owner]}'\n`

    run.deactivate()
  }

  console.log(properties)
}

// ------------------------------------------------------------------------------------------------

module.exports = { hookPay, deploy }
