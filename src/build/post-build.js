const execSync = require('child_process').execSync;

execSync('git checkout src/app/buildtimestamp.ts');
execSync('git checkout ngsw-config.json');
