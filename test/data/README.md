# Test Data

Protocol tests are tests which "lock in" a particular protocol with reference transactions.
These reference transactions are captured both by this test suite and from the live chain.
A test data file has the following form:

{
    tests: [<txid>],            // Run transactions to import
    txns: {<txid>: <rawtx>},    // Test txns and the supporting txns needed to load them
    network: <network-string>   // Run network to use
}