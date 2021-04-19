/**
 * index.js
 *
 * Master list of test modules
 */

// Setup the extras blockchain before any other tests start! The classes need to be deployed correctly.
require('mocha').before(() => require('./env/misc').getExtrasBlockchain())

require('./protocol')
require('./run')

require('./data/capture')

require('./extra/asm')
require('./extra/b')
require('./extra/base58')
require('./extra/expect')
require('./extra/group')
require('./extra/hex')
require('./extra/sha256')
require('./extra/token10')
require('./extra/token20')
require('./extra/tx')
require('./extra/txo')

require('./kernel/api')
require('./kernel/auth')
require('./kernel/batch')
require('./kernel/berry')
require('./kernel/blockchain')
require('./kernel/cache')
require('./kernel/call')
require('./kernel/caller')
require('./kernel/code')
require('./kernel/creation')
require('./kernel/deploy')
require('./kernel/deps')
require('./kernel/destroy')
require('./kernel/editor')
require('./kernel/interactive')
require('./kernel/jig')
require('./kernel/load')
require('./kernel/lock')
require('./kernel/membrane')
require('./kernel/native')
require('./kernel/owner')
require('./kernel/private')
require('./kernel/publish')
require('./kernel/purse')
require('./kernel/recent')
require('./kernel/replay')
require('./kernel/reserved')
require('./kernel/rules')
require('./kernel/satoshis')
require('./kernel/sealed')
require('./kernel/sidekick')
require('./kernel/state')
require('./kernel/sidekick')
require('./kernel/stress')
require('./kernel/sync')
require('./kernel/timeout')
require('./kernel/transaction')
require('./kernel/trust')
require('./kernel/unify')
require('./kernel/upgrade')
require('./kernel/upgradable')

require('./plugins/browser-cache')
require('./plugins/indexeddb-cache')
require('./plugins/inventory')
require('./plugins/local-cache')
require('./plugins/local-owner')
require('./plugins/local-purse')
require('./plugins/mattercloud')
require('./plugins/mockchain')
require('./plugins/pay-server')
require('./plugins/run-connect')
require('./plugins/run-db')
require('./plugins/viewer')
require('./plugins/whatsonchain')

require('./sandbox/realm')
require('./sandbox/sandbox')

require('./util/admin')
require('./util/bindings')
require('./util/bsv')
require('./util/codec')
require('./util/common-lock')
require('./util/deep')
require('./util/dynamic')
require('./util/environment')
require('./util/log')
require('./util/metadata')
require('./util/misc')
require('./util/proxy2')
require('./util/queue')
require('./util/recent-broadcasts')
require('./util/rest')
require('./util/version')
