#!/usr/bin/env node
const exec = require('child_process').execSync;

function run(command) {
    exec(command, { stdio: 'inherit' });
}

if (!process.env['CHROME_BIN']) {
    process.env['CHROME_BIN'] = 'chromium-browser';
}

const phases = {
    lint:   'npm run lint',
    policy: 'npm run policy',
    unit:   'npm run test -- --watch=false --progress=false --browsers=ChromeHeadlessCI',
    e2e:    'npm run e2e -- --protractor-config=./protractor-ci.conf.js',
    build:  'npm run build',
};

let commands = process.argv.slice(2);
if (commands.length === 0) {
    commands = ['lint', 'policy', 'unit', 'e2e', 'build'];
}

for (const c of commands) {
    run(phases[c]);
}
