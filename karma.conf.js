// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

const DEFAULT_BROWSERS = ['Firefox'];

function configuredBrowsers(envValue) {
  if (!envValue) {
    return DEFAULT_BROWSERS;
  }

  const browsers = envValue.split(',').map((browser) => browser.trim()).filter(Boolean);
  return browsers.length ? browsers : DEFAULT_BROWSERS;
}

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-firefox-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage-istanbul-reporter'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client:{
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    coverageIstanbulReporter: {
      dir: require('path').join(__dirname, 'coverage'), reports: [ 'html', 'lcovonly' ],
      fixWebpackSourcePaths: true
    },
    angularCli: {
      environment: 'dev'
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: configuredBrowsers(process.env.KARMA_BROWSERS),
    singleRun: false
  });
};

module.exports.configuredBrowsers = configuredBrowsers;
