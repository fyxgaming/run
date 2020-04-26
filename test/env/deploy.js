/**
 * deploy.js
 *
 * Deploys code using Run
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { Run } = require('./config')

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

module.exports = deploy
