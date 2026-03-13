require('./commands');
require('cypress-terminal-report/src/installLogsCollector')();

// Suppress service worker registration errors in dev/test environment
Cypress.on('window:before:load', (win) => {
    // Stub serviceWorker to prevent registration attempts
    Object.defineProperty(win.navigator, 'serviceWorker', {
        value: {
            register: () => Promise.resolve(),
            ready: Promise.resolve(),
            controller: null,
            addEventListener: () => {},
            removeEventListener: () => {},
        },
        writable: true,
        configurable: true,
    });
});
