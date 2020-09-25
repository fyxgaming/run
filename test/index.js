/**
 * index.js
 *
 * Master list of test modules
 */

require('./protocol')
require('./run')

require('./extra/asm')
require('./extra/expect')
require('./extra/group')
require('./extra/hex')
require('./extra/token')

require('./kernel/api')
require('./kernel/auth')
require('./kernel/batch')
require('./kernel/blockchain')
require('./kernel/call')
require('./kernel/caller')
require('./kernel/code')
require('./kernel/deploy')
require('./kernel/deps')
require('./kernel/destroy')
require('./kernel/jig')
require('./kernel/load')
require('./kernel/lock')
require('./kernel/membrane')
require('./kernel/native')
require('./kernel/private')
require('./kernel/publish')
require('./kernel/purse')
require('./kernel/recent')
require('./kernel/rules')
require('./kernel/sealed')
require('./kernel/state')
require('./kernel/static')
require('./kernel/stress')
require('./kernel/sync')
require('./kernel/timeout')
require('./kernel/transaction')
require('./kernel/trust')
require('./kernel/unify')
require('./kernel/universal')
require('./kernel/upgrade')
require('./kernel/verify')

require('./module/inventory')
require('./module/local-cache')
require('./module/local-owner')
require('./module/local-purse')
require('./module/mockchain')
require('./module/remote-blockchain')
require('./module/pay-server')
require('./module/viewer')

require('./util/admin')
require('./util/bindings')
require('./util/codec')
require('./util/deep')
require('./util/dynamic')
require('./util/log')
require('./util/misc')
require('./util/proxy2')
require('./util/queue')
require('./util/rest')
require('./util/sandbox')
require('./util/standard-lock')
