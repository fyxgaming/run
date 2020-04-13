/**
 * index.js
 *
 * Master list of test modules
 */

require('./extra/expect')
require('./extra/token')

require('./kernel/api')
require('./kernel/berry')
require('./kernel/blockchain')
require('./kernel/code')
require('./kernel/inventory')
require('./kernel/jig')
require('./kernel/owner')
require('./kernel/transaction')

require('./module/blockchain-api')
require('./module/local-owner')
require('./module/local-purse')
require('./module/mockchain')
require('./module/state-cache')

require('./util/checkpoint')
require('./util/datatypes')
require('./util/json')
require('./util/location')
require('./util/misc')
require('./util/opreturn')
require('./util/standard-lock')

require('./run')
