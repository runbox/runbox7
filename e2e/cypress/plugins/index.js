const wp = require('@cypress/webpack-preprocessor')

module.exports = (on, config) => {
    const options = {
        webpackOptions: {
            resolve: {
                extensions: [".ts", ".tsx", ".js"]
            },
            module: {
                rules: [
                    {
                        test: /\.tsx?$/,
                        loader: "ts-loader",
                        options: { transpileOnly: true }
                    }
                ]
            }
        },
    }
    on('file:preprocessor', wp(options))
    require('cypress-terminal-report/src/installLogsPrinter')(on);

    // Force the browser into a specific timezone via TZ env var.
    // Defaults to Europe/Oslo (CET/CEST) to expose bugs where
    // account tz != browser tz. Override with env var CYPRESS_TZ.
    on('before:browser:launch', (browser, launchOptions) => {
        const tz = config.env.TZ || 'Europe/Oslo';
        launchOptions.env = {
            ...(launchOptions.env || {}),
            TZ: tz,
        };
        return launchOptions;
    });
}
