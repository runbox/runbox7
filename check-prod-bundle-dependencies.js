const fs = require('fs');

console.log('WARNING: Reverting to committed package-lock.json. If that means your changes are lost you should rebuild it.')
require('child_process').execSync('git checkout package-lock.json');

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
