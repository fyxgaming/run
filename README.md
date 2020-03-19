# Starter Project

![Last Commit](https://github.com/runonbitcoin/starter/workflows/Last%20Commit/badge.svg) ![Nightly Suite](https://github.com/runonbitcoin/starter/workflows/Nightly%20Suite/badge.svg) [![codecov](https://codecov.io/gh/runonbitcoin/starter/branch/master/graph/badge.svg?token=IoAqrMTgqc)](https://codecov.io/gh/runonbitcoin/starter)

## Introduction

This is a base project for Javascript libraries we develop.

It ensures the library works in all ES6 environments, including modern browsers and Node 10+.

Automated tests run with every push and also nightly.

## Setup

To create a new project from this starter:

1. Copy the files into an empty repository
2. Update `package.json`
    - name
    - version
    - description
    - repository
    - scripts, test:node, LIB
3. Update `test/browser.html` scripts
4. Set a `CODECOV_TOKEN` secret from codecov.io on GitHub
5. Remove performance tests if necessary:
    - `.github/workflows/nightly.yml`
    - `test/config.js`
    - `test/performance.js`
6. Remove `package-lock.json` and `npm install` to regenerate
7. Update badges in `README.md`

## Commands

- `npm run lint` - Lint and automatically fix errors
- `npm run build` - Build outputs
- `npm run test` - Test library quickly
- `npm run test:node` - Test the minified node build
- `npm run test:browser` - Test the minified browser build (Firefox default)
- `env BROWSER=safari npm run test:browser` - Test the minified browser build on Safari
- `npm run test:cover` - Collect code coverage
- `npm run test test/adder.js` - Run just the adder tests
- `npm run bump` - Create a new patch release
