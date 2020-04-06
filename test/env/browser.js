/**
 * browser.js
 *
 * Runs the tests in a live browser using Selenium.
 *
 * The appropriate webdriver must be installed.
 *
 * Usage:
 *    node ./browser.js [spec..]
 *
 * Environment variables:
 *    BROWSER=<chrome|firefox|safari|MicrosoftEdge>       (Default: chrome)
 *    TIMEOUT=<milliseconds>                              (Default: 300000)
 */

const path = require('path')
const webpack = require('webpack')
const webdriver = require('selenium-webdriver')
const firefox = require('selenium-webdriver/firefox')
const chrome = require('selenium-webdriver/chrome')
const edge = require('selenium-webdriver/edge')

async function buildTests () {
  if (process.argv.length > 2) process.env.SPECS = JSON.stringify(process.argv.slice(2))
  process.env.UNMANGLE = 1
  const compiler = webpack(require('../../webpack.config'))
  return new Promise((resolve, reject) => compiler.run(e => e ? reject(e) : resolve()))
}

async function runTests () {
  const timeout = process.env.TIMEOUT || 5 * 60 * 1000
  const browser = process.env.BROWSER || 'chrome'

  // Headless mode is required in Linux VMs on Github Actions
  const chromeOptions = new chrome.Options().headless()
  const firefoxOptions = new firefox.Options().headless()
  const edgeOptions = new edge.Options().headless().setEdgeChromium(true)

  // Start the browser
  const driver = await new webdriver.Builder()
    .setChromeOptions(chromeOptions)
    .setFirefoxOptions(firefoxOptions)
    .setEdgeOptions(edgeOptions)
    .forBrowser(browser)
    .build()

  // Poll function to read logs
  let logsRead = 0
  async function poll () {
    const { logs, done } = await driver.executeScript('return { logs, done }')
    while (logs.length > logsRead) console.log(...logs[logsRead++])
    return !done
  }

  let failures = 0

  try {
    // Load the test page
    const url = `file://${path.resolve(__dirname, 'browser.html?colors=1')}`
    await driver.get(url)

    // Poll until complete or timeout
    const startTime = new Date()
    const timedOut = () => (new Date() - startTime > timeout)
    while (!timedOut() && await poll());

    // Read the number of failures
    failures = await driver.executeScript('return failures')
  } finally {
    await driver.quit()
  }

  // Exit with the failure count as the exit code. 0 failures = success
  process.exit(failures)
}

function error (e) {
  console.error(e)
  process.exit(1)
}

const testing = typeof global.it !== 'undefined'
if (!testing) buildTests().then(runTests).catch(error)
