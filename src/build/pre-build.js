const cp = require('child_process');
const fs = require('fs');

console.log('WARNING: Reverting to committed package-lock.json. If that means your changes are lost you should rebuild it.')
cp.execSync('git checkout package-lock.json');

// const packageLockJSON = JSON.parse(fs.readFileSync('package-lock.json'));
// const packageJSON = JSON.parse(fs.readFileSync('package.json'));

// FIXME: is this necessary? the package.json & package-lock.json format has changed, package.json no longer
// contains a _integrity field, package-lock.json not uses the field packages instead of dependencies.

// Object.keys(packageJSON.dependencies).concat(Object.keys(packageJSON.devDependencies)).forEach(packagename => {
//     process.stdout.write(`checking integrity of package ${packagename}\n`);
//     const package = JSON.parse(fs.readFileSync(`node_modules/${packagename}/package.json`));
//     if(packageLockJSON.packages[`node_modules/${packagename}`].integrity !== package._integrity) {
//         console._rror(`${packagename} integrity does not match with package-lock.json. Please reinstall.`);
//         process.exit(1);
//     }
//     process.stdout.write(` ${package._integrity.substr(0, 20)}... - OK\r\n`);
// });

console.log('All dependency versions ok. Will build production bundle.');

console.log(cp.execFileSync('node', ['src/build/gen-env.js']).toString().trim())

if (!process.env.SKIP_CHANGELOG) {
    console.log('Updating changelog');
    console.log(cp.execFileSync('node', ['src/build/build-changelog.js']).toString().trim())
}

console.log('Updating appData');
const dirty = cp.execSync('git status --porcelain ngsw-config.json').toString().trim();

if (dirty) {
    console.log('You have local changes to ngsw-config.json!\n');
    console.log('They will be lost during the automatic update of appData section');
    console.log('Please commit your changes before the build');
    process.exit(1);
}
