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
require('./kernel/code')
require('./kernel/inventory')
require('./kernel/jig')
require('./kernel/owner')
require('./kernel/purse')
require('./kernel/syncer')
require('./kernel/transaction')

require('./module/blockchain-api')
require('./module/local-owner')
require('./module/local-purse')
require('./module/mockchain')
require('./module/pay-server')
require('./module/state-cache')
require('./module/viewer')

require('./util/checkpoint')
require('./util/datatypes')
require('./util/rest')
require('./util/json')
require('./util/location')
require('./util/misc')
require('./util/opreturn')

require('./run')
