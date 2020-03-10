## Running tests

To run all tests locally:

    npm run test

This will compile the node build automatically and use it in the tests.

### Browser testing

To run tests in a headless Chrome browser:

    npm run test:browser

You may also open `./test/browser.html` in any web browser to run all tests.

### Developer testing

During development, it is often useful to lint and test together using an uncompiled build. To do that:

    npm run test:dev

You may optionally pass a path to limit testing to just that module:

    npm run test:dev ./test/jig.js

This applies to `test:dev`, `test`, and `test:cover`.

### Code coverage

To run testing with code coverage:

    npm run test:cover

This will print out coverage information in the console.