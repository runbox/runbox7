const http = require('http');
const PROXY_CONFIG = [
    {
        context: [
            "/rest", "/LOGOUT", "/mail", "/ajax", "/_js", "/_img", "/_css", "/app"
        ],
        "target": 'http://localhost:15000'
    }
];

module.exports = PROXY_CONFIG;