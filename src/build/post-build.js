const execSync = require('child_process').execSync;
const chalk = require('chalk');

execSync('git checkout src/app/buildtimestamp.ts');
execSync('git checkout ngsw-config.json');

console.log(chalk.green(`
==========================
Changelog has been updated
==========================`));
console.log('Run the following command to commit it:\n');
console.log('git commit src/app/changelog/changes.ts -em "docs(changelog): Update changelog"');
