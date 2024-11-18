const execSync = require('child_process').execSync;
const chalk = require('chalk');

execSync('git checkout src/app/buildtimestamp.ts');
execSync('git checkout ngsw-config.json');
execSync('npx sentry-cli sourcemaps inject ./dist/');
execSync('npx ngsw-config ./dist ngsw-config.json "/app/"');

const changelogUpdated = execSync('git status --porcelain src/app/changelog/changes.ts').toString().trim();
if (changelogUpdated) {
    console.log(chalk.green(`
    ==========================
    Changelog has been updated
    ==========================`));
    console.log('Run the following command to commit it:\n');
    console.log('git commit src/app/changelog/changes.ts -em "docs(changelog): Update changelog"');
}

if (!process.env.SENTRY_DSN) {
    console.log(chalk.bold.yellow('This build did NOT use Sentry error reporting.'));
    console.log('Re-run with SENTRY_DSN environment variable set to enable it');
} else {
    execSync('git checkout src/app/sentry.ts');
}
