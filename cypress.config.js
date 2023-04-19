const { defineConfig } = require('cypress');
const setupNodeEvents = require('./e2e/cypress/plugins/index.js');

module.exports = defineConfig({
  experimentalModifyObstructiveThirdPartyCode: true,
  e2e: {
    "baseUrl": "http://localhost:4201",
    "defaultCommandTimeout": 10000,
    "fixturesFolder": "e2e/cypress/fixtures",
    "specPattern": "e2e/cypress/integration",
    "supportFile": "e2e/cypress/support/index.js",
    "video" : false,
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "retries": {
        "runMode": 2
    },
    setupNodeEvents,
    setupNodeEvents(on, config) {
      require('cypress-terminal-report/src/installLogsPrinter')(on);
    }
  }
});