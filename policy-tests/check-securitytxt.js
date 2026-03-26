const fs = require('fs');

function fail(message) {
    throw new Error(message);
}

function expect(condition, message) {
    if (!condition) {
        fail(message);
    }
}

function readJson(filename) {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function hasSecurityTxtAsset(assets) {
    return assets.some(asset => asset &&
        asset.glob === 'security.txt' &&
        asset.input === 'src/.well-known' &&
        asset.output === '/.well-known/');
}

const angularConfig = readJson('angular.json');
const buildAssets = angularConfig.projects.runbox7.architect.build.options.assets;
const testAssets = angularConfig.projects.runbox7.architect.test.options.assets;

expect(hasSecurityTxtAsset(buildAssets),
    'runbox7 build assets must publish src/.well-known/security.txt to /.well-known/');
expect(hasSecurityTxtAsset(testAssets),
    'runbox7 test assets must publish src/.well-known/security.txt to /.well-known/');

const securityTxt = fs.readFileSync('src/.well-known/security.txt', 'utf8').trim().split('\n');
const requiredLines = [
    'Contact: https://support.runbox.com/',
    'Canonical: https://runbox.com/.well-known/security.txt',
    'Policy: https://blog.runbox.com/2019/02/runbox-7-feature-and-bug-bounty-program/',
    'Preferred-Languages: en',
];

for (const line of requiredLines) {
    expect(securityTxt.includes(line), `security.txt is missing "${line}"`);
}

const expiresLine = securityTxt.find(line => line.startsWith('Expires: '));
expect(Boolean(expiresLine), 'security.txt must contain an Expires field');
expect(!Number.isNaN(Date.parse(expiresLine.slice('Expires: '.length))),
    'security.txt Expires field must contain a valid ISO-8601 timestamp');

console.log('security.txt policy checks passed');
