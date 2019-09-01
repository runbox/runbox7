const http = require('http');
const PROXY_CONFIG = [
    {
        context: [
            "/rest", "/LOGOUT", "/mail", "/ajax", "/app"
        ],
        "target": 'http://localhost:15000'
    },
    {
        context: ["/_js", "/_img", "/_css"],
        "target": "https://runbox.com",
        "secure": true,
        "ws": true,
        "changeOrigin": true
    }
];

module.exports = PROXY_CONFIG;