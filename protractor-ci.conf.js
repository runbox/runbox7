const config = require('./protractor.conf').config;

config.capabilities = {
  browserName: 'chrome',
  chromeOptions: {
    args: ['--headless','--window-size=1920,1080','--remote-debugging-port=9222']
  }
};

exports.config = config;
