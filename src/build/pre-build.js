const execSync = require('child_process').execSync;
const fs = require('fs');

console.log('WARNING: Reverting to committed package-lock.json. If that means your changes are lost you should rebuild it.')
execSync('git checkout package-lock.json');

const packageLockJSON = JSON.parse(fs.readFileSync('package-lock.json'));
const packageJSON = JSON.parse(fs.readFileSync('package.json'));

Object.keys(packageJSON.dependencies).concat(Object.keys(packageJSON.devDependencies)).forEach(packagename => {
    process.stdout.write(`checking integrity of package ${packagename}`);
    const package = JSON.parse(fs.readFileSync(`node_modules/${packagename}/package.json`));
    if(packageLockJSON.dependencies[packagename].integrity !== package._integrity) {
        console.error(`${packagename} integrity does not match with package-lock.json. Please reinstall.`);
        process.exit(1);
    }
    process.stdout.write(` ${package._integrity.substr(0, 20)}... - OK\r\n`);
});

console.log('All dependency versions ok. Will build production bundle.');

console.log('Updating build timestamp');
fs.writeFileSync('src/app/buildtimestamp.ts', "export const BUILD_TIMESTAMP = '" + new Date().toJSON() + "';\n");

console.log('Updating appData commit hash');
const dirty = execSync('git status --porcelain ngsw-config.json').toString().trim();

if (dirty) {
    console.log('You have local changes to ngsw-config.json!\n');
    console.log('They will be lost during the automatic update of appData section');
    console.log('Please commit your changes before the build');
    process.exit(1);
}

let config = fs.readFileSync('ngsw-config.json').toString();
const hash = execSync('git rev-parse --short HEAD').toString().trim();
console.log(`Setting appData commit hash to ${hash}`);
config = config.replace('__COMMIT_HASH__', hash);
fs.writeFileSync('ngsw-config.json', config);
