let backendhostname = process.env.RUNBOX7_ANGULAR_BACKEND_HOST;
let backendhostsecure = false;
if(backendhostname) 
    {
    // If we're using a custom (development) backend, turn off security checking to avoid certificate errors:
    backendhostsecure = false;
    }
else 
    {
    // Default to production backend
    backendhostname = 'https://runbox.com';
    }

const PROXY_CONFIG = [
    {
        context: ["/websocket"],
        "target": backendhostname.replace(/^http/,'ws'),
        "secure": backendhostsecure,
        "ws": true,
        "changeOrigin": true
    },
    {
        context: [
            "/rest", "/LOGOUT", "/mail", "/ajax", "/_js", "/_img", "/_css", "/app", "/angular2"    
        ],
        onProxyRes: (proxyRes, req, res) => {            
            if (proxyRes.headers['set-cookie']) {
                const cookies = proxyRes.headers['set-cookie'].map(cookie =>
                    cookie.replace(/; secure/gi, '')
                );
                proxyRes.headers['set-cookie'] = cookies;
            }
            if(proxyRes.headers['location']) {
                proxyRes.headers['location'] = proxyRes.headers['location'].replace(backendhostname, '');
            }
        },
        "target": backendhostname,
        "secure": backendhostsecure,
        "cookieDomainRewrite": "localhost",
        "changeOrigin": true
        
    }
]

module.exports = PROXY_CONFIG;
