const assert = require('assert');
const karmaConfig = require('../karma.conf.js');

assert.deepStrictEqual(karmaConfig.configuredBrowsers(undefined), ['Firefox']);
assert.deepStrictEqual(karmaConfig.configuredBrowsers(''), ['Firefox']);
assert.deepStrictEqual(karmaConfig.configuredBrowsers('FirefoxHeadless'), ['FirefoxHeadless']);
assert.deepStrictEqual(
  karmaConfig.configuredBrowsers('ChromeHeadless, FirefoxHeadless'),
  ['ChromeHeadless', 'FirefoxHeadless']
);
assert.deepStrictEqual(
  karmaConfig.configuredBrowsers(' , FirefoxHeadless ,, '),
  ['FirefoxHeadless']
);
