#!/usr/bin/env node
const exec = require('child_process').execSync;

function run(command) {
    exec(command, { stdio: 'inherit', env: { ...process.env, SKIP_CHANGELOG: 1 } });
}

const phases = {
    lint:   'npm run lint',
    policy: 'npm run policy',
    unit:   'npm run test -- --watch=false --progress=false --browsers=FirefoxHeadless',
    e2e:    'npm run cypress-e2e',
    build:  'npm run build',
};

let commands = process.argv.slice(2);
if (commands.length === 0) {
    commands = ['lint', 'policy', 'unit', 'e2e', 'build'];
}

for (const c of commands) {
    run(phases[c]);
}
