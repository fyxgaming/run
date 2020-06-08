/**
 * index.js
 *
 * Master list of test modules
 */

require('./extra/asm')
require('./extra/expect')
require('./extra/group-lock')
require('./extra/hex')
require('./extra/standard-lock')
require('./extra/token')

require('./kernel/api')
require('./kernel/berry')
require('./kernel/blockchain')
require('./kernel/cache')
require('./kernel/code')
require('./kernel/v2/code')
require('./kernel/inventory')
require('./kernel/jig')
require('./kernel/owner')
require('./kernel/purse')
require('./kernel/syncer')
require('./kernel/transaction')

require('./module/local-cache')
require('./module/local-owner')
require('./module/local-purse')
require('./module/mockchain')
require('./module/pay-server')
require('./module/remote-blockchain')
require('./module/viewer')

require('./util/bindings')
require('./util/checkpoint')
require('./util/deep')
require('./util/json')
require('./util/location')
require('./util/misc')
require('./util/opreturn')
require('./util/rest')
require('./util/set')

require('./run')
