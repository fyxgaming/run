/**
 * helpers.js
 *
 * Various helpers methods used in tests
 */

const Run = require('./config')
const { unmangle } = require('./unmangle')

// ------------------------------------------------------------------------------------------------
// hookPay
// ------------------------------------------------------------------------------------------------

async function hookPay (run, ...enables) {
  const syncer = unmangle(unmangle(run)._kernel)._syncer
  enables = new Array(syncer.queued.length).fill(true).concat(enables)
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
  const app = 'Run ▸ Library'
  const networks = [['test', 'Testnet'], ['main', 'Mainnet']]

  let properties = ''

  for (const [network, suffix] of networks) {
    const run = new Run({ network, app })
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
