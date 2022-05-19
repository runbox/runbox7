const http = require('http');
const PROXY_CONFIG = [
    {
        context: [
            "/rest", "/LOGOUT", "/mail", "/ajax", "/app", "/_ics"
        ],
        "target": 'http://localhost:15000',
        headers: {
            "Connection": "keep-alive"
        },
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
