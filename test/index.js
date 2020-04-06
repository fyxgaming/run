/**
 * index.js
 *
 * Master list of test modules
 */

require('./kernel/blockchain')
require('./kernel/jig')
require('./kernel/owner')
require('./kernel/transaction')

require('./module/blockchain-api')
require('./module/local-purse')
require('./module/mockchain')
require('./module/state-cache')

require('./util/checkpoint')
require('./util/datatypes')
require('./util/json')
require('./util/location')
require('./util/misc')
require('./util/opreturn')

require('./run')
