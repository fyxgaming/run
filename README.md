## Running the Tests

### In Node

To run all tests locally:

    npm run test

This will compile the node build and run all tests on it.

### In the Browser

To test the browser build:

    npm run test:browser

This will run the tests in a headless version of Chrome.

To test with other browsers, open `./test/browser.html` in any web browser.

### As a Developer

During development, you may find it useful to lint and test together using an uncompiled build:

    npm run test:dev

You may optionally pass a path to limit testing to just that module:

    npm run test:dev ./test/jig.js

This path argument also applies to `test:dev`, `test`, and `test:cover`.

### With Code Coverage

To calculate the code coverage:

    npm run test:cover

This will print out coverage information in the console.